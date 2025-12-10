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
                setSuccessMsg("✓ Account created successfully! You can now log in.");
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
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
            position: 'relative',
            overflow: 'hidden'
        }}>

            {/* Animated Background Orbs */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0.15,
                pointerEvents: 'none'
            }}>
                <motion.div
                    animate={{
                        x: [0, 100, 0],
                        y: [0, -100, 0],
                    }}
                    transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    style={{
                        position: 'absolute',
                        top: '10%',
                        left: '5%',
                        width: '300px',
                        height: '300px',
                        background: 'white',
                        borderRadius: '50%',
                        filter: 'blur(60px)'
                    }}
                />
                <motion.div
                    animate={{
                        x: [0, -100, 0],
                        y: [0, 100, 0],
                    }}
                    transition={{
                        duration: 15,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    style={{
                        position: 'absolute',
                        bottom: '10%',
                        right: '5%',
                        width: '400px',
                        height: '400px',
                        background: 'white',
                        borderRadius: '50%',
                        filter: 'blur(60px)'
                    }}
                />
            </div>

            {/* Brand Logo */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    marginBottom: '2rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    position: 'relative',
                    zIndex: 10
                }}
            >
                <div style={{
                    background: 'white',
                    padding: '0.625rem',
                    borderRadius: '0.75rem',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                }}>
                    <Layout style={{ color: '#667eea' }} size={28} />
                </div>
                <h1 style={{
                    fontSize: '2rem',
                    fontWeight: 700,
                    color: 'white',
                    letterSpacing: '-0.025em',
                    margin: 0
                }}>TaskFlow</h1>
            </motion.div>

            {/* Main Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                style={{
                    width: '100%',
                    maxWidth: '420px',
                    background: 'white',
                    borderRadius: '1rem',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    padding: '2.5rem',
                    position: 'relative',
                    zIndex: 10
                }}
            >
                <h2 style={{
                    textAlign: 'center',
                    color: '#6b7280',
                    fontWeight: 600,
                    marginBottom: '2rem',
                    fontSize: '0.875rem',
                    margin: '0 0 2rem 0'
                }}>
                    {isLogin ? 'Welcome back' : 'Create your account'}
                </h2>

                <AnimatePresence mode="wait">
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{
                                background: '#fee2e2',
                                color: '#991b1b',
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                marginBottom: '1.5rem',
                                fontSize: '0.875rem',
                                textAlign: 'center',
                                fontWeight: 500,
                                border: '1px solid #fecaca'
                            }}
                        >
                            {error}
                        </motion.div>
                    )}
                    {successMsg && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{
                                background: '#d1fae5',
                                color: '#065f46',
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                marginBottom: '1.5rem',
                                fontSize: '0.875rem',
                                textAlign: 'center',
                                fontWeight: 500,
                                border: '1px solid #a7f3d0'
                            }}
                        >
                            {successMsg}
                        </motion.div>
                    )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <AnimatePresence>
                        {!isLogin && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                style={{ position: 'relative' }}
                            >
                                <User style={{
                                    position: 'absolute',
                                    left: '0.875rem',
                                    top: '0.875rem',
                                    color: '#9ca3af'
                                }} size={18} />
                                <input
                                    name="username"
                                    type="text"
                                    placeholder="Full name"
                                    style={{
                                        width: '100%',
                                        background: '#f9fafb',
                                        border: '1.5px solid #e5e7eb',
                                        borderRadius: '0.5rem',
                                        padding: '0.75rem 1rem 0.75rem 2.75rem',
                                        fontSize: '0.875rem',
                                        outline: 'none',
                                        transition: 'all 0.15s'
                                    }}
                                    value={formData.username}
                                    onChange={handleChange}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = '#667eea';
                                        e.target.style.background = 'white';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#e5e7eb';
                                        e.target.style.background = '#f9fafb';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div style={{ position: 'relative' }}>
                        <Mail style={{
                            position: 'absolute',
                            left: '0.875rem',
                            top: '0.875rem',
                            color: '#9ca3af'
                        }} size={18} />
                        <input
                            name="email"
                            type="email"
                            placeholder="Email address"
                            style={{
                                width: '100%',
                                background: '#f9fafb',
                                border: '1.5px solid #e5e7eb',
                                borderRadius: '0.5rem',
                                padding: '0.75rem 1rem 0.75rem 2.75rem',
                                fontSize: '0.875rem',
                                outline: 'none',
                                transition: 'all 0.15s'
                            }}
                            value={formData.email}
                            onChange={handleChange}
                            required
                            onFocus={(e) => {
                                e.target.style.borderColor = '#667eea';
                                e.target.style.background = 'white';
                                e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = '#e5e7eb';
                                e.target.style.background = '#f9fafb';
                                e.target.style.boxShadow = 'none';
                            }}
                        />
                    </div>

                    <div style={{ position: 'relative' }}>
                        <Lock style={{
                            position: 'absolute',
                            left: '0.875rem',
                            top: '0.875rem',
                            color: '#9ca3af'
                        }} size={18} />
                        <input
                            name="password"
                            type="password"
                            placeholder="Password"
                            style={{
                                width: '100%',
                                background: '#f9fafb',
                                border: '1.5px solid #e5e7eb',
                                borderRadius: '0.5rem',
                                padding: '0.75rem 1rem 0.75rem 2.75rem',
                                fontSize: '0.875rem',
                                outline: 'none',
                                transition: 'all 0.15s'
                            }}
                            value={formData.password}
                            onChange={handleChange}
                            required
                            onFocus={(e) => {
                                e.target.style.borderColor = '#667eea';
                                e.target.style.background = 'white';
                                e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = '#e5e7eb';
                                e.target.style.background = '#f9fafb';
                                e.target.style.boxShadow = 'none';
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            fontWeight: 600,
                            padding: '0.875rem',
                            borderRadius: '0.5rem',
                            transition: 'all 0.15s',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            marginTop: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            fontSize: '0.875rem'
                        }}
                        onMouseEnter={(e) => {
                            if (!loading) {
                                e.target.style.transform = 'translateY(-1px)';
                                e.target.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                        }}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                <span>Please wait...</span>
                            </>
                        ) : (
                            isLogin ? 'Sign In' : 'Create Account'
                        )}
                    </button>
                </form>

                <div style={{
                    marginTop: '1.5rem',
                    paddingTop: '1.5rem',
                    borderTop: '1px solid #e5e7eb',
                    textAlign: 'center'
                }}>
                    <button
                        type="button"
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError(null);
                            setSuccessMsg(null);
                        }}
                        style={{
                            background: 'none',
                            color: '#667eea',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            padding: 0
                        }}
                        onMouseEnter={(e) => e.target.style.color = '#764ba2'}
                        onMouseLeave={(e) => e.target.style.color = '#667eea'}
                    >
                        {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                    </button>
                </div>
            </motion.div>

            {/* Demo Credentials */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                style={{
                    marginTop: '1.5rem',
                    color: 'white',
                    fontSize: '0.813rem',
                    position: 'relative',
                    zIndex: 10,
                    background: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(10px)',
                    padding: '0.625rem 1.25rem',
                    borderRadius: '9999px',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
            >
                Demo: test@example.com / password
            </motion.div>
        </div>
    );
}
