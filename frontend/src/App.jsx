import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import GlobalFilterBar from './components/GlobalFilterBar';
import SummaryCards from './components/SummaryCards';
import PatientRegistry from './pages/PatientRegistry';
import DashboardOverview from './pages/DashboardOverview';
import PredictiveDashboard from './pages/PredictiveDashboard';
import AIAnalyst from './components/AIAnalyst';
import UserManagement from './pages/UserManagement';
import Login from './pages/Login';
import ProfileSettings from './pages/ProfileSettings';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoutes';
import { fetchRegistry } from './services/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Main Dashboard Component with role-based navigation
 */
const Dashboard = () => {
    const { user, hasRole } = useAuth();
    
    // Current Active Tab
    const [activeTab, setActiveTab] = useState('REGISTRY');
    
    // THE GLOBAL STATE - Persistent across all tabs
    // Default: No date filter to show all patients
    const [globalFilters, setGlobalFilters] = useState({
        startDate: '',
        endDate: '',
        consultant: 'All Consultants',
        site: 'All Sites',
        clinic: 'All Clinics',
        diabetes: 'All Statuses',
        control: 'All Categories',
        cholesterol: 'All Levels',
        gender: 'All Genders',
        age: 'All Ages',
        searchTerm: ''
    });

    // APPLIED FILTERS - Only updated when Search button is clicked
    // This is what triggers data fetching in child components
    const [appliedFilters, setAppliedFilters] = useState({
        startDate: '',
        endDate: '',
        consultant: 'All Consultants',
        site: 'All Sites',
        clinic: 'All Clinics',
        diabetes: 'All Statuses',
        control: 'All Categories',
        cholesterol: 'All Levels',
        gender: 'All Genders',
        age: 'All Ages',
        searchTerm: ''
    });

    // Loading state for search operation
    const [isSearching, setIsSearching] = useState(false);

    // Role-based tabs configuration
    const allTabs = [
        { id: 'DASHBOARD', label: 'DASHBOARD', roles: ['Administrator', 'Analyst', 'Clinician'] },
        { id: 'REGISTRY', label: 'REGISTRY', roles: ['Administrator', 'Analyst', 'Clinician'] },
        { id: 'PREDICTIVE', label: 'PREDICTIVE', roles: ['Administrator', 'Analyst'] },
        { id: 'AI ANALYST', label: 'AI ANALYST', roles: ['Administrator', 'Analyst'] },
        { id: 'USER MANAGEMENT', label: 'USER MANAGEMENT', roles: ['Administrator'] },
    ];

    // Filter tabs based on user role
    const availableTabs = allTabs.filter(tab => 
        tab.roles.includes(user?.role)
    );

    const fetchRegistryForExport = async () => {
        return fetchRegistry(appliedFilters);
    };

    const getDiagnosisLabel = (hba1c) => {
        if (!hba1c) return '--';
        const val = parseFloat(hba1c);
        if (val >= 6.5) return 'DIABETES';
        if (val >= 5.7) return 'PREDIABETES';
        return 'NORMAL';
    };

    const getCholesterolLabel = (value) => {
        if (!value) return '--';
        const num = parseFloat(value);
        if (num >= 240) return `HIGH (${num})`;
        if (num >= 200) return `BORDERLINE (${num})`;
        return `NORMAL (${num})`;
    };

    const handleSearch = (draftFilters) => {
        setIsSearching(true);
        // Update applied filters to trigger data fetch in child components
        setAppliedFilters(draftFilters);
        // Also update global filters to keep them in sync
        setGlobalFilters(draftFilters);
        // Reset searching state after a short delay to allow data to load
        setTimeout(() => setIsSearching(false), 500);
    };

    const handleDownloadCSV = async () => {
        try {
            const patients = await fetchRegistryForExport();
            const headers = ["Patient Name", "Age", "UHID", "Gender", "Last Visit", "Consultant", "HbA1c", "Diagnosis", "LDL", "HDL", "LDL/HDL", "Cholesterol", "TG", "Diabetic Status", "Control Status"];
            const escapeCSV = (val) => {
                if (val === null || val === undefined) return '';
                const str = String(val);
                return str.includes(',') || str.includes('"') || str.includes('\n')
                    ? `"${str.replace(/"/g, '""')}"` : str;
            };
            const rows = patients.map(p => [
                p.patient_name,
                p.age,
                p.uhid_display || 'N/A',
                p.gender_id || 'N/A',
                p.latest_visit_date ? new Date(p.latest_visit_date).toLocaleDateString() : 'N/A',
                p.provider_name || 'N/A',
                p.hba1c ? `${p.hba1c}%` : '--',
                getDiagnosisLabel(p.hba1c),
                p.ldl || '--',
                p.hdl || '--',
                `${p.ldl || '--'}/${p.hdl || '--'}`,
                p.cholesterol || '--',
                p.tg || '--',
                p.diabetic_status || 'N/A',
                p.control_status || 'N/A'
            ]);
            const csvContent = [headers, ...rows].map(row => row.map(escapeCSV).join(",")).join("\n");
            const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", "patient_registry.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("CSV export failed:", err);
            alert("Failed to export CSV. Please try again.");
        }
    };

    const handleDownloadPDF = async () => {
        try {
            const patients = await fetchRegistryForExport();
            const doc = new jsPDF('l', 'mm', 'a4');
            doc.setFontSize(18);
            doc.text("Clinical Patient Registry", 14, 15);
            doc.setFontSize(12);
            doc.text(`Generated: ${new Date().toLocaleString()} | Total Records: ${patients.length}`, 14, 22);
            const tableColumn = ["Patient Name", "Age / UHID", "Last Visit", "Consultant", "HbA1c", "Diagnosis", "LDL/HDL", "Cholesterol", "Diabetic Status", "Control"];
            const tableRows = patients.map(p => [
                p.patient_name || 'N/A',
                `${p.age || '--'}Y / ${p.uhid_display || 'N/A'}`,
                p.latest_visit_date ? new Date(p.latest_visit_date).toLocaleDateString() : 'N/A',
                p.provider_name || 'N/A',
                p.hba1c ? `${p.hba1c}%` : '--',
                getDiagnosisLabel(p.hba1c),
                `${p.ldl || '--'}/${p.hdl || '--'}`,
                getCholesterolLabel(p.cholesterol),
                p.diabetic_status || 'N/A',
                p.control_status || 'N/A'
            ]);
            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 30,
                theme: 'grid',
                headStyles: { fillColor: [30, 41, 59], fontSize: 10, textColor: [255, 255, 255] },
                styles: { fontSize: 9, cellPadding: 2 },
                columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 22 } }
            });
            doc.save("patient_registry_report.pdf");
        } catch (err) {
            console.error("PDF export failed:", err);
            alert("Failed to export PDF. Please try again.");
        }
    };

    // Redirect to first available tab if current tab is not accessible
    React.useEffect(() => {
        const currentTabAvailable = availableTabs.some(tab => tab.id === activeTab);
        if (!currentTabAvailable && availableTabs.length > 0) {
            setActiveTab(availableTabs[0].id);
        }
    }, [user?.role]);

    return (
        <div className="bg-[#f8fafc] min-h-screen pb-10">
            <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

            {/* Change space-y-6 to space-y-3 for tighter vertical grouping */}
            <div className="max-w-[1600px] mx-auto p-6 space-y-3">
                
                {/* NAVIGATION TABS - Role-based */}
                <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-100 w-fit mb-2">
                    {availableTabs.map((tab) => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-2 rounded-lg text-[12px] tracking-widest font-black transition-all font-display-bold ${
                                activeTab === tab.id 
                                ? 'bg-indigo-600 text-white shadow-md' 
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* 2. PERSISTENT FILTER BAR */}
                <GlobalFilterBar 
                    filters={globalFilters} 
                    setFilters={setGlobalFilters} 
                    onSearch={handleSearch}
                    isSearching={isSearching}
                    onDownloadCSV={handleDownloadCSV} 
                    onDownloadPDF={handleDownloadPDF} 
                />

                {/* 3. PERSISTENT SUMMARY CARDS */}
                <div className="mb-0"> 
                    <SummaryCards filters={appliedFilters} />
                </div>

                {/* 4. DYNAMIC CONTENT AREA */}
                {/* Reduced mt-6 to mt-2 to pull the registry table up closer to the cards */}
                <div className="mt-2">
                    {activeTab === 'DASHBOARD' && <DashboardOverview filters={appliedFilters} />}
                    {activeTab === 'REGISTRY' && <PatientRegistry filters={appliedFilters} />}
                    {activeTab === 'PREDICTIVE' && <PredictiveDashboard filters={appliedFilters} />}
                    {activeTab === 'AI ANALYST' && <AIAnalyst globalFilters={appliedFilters} />}
                    {activeTab === 'USER MANAGEMENT' && <UserManagement />}
                </div>
            </div>
        </div>
    );
};

/**
 * Main App Component with Router
 */
const App = () => {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<Login />} />
                    
                    {/* Protected Routes */}
                    <Route 
                        path="/" 
                        element={
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        } 
                    />
                    
                    <Route 
                        path="/profile" 
                        element={
                            <ProtectedRoute>
                                <ProfileSettings />
                            </ProtectedRoute>
                        } 
                    />
                    
                    {/* Catch all - redirect to login */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
};

export default App;

