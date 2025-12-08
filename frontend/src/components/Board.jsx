import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, MoreHorizontal, ArrowLeft, X, Loader2, Star, Users } from 'lucide-react';

export default function Board() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [board, setBoard] = useState(null);
    const [lists, setLists] = useState([]);
    const [newListTitle, setNewListTitle] = useState('');
    const [isAddingList, setIsAddingList] = useState(false);
    const [newCardTitles, setNewCardTitles] = useState({});
    const [isAddingCard, setIsAddingCard] = useState({});

    const ws = useRef(null);

    useEffect(() => {
        fetchBoard();
        connectWS();
        return () => {
            if (ws.current) ws.current.close();
        };
    }, [id]);

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
                case 'CARD_CREATED':
                    newLists = newLists.map(l => {
                        if (l.id === payload.list_id) {
                            return { ...l, cards: [...l.cards, payload].sort((a, b) => a.position - b.position) };
                        }
                        return l;
                    });
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

    if (!board) return (
        <div className="min-h-screen bg-gradient-to-br from-[#0079bf] to-[#026aa7] flex items-center justify-center text-white">
            <Loader2 className="animate-spin mr-2" size={32} />
            <span className="text-lg">Loading board...</span>
        </div>
    );

    return (
        <div className="h-screen flex flex-col bg-gradient-to-br from-[#0079bf] via-[#026aa7] to-[#005a8e] overflow-hidden">
            {/* Enhanced Header */}
            <header className="bg-black/20 backdrop-blur-sm px-4 h-12 flex items-center justify-between text-white z-10 sticky top-0 shadow-lg border-b border-white/10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="hover:bg-white/20 p-2 rounded-md transition-all"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-lg font-bold">{board.title}</h1>
                    <button className="hover:bg-white/20 p-1.5 rounded-md transition-all">
                        <Star size={16} />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-md text-sm font-semibold transition-all flex items-center gap-1.5">
                        <Users size={16} />
                        <span className="hidden sm:inline">Share</span>
                    </button>
                    <button className="hover:bg-white/20 p-2 rounded-md transition-all">
                        <MoreHorizontal size={20} />
                    </button>
                </div>
            </header>

            {/* Board Canvas */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex gap-4 h-full items-start pb-4">

                        {lists.map(list => (
                            <div key={list.id} className="w-[280px] flex-shrink-0 flex flex-col max-h-full">
                                <div className="bg-[#ebecf0] rounded-lg flex flex-col max-h-full shadow-lg">
                                    {/* List Header */}
                                    <div className="p-3 font-semibold text-sm flex justify-between items-center text-[#172b4d]">
                                        <span className="truncate flex-1">{list.title}</span>
                                        <button className="text-[#6b778c] hover:bg-[#091e4214] p-1.5 rounded-md transition-all ml-2">
                                            <MoreHorizontal size={16} />
                                        </button>
                                    </div>

                                    {/* Cards Area */}
                                    <Droppable droppableId={list.id}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                                className={`px-2 pb-2 flex-1 overflow-y-auto min-h-[4px] list-scrollbar ${snapshot.isDraggingOver ? 'bg-[#091e4214] rounded-md' : ''} transition-colors`}
                                            >
                                                {list.cards.map((card, index) => (
                                                    <Draggable key={card.id} draggableId={card.id} index={index}>
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                className={`
                                                            bg-white p-3 mb-2 rounded-lg shadow-sm hover:shadow-md cursor-pointer text-sm text-[#172b4d] break-words transition-all
                                                            ${snapshot.isDragging ? 'rotate-3 shadow-2xl ring-2 ring-blue-400' : ''}
                                                        `}
                                                                style={{ ...provided.draggableProps.style }}
                                                            >
                                                                {card.title}
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}

                                                {isAddingCard[list.id] && (
                                                    <div className="mb-2 animate-in fade-in duration-200">
                                                        <form onSubmit={(e) => addCard(e, list.id)}>
                                                            <textarea
                                                                autoFocus
                                                                className="w-full p-3 text-sm rounded-lg shadow-md border-2 border-[#0079bf] outline-none resize-none placeholder-gray-400 mb-2"
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
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    type="submit"
                                                                    className="bg-[#0079bf] hover:bg-[#026aa7] text-white text-sm px-4 py-2 rounded-md font-semibold shadow-md hover:shadow-lg transition-all"
                                                                >
                                                                    Add card
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setIsAddingCard(prev => ({ ...prev, [list.id]: false }))}
                                                                    className="text-[#6b778c] hover:text-[#172b4d] hover:bg-[#091e4214] p-2 rounded-md transition-all"
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
                                            className="m-2 p-2 flex items-center gap-2 text-[#5e6c84] hover:bg-[#091e4214] hover:text-[#172b4d] rounded-md text-sm font-medium transition-all"
                                        >
                                            <Plus size={16} /> Add a card
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Add List Section */}
                        <div className="w-[280px] flex-shrink-0">
                            {!isAddingList ? (
                                <button
                                    onClick={() => setIsAddingList(true)}
                                    className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm p-3 rounded-lg text-white flex items-center gap-2 transition-all font-semibold shadow-md hover:shadow-lg"
                                >
                                    <Plus size={18} /> Add another list
                                </button>
                            ) : (
                                <div className="bg-[#ebecf0] p-3 rounded-lg shadow-lg animate-in fade-in duration-200">
                                    <form onSubmit={addList}>
                                        <input
                                            autoFocus
                                            className="w-full p-2.5 rounded-md border-2 border-[#0079bf] outline-none text-sm placeholder-[#5e6c84] mb-2 shadow-sm"
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
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="submit"
                                                className="bg-[#0079bf] hover:bg-[#026aa7] text-white text-sm px-4 py-2 rounded-md font-semibold shadow-md hover:shadow-lg transition-all"
                                            >
                                                Add list
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setIsAddingList(false)}
                                                className="text-[#6b778c] hover:text-[#172b4d] hover:bg-[#091e4214] p-2 rounded-md transition-all"
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
        </div>
    );
}
