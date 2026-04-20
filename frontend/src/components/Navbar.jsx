import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Shield, BarChart3, Stethoscope, User, Settings } from 'lucide-react';
import logo from '../assets/logo.png';

const Navbar = ({ activeTab, setActiveTab }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Get role-specific display info
    const getRoleDisplay = () => {
        if (!user) return { label: 'Guest', sub: 'Not logged in' };
        
        switch (user.role) {
            case 'Administrator':
                return { label: 'Administrator', sub: 'System Admin' };
            case 'Analyst':
                return { label: 'Analyst', sub: 'Data Analyst' };
            case 'Clinician':
                return { label: 'Clinician', sub: 'Healthcare Provider' };
            default:
                return { label: user.role, sub: 'User' };
        }
    };

    const getRoleIcon = () => {
        if (!user) return null;
        
        switch (user.role) {
            case 'Administrator':
                return <Shield className="w-4 h-4 text-indigo-400" />;
            case 'Analyst':
                return <BarChart3 className="w-4 h-4 text-emerald-400" />;
            case 'Clinician':
                return <Stethoscope className="w-4 h-4 text-rose-400" />;
            default:
                return null;
        }
    };

    const roleDisplay = getRoleDisplay();

    const handleProfileClick = () => {
        navigate('/profile');
    };

    return (
        <nav className="bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between sticky top-0 z-50">
            {/* LOGO SECTION */}
            <div className="flex items-center gap-3">
                <img 
                    src={logo} 
                    alt="Trust Diabetes Logo" 
                    className="w-15 h-15 object-contain"
                    />
                <div>
                    <h1 className="text-sm font-black text-slate-800 leading-none tracking-tighter font-avenir">
                        TRUST <span className="text-[#005FBE]">HealthCare</span>
                    </h1>

                    <p className="text-[16px] font-medium text-black uppercase tracking-widest mt-0.5 font-avenir">
                        Healthcare Registry
                    </p>
                </div>
            </div>

            {/* NAVIGATION TABS - Role-based */}
            

            {/* USER PROFILE & LOGOUT */}
            <div className="flex items-center gap-4 pl-4 border-l border-slate-100">
                <div className="text-right hidden sm:block">
                    <div className="flex items-center gap-2 justify-end">
                        {getRoleIcon()}
                        <p className="text-[16px] font-medium font-avenir hidden md:inline">{roleDisplay.label}</p>
                    </div>
                    <p className="text-[16px] font-medium font-avenir hidden md:inline">{roleDisplay.sub}</p>
                </div>
                
                {/* Logout Button */}
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-red-50 text-black hover:text-red-600 rounded-lg transition-colors group font-display-medium"
                    title="Logout"
                >
                    <LogOut className="w-4 h-4" />
                    <span className="text-[18px] font-medium font-avenir hidden md:inline">Logout</span>
                </button>
                
                <div className="w-9 h-9 bg-slate-100 rounded-full border border-slate-200 flex items-center justify-center text-black cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-colors relative group">
                    👤
                    {/* Dropdown Menu */}
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                        
                        <button
                            onClick={handleProfileClick}
                            className="w-full px-4 py-3 text-left text-sm font-medium font-avenir text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2 rounded-t-xl transition-colors"
                        >
                            <User className="w-4 h-4" />
                            Account Settings
                        </button>

                        <button
                            onClick={handleLogout}
                            className="w-full px-4 py-3 text-left text-sm font-medium font-avenir text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-b-xl transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>

                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;


