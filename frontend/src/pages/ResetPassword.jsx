import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff, ArrowLeft, Lock, CheckCircle, XCircle } from 'lucide-react';
import logo from '../assets/logo.png';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');
    
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    
    // Password validation rules
    const passwordRules = [
        { test: (p) => p.length >= 8, message: 'At least 8 characters' },
        { test: (p) => /[A-Z]/.test(p), message: 'One uppercase letter' },
        { test: (p) => /[a-z]/.test(p), message: 'One lowercase letter' },
        { test: (p) => /[0-9]/.test(p), message: 'One number' },
        { test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p), message: 'One special character (!@#$%^&*)' }
    ];
    
    const validatePassword = (password) => {
        const newErrors = {};
        
        for (const rule of passwordRules) {
            if (!rule.test(password)) {
                newErrors.password = 'Password does not meet requirements';
                break;
            }
        }
        
        return newErrors;
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setErrorMessage('');
        setSuccessMessage('');
        
        // Validate passwords match
        if (newPassword !== confirmPassword) {
            setErrors({ confirmPassword: 'Passwords do not match' });
            return;
        }
        
        // Validate password strength
        const passwordErrors = validatePassword(newPassword);
        if (Object.keys(passwordErrors).length > 0) {
            setErrors(passwordErrors);
            return;
        }
        
        if (!token) {
            setErrorMessage('Invalid or missing reset token');
            return;
        }
        
        setIsLoading(true);
        
        try {
            await axios.post('http://localhost:5000/api/auth/reset-password', {
                token,
                newPassword
            });
            
            setSuccessMessage('Password reset successfully! Redirecting to login...');
            
            // Redirect to login after 2 seconds
            setTimeout(() => {
                navigate('/login');
            }, 2000);
            
        } catch (error) {
            console.error('Reset password error:', error);
            setErrorMessage(error.response?.data?.message || 'Failed to reset password. The token may have expired.');
        } finally {
            setIsLoading(false);
        }
    };
    
    // Check individual password requirements
    const checkRule = (rule) => rule.test(newPassword);
    
    // If no token in URL
    if (!token) {
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
                    
                    {/* Error Card */}
                    <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/10">
                        <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl text-center mb-6">
                            <p>Invalid reset link. Please request a new password reset.</p>
                        </div>
                        
                        <button 
                            onClick={() => navigate('/login')}
                            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            <ArrowLeft size={20} />
                            Back to Login
                        </button>
                    </div>
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
                
                {/* Reset Password Card */}
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/10">
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-500/20 rounded-full mb-4">
                            <Lock className="w-7 h-7 text-indigo-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Reset Password</h2>
                        <p className="text-slate-400 mt-2">Enter your new password below</p>
                    </div>
                    
                    {successMessage && (
                        <div className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-xl text-center mb-6">
                            {successMessage}
                        </div>
                    )}
                    
                    {errorMessage && (
                        <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl text-center mb-6">
                            {errorMessage}
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit}>
                        {/* New Password Field */}
                        <div className="mb-4">
                            <label htmlFor="newPassword" className="block text-sm font-medium text-slate-300 mb-2">
                                New Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="newPassword"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    required
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            
                            {/* Password Requirements */}
                            <div className="mt-3 bg-white/5 rounded-xl p-3">
                                <p className="text-xs text-slate-400 mb-2 font-medium">Password must contain:</p>
                                <ul className="space-y-1">
                                    {passwordRules.map((rule, index) => (
                                        <li 
                                            key={index} 
                                            className={`flex items-center gap-2 text-xs ${
                                                newPassword && rule.test(newPassword) 
                                                    ? 'text-emerald-400' 
                                                    : 'text-slate-500'
                                            }`}
                                        >
                                            {newPassword && rule.test(newPassword) ? (
                                                <CheckCircle size={14} className="text-emerald-400" />
                                            ) : (
                                                <XCircle size={14} />
                                            )}
                                            {rule.message}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            
                            {errors.password && (
                                <p className="text-red-400 text-xs mt-2">{errors.password}</p>
                            )}
                        </div>
                        
                        {/* Confirm Password Field */}
                        <div className="mb-6">
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">
                                Confirm Password
                            </label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                required
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                            {errors.confirmPassword && (
                                <p className="text-red-400 text-xs mt-2">{errors.confirmPassword}</p>
                            )}
                        </div>
                        
                        {/* Submit Button */}
                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Resetting...
                                </>
                            ) : (
                                <>
                                    <Lock size={20} />
                                    Reset Password
                                </>
                            )}
                        </button>
                        
                        {/* Back to Login Link */}
                        <div className="mt-6 text-center">
                            <Link 
                                to="/login" 
                                className="text-indigo-400 hover:text-indigo-300 text-sm font-medium inline-flex items-center gap-1"
                            >
                                <ArrowLeft size={16} />
                                Back to Login
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;