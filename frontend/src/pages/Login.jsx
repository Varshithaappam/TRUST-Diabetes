import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import logo from '../assets/logo.png';


const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Forgot password state
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
    const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
    const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
    const [forgotPasswordError, setForgotPasswordError] = useState('');
    
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || '/';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!email || !password) {
            setError('Please enter both email and password');
            setLoading(false);
            return;
        }

        const result = await login(email, password);
        
        if (result.success) {
            navigate('/dashboard', { replace: true });
        } else {
            setError(result.error);
        }
        
        setLoading(false);
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setForgotPasswordError('');
        setForgotPasswordLoading(true);

        if (!forgotPasswordEmail) {
            setForgotPasswordError('Please enter your email address');
            setForgotPasswordLoading(false);
            return;
        }

        try {
            await axios.post('http://localhost:5000/api/auth/forgot-password', {
                email: forgotPasswordEmail
            });
            setForgotPasswordSuccess(true);
        } catch (err) {
            setForgotPasswordError(err.response?.data?.message || 'Failed to process request. Please try again.');
        }

        setForgotPasswordLoading(false);
    };

    const handleBackToLogin = () => {
        setShowForgotPassword(false);
        setForgotPasswordSuccess(false);
        setForgotPasswordError('');
        setForgotPasswordEmail('');
    };

    // Render forgot password form
    if (showForgotPassword) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    {/* Logo Section */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center p-4 bg-white rounded-2xl shadow-lg mb-4">
                            <img 
                                src={logo} 
                                alt="Trust Diabetes Logo" 
                                className="w-16 h-16 object-contain"
                            />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight">
                            TRUST <span className="text-indigo-400">HealthCare</span>
                        </h1>
                        <p className="text-slate-400 mt-2 font-medium">Healthcare Registry System</p>
                    </div>

                    {/* Forgot Password Card */}
                    <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/10">
                        <h2 className="text-xl font-bold text-white mb-2 text-center">Reset Password</h2>
                        <p className="text-slate-400 text-sm mb-6 text-center">
                            Enter your email address and we'll send you a link to reset your password.
                        </p>

                        {forgotPasswordSuccess ? (
                            <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                                <p className="text-green-400 text-sm text-center font-medium">
                                    Password reset link has been sent to your email!
                                </p>
                                <button
                                    onClick={handleBackToLogin}
                                    className="w-full mt-4 py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all"
                                >
                                    Back to Sign In
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleForgotPassword} className="space-y-5">
                                {forgotPasswordError && (
                                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                        <p className="text-red-400 text-sm text-center font-medium">{forgotPasswordError}</p>
                                    </div>
                                )}

                                <div>
                                    <label htmlFor="forgotEmail" className="block text-sm font-medium text-slate-300 mb-2">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        id="forgotEmail"
                                        value={forgotPasswordEmail}
                                        onChange={(e) => setForgotPasswordEmail(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                        placeholder="Enter your email"
                                        autoComplete="email"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={forgotPasswordLoading}
                                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {forgotPasswordLoading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Sending...
                                        </span>
                                    ) : (
                                        'Send Reset Link'
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleBackToLogin}
                                    className="w-full py-2 text-slate-400 hover:text-white font-medium transition-colors"
                                >
                                    Back to Sign In
                                </button>
                            </form>
                        )}
                    </div>

                    <p className="text-center text-slate-500 text-sm mt-6">
                        © 2026 TRUST Diabetes Healthcare System
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo Section */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center p-4 bg-white rounded-2xl shadow-lg mb-4">
                        <img 
                            src={logo} 
                            alt="Trust Diabetes Logo" 
                            className="w-16 h-16 object-contain"
                        />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">
                        TRUST <span className="text-indigo-400">HealthCare</span>
                    </h1>
                    <p className="text-slate-400 mt-2 font-medium">Healthcare Registry System</p>
                </div>

                {/* Login Card */}
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/10">
                    <h2 className="text-xl font-bold text-white mb-6 text-center">Sign In</h2>
                    
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <p className="text-red-400 text-sm text-center font-medium">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                placeholder="Enter your email"
                                autoComplete="email"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                placeholder="Enter your password"
                                autoComplete="current-password"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Signing in...
                                </span>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    <div className="mt-4 text-center">
                        <button
                            type="button"
                            onClick={() => setShowForgotPassword(true)}
                            className="text-sm text-slate-400 hover:text-indigo-400 font-medium transition-colors"
                        >
                            Forgot Password?
                        </button>
                    </div>
                </div>

                <p className="text-center text-slate-500 text-sm mt-6">
                    © 2026 TRUST Diabetes Healthcare System
                </p>
            </div>
        </div>
    );
};

export default Login;
