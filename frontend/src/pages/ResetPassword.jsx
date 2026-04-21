import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
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
        { test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p), message: 'One special character' }
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

        if (newPassword !== confirmPassword) {
            setErrors({ confirmPassword: 'Passwords do not match' });
            return;
        }

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

            setSuccessMessage('Password reset successfully! Redirecting...');

            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (error) {
            setErrorMessage('Failed to reset password. Try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // INVALID TOKEN UI
    if (!token) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
                <div className="w-full max-w-lg text-center">

                    <img src={logo} className="w-16 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-[#1E3A8A]">
                        TRUST <span className="text-indigo-400">HealthCare</span>
                    </h1>

                    <div className="bg-[#F8FAFC] shadow-[0_12px_40px_rgba(30,58,138,0.18)] rounded-2xl p-10 mt-6">

                        <p className="text-red-500 mb-6">
                            Invalid or expired reset link
                        </p>

                        <button
                            onClick={() => navigate('/login')}
                            className="w-full bg-[#1E3A8A] text-white py-3 rounded-lg font-semibold"
                        >
                            Back to Login
                        </button>

                    </div>
                </div>
            </div>
        );
    }

    // MAIN RESET FORM
    return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
            <div className="w-full max-w-lg text-center">

                <img src={logo} className="w-16 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-[#1E3A8A]">
                    TRUST <span className="text-indigo-400">HealthCare</span>
                </h1>
                <p className="text-gray-500 mb-8">Healthcare Registry System</p>

                <div className="bg-[#F8FAFC] shadow-[0_12px_40px_rgba(30,58,138,0.18)] rounded-2xl p-10">

                    <h2 className="text-xl font-semibold mb-6">Reset Password</h2>

                    {successMessage && (
                        <p className="text-green-600 text-sm mb-3">{successMessage}</p>
                    )}

                    {errorMessage && (
                        <p className="text-red-500 text-sm mb-3">{errorMessage}</p>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">

                        <div>
                            <label className="block text-sm text-gray-600 mb-2">
                                New Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    className="w-full px-5 py-3 border rounded-lg focus:ring-2 focus:ring-[#1E3A8A]"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                                >
                                    {showPassword ? 'Hide' : 'Show'}
                                </button>
                            </div>

                            <div className="mt-3 bg-gray-100 rounded-lg p-3">
                                <p className="text-xs text-gray-500 mb-2">Password must contain:</p>
                                <ul className="text-xs space-y-1">
                                    {passwordRules.map((rule, index) => (
                                        <li key={index} className={rule.test(newPassword) ? 'text-green-600' : 'text-gray-400'}>
                                            {rule.message}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {errors.password && (
                                <p className="text-red-500 text-xs mt-2">{errors.password}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm text-gray-600 mb-2">
                                Confirm Password
                            </label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm password"
                                className="w-full px-5 py-3 border rounded-lg focus:ring-2 focus:ring-[#1E3A8A]"
                            />
                            {errors.confirmPassword && (
                                <p className="text-red-500 text-xs mt-2">{errors.confirmPassword}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-[#1E3A8A] text-white py-3 rounded-lg font-semibold"
                        >
                            {isLoading ? 'Resetting...' : 'Reset Password'}
                        </button>

                    </form>

                    <button
                        onClick={() => navigate('/login')}
                        className="mt-4 text-sm text-gray-500 hover:text-[#1E3A8A]"
                    >
                        Back to Login
                    </button>

                </div>
            </div>
        </div>
    );
};

export default ResetPassword;