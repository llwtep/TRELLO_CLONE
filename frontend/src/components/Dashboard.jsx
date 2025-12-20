import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Layout, LogOut, Search, Star, Clock, ChevronDown, Bell, Edit2, Trash2, MoreHorizontal } from 'lucide-react';

export default function Dashboard() {
    const [boards, setBoards] = useState([]);
    const [newBoardTitle, setNewBoardTitle] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [user, setUser] = useState(null);
    const [invitations, setInvitations] = useState([]);
    const [showInvitations, setShowInvitations] = useState(false);
    const navigate = useNavigate();

    // New state for board edit/delete
    const [showBoardMenu, setShowBoardMenu] = useState(null); // board id
    const [editingBoard, setEditingBoard] = useState(null); // {id, title}
    const [deleteConfirm, setDeleteConfirm] = useState(null); // {id, title}

    // WebSocket ref for user notifications
    const ws = useRef(null);

    useEffect(() => {
        fetchBoards();
        fetchUser();
        fetchInvitations();
        connectUserWS();

        return () => {
            if (ws.current) ws.current.close();
        };
    }, []);

    // Connect to user-level WebSocket for real-time notifications
    const connectUserWS = () => {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}/ws/user`;

        ws.current = new WebSocket(wsUrl);

        ws.current.onmessage = (event) => {
            const message = JSON.parse(event.data);
            handleWSMessage(message);
        };

        ws.current.onclose = () => {
            // Reconnect after a delay if disconnected
            setTimeout(connectUserWS, 3000);
        };

        ws.current.onerror = (error) => {
            console.error('User WebSocket error:', error);
        };
    };

    const handleWSMessage = (msg) => {
        const { type, payload } = msg;

        switch (type) {
            case 'INVITATION_RECEIVED':
                // Add the new invitation to the list
                setInvitations(prev => {
                    // Avoid duplicates
                    const exists = prev.some(inv => inv.id === payload.id);
                    if (exists) return prev;
                    return [...prev, payload];
                });
                break;
            default:
                break;
        }
    };

    const fetchUser = async () => {
        try {
            const res = await axios.get('/auth/me');
            setUser(res.data);
        } catch (err) {
            console.error(err);
        }
    }

    const fetchBoards = async () => {
        try {
            const res = await axios.get('/boards');
            setBoards(res.data);
        } catch (err) {
            if (err.response?.status === 401) navigate('/');
        }
    };

    const createBoard = async (e) => {
        e.preventDefault();
        if (!newBoardTitle.trim()) return;
        try {
            await axios.post('/boards', { title: newBoardTitle });
            setNewBoardTitle('');
            setIsCreating(false);
            fetchBoards();
        } catch (err) {
            console.error(err);
        }
    };

    const handleLogout = async () => {
        await axios.post('/auth/logout');
        navigate('/');
    }

    const fetchInvitations = async () => {
        try {
            const res = await axios.get('/boards/invitations/pending');
            setInvitations(res.data);
        } catch (err) {
            console.error('Failed to fetch invitations:', err);
        }
    };

    const respondToInvitation = async (boardId, status) => {
        try {
            await axios.post(`/boards/${boardId}/invite/respond`, { status });
            fetchInvitations(); // Refresh list
            if (status === 'accepted') {
                fetchBoards(); // Refresh boards
            }
        } catch (err) {
            alert('Failed to respond to invitation');
        }
    };

    // Board edit/delete functions
    const updateBoard = async (boardId, newTitle) => {
        if (!newTitle.trim()) return;
        try {
            await axios.patch(`/boards/${boardId}`, { title: newTitle });
            setEditingBoard(null);
            fetchBoards();
        } catch (err) {
            console.error('Failed to update board:', err);
            alert('Failed to update board');
        }
    };

    const deleteBoard = async (boardId) => {
        try {
            await axios.delete(`/boards/${boardId}`);
            setDeleteConfirm(null);
            fetchBoards();
        } catch (err) {
            console.error('Failed to delete board:', err);
            alert('Failed to delete board');
        }
    };

    const gradients = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    ];

    return (
        <div style={{ minHeight: '100vh', background: '#fafbfc' }}>

            {/* Modern Header */}
            <nav style={{
                background: 'white',
                borderBottom: '1px solid #e5e7eb',
                padding: '0 1.5rem',
                height: '4rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'sticky',
                top: 0,
                zIndex: 50,
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.625rem',
                        cursor: 'pointer'
                    }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            padding: '0.5rem',
                            borderRadius: '0.5rem',
                            display: 'flex'
                        }}>
                            <Layout style={{ color: 'white' }} size={20} />
                        </div>
                        <span style={{
                            fontWeight: 700,
                            fontSize: '1.25rem',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                        }}>TaskFlow</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button style={{
                            padding: '0.5rem 0.875rem',
                            background: 'transparent',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            color: '#4b5563',
                            display: 'none'
                        }}
                            onMouseEnter={(e) => e.target.style.background = '#f3f4f6'}
                            onMouseLeave={(e) => e.target.style.background = 'transparent'}
                        >
                            Workspaces
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ position: 'relative', display: 'flex' }}>
                        <Search style={{
                            position: 'absolute',
                            left: '0.75rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#9ca3af',
                            pointerEvents: 'none'
                        }} size={16} />
                        <input
                            style={{
                                background: '#f9fafb',
                                border: '1px solid #e5e7eb',
                                borderRadius: '0.5rem',
                                padding: '0.5rem 0.875rem 0.5rem 2.5rem',
                                fontSize: '0.875rem',
                                outline: 'none',
                                width: '240px',
                                transition: 'all 0.15s'
                            }}
                            placeholder="Search boards..."
                            onFocus={(e) => {
                                e.target.style.background = 'white';
                                e.target.style.borderColor = '#667eea';
                                e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                            }}
                            onBlur={(e) => {
                                e.target.style.background = '#f9fafb';
                                e.target.style.borderColor = '#e5e7eb';
                                e.target.style.boxShadow = 'none';
                            }}
                        />
                    </div>

                    {user && (
                        <div style={{
                            width: '2rem',
                            height: '2rem',
                            borderRadius: '0.5rem',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            color: 'white',
                            cursor: 'pointer',
                            textTransform: 'uppercase'
                        }} title={user.email}>
                            {user.username?.substring(0, 2) || user.email?.substring(0, 2)}
                        </div>
                    )}

                    {/* Invitations Bell */}
                    {invitations.length > 0 && (
                        <button
                            onClick={() => setShowInvitations(true)}
                            style={{
                                position: 'relative',
                                color: '#6b7280',
                                padding: '0.5rem',
                                borderRadius: '0.375rem',
                                transition: 'all 0.15s'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.color = '#111827';
                                e.target.style.background = '#f3f4f6';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.color = '#6b7280';
                                e.target.style.background = 'transparent';
                            }}
                            title="Pending Invitations"
                        >
                            <Bell size={18} />
                            <span style={{
                                position: 'absolute',
                                top: '2px',
                                right: '2px',
                                background: '#ef4444',
                                color: 'white',
                                fontSize: '0.625rem',
                                fontWeight: 700,
                                borderRadius: '9999px',
                                minWidth: '16px',
                                height: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0 4px'
                            }}>
                                {invitations.length}
                            </span>
                        </button>
                    )}

                    <button
                        onClick={handleLogout}
                        style={{
                            color: '#6b7280',
                            padding: '0.5rem',
                            borderRadius: '0.375rem',
                            transition: 'all 0.15s'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.color = '#111827';
                            e.target.style.background = '#f3f4f6';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.color = '#6b7280';
                            e.target.style.background = 'transparent';
                        }}
                        title="Logout"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </nav>

            {/* Main Content */}
            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '3rem 2rem' }}>

                {/* Page Header */}
                <div style={{ marginBottom: '3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        <div style={{
                            width: '3.5rem',
                            height: '3.5rem',
                            borderRadius: '0.75rem',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}>
                            <Layout style={{ color: 'white' }} size={24} />
                        </div>
                        <div>
                            <h1 style={{
                                fontSize: '1.875rem',
                                fontWeight: 700,
                                color: '#111827',
                                margin: 0,
                                letterSpacing: '-0.025em'
                            }}>Your Workspace</h1>
                            <p style={{
                                fontSize: '0.875rem',
                                color: '#6b7280',
                                margin: 0
                            }}>{user?.email || 'Loading...'}</p>
                        </div>
                    </div>
                </div>

                {/* Boards Section */}
                <div style={{ marginBottom: '3rem' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '1.5rem'
                    }}>
                        <Star size={18} style={{ color: '#6b7280' }} />
                        <h2 style={{
                            fontWeight: 600,
                            color: '#111827',
                            fontSize: '1.125rem',
                            margin: 0
                        }}>Your Boards</h2>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                        gap: '1.25rem'
                    }}>

                        {boards.map((board, index) => (
                            <motion.div
                                key={board.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => navigate(`/board/${board.id}`)}
                                style={{
                                    background: gradients[index % gradients.length],
                                    borderRadius: '0.75rem',
                                    height: '120px',
                                    padding: '1.25rem',
                                    position: 'relative',
                                    cursor: 'pointer',
                                    overflow: 'visible',
                                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)';
                                }}
                            >
                                <div style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.1))',
                                    borderRadius: '0.75rem'
                                }} />

                                {/* Menu Button */}
                                <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', zIndex: 20 }}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowBoardMenu(showBoardMenu === board.id ? null : board.id);
                                        }}
                                        style={{
                                            color: 'rgba(255,255,255,0.8)',
                                            padding: '0.375rem',
                                            borderRadius: '0.375rem',
                                            transition: 'all 0.15s',
                                            background: showBoardMenu === board.id ? 'rgba(0,0,0,0.2)' : 'transparent'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = showBoardMenu === board.id ? 'rgba(0,0,0,0.2)' : 'transparent'}
                                    >
                                        <MoreHorizontal size={18} />
                                    </button>
                                    {showBoardMenu === board.id && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: '100%',
                                                right: 0,
                                                marginTop: '0.25rem',
                                                background: 'white',
                                                borderRadius: '0.5rem',
                                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
                                                border: '1px solid #e5e7eb',
                                                minWidth: '140px',
                                                zIndex: 50,
                                                overflow: 'hidden'
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <button
                                                onClick={() => {
                                                    setShowBoardMenu(null);
                                                    setEditingBoard({ id: board.id, title: board.title });
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
                                                <Edit2 size={14} /> Rename
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowBoardMenu(null);
                                                    setDeleteConfirm({ id: board.id, title: board.title });
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
                                                <Trash2 size={14} /> Delete
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div style={{ position: 'relative', zIndex: 10 }}>
                                    <h3 style={{
                                        fontWeight: 600,
                                        color: 'white',
                                        fontSize: '1.125rem',
                                        margin: 0,
                                        marginBottom: '0.5rem',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                        paddingRight: '2rem'
                                    }}>{board.title}</h3>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.375rem',
                                        color: 'rgba(255,255,255,0.9)',
                                        fontSize: '0.75rem'
                                    }}>
                                        <Clock size={12} />
                                        <span>Recently viewed</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}

                        {/* Create New Board Tile */}
                        <motion.div
                            onClick={() => setIsCreating(true)}
                            style={{
                                background: '#f9fafb',
                                border: '2px dashed #d1d5db',
                                height: '120px',
                                borderRadius: '0.75rem',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#f3f4f6';
                                e.currentTarget.style.borderColor = '#667eea';
                                e.currentTarget.style.transform = 'translateY(-4px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#f9fafb';
                                e.currentTarget.style.borderColor = '#d1d5db';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            {isCreating ? (
                                <form onSubmit={createBoard} style={{ width: '100%', padding: '1.25rem' }} onClick={e => e.stopPropagation()}>
                                    <input
                                        autoFocus
                                        style={{
                                            width: '100%',
                                            padding: '0.625rem',
                                            fontSize: '0.875rem',
                                            border: '1.5px solid #667eea',
                                            borderRadius: '0.5rem',
                                            outline: 'none',
                                            boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)'
                                        }}
                                        placeholder="Enter board title..."
                                        value={newBoardTitle}
                                        onChange={e => setNewBoardTitle(e.target.value)}
                                        onBlur={() => !newBoardTitle && setIsCreating(false)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Escape') {
                                                setIsCreating(false);
                                                setNewBoardTitle('');
                                            }
                                        }}
                                    />
                                    <button type="submit" style={{ display: 'none' }} />
                                    <p style={{
                                        fontSize: '0.75rem',
                                        color: '#6b7280',
                                        marginTop: '0.625rem',
                                        textAlign: 'center',
                                        margin: '0.625rem 0 0 0'
                                    }}>Press Enter to create</p>
                                </form>
                            ) : (
                                <>
                                    <div style={{
                                        width: '3rem',
                                        height: '3rem',
                                        borderRadius: '9999px',
                                        background: '#e5e7eb',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: '0.625rem'
                                    }}>
                                        <Plus style={{ color: '#6b7280' }} size={20} />
                                    </div>
                                    <span style={{
                                        color: '#4b5563',
                                        fontSize: '0.875rem',
                                        fontWeight: 500
                                    }}>Create new board</span>
                                </>
                            )}
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Invitations Modal */}
            {showInvitations && (
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
                }} onClick={() => setShowInvitations(false)}>
                    <div style={{
                        background: 'white',
                        borderRadius: '1rem',
                        padding: '1.5rem',
                        width: '90%',
                        maxWidth: '500px',
                        maxHeight: '80vh',
                        overflowY: 'auto',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                    }} onClick={(e) => e.stopPropagation()}>
                        <h2 style={{
                            fontSize: '1.5rem',
                            fontWeight: 700,
                            marginBottom: '1rem',
                            color: '#111827'
                        }}>Pending Invitations</h2>

                        {invitations.length === 0 ? (
                            <p style={{ color: '#6b7280', margin: '1rem 0' }}>No pending invitations</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {invitations.map(inv => (
                                    <div key={inv.id} style={{
                                        background: '#f9fafb',
                                        padding: '1rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid #e5e7eb'
                                    }}>
                                        <div style={{
                                            fontSize: '0.875rem',
                                            color: '#111827',
                                            marginBottom: '0.5rem',
                                            fontWeight: 600
                                        }}>
                                            Board Invitation
                                        </div>
                                        <div style={{
                                            fontSize: '0.75rem',
                                            color: '#6b7280',
                                            marginBottom: '0.75rem'
                                        }}>
                                            Board ID: {inv.board_id}
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => respondToInvitation(inv.board_id, 'accepted')}
                                                style={{
                                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                    color: 'white',
                                                    padding: '0.5rem 1rem',
                                                    borderRadius: '0.375rem',
                                                    fontSize: '0.875rem',
                                                    fontWeight: 600,
                                                    flex: 1,
                                                    transition: 'all 0.15s'
                                                }}
                                                onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                                                onMouseLeave={(e) => e.target.style.opacity = '1'}
                                            >
                                                Accept
                                            </button>
                                            <button
                                                onClick={() => respondToInvitation(inv.board_id, 'rejected')}
                                                style={{
                                                    background: '#ef4444',
                                                    color: 'white',
                                                    padding: '0.5rem 1rem',
                                                    borderRadius: '0.375rem',
                                                    fontSize: '0.875rem',
                                                    fontWeight: 600,
                                                    flex: 1,
                                                    transition: 'all 0.15s'
                                                }}
                                                onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                                                onMouseLeave={(e) => e.target.style.opacity = '1'}
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={() => setShowInvitations(false)}
                            style={{
                                marginTop: '1rem',
                                width: '100%',
                                padding: '0.5rem',
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                color: '#6b7280',
                                transition: 'all 0.15s'
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#f3f4f6'}
                            onMouseLeave={(e) => e.target.style.background = 'transparent'}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Edit Board Modal */}
            {editingBoard && (
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
                }} onClick={() => setEditingBoard(null)}>
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
                        }}>Rename Board</h2>

                        <input
                            autoFocus
                            type="text"
                            value={editingBoard.title}
                            onChange={(e) => setEditingBoard({ ...editingBoard, title: e.target.value })}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    updateBoard(editingBoard.id, editingBoard.title);
                                }
                                if (e.key === 'Escape') {
                                    setEditingBoard(null);
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
                                boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)'
                            }}
                        />

                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setEditingBoard(null)}
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
                                onClick={() => updateBoard(editingBoard.id, editingBoard.title)}
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
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Board Confirmation Modal */}
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
                        }}>Delete Board?</h2>

                        <p style={{
                            fontSize: '0.875rem',
                            color: '#6b7280',
                            marginBottom: '1.5rem',
                            lineHeight: 1.5
                        }}>
                            Are you sure you want to delete "{deleteConfirm.title}"?
                            This will also delete all lists and cards in this board.
                            This action cannot be undone.
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
                                onClick={() => deleteBoard(deleteConfirm.id)}
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
