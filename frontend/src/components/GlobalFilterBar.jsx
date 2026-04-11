import React, { useState, useEffect } from 'react';
import axios from 'axios';

// --- HELPER COMPONENTS ---
const FilterItem = ({ label, children }) => (
    <div className="flex flex-col gap-1 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
        <label className="text-[11px] font-black text-black uppercase tracking-tighter font-electronic-bold">{label}</label>
        {children}
    </div>
);

const FilterSelect = ({ label, value, onChange, options }) => (
    <FilterItem label={label}>
        <select 
            value={value} 
            onChange={(e) => onChange(e.target.value)}
            className="bg-transparent border-none text-[13px] font-bold text-black outline-none cursor-pointer appearance-none w-full font-electronic-bold"
        >
            {options && options.length > 0 ? (
                options.map(opt => <option key={opt} value={opt}>{opt}</option>)
            ) : (
                <option disabled>Loading...</option>
            )}
        </select>
    </FilterItem>
);

// --- MAIN COMPONENT ---
const GlobalFilterBar = ({ filters, setFilters, onSearch, isSearching, onDownloadCSV, onDownloadPDF }) => {
    const [draftFilters, setDraftFilters] = useState(filters);
    const [options, setOptions] = useState({
        consultants: ['All Consultants'],
        sites: ['All Sites'],
        clinics: ['All Clinics'],
        diabetes: ['All Statuses', 'Diabetic', 'Probable Diabetic', 'Normal'],
        control: ['All Categories', 'Controlled', 'Moderately Controlled', 'Uncontrolled'],
        cholesterol: ['All Levels', 'Normal', 'Borderline', 'High'],
        gender: ['All Genders', 'Male', 'Female'],
        age: ['All Ages', '30-40', '41-50', '51-60', '61-70', '71+']
    });

    useEffect(() => {
        setDraftFilters(filters);
    }, [filters]);

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const token = localStorage.getItem('token');
                const userRole = localStorage.getItem('userRole');
                
                const res = await axios.get('http://localhost:5000/api/filters/options', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.data) {
                    const userRole = localStorage.getItem('userRole');
                    
                    // For Administrator: include "All Sites" option
                    // For Analyst/Clinician: don't include "All Sites"
                    const sitesList = userRole === 'Administrator' 
                        ? ['All Sites', ...(res.data.sites || [])]
                        : res.data.sites || [];
                    
                    const clinicsList = userRole === 'Administrator'
                        ? ['All Clinics', ...(res.data.clinics || [])]
                        : res.data.clinics || [];
                    
                    setOptions(prev => ({
                        ...prev,
                        ...res.data,
                        consultants: ['All Consultants', ...(res.data.consultants || [])],
                        sites: sitesList,
                        clinics: clinicsList
                    }));
                    
                    // For non-Administrator users, default to first site (no "All Sites" option)
                    let initialSite;
                    let initialClinic;
                    if (userRole && userRole !== 'Administrator') {
                        initialSite = res.data.sites?.[0] || '';
                        initialClinic = res.data.clinics?.[0] || '';
                    } else {
                        initialSite = 'All Sites';
                        initialClinic = 'All Clinics';
                    }
                    const initialConsultant = 'All Consultants';

                    // Update draft filters with the new defaults from the DB
                    setDraftFilters(prev => {
                        const newFilters = {
                            ...prev,
                            site: initialSite,
                            clinic: initialClinic,
                            consultant: initialConsultant
                        };
                        // Trigger an initial search if this is the first load
                        if (onSearch) onSearch(newFilters);
                        return newFilters;
                    });
                }
            } catch (err) {
                console.error("Failed to load filters:", err);
            }
        };

        fetchOptions();
    }, []); // Only run once on mount

    const updateDraftFilter = (key, value) => {
        setDraftFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleSearchClick = () => {
        if (onSearch) onSearch(draftFilters);
    };

    const handleReset = () => {
        const userRole = localStorage.getItem('userRole');
        
        // Reset to initial state: first allotted site, all other filters cleared
        let resetFilters = {
            searchTerm: '',
            startDate: '',
            endDate: '',
            consultant: 'All Consultants',
            diabetes: 'All Statuses',
            control: 'All Categories',
            cholesterol: 'All Levels',
            gender: 'All Genders',
            age: 'All Ages'
        };
        
        // For non-admin users, reset to their first allotted site
        if (userRole && userRole !== 'Administrator') {
            resetFilters.site = options.sites?.[0] || '';
            resetFilters.clinic = options.clinics?.[0] || '';
        } else {
            resetFilters.site = 'All Sites';
            resetFilters.clinic = 'All Clinics';
        }
        
        setDraftFilters(resetFilters);
        if (onSearch) onSearch(resetFilters);
    };

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-2xl">
                    <span className="absolute inset-y-0 left-4 flex items-center text-black">🔍</span>
                    <input 
                        type="text" 
                        placeholder="Search patients by name or UHID..." 
                        className="w-full bg-white border border-slate-300 rounded-xl py-3.5 pl-12 text-sm font-medium text-black shadow-lg shadow-slate-200/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all duration-300"
                        value={draftFilters.searchTerm || ''}
                        onChange={(e) => updateDraftFilter('searchTerm', e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={handleSearchClick}
                        disabled={isSearching}
                        className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-[12px] font-black uppercase tracking-wider hover:bg-emerald-700 disabled:opacity-50 font-display-bold"
                    >
                        {isSearching ? 'Searching...' : 'Search'}
                    </button>
                    <button 
                        onClick={handleReset}
                        className="bg-amber-500 text-white px-4 py-2 rounded-lg text-[12px] font-black uppercase hover:bg-amber-600 font-display-bold"
                    >
                        Reset
                    </button>
                    <button onClick={onDownloadPDF} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-[12px] font-black uppercase font-display-bold">PDF</button>
                    <button onClick={onDownloadCSV} className="bg-white border border-slate-200 text-black px-4 py-2 rounded-lg text-[12px] font-black uppercase font-display-bold">CSV</button>
                </div>
            </div>

            {/* Change the grid definition to allow for custom spans */}
<div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-16 gap-3">
    
    {/* Standard Size (1 Span) */}
    <div className="lg:col-span-2">
        <FilterItem label="START DATE">
            <input type="date" value={draftFilters.startDate || ''} onChange={(e) => updateDraftFilter('startDate', e.target.value)} className="w-full bg-transparent outline-none text-[13px] font-bold text-slate-700 font-electronic-bold" />
        </FilterItem>
    </div>
    <div className="lg:col-span-2">
        <FilterItem label="END DATE">
            <input type="date" value={draftFilters.endDate || ''} onChange={(e) => updateDraftFilter('endDate', e.target.value)} className="w-full bg-transparent outline-none text-[13px] font-bold text-slate-700 font-electronic-bold" />
        </FilterItem>
    </div>

    {/* Increased Size (2 Spans each) */}
    <div className="lg:col-span-2">
        <FilterSelect label="CONSULTANT" value={draftFilters.consultant} onChange={(v) => updateDraftFilter('consultant', v)} options={options.consultants} />
    </div>
    <div className="lg:col-span-2">
        <FilterSelect label="SITE" value={draftFilters.site} onChange={(v) => updateDraftFilter('site', v)} options={options.sites} />
    </div>
    <div className="lg:col-span-2">
        <FilterSelect label="CLINIC" value={draftFilters.clinic} onChange={(v) => updateDraftFilter('clinic', v)} options={options.clinics} />
    </div>

    {/* Decreased/Standard Size (1 Span each) */}
    <div className="lg:col-span-2">
        <FilterSelect label="DIABETES" value={draftFilters.diabetes} onChange={(v) => updateDraftFilter('diabetes', v)} options={options.diabetes} />
    </div>
    <div className="lg:col-span-2">
        <FilterSelect label="CONTROL" value={draftFilters.control} onChange={(v) => updateDraftFilter('control', v)} options={options.control} />
    </div>
    <div className="lg:col-span-1">
        <FilterSelect label="GENDER" value={draftFilters.gender} onChange={(v) => updateDraftFilter('gender', v)} options={options.gender} />
    </div>
    <div className="lg:col-span-1">
        <FilterSelect label="AGE" value={draftFilters.age} onChange={(v) => updateDraftFilter('age', v)} options={options.age} />
    </div>
</div>
        </div>
    );
};

export default GlobalFilterBar;
