import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
    Users, Check, X, UserPlus, Search, 
    MapPin, Building2, Phone, Mail, User, 
    ChevronDown, Plus, Trash2, Globe
} from 'lucide-react';

// ============================================
// COMPONENT: Searchable Multi-Select Dropdown
// ============================================
const MultiSelectDropdown = ({ label, options = [], selected = [], onChange, placeholder = 'Search...', loading = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef(null);

    const filteredOptions = options.filter(opt => 
        (opt.site_name || opt.clinic_name || '').toLowerCase().includes(search.toLowerCase())
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
                                const id = opt.site_id || opt.clinic_id;
                                const name = opt.site_name || opt.clinic_name;
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

    const [formData, setFormData] = useState({
        suffix: '', firstName: '', lastName: '', email: '', password: '',
        role: 'Clinician', gender: 'Male', siteIds: [], clinicIds: []
    });

    // 1. Initial Load: Fetch Users and available Sites
    useEffect(() => {
        if (token) fetchInitialData();
    }, [token]);

    // 2. DEPENDENT DROPDOWN LOGIC: Fetch clinics when site selection changes
    // Replace your existing useEffect for clinics with this:
useEffect(() => {
    const controller = new AbortController();

    const fetchFilteredClinics = async () => {
        if (!token) return;
        
        // 1. Check if siteIds exists and has length
        if (!formData.siteIds || !Array.isArray(formData.siteIds) || formData.siteIds.length === 0) {
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

            // 2. Ensure we only send valid strings
            const cleanIds = formData.siteIds.filter(id => id && typeof id === 'string');
            const siteIdsParam = cleanIds.join(',');
            
            if (!siteIdsParam) {
                setLoadingClinics(false);
                return;
            }

            const response = await axios.get(`http://localhost:5000/api/users/clinics?siteIds=${siteIdsParam}`, config);
            
            // 3. Update state with returned data
            const fetchedClinics = response.data || [];
            setClinics(fetchedClinics);

            // 4. Auto-remove clinics that no longer belong to selected sites
            const validClinicIds = fetchedClinics.map(c => c.clinic_id);
            setFormData(prev => ({
                ...prev,
                clinicIds: prev.clinicIds.filter(id => validClinicIds.includes(id))
            }));
        } catch (err) {
            if (!axios.isCancel(err)) {
                console.error("Error fetching filtered clinics", err);
                setClinics([]);
            }
        } finally {
            setLoadingClinics(false);
        }
    };

    fetchFilteredClinics();
    return () => controller.abort(); 
}, [formData.siteIds, token]);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            // Filter clinicIds to only include valid clinics that belong to selected sites
            const validClinicIds = formData.clinicIds.filter(id => 
                clinics.some(c => c.clinic_id === id)
            );
            
            // Filter siteIds to only include valid sites
            const validSiteIds = formData.siteIds.filter(id => 
                sites.some(s => s.site_id === id)
            );
            
            const submitData = {
                ...formData,
                siteIds: validSiteIds,
                clinicIds: validClinicIds
            };
            
            await axios.post('http://localhost:5000/api/users', submitData, config);
            alert("User Created Successfully");
            
            // Reset Form
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

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            {/* Tab Navigation */}
            <div className="flex gap-4 mb-8 bg-white p-2 rounded-2xl shadow-sm w-fit">
                <button 
                    onClick={() => setActiveTab('list')} 
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'list' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    Users List
                </button>
                <button 
                    onClick={() => setActiveTab('add')} 
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'add' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    Add User
                </button>
            </div>

            {activeTab === 'list' ? (
                <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-gray-100">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">User Details</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Role & Gender</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Assigned Locations</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">{user.suffix} {user.first_name} {user.last_name}</div>
                                        <div className="text-xs text-gray-500">{user.email}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold mr-2">{user.role}</span>
                                        <span className="text-gray-400 text-xs italic">{user.gender}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {user.sites?.map(s => <span key={s.site_id} className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-[10px] font-medium border border-green-100">{s.site_name}</span>)}
                                            {user.clinics?.map(c => <span key={c.clinic_id} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium border border-blue-100">{c.clinic_name}</span>)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold">
                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                            {user.status}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column: Personal Info */}
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
                                <input type="email" placeholder="Email Address" required className="p-3 bg-gray-50 border rounded-xl text-sm" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}/>
                                <input type="password" placeholder="Password" required className="p-3 bg-gray-50 border rounded-xl text-sm" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}/>
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

                        {/* Right Column: Access Management */}
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
                            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <Globe className="w-6 h-6 text-indigo-600" /> Access & Mappings
                            </h3>
                            
                            <MultiSelectDropdown 
                                label="Assign Sites" 
                                options={sites} 
                                selected={formData.siteIds} 
                                onChange={ids => setFormData({...formData, siteIds: ids})}
                                placeholder="Select Sites..."
                            />
                            
                            <MultiSelectDropdown 
                                label="Assign Clinics" 
                                options={clinics} 
                                selected={formData.clinicIds} 
                                onChange={ids => setFormData({...formData, clinicIds: ids})}
                                placeholder={formData.siteIds.length === 0 ? "Select Sites first..." : "Select Clinics..."}
                                loading={loadingClinics}
                            />
                            
                            <div className="mt-auto pt-8">
                                <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                                    <Plus className="w-5 h-5" /> Save User Profile
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            )}
        </div>
    );
};

export default UserManagement;