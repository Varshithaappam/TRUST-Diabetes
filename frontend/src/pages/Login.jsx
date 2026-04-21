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

    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
    const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
    const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
    const [forgotPasswordError, setForgotPasswordError] = useState('');

    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

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
            setForgotPasswordError('Please enter your email');
            setForgotPasswordLoading(false);
            return;
        }

        try {
            await axios.post('http://localhost:5000/api/auth/forgot-password', {
                email: forgotPasswordEmail
            });
            setForgotPasswordSuccess(true);
        } catch (err) {
            setForgotPasswordError('Something went wrong. Try again.');
        }

        setForgotPasswordLoading(false);
    };

    const handleBackToLogin = () => {
        setShowForgotPassword(false);
        setForgotPasswordSuccess(false);
        setForgotPasswordEmail('');
        setForgotPasswordError('');
    };

    // ---------------- FORGOT PASSWORD ----------------
    if (showForgotPassword) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
                <div className="w-full max-w-lg text-center">

                    <img src={logo} className="w-16 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-[#1E3A8A]">
                        TRUST <span className="text-indigo-400">HealthCare</span>
                    </h1>
                    <p className="text-gray-500 mb-8">Healthcare Registry System</p>

                    <div className="bg-[#F8FAFC] shadow-[0_12px_40px_rgba(30,58,138,0.18)] rounded-2xl p-10">

                        <h2 className="text-xl font-semibold mb-4">Reset Password</h2>
                        <p className="text-sm text-gray-500 mb-6">
                            Enter your email to receive reset link
                        </p>

                        {forgotPasswordSuccess ? (
                            <>
                                <p className="text-green-600 text-sm mb-4">
                                    Reset link sent successfully!
                                </p>

                                <button
                                    onClick={handleBackToLogin}
                                    className="w-full bg-[#1E3A8A] text-white py-3 rounded-lg font-semibold"
                                >
                                    Back to Login
                                </button>
                            </>
                        ) : (
                            <form onSubmit={handleForgotPassword} className="space-y-6">

                                {forgotPasswordError && (
                                    <p className="text-red-500 text-sm">{forgotPasswordError}</p>
                                )}

                                <input
                                    type="email"
                                    value={forgotPasswordEmail}
                                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                                    placeholder="Enter email"
                                    className="w-full px-5 py-3 border rounded-lg focus:ring-2 focus:ring-[#1E3A8A]"
                                />

                                <button
                                    type="submit"
                                    className="w-full bg-[#1E3A8A] text-white py-3 rounded-lg font-semibold"
                                >
                                    {forgotPasswordLoading ? 'Sending...' : 'Send Reset Link'}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleBackToLogin}
                                    className="text-sm text-gray-500"
                                >
                                    Back to Login
                                </button>

                            </form>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ---------------- LOGIN ----------------
    return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
            <div className="w-full max-w-lg text-center">

                <img src={logo} className="w-16 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-[#1E3A8A]">
                    TRUST <span className="text-indigo-400">HealthCare</span>
                </h1>
                <p className="text-gray-500 mb-8">Healthcare Registry System</p>

                <div className="bg-[#F8FAFC] shadow-[0_12px_40px_rgba(30,58,138,0.18)] rounded-2xl p-10">

                    <h2 className="text-xl font-semibold mb-6">Sign In</h2>

                    {error && (
                        <p className="text-red-500 text-sm mb-3">{error}</p>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">

                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email"
                            className="w-full px-5 py-3 border rounded-lg focus:ring-2 focus:ring-[#1E3A8A]"
                        />

                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            className="w-full px-5 py-3 border rounded-lg focus:ring-2 focus:ring-[#1E3A8A]"
                        />

                        <button
                            type="submit"
                            className="w-full bg-[#1E3A8A] text-white py-3 rounded-lg font-semibold"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>

                    </form>

                    <button
                        onClick={() => setShowForgotPassword(true)}
                        className="mt-4 text-sm text-gray-500 hover:text-[#1E3A8A]"
                    >
                        Forgot Password?
                    </button>

                </div>
            </div>
        </div>
    );
};

export default Login;