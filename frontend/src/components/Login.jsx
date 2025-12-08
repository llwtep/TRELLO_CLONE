import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout, Loader2, Mail, Lock, User } from 'lucide-react';

export default function Login() {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ email: '', password: '', username: '' });
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMsg(null);

        try {
            if (isLogin) {
                await axios.post('/auth/login', { email: formData.email, password: formData.password });
                navigate('/dashboard');
            } else {
                await axios.post('/auth/signup', {
                    email: formData.email,
                    password: formData.password,
                    username: formData.username || "User"
                });
                setSuccessMsg("✓ Account created! Please check your email to verify your account.");
                setIsLogin(true);
                setFormData({ email: '', password: '', username: '' });
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail || "Authentication failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0079bf] via-[#026aa7] to-[#005a8e] text-[#172b4d] relative overflow-hidden">

            {/* Decorative Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10">
                <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-white rounded-full blur-3xl"></div>
            </div>

            {/* Brand Logo */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 flex items-center gap-3 relative z-10"
            >
                <div className="bg-white p-2 rounded-lg shadow-lg">
                    <Layout className="text-[#0079bf]" size={32} />
                </div>
                <h1 className="text-4xl font-bold text-white tracking-tight">TrelloClone</h1>
            </motion.div>

            {/* Main Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-[400px] bg-white rounded-lg shadow-2xl p-10 relative z-10"
            >
                <h2 className="text-center text-[#5e6c84] font-semibold mb-8 text-base">
                    {isLogin ? 'Log in to continue' : 'Sign up for your account'}
                </h2>

                <AnimatePresence mode="wait">
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-[#eb5a46] text-white p-3 rounded-md mb-6 text-sm text-center font-medium"
                        >
                            {error}
                        </motion.div>
                    )}
                    {successMsg && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-[#61bd4f] text-white p-3 rounded-md mb-6 text-sm text-center font-medium"
                        >
                            {successMsg}
                        </motion.div>
                    )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <AnimatePresence>
                        {!isLogin && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="relative"
                            >
                                <User className="absolute left-3 top-3 text-[#5e6c84]" size={18} />
                                <input
                                    name="username"
                                    type="text"
                                    placeholder="Enter your full name"
                                    className="w-full bg-[#fafbfc] border-2 border-[#dfe1e6] rounded-md py-3 pl-11 pr-4 text-sm focus:border-[#0079bf] focus:bg-white outline-none transition-all"
                                    value={formData.username}
                                    onChange={handleChange}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="relative">
                        <Mail className="absolute left-3 top-3 text-[#5e6c84]" size={18} />
                        <input
                            name="email"
                            type="email"
                            placeholder="Enter your email"
                            className="w-full bg-[#fafbfc] border-2 border-[#dfe1e6] rounded-md py-3 pl-11 pr-4 text-sm focus:border-[#0079bf] focus:bg-white outline-none transition-all"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="relative">
                        <Lock className="absolute left-3 top-3 text-[#5e6c84]" size={18} />
                        <input
                            name="password"
                            type="password"
                            placeholder="Enter your password"
                            className="w-full bg-[#fafbfc] border-2 border-[#dfe1e6] rounded-md py-3 pl-11 pr-4 text-sm focus:border-[#0079bf] focus:bg-white outline-none transition-all"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#5aac44] hover:bg-[#61bd4f] text-white font-bold py-3 rounded-md transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                <span>Please wait...</span>
                            </>
                        ) : (
                            isLogin ? 'Log in' : 'Create Account'
                        )}
                    </button>
                </form>

                <div className="mt-6 pt-6 border-t border-[#dfe1e6] text-center">
                    <button
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError(null);
                            setSuccessMsg(null);
                        }}
                        className="text-[#0079bf] hover:text-[#026aa7] text-sm font-medium transition-colors"
                    >
                        {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
                    </button>
                </div>
            </motion.div>

            {/* Demo Credentials */}
            <div className="mt-6 text-white/80 text-sm relative z-10 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                Demo: test@example.com / password
            </div>
        </div>
    );
}
