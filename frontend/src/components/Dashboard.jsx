import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Layout, LogOut, User, Search, Star, Clock } from 'lucide-react';

export default function Dashboard() {
    const [boards, setBoards] = useState([]);
    const [newBoardTitle, setNewBoardTitle] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchBoards();
        fetchUser();
    }, []);

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

    return (
        <div className="min-h-screen bg-[#fafbfc] text-[#172b4d]">

            {/* Trello-style Header */}
            <nav className="bg-gradient-to-r from-[#026aa7] to-[#0079bf] text-white px-4 h-12 flex items-center justify-between shadow-md sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 hover:bg-white/20 px-3 py-1.5 rounded-md cursor-pointer transition-all">
                        <Layout size={20} />
                        <span className="font-bold text-lg tracking-tight hidden sm:inline">TrelloClone</span>
                    </div>
                    <div className="hidden md:flex items-center gap-2">
                        <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-md text-sm font-semibold transition-all">
                            Workspaces
                        </button>
                        <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-md text-sm font-semibold transition-all">
                            Recent
                        </button>
                        <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-md text-sm font-semibold transition-all">
                            Starred
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative hidden sm:block">
                        <input
                            className="bg-white/20 hover:bg-white/30 focus:bg-white focus:text-[#172b4d] border-none rounded-md py-1.5 pl-9 pr-3 text-sm placeholder:text-white/80 focus:placeholder:text-gray-400 transition-all w-52 outline-none"
                            placeholder="Search..."
                        />
                        <Search className="absolute left-2.5 top-2 text-white/80 pointer-events-none" size={16} />
                    </div>

                    {user && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center font-bold text-sm uppercase cursor-pointer shadow-md hover:shadow-lg transition-all" title={user.email}>
                            {user.username?.substring(0, 2) || user.email?.substring(0, 2)}
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        className="text-white/90 hover:text-white hover:bg-white/20 p-2 rounded-md transition-all"
                        title="Logout"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </nav>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto p-8">

                {/* Page Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
                            <User className="text-white" size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-[#172b4d]">Your Workspace</h1>
                            <p className="text-sm text-[#5e6c84]">{user?.email || 'Loading...'}</p>
                        </div>
                    </div>
                </div>

                {/* Boards Section */}
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <Star size={18} className="text-[#5e6c84]" />
                        <h2 className="font-bold text-[#172b4d] text-lg">Your Boards</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">

                        {boards.map((board, index) => (
                            <motion.div
                                key={board.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                whileHover={{ y: -4 }}
                                onClick={() => navigate(`/board/${board.id}`)}
                                className="group bg-gradient-to-br from-[#0079bf] to-[#026aa7] rounded-lg h-28 p-4 relative cursor-pointer hover:shadow-xl transition-all overflow-hidden"
                            >
                                {/* Decorative overlay */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all"></div>

                                <div className="relative z-10">
                                    <h3 className="font-bold text-white text-lg truncate mb-2">{board.title}</h3>
                                    <div className="flex items-center gap-1 text-white/80 text-xs">
                                        <Clock size={12} />
                                        <span>Recently viewed</span>
                                    </div>
                                </div>

                                {/* Star button */}
                                <button className="absolute bottom-3 right-3 text-white/60 hover:text-white opacity-0 group-hover:opacity-100 transition-all">
                                    <Star size={16} />
                                </button>
                            </motion.div>
                        ))}

                        {/* Create New Board Tile */}
                        <motion.div
                            whileHover={{ y: -4 }}
                            onClick={() => setIsCreating(true)}
                            className="bg-[#091e420f] hover:bg-[#091e4214] h-28 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all border-2 border-dashed border-[#091e4226] hover:border-[#0079bf]"
                        >
                            {isCreating ? (
                                <form onSubmit={createBoard} className="w-full px-4" onClick={e => e.stopPropagation()}>
                                    <input
                                        autoFocus
                                        className="w-full p-2 text-sm border-2 border-[#0079bf] rounded-md outline-none focus:ring-2 focus:ring-[#0079bf]/30"
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
                                    <button type="submit" className="hidden" />
                                    <p className="text-xs text-[#5e6c84] mt-2 text-center">Press Enter to create</p>
                                </form>
                            ) : (
                                <>
                                    <div className="w-10 h-10 rounded-full bg-[#091e4214] flex items-center justify-center mb-2">
                                        <Plus className="text-[#5e6c84]" size={20} />
                                    </div>
                                    <span className="text-[#172b4d] text-sm font-semibold">Create new board</span>
                                </>
                            )}
                        </motion.div>
                    </div>
                </div>

                {/* Recently Viewed Section (Optional) */}
                {boards.length > 0 && (
                    <div className="mt-12">
                        <div className="flex items-center gap-2 mb-4">
                            <Clock size={18} className="text-[#5e6c84]" />
                            <h2 className="font-bold text-[#172b4d] text-lg">Recently Viewed</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {boards.slice(0, 3).map((board) => (
                                <div
                                    key={`recent-${board.id}`}
                                    onClick={() => navigate(`/board/${board.id}`)}
                                    className="flex items-center gap-3 p-3 bg-white rounded-lg border border-[#dfe1e6] hover:border-[#0079bf] hover:shadow-md cursor-pointer transition-all"
                                >
                                    <div className="w-10 h-10 rounded bg-gradient-to-br from-[#0079bf] to-[#026aa7] flex-shrink-0"></div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-sm text-[#172b4d] truncate">{board.title}</h4>
                                        <p className="text-xs text-[#5e6c84]">Board</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
