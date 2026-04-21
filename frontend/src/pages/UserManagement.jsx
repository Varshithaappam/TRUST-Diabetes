import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
    Users, Check, X, UserPlus, Search, 
    MapPin, Building2, Phone, Mail, User, 
    ChevronDown, Plus, Globe, UserCheck, UserX, Pencil
} from 'lucide-react';
import AddHospitalForm from './AddHospital';
import AddSiteForm from './AddSite';
import AddClinicForm from './AddClinic';
import Toast from '../components/Toast';

// ============================================
// COMPONENT: Searchable Multi-Select Dropdown
// ============================================
const MultiSelectDropdown = ({ 
    label, 
    options = [], 
    selected = [], 
    onChange, 
    placeholder = 'Search...', 
    loading = false,
    idKey,
    labelKey
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef(null);

    const filteredOptions = options.filter(opt => 
        (opt[labelKey] || '').toLowerCase().includes(search.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (id) => {
        const nextSelected = selected.includes(id) 
            ? selected.filter(item => item !== id) 
            : [...selected, id];
        onChange(nextSelected);
    };

    return (
        <div className="relative mb-4" ref={wrapperRef}>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">{label}</label>
            <div 
                onClick={() => !loading && setIsOpen(!isOpen)}
                className={`w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex justify-between items-center cursor-pointer hover:border-indigo-300 transition-all ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <span className="text-sm text-gray-600">
                    {loading ? 'Loading...' : selected.length > 0 ? `${selected.length} selected` : placeholder}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-hidden flex flex-col">
                    <div className="p-2 border-b">
                        <input 
                            type="text"
                            className="w-full px-3 py-2 text-sm bg-gray-50 rounded-lg focus:outline-none"
                            placeholder="Type to filter..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="overflow-y-auto">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(opt => {
                                const id = opt[idKey];
                                const name = opt[labelKey];
                                return (
                                    <div 
                                        key={id}
                                        onClick={() => toggleOption(id)}
                                        className="px-4 py-2 hover:bg-indigo-50 flex items-center justify-between cursor-pointer"
                                    >
                                        <span className="text-sm">{name}</span>
                                        {selected.includes(id) && <Check className="w-4 h-4 text-indigo-600" />}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="px-4 py-3 text-xs text-gray-400 text-center italic">No options available</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================
// COMPONENT: Main User Management
// ============================================
const UserManagement = () => {
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState('list');
    const [users, setUsers] = useState([]);
    const [sites, setSites] = useState([]);
    const [clinics, setClinics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingClinics, setLoadingClinics] = useState(false);
    
    // Toast state
    const [toast, setToast] = useState(null);
    
    // Edit modal state
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [editFormData, setEditFormData] = useState({
        suffix: '', firstName: '', lastName: '', email: '', password: '',
        role: 'Clinician', gender: 'Male', status: 'active', siteIds: [], clinicIds: []
    });

    const [formData, setFormData] = useState({
        suffix: '', firstName: '', lastName: '', email: '', password: '',
        role: 'Clinician', gender: 'Male', siteIds: [], clinicIds: []
    });

    useEffect(() => {
        if (token) fetchInitialData();
    }, [token]);

    useEffect(() => {
        const controller = new AbortController();
        const fetchFilteredClinics = async () => {
            if (!token) return;
            if (!formData.siteIds || formData.siteIds.length === 0) {
                setClinics([]);
                setFormData(prev => ({ ...prev, clinicIds: [] }));
                return;
            }

            setLoadingClinics(true);
            try {
                const config = { 
                    headers: { Authorization: `Bearer ${token}` },
                    signal: controller.signal 
                };
                const siteIdsParam = formData.siteIds.join(',');
                const response = await axios.get(`http://localhost:5000/api/users/clinics?siteIds=${siteIdsParam}`, config);
                const fetchedClinics = response.data || [];
                setClinics(fetchedClinics);

                const validClinicIds = fetchedClinics.map(c => c.clinic_id);
                setFormData(prev => ({
                    ...prev,
                    clinicIds: prev.clinicIds.filter(id => validClinicIds.includes(id))
                }));
            } catch (err) {
                if (!axios.isCancel(err)) setClinics([]);
            } finally {
                setLoadingClinics(false);
            }
        };
        fetchFilteredClinics();
        return () => controller.abort(); 
    }, [formData.siteIds, token]);

    // Fetch clinics for edit modal
    const [editClinics, setEditClinics] = useState([]);
    const [loadingEditClinics, setLoadingEditClinics] = useState(false);
    
    useEffect(() => {
        const controller = new AbortController();
        const fetchEditClinics = async () => {
            if (!token || !editModalOpen) return;
            if (!editFormData.siteIds || editFormData.siteIds.length === 0) {
                setEditClinics([]);
                return;
            }

            setLoadingEditClinics(true);
            try {
                const config = { 
                    headers: { Authorization: `Bearer ${token}` },
                    signal: controller.signal 
                };
                const siteIdsParam = editFormData.siteIds.join(',');
                const response = await axios.get(`http://localhost:5000/api/users/clinics?siteIds=${siteIdsParam}`, config);
                const fetchedClinics = response.data || [];
                setEditClinics(fetchedClinics);
            } catch (err) {
                if (!axios.isCancel(err)) setEditClinics([]);
            } finally {
                setLoadingEditClinics(false);
            }
        };
        fetchEditClinics();
        return () => controller.abort(); 
    }, [editFormData.siteIds, token, editModalOpen]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const [uRes, sRes] = await Promise.all([
                axios.get('http://localhost:5000/api/users/with-mappings', config),
                axios.get('http://localhost:5000/api/users/sites', config)
            ]);
            setUsers(uRes.data.users || []);
            setSites(sRes.data || []);
        } catch (err) {
            console.error("Initialization error", err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (userId, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'deactive' : 'active';
        const confirmMsg = `Are you sure you want to ${newStatus === 'active' ? 're-activate' : 'deactivate'} this user?`;
        
        if (!window.confirm(confirmMsg)) return;

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.patch(`http://localhost:5000/api/users/${userId}/status`, { status: newStatus }, config);
            setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
        } catch (err) {
            alert("Failed to update user status.");
        }
    };

    const handleEditUser = (user) => {
        // Pre-populate form with user's current data
        const userSiteIds = user.sites?.map(s => s.site_id) || [];
        const userClinicIds = user.clinics?.map(c => c.clinic_id) || [];
        
        setEditingUser(user);
        setEditFormData({
            suffix: user.suffix || '',
            firstName: user.first_name || '',
            lastName: user.last_name || '',
            email: user.email || '',
            password: '', // Empty - will keep current password if not changed
            role: user.role || 'Clinician',
            gender: user.gender || 'Male',
            status: user.status || 'active',
            siteIds: userSiteIds,
            clinicIds: userClinicIds
        });
        setEditModalOpen(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            // Only include password if it was changed (non-empty)
            const payload = { ...editFormData };
            if (!payload.password) {
                delete payload.password;
            }
            
            await axios.put(`http://localhost:5000/api/users/${editingUser.id}`, payload, config);
            alert("User Updated Successfully");
            setEditModalOpen(false);
            setEditingUser(null);
            fetchInitialData();
        } catch (err) {
            alert(err.response?.data?.message || "Error updating user");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.post('http://localhost:5000/api/users', formData, config);
            alert("User Created Successfully");
            setFormData({ 
                suffix: '', firstName: '', lastName: '', email: '', password: '', 
                role: 'Clinician', gender: 'Male', siteIds: [], clinicIds: []
            });
            setActiveTab('list');
            fetchInitialData();
        } catch (err) {
            alert(err.response?.data?.message || "Error creating user");
        }
    };

    // Render the appropriate content based on active tab
    const renderContent = () => {
        switch (activeTab) {
            case 'list':
                return (
                    <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-gray-100">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-black-400 uppercase">User Details</th>
                                    <th className="px-6 py-4 text-xs font-bold text-black-400 uppercase">Role & Gender</th>
                                    <th className="px-6 py-4 text-xs font-bold text-black-400 uppercase">Assigned Locations</th>
                                    <th className="px-6 py-4 text-xs font-bold text-black-400 uppercase text-center">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-black-400 uppercase text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {users.map(user => (
                                    <tr key={user.id} className={`hover:bg-gray-50/50 transition-colors ${user.status === 'deactive' ? 'bg-gray-50/50' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className={`font-bold ${user.status === 'deactive' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                                {user.suffix} {user.first_name} {user.last_name}
                                            </div>
                                            <div className="text-xs text-gray-500">{user.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold mr-2 ${user.status === 'deactive' ? 'bg-gray-100 text-gray-400' : 'bg-indigo-50 text-indigo-700'}`}>
                                                {user.role}
                                            </span>
                                            <span className="text-gray-400 text-xs italic">{user.gender}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`flex flex-wrap gap-1 ${user.status === 'deactive' ? 'opacity-40' : ''}`}>
                                                {user.sites?.map(s => <span key={s.site_id} className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-[10px] font-medium border border-green-100">{s.site_name}</span>)}
                                                {user.clinics?.map(c => <span key={c.clinic_id} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium border border-blue-100">{c.clinic_name}</span>)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${user.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                                                {user.status === 'active' ? 'Active' : 'Deactivated'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => handleEditUser(user)}
                                                    className="p-2 rounded-xl border border-indigo-100 text-indigo-600 hover:bg-[#005FBE] hover:text-white transition-all"
                                                    title="Edit User"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleToggleStatus(user.id, user.status)}
                                                    className={`p-2 rounded-xl border transition-all ${
                                                        user.status === 'active' 
                                                        ? 'text-rose-600 border-rose-100 hover:bg-rose-600 hover:text-white' 
                                                        : 'text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white'
                                                    }`}
                                                >
                                                    {user.status === 'active' ? <UserX size={18} /> : <UserCheck size={18} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            
            case 'add':
                return (
                    <form onSubmit={handleSubmit} className="max-w-6xl mx-auto" autoComplete="off">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                    <User className="w-6 h-6 text-indigo-600" /> Basic Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex items-center gap-4">
                                        <select className="w-24 p-3 bg-gray-50 border rounded-xl text-sm" value={formData.suffix} onChange={e => setFormData({...formData, suffix: e.target.value})}>
                                            <option value="">Suffix</option>
                                            <option value="Mr.">Mr.</option>
                                            <option value="Mrs.">Mrs.</option>
                                            <option value="Ms.">Ms.</option>
                                            <option value="Dr.">Dr.</option>
                                        </select>
                                        <input placeholder="First Name" required className="flex-1 p-3 bg-gray-50 border rounded-xl text-sm" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})}/>
                                    </div>
                                    <input placeholder="Last Name" required className="p-3 bg-gray-50 border rounded-xl text-sm" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})}/>
                                    <input type="email" autoComplete="off" placeholder="Email Address" required className="p-3 bg-gray-50 border rounded-xl text-sm" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}/>
                                    <input type="password" autoComplete="off" placeholder="Password" required className="p-3 bg-gray-50 border rounded-xl text-sm" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}/>
                                    <select className="p-3 bg-gray-50 border rounded-xl text-sm" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                                        <option value="Clinician">Clinician</option>
                                        <option value="Analyst">Analyst</option>
                                        <option value="Administrator">Administrator</option>
                                    </select>
                                    <select className="p-3 bg-gray-50 border rounded-xl text-sm" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                </div>
                            </div>

                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
                                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                    <Globe className="w-6 h-6 text-indigo-600" /> Access & Mappings
                                </h3>
                                
                                <MultiSelectDropdown 
                                    label="Assign Sites" 
                                    options={sites} 
                                    idKey="site_id"
                                    labelKey="site_name"
                                    selected={formData.siteIds} 
                                    onChange={ids => setFormData({...formData, siteIds: ids})}
                                    placeholder="Select Sites..."
                                />
                                <MultiSelectDropdown 
                                    label="Assign Clinics" 
                                    options={clinics} 
                                    idKey="clinic_id"
                                    labelKey="clinic_name"
                                    selected={formData.clinicIds} 
                                    onChange={ids => setFormData({...formData, clinicIds: ids})}
                                    placeholder={formData.siteIds.length === 0 ? "Select Sites first..." : "Select Clinics..."}
                                    loading={loadingClinics}
                                />

                                <div className="mt-auto pt-8">
                                    <button type="submit" className="w-full bg-[#005FBE] text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-[#004B87] transition-all flex items-center justify-center gap-2">
                                        <Plus className="w-5 h-5" /> Save User Profile
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                );

            case 'hospital':
                return (
                    <AddHospitalForm 
                        onSuccess={() => {
                            setToast({ message: 'Hospital added successfully!', type: 'success' });
                            setActiveTab('list');
                        }} 
                        onCancel={() => setActiveTab('list')}
                    />
                );

            case 'site':
                return (
                    <AddSiteForm 
                        onSuccess={() => {
                            setToast({ message: 'Site added successfully!', type: 'success' });
                            setActiveTab('list');
                            fetchInitialData();
                        }} 
                        onCancel={() => setActiveTab('list')}
                    />
                );

            case 'clinic':
                return (
                    <AddClinicForm 
                        onSuccess={() => {
                            setToast({ message: 'Clinic added successfully!', type: 'success' });
                            setActiveTab('list');
                        }} 
                        onCancel={() => setActiveTab('list')}
                    />
                );

            default:
                return null;
        }
    };

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            {/* Tab Navigation */}
            <div className="flex gap-4 mb-8 bg-white p-2 rounded-2xl shadow-sm w-fit">
                <button 
                    onClick={() => setActiveTab('list')} 
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'list' ? 'bg-[#005FBE] text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    Users List
                </button>
                <button 
                    onClick={() => setActiveTab('add')} 
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'add' ? 'bg-[#005FBE] text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    Add User
                </button>
                <button 
                    onClick={() => setActiveTab('hospital')} 
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'hospital' ? 'bg-[#005FBE] text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    Add Hospital
                </button>
                <button 
                    onClick={() => setActiveTab('site')} 
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'site' ? 'bg-[#005FBE] text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    Add Site
                </button>
                <button 
                    onClick={() => setActiveTab('clinic')} 
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'clinic' ? 'bg-[#005FBE] text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    Add Clinic
                </button>
            </div>

            {/* Render Content */}
            {renderContent()}
            
            {/* Toast Notification */}
            {toast && (
                <Toast 
                    message={toast.message} 
                    type={toast.type} 
                    onClose={() => setToast(null)} 
                />
            )}

            {/* Edit User Modal */}
            {editModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <Pencil className="w-6 h-6 text-indigo-600" /> Edit User Profile
                                </h3>
                                <button 
                                    onClick={() => {
                                        setEditModalOpen(false);
                                        setEditingUser(null);
                                    }}
                                    className="p-2 hover:bg-gray-100 rounded-xl transition-all"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            <form onSubmit={handleEditSubmit} className="max-w-6xl mx-auto">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="lg:col-span-2 bg-gray-50 p-8 rounded-3xl border border-gray-100">
                                        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                            <User className="w-6 h-6 text-indigo-600" /> Basic Information
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="flex items-center gap-4">
                                                <select 
                                                    className="w-24 p-3 bg-white border border-gray-200 rounded-xl text-sm"
                                                    value={editFormData.suffix} 
                                                    onChange={e => setEditFormData({...editFormData, suffix: e.target.value})}
                                                >
                                                    <option value="">Suffix</option>
                                                    <option value="Mr.">Mr.</option>
                                                    <option value="Mrs.">Mrs.</option>
                                                    <option value="Ms.">Ms.</option>
                                                    <option value="Dr.">Dr.</option>
                                                </select>
                                                <input 
                                                    placeholder="First Name" 
                                                    required 
                                                    className="flex-1 p-3 bg-white border border-gray-200 rounded-xl text-sm"
                                                    value={editFormData.firstName} 
                                                    onChange={e => setEditFormData({...editFormData, firstName: e.target.value})}
                                                />
                                            </div>
                                            <input 
                                                placeholder="Last Name" 
                                                required 
                                                className="p-3 bg-white border border-gray-200 rounded-xl text-sm"
                                                value={editFormData.lastName} 
                                                onChange={e => setEditFormData({...editFormData, lastName: e.target.value})}
                                            />
                                            <input 
                                                type="email" 
                                                placeholder="Email Address" 
                                                required 
                                                disabled
                                                className="p-3 bg-gray-100 border border-gray-200 rounded-xl text-sm cursor-not-allowed"
                                                value={editFormData.email} 
                                            />
                                            <div>
                                                <input 
                                                    type="password" 
                                                    placeholder="New Password (leave empty to keep current)" 
                                                    className="p-3 bg-white border border-gray-200 rounded-xl text-sm w-full"
                                                    value={editFormData.password} 
                                                    onChange={e => setEditFormData({...editFormData, password: e.target.value})}
                                                />
                                                <p className="text-xs text-gray-400 mt-1">Leave empty to keep current password</p>
                                            </div>
                                            <select 
                                                className="p-3 bg-white border border-gray-200 rounded-xl text-sm"
                                                value={editFormData.role} 
                                                onChange={e => setEditFormData({...editFormData, role: e.target.value})}
                                            >
                                                <option value="Clinician">Clinician</option>
                                                <option value="Analyst">Analyst</option>
                                                <option value="Administrator">Administrator</option>
                                            </select>
                                            <select 
                                                className="p-3 bg-white border border-gray-200 rounded-xl text-sm"
                                                value={editFormData.gender} 
                                                onChange={e => setEditFormData({...editFormData, gender: e.target.value})}
                                            >
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                            </select>
                                            <select 
                                                className="p-3 bg-white border border-gray-200 rounded-xl text-sm"
                                                value={editFormData.status} 
                                                onChange={e => setEditFormData({...editFormData, status: e.target.value})}
                                            >
                                                <option value="active">Active</option>
                                                <option value="deactive">Deactive</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 flex flex-col">
                                        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                            <Globe className="w-6 h-6 text-indigo-600" /> Access & Mappings
                                        </h3>
                                        
                                        <MultiSelectDropdown 
                                            label="Assign Sites" 
                                            options={sites} 
                                            idKey="site_id"
                                            labelKey="site_name"
                                            selected={editFormData.siteIds} 
                                            onChange={ids => setEditFormData({...editFormData, siteIds: ids, clinicIds: []})}
                                            placeholder="Select Sites..."
                                        />
                                        <MultiSelectDropdown 
                                            label="Assign Clinics" 
                                            options={editClinics} 
                                            idKey="clinic_id"
                                            labelKey="clinic_name"
                                            selected={editFormData.clinicIds} 
                                            onChange={ids => setEditFormData({...editFormData, clinicIds: ids})}
                                            placeholder={editFormData.siteIds.length === 0 ? "Select Sites first..." : "Select Clinics..."}
                                            loading={loadingEditClinics}
                                        />

                                        <div className="mt-auto pt-8">
                                            <button 
                                                type="submit" 
                                                className="w-full bg-[#005FBE] text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-[#004B87] transition-all flex items-center justify-center gap-2"
                                            >
                                                <Plus className="w-5 h-5" /> Update User Profile
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;