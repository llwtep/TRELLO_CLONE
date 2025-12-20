import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, MoreHorizontal, ArrowLeft, X, Loader2, UserPlus, Users, Edit2, Trash2 } from 'lucide-react';

export default function Board() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [board, setBoard] = useState(null);
    const [lists, setLists] = useState([]);
    const [newListTitle, setNewListTitle] = useState('');
    const [isAddingList, setIsAddingList] = useState(false);
    const [newCardTitles, setNewCardTitles] = useState({});
    const [isAddingCard, setIsAddingCard] = useState({});
    const [members, setMembers] = useState([]);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [isInviting, setIsInviting] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    // New state for edit/delete functionality
    const [editingCard, setEditingCard] = useState(null); // {id, title, listId}
    const [editingListId, setEditingListId] = useState(null);
    const [editingListTitle, setEditingListTitle] = useState('');
    const [showCardMenu, setShowCardMenu] = useState(null); // card id
    const [showListMenu, setShowListMenu] = useState(null); // list id
    const [deleteConfirm, setDeleteConfirm] = useState(null); // {type: 'card'|'list', id, title}

    const ws = useRef(null);

    useEffect(() => {
        fetchCurrentUser();
        fetchBoard();
        fetchMembers();
        connectWS();
        return () => {
            if (ws.current) ws.current.close();
        };
    }, [id]);

    const fetchCurrentUser = async () => {
        try {
            const res = await axios.get('/auth/me');
            setCurrentUser(res.data);
        } catch (err) {
            console.error('Failed to fetch current user');
        }
    };

    const fetchBoard = async () => {
        try {
            const res = await axios.get(`/boards/${id}`);
            setBoard(res.data);
            const sortedLists = (res.data.lists || []).sort((a, b) => a.position - b.position);
            sortedLists.forEach(l => {
                l.cards = (l.cards || []).sort((a, b) => a.position - b.position);
            });
            setLists(sortedLists);
        } catch (err) {
            if (err.response?.status === 401) navigate('/');
        }
    };

    const fetchMembers = async () => {
        try {
            const res = await axios.get(`/boards/${id}/members`);
            setMembers(res.data);
        } catch (err) {
            console.error('Failed to fetch members:', err);
        }
    };

    const connectWS = () => {
        const wsUrl = `ws://${window.location.host}/ws/board/${id}`;
        ws.current = new WebSocket(wsUrl);
        ws.current.onmessage = (event) => handleWSMessage(JSON.parse(event.data));
    };

    const handleWSMessage = (msg) => {
        const { type, payload } = msg;
        setLists(prevLists => {
            let newLists = [...prevLists];
            switch (type) {
                case 'LIST_CREATED':
                    newLists.push({ ...payload, cards: [] });
                    break;
                case 'LIST_UPDATED':
                    newLists = newLists.map(l => l.id === payload.id ? { ...l, ...payload } : l);
                    break;
                case 'LIST_DELETED':
                    newLists = newLists.filter(l => l.id !== payload.id);
                    break;
                case 'CARD_CREATED':
                    newLists = newLists.map(l => {
                        if (l.id === payload.list_id) {
                            return { ...l, cards: [...l.cards, payload].sort((a, b) => a.position - b.position) };
                        }
                        return l;
                    });
                    break;
                case 'CARD_UPDATED':
                    newLists = newLists.map(l => ({
                        ...l,
                        cards: l.cards.map(c => c.id === payload.id ? { ...c, ...payload } : c)
                    }));
                    break;
                case 'CARD_DELETED':
                    newLists = newLists.map(l => ({
                        ...l,
                        cards: l.cards.filter(c => c.id !== payload.id)
                    }));
                    break;
                case 'CARD_MOVED':
                    const card = payload;
                    newLists = newLists.map(l => ({ ...l, cards: l.cards.filter(c => c.id !== card.id) }));
                    newLists = newLists.map(l => {
                        if (l.id === card.list_id) {
                            return { ...l, cards: [...l.cards, card].sort((a, b) => a.position - b.position) };
                        }
                        return l;
                    });
                    break;
                case 'USER_JOINED':
                    // Refresh members list when someone joins
                    fetchMembers();
                    break;
                default: break;
            }
            return newLists.sort((a, b) => a.position - b.position);
        });
    };

    const onDragEnd = async (result) => {
        const { source, destination, draggableId } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const newLists = JSON.parse(JSON.stringify(lists));
        const sourceList = newLists.find(l => l.id === source.droppableId);
        const destList = newLists.find(l => l.id === destination.droppableId);
        const card = sourceList.cards.find(c => c.id === draggableId);

        sourceList.cards.splice(source.index, 1);
        card.list_id = destination.droppableId;
        destList.cards.splice(destination.index, 0, card);

        setLists(newLists);

        try {
            await axios.patch(`/cards/${draggableId}/move?new_list_id=${destination.droppableId}&new_position=${destination.index}`, {});
        } catch (err) {
            fetchBoard();
        }
    };

    const addList = async (e) => {
        e.preventDefault();
        if (!newListTitle.trim()) return;
        try {
            const position = lists.length;
            await axios.post(`/boards/${id}/lists`, { title: newListTitle, position });
            setNewListTitle('');
            setIsAddingList(false);
        } catch (err) { console.error(err); }
    };

    const addCard = async (e, listId) => {
        e.preventDefault();
        const title = newCardTitles[listId];
        if (!title?.trim()) return;
        try {
            const list = lists.find(l => l.id === listId);
            await axios.post(`/lists/${listId}/cards`, {
                title, position: list.cards.length, list_id: listId
            });
            setNewCardTitles(prev => ({ ...prev, [listId]: '' }));
            setIsAddingCard(prev => ({ ...prev, [listId]: false }));
        } catch (err) { console.error(err); }
    };

    const inviteUser = async (e) => {
        e.preventDefault();
        if (!inviteEmail.trim()) return;
        setIsInviting(true);
        try {
            await axios.post(`/boards/${id}/invite`, { email: inviteEmail });
            alert('Invitation sent successfully!');
            setShowInviteModal(false);
            setInviteEmail('');
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to send invitation');
        } finally {
            setIsInviting(false);
        }
    };

    // Card edit/delete functions
    const updateCard = async (cardId, newTitle) => {
        if (!newTitle.trim()) return;
        try {
            await axios.patch(`/cards/${cardId}`, { title: newTitle });
            setEditingCard(null);
        } catch (err) {
            console.error('Failed to update card:', err);
            alert('Failed to update card');
        }
    };

    const deleteCard = async (cardId) => {
        try {
            await axios.delete(`/cards/${cardId}`);
            setDeleteConfirm(null);
        } catch (err) {
            console.error('Failed to delete card:', err);
            alert('Failed to delete card');
        }
    };

    // List edit/delete functions
    const updateList = async (listId, newTitle) => {
        if (!newTitle.trim()) return;
        try {
            await axios.patch(`/boards/${id}/lists/${listId}`, { title: newTitle });
            setEditingListId(null);
            setEditingListTitle('');
        } catch (err) {
            console.error('Failed to update list:', err);
            alert('Failed to update list');
        }
    };

    const deleteList = async (listId) => {
        try {
            await axios.delete(`/boards/${id}/lists/${listId}`);
            setDeleteConfirm(null);
        } catch (err) {
            console.error('Failed to delete list:', err);
            alert('Failed to delete list');
        }
    };

    if (!board) return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            gap: '0.5rem'
        }}>
            <Loader2 className="animate-spin" size={32} />
            <span style={{ fontSize: '1.125rem' }}>Loading board...</span>
        </div>
    );

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <header style={{
                background: 'rgba(0, 0, 0, 0.15)',
                backdropFilter: 'blur(10px)',
                padding: '0 1.5rem',
                height: '3.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: 'white',
                zIndex: 10,
                position: 'sticky',
                top: 0,
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                        onClick={() => navigate('/dashboard')}
                        style={{
                            background: 'transparent',
                            color: 'white',
                            padding: '0.5rem',
                            borderRadius: '0.375rem',
                            transition: 'all 0.15s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 style={{
                        fontSize: '1.125rem',
                        fontWeight: 600,
                        margin: 0
                    }}>{board.title}</h1>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {/* Members Avatars */}
                    {members.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginRight: '0.5rem' }}>
                            <Users size={18} style={{ color: 'rgba(255, 255, 255, 0.9)', marginRight: '0.25rem' }} />
                            {members.slice(0, 3).map(member => (
                                <div key={member.user_id} style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    border: '2px solid rgba(255, 255, 255, 0.3)'
                                }} title={`${member.username} (${member.email})`}>
                                    {member.username[0].toUpperCase()}
                                </div>
                            ))}
                            {members.length > 3 && (
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: 'rgba(255, 255, 255, 0.9)',
                                    fontWeight: 500,
                                    marginLeft: '0.25rem'
                                }}>
                                    +{members.length - 3}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Invite Button - Only show for board owner */}
                    {currentUser && board && board.owner_id === currentUser.id && (
                        <button
                            onClick={() => setShowInviteModal(true)}
                            style={{
                                background: 'rgba(255, 255, 255, 0.15)',
                                color: 'white',
                                padding: '0.5rem 0.875rem',
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                transition: 'all 0.15s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.375rem'
                            }}
                            onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.25)'}
                            onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.15)'}
                        >
                            <UserPlus size={16} /> Invite
                        </button>
                    )}

                    <button style={{
                        background: 'rgba(255, 255, 255, 0.15)',
                        color: 'white',
                        padding: '0.5rem',
                        borderRadius: '0.375rem',
                        transition: 'all 0.15s'
                    }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.25)'}
                        onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.15)'}
                    >
                        <MoreHorizontal size={20} />
                    </button>
                </div>
            </header>

            {/* Board Canvas */}
            <div style={{
                flex: 1,
                overflowX: 'auto',
                overflowY: 'hidden',
                padding: '1.5rem'
            }} className="scrollbar-light">
                <DragDropContext onDragEnd={onDragEnd}>
                    <div style={{
                        display: 'flex',
                        gap: '1.25rem',
                        height: '100%',
                        alignItems: 'flex-start',
                        paddingBottom: '1rem'
                    }}>

                        {lists.map(list => (
                            <div key={list.id} style={{
                                width: '300px',
                                flexShrink: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                maxHeight: '100%'
                            }}>
                                <div style={{
                                    background: '#f3f4f6',
                                    borderRadius: '0.75rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    maxHeight: '100%',
                                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                                }}>
                                    {/* List Header */}
                                    <div style={{
                                        padding: '1rem',
                                        fontWeight: 600,
                                        fontSize: '0.875rem',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        color: '#111827',
                                        position: 'relative'
                                    }}>
                                        {editingListId === list.id ? (
                                            <input
                                                autoFocus
                                                type="text"
                                                value={editingListTitle}
                                                onChange={(e) => setEditingListTitle(e.target.value)}
                                                onBlur={() => {
                                                    if (editingListTitle.trim() && editingListTitle !== list.title) {
                                                        updateList(list.id, editingListTitle);
                                                    } else {
                                                        setEditingListId(null);
                                                        setEditingListTitle('');
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        if (editingListTitle.trim() && editingListTitle !== list.title) {
                                                            updateList(list.id, editingListTitle);
                                                        } else {
                                                            setEditingListId(null);
                                                            setEditingListTitle('');
                                                        }
                                                    }
                                                    if (e.key === 'Escape') {
                                                        setEditingListId(null);
                                                        setEditingListTitle('');
                                                    }
                                                }}
                                                style={{
                                                    flex: 1,
                                                    padding: '0.25rem 0.5rem',
                                                    fontSize: '0.875rem',
                                                    fontWeight: 600,
                                                    border: '2px solid #667eea',
                                                    borderRadius: '0.375rem',
                                                    outline: 'none',
                                                    background: 'white'
                                                }}
                                            />
                                        ) : (
                                            <span
                                                onClick={() => {
                                                    setEditingListId(list.id);
                                                    setEditingListTitle(list.title);
                                                }}
                                                style={{
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    flex: 1,
                                                    cursor: 'pointer'
                                                }}
                                                title="Click to edit"
                                            >{list.title}</span>
                                        )}
                                        <div style={{ position: 'relative' }}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowListMenu(showListMenu === list.id ? null : list.id);
                                                    setShowCardMenu(null);
                                                }}
                                                style={{
                                                    color: '#6b7280',
                                                    padding: '0.375rem',
                                                    borderRadius: '0.375rem',
                                                    marginLeft: '0.5rem',
                                                    transition: 'all 0.15s',
                                                    background: showListMenu === list.id ? '#e5e7eb' : 'transparent'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = '#e5e7eb'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = showListMenu === list.id ? '#e5e7eb' : 'transparent'}
                                            >
                                                <MoreHorizontal size={16} />
                                            </button>
                                            {showListMenu === list.id && (
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        top: '100%',
                                                        right: 0,
                                                        marginTop: '0.25rem',
                                                        background: 'white',
                                                        borderRadius: '0.5rem',
                                                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
                                                        border: '1px solid #e5e7eb',
                                                        minWidth: '150px',
                                                        zIndex: 50,
                                                        overflow: 'hidden'
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button
                                                        onClick={() => {
                                                            setShowListMenu(null);
                                                            setEditingListId(list.id);
                                                            setEditingListTitle(list.title);
                                                        }}
                                                        style={{
                                                            width: '100%',
                                                            padding: '0.625rem 0.875rem',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.5rem',
                                                            fontSize: '0.875rem',
                                                            color: '#374151',
                                                            background: 'transparent',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            transition: 'background 0.15s'
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                    >
                                                        <Edit2 size={14} /> Rename List
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setShowListMenu(null);
                                                            setDeleteConfirm({ type: 'list', id: list.id, title: list.title });
                                                        }}
                                                        style={{
                                                            width: '100%',
                                                            padding: '0.625rem 0.875rem',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.5rem',
                                                            fontSize: '0.875rem',
                                                            color: '#ef4444',
                                                            background: 'transparent',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            transition: 'background 0.15s'
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                    >
                                                        <Trash2 size={14} /> Delete List
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Cards Area */}
                                    <Droppable droppableId={list.id}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                                style={{
                                                    padding: '0 0.75rem 0.75rem 0.75rem',
                                                    flex: 1,
                                                    overflowY: 'auto',
                                                    minHeight: '4px',
                                                    background: snapshot.isDraggingOver ? '#e5e7eb' : 'transparent',
                                                    borderRadius: '0.5rem',
                                                    transition: 'background 0.15s'
                                                }}
                                                className="list-scrollbar"
                                            >
                                                {list.cards.map((card, index) => (
                                                    <Draggable key={card.id} draggableId={card.id} index={index}>
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                style={{
                                                                    background: 'white',
                                                                    padding: '0.875rem',
                                                                    marginBottom: '0.625rem',
                                                                    borderRadius: '0.5rem',
                                                                    boxShadow: snapshot.isDragging
                                                                        ? '0 10px 15px -3px rgba(0, 0, 0, 0.2)'
                                                                        : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                                                    cursor: 'pointer',
                                                                    fontSize: '0.875rem',
                                                                    color: '#111827',
                                                                    wordWrap: 'break-word',
                                                                    transition: 'box-shadow 0.15s',
                                                                    transform: snapshot.isDragging ? 'rotate(2deg)' : 'none',
                                                                    border: snapshot.isDragging ? '2px solid #667eea' : '1px solid #e5e7eb',
                                                                    position: 'relative',
                                                                    ...provided.draggableProps.style
                                                                }}
                                                                className="card-item"
                                                            >
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                                    <span style={{ flex: 1, paddingRight: '0.5rem' }}>{card.title}</span>
                                                                    <div style={{ position: 'relative', flexShrink: 0 }}>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setShowCardMenu(showCardMenu === card.id ? null : card.id);
                                                                                setShowListMenu(null);
                                                                            }}
                                                                            style={{
                                                                                color: '#9ca3af',
                                                                                padding: '0.25rem',
                                                                                borderRadius: '0.25rem',
                                                                                transition: 'all 0.15s',
                                                                                background: showCardMenu === card.id ? '#f3f4f6' : 'transparent',
                                                                                opacity: showCardMenu === card.id ? 1 : 0.5
                                                                            }}
                                                                            className="card-menu-btn"
                                                                            onMouseEnter={(e) => {
                                                                                e.currentTarget.style.background = '#f3f4f6';
                                                                                e.currentTarget.style.color = '#6b7280';
                                                                                e.currentTarget.style.opacity = 1;
                                                                            }}
                                                                            onMouseLeave={(e) => {
                                                                                if (showCardMenu !== card.id) {
                                                                                    e.currentTarget.style.background = 'transparent';
                                                                                    e.currentTarget.style.color = '#9ca3af';
                                                                                    e.currentTarget.style.opacity = 0.5;
                                                                                }
                                                                            }}
                                                                        >
                                                                            <MoreHorizontal size={14} />
                                                                        </button>
                                                                        {showCardMenu === card.id && (
                                                                            <div
                                                                                style={{
                                                                                    position: 'absolute',
                                                                                    top: '100%',
                                                                                    right: 0,
                                                                                    marginTop: '0.25rem',
                                                                                    background: 'white',
                                                                                    borderRadius: '0.5rem',
                                                                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
                                                                                    border: '1px solid #e5e7eb',
                                                                                    minWidth: '130px',
                                                                                    zIndex: 50,
                                                                                    overflow: 'hidden'
                                                                                }}
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            >
                                                                                <button
                                                                                    onClick={() => {
                                                                                        setShowCardMenu(null);
                                                                                        setEditingCard({ id: card.id, title: card.title, listId: list.id });
                                                                                    }}
                                                                                    style={{
                                                                                        width: '100%',
                                                                                        padding: '0.5rem 0.75rem',
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                                                        gap: '0.5rem',
                                                                                        fontSize: '0.875rem',
                                                                                        color: '#374151',
                                                                                        background: 'transparent',
                                                                                        border: 'none',
                                                                                        cursor: 'pointer',
                                                                                        transition: 'background 0.15s'
                                                                                    }}
                                                                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                                                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                                                >
                                                                                    <Edit2 size={14} /> Edit
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => {
                                                                                        setShowCardMenu(null);
                                                                                        setDeleteConfirm({ type: 'card', id: card.id, title: card.title });
                                                                                    }}
                                                                                    style={{
                                                                                        width: '100%',
                                                                                        padding: '0.5rem 0.75rem',
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                                                        gap: '0.5rem',
                                                                                        fontSize: '0.875rem',
                                                                                        color: '#ef4444',
                                                                                        background: 'transparent',
                                                                                        border: 'none',
                                                                                        cursor: 'pointer',
                                                                                        transition: 'background 0.15s'
                                                                                    }}
                                                                                    onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                                                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                                                >
                                                                                    <Trash2 size={14} /> Delete
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}

                                                {isAddingCard[list.id] && (
                                                    <div style={{ marginBottom: '0.625rem' }}>
                                                        <form onSubmit={(e) => addCard(e, list.id)}>
                                                            <textarea
                                                                autoFocus
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '0.875rem',
                                                                    fontSize: '0.875rem',
                                                                    borderRadius: '0.5rem',
                                                                    border: '2px solid #667eea',
                                                                    outline: 'none',
                                                                    resize: 'none',
                                                                    marginBottom: '0.5rem',
                                                                    boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)'
                                                                }}
                                                                placeholder="Enter a title for this card..."
                                                                rows={3}
                                                                value={newCardTitles[list.id] || ''}
                                                                onChange={e => setNewCardTitles(prev => ({ ...prev, [list.id]: e.target.value }))}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                                        e.preventDefault();
                                                                        addCard(e, list.id);
                                                                    }
                                                                    if (e.key === 'Escape') {
                                                                        setIsAddingCard(prev => ({ ...prev, [list.id]: false }));
                                                                    }
                                                                }}
                                                            />
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                <button
                                                                    type="submit"
                                                                    style={{
                                                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                                        color: 'white',
                                                                        fontSize: '0.875rem',
                                                                        padding: '0.5rem 1rem',
                                                                        borderRadius: '0.375rem',
                                                                        fontWeight: 600,
                                                                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                                                        transition: 'all 0.15s'
                                                                    }}
                                                                    onMouseEnter={(e) => e.target.style.transform = 'translateY(-1px)'}
                                                                    onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                                                                >
                                                                    Add card
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setIsAddingCard(prev => ({ ...prev, [list.id]: false }))}
                                                                    style={{
                                                                        color: '#6b7280',
                                                                        padding: '0.5rem',
                                                                        borderRadius: '0.375rem',
                                                                        transition: 'all 0.15s'
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                        e.target.style.background = '#e5e7eb';
                                                                        e.target.style.color = '#111827';
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        e.target.style.background = 'transparent';
                                                                        e.target.style.color = '#6b7280';
                                                                    }}
                                                                >
                                                                    <X size={20} />
                                                                </button>
                                                            </div>
                                                        </form>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </Droppable>

                                    {/* Add Card Button */}
                                    {!isAddingCard[list.id] && (
                                        <button
                                            onClick={() => setIsAddingCard(prev => ({ ...prev, [list.id]: true }))}
                                            style={{
                                                margin: '0 0.75rem 0.75rem 0.75rem',
                                                padding: '0.625rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                color: '#6b7280',
                                                borderRadius: '0.375rem',
                                                fontSize: '0.875rem',
                                                fontWeight: 500,
                                                transition: 'all 0.15s'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.background = '#e5e7eb';
                                                e.target.style.color = '#111827';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.background = 'transparent';
                                                e.target.style.color = '#6b7280';
                                            }}
                                        >
                                            <Plus size={16} /> Add a card
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Add List Section */}
                        <div style={{ width: '300px', flexShrink: 0 }}>
                            {!isAddingList ? (
                                <button
                                    onClick={() => setIsAddingList(true)}
                                    style={{
                                        width: '100%',
                                        background: 'rgba(255, 255, 255, 0.2)',
                                        backdropFilter: 'blur(10px)',
                                        padding: '0.875rem',
                                        borderRadius: '0.75rem',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        transition: 'all 0.15s',
                                        fontWeight: 600,
                                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.background = 'rgba(255, 255, 255, 0.3)';
                                        e.target.style.transform = 'translateY(-2px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                                        e.target.style.transform = 'translateY(0)';
                                    }}
                                >
                                    <Plus size={18} /> Add another list
                                </button>
                            ) : (
                                <div style={{
                                    background: '#f3f4f6',
                                    padding: '0.875rem',
                                    borderRadius: '0.75rem',
                                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                                }}>
                                    <form onSubmit={addList}>
                                        <input
                                            autoFocus
                                            style={{
                                                width: '100%',
                                                padding: '0.625rem',
                                                borderRadius: '0.375rem',
                                                border: '2px solid #667eea',
                                                outline: 'none',
                                                fontSize: '0.875rem',
                                                marginBottom: '0.5rem',
                                                boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)'
                                            }}
                                            placeholder="Enter list title..."
                                            value={newListTitle}
                                            onChange={e => setNewListTitle(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Escape') {
                                                    setIsAddingList(false);
                                                    setNewListTitle('');
                                                }
                                            }}
                                        />
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <button
                                                type="submit"
                                                style={{
                                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                    color: 'white',
                                                    fontSize: '0.875rem',
                                                    padding: '0.5rem 1rem',
                                                    borderRadius: '0.375rem',
                                                    fontWeight: 600,
                                                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                                    transition: 'all 0.15s'
                                                }}
                                                onMouseEnter={(e) => e.target.style.transform = 'translateY(-1px)'}
                                                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                                            >
                                                Add list
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setIsAddingList(false)}
                                                style={{
                                                    color: '#6b7280',
                                                    padding: '0.5rem',
                                                    borderRadius: '0.375rem',
                                                    transition: 'all 0.15s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.target.style.background = '#e5e7eb';
                                                    e.target.style.color = '#111827';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.background = 'transparent';
                                                    e.target.style.color = '#6b7280';
                                                }}
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>

                    </div>
                </DragDropContext>
            </div>

            {/* Invite Modal */}
            {showInviteModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }} onClick={() => setShowInviteModal(false)}>
                    <div style={{
                        background: 'white',
                        borderRadius: '0.75rem',
                        padding: '1.5rem',
                        width: '90%',
                        maxWidth: '400px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                    }} onClick={(e) => e.stopPropagation()}>
                        <h2 style={{
                            fontSize: '1.25rem',
                            fontWeight: 700,
                            marginBottom: '1rem',
                            color: '#111827'
                        }}>Invite User to Board</h2>

                        <form onSubmit={inviteUser}>
                            <input
                                autoFocus
                                type="email"
                                placeholder="Enter email address"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '0.5rem',
                                    border: '2px solid #e5e7eb',
                                    fontSize: '0.875rem',
                                    marginBottom: '1rem',
                                    outline: 'none'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                            />

                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowInviteModal(false)}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: '0.375rem',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        color: '#6b7280',
                                        transition: 'all 0.15s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.background = '#f3f4f6'}
                                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isInviting}
                                    style={{
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        color: 'white',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '0.375rem',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        transition: 'all 0.15s',
                                        opacity: isInviting ? 0.6 : 1,
                                        cursor: isInviting ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {isInviting ? 'Sending...' : 'Send Invitation'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Card Modal */}
            {editingCard && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }} onClick={() => setEditingCard(null)}>
                    <div style={{
                        background: 'white',
                        borderRadius: '0.75rem',
                        padding: '1.5rem',
                        width: '90%',
                        maxWidth: '500px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                    }} onClick={(e) => e.stopPropagation()}>
                        <h2 style={{
                            fontSize: '1.25rem',
                            fontWeight: 700,
                            marginBottom: '1rem',
                            color: '#111827'
                        }}>Edit Card</h2>

                        <textarea
                            autoFocus
                            value={editingCard.title}
                            onChange={(e) => setEditingCard({ ...editingCard, title: e.target.value })}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    updateCard(editingCard.id, editingCard.title);
                                }
                                if (e.key === 'Escape') {
                                    setEditingCard(null);
                                }
                            }}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                border: '2px solid #667eea',
                                fontSize: '0.875rem',
                                marginBottom: '1rem',
                                outline: 'none',
                                resize: 'vertical',
                                minHeight: '100px',
                                boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)'
                            }}
                        />

                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setEditingCard(null)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    color: '#6b7280',
                                    transition: 'all 0.15s'
                                }}
                                onMouseEnter={(e) => e.target.style.background = '#f3f4f6'}
                                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => updateCard(editingCard.id, editingCard.title)}
                                style={{
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: 'white',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    transition: 'all 0.15s'
                                }}
                                onMouseEnter={(e) => e.target.style.transform = 'translateY(-1px)'}
                                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }} onClick={() => setDeleteConfirm(null)}>
                    <div style={{
                        background: 'white',
                        borderRadius: '0.75rem',
                        padding: '1.5rem',
                        width: '90%',
                        maxWidth: '400px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                    }} onClick={(e) => e.stopPropagation()}>
                        <div style={{
                            width: '3rem',
                            height: '3rem',
                            borderRadius: '50%',
                            background: '#fef2f2',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '1rem'
                        }}>
                            <Trash2 size={24} style={{ color: '#ef4444' }} />
                        </div>

                        <h2 style={{
                            fontSize: '1.25rem',
                            fontWeight: 700,
                            marginBottom: '0.5rem',
                            color: '#111827'
                        }}>Delete {deleteConfirm.type === 'card' ? 'Card' : 'List'}?</h2>

                        <p style={{
                            fontSize: '0.875rem',
                            color: '#6b7280',
                            marginBottom: '1.5rem',
                            lineHeight: 1.5
                        }}>
                            Are you sure you want to delete "{deleteConfirm.title}"?
                            {deleteConfirm.type === 'list' && ' This will also delete all cards in this list.'}
                            {' '}This action cannot be undone.
                        </p>

                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    color: '#6b7280',
                                    transition: 'all 0.15s'
                                }}
                                onMouseEnter={(e) => e.target.style.background = '#f3f4f6'}
                                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (deleteConfirm.type === 'card') {
                                        deleteCard(deleteConfirm.id);
                                    } else {
                                        deleteList(deleteConfirm.id);
                                    }
                                }}
                                style={{
                                    background: '#ef4444',
                                    color: 'white',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    transition: 'all 0.15s'
                                }}
                                onMouseEnter={(e) => e.target.style.background = '#dc2626'}
                                onMouseLeave={(e) => e.target.style.background = '#ef4444'}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
