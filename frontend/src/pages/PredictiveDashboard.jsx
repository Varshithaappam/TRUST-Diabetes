import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import RiskStratificationPie from '../components/RiskStratificationPie';
import HighRiskList from '../components/HighRiskList';
import PatientPrognosisCard from '../components/PatientPrognosisCard';

// Helper function to calculate risk score based on reference code
const calculateRiskScore = (patient) => {
    const hba1c = parseFloat(patient.hba1c) || 0;
    const prevHba1c = parseFloat(patient.prev_hba1c) || 0;
    const ldl = parseFloat(patient.ldl) || 0;
    
    // If no HbA1c, return N/A
    if (!patient.hba1c || patient.hba1c === null || patient.hba1c === undefined || isNaN(hba1c) || hba1c === 0) {
        return { riskScore: 0, riskLabel: 'N/A', trend: 'stable' };
    }
    
    let score = 0;
    
    // HbA1c factors
    if (hba1c) {
        if (hba1c > 9.0) score += 40;
        else if (hba1c > 7.5) score += 20;
        else if (hba1c > 6.5) score += 10;
    }

    // Trend Factor - Use prev_hba1c from backend
    let trend = 'stable';
    if (hba1c && prevHba1c) {
        const diff = hba1c - prevHba1c;
        if (diff > 0.5) {
            score += 25;
            trend = 'deteriorating';
        } else if (diff < -0.5) {
            score -= 10;
            trend = 'improving';
        }
    }

    // LDL Factor
    if (ldl > 130) score += 15;

    // Age Factor
    if (patient.age > 65) score += 10;

    // Classification
    let label = 'N/A';
    if (hba1c && hba1c > 0) {
        if (score >= 50) label = 'High';
        else if (score >= 30) label = 'Medium';
        else label = 'Low';
    }

    return { riskScore: score, riskLabel: label, trend };
};

const PredictiveDashboard = ({ filters }) => {
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [patientVisits, setPatientVisits] = useState([]);
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingVisits, setLoadingVisits] = useState(false);

    // Fetch all patients for risk scoring - now with filters
    useEffect(() => {
        const fetchAllPatients = async () => {
            try {
                setLoading(true);
                // Build query string from filters
                const params = new URLSearchParams();
                if (filters) {
                    if (filters.site && filters.site !== 'All Sites') params.append('site', filters.site);
                    if (filters.consultant && filters.consultant !== 'All Consultants') params.append('consultant', filters.consultant);
                    if (filters.gender && filters.gender !== 'All Genders') params.append('gender', filters.gender);
                    if (filters.age && filters.age !== 'All Ages') params.append('age', filters.age);
                    if (filters.diabetes && filters.diabetes !== 'All Statuses') params.append('status', filters.diabetes);
                    if (filters.control && filters.control !== 'All Categories') params.append('control', filters.control);
                    if (filters.cholesterol && filters.cholesterol !== 'All Levels') params.append('cholesterol', filters.cholesterol);
                    if (filters.startDate) params.append('startDate', filters.startDate);
                    if (filters.endDate) params.append('endDate', filters.endDate);
                    if (filters.searchTerm) params.append('search', filters.searchTerm);
                }
                const queryString = params.toString();
                const res = await axios.get(`/api/patients/registry${queryString ? '?' + queryString : ''}`);
                setPatients(res.data);
            } catch (err) {
                console.error("Error fetching patients:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAllPatients();
    }, [filters]);

    // Fetch patient visit history when a patient is selected
    useEffect(() => {
        const fetchPatientHistory = async () => {
            if (!selectedPatient) {
                setPatientVisits([]);
                return;
            }

            const patientId = selectedPatient.patient_id || selectedPatient.patientId;
            if (!patientId) {
                setPatientVisits([]);
                return;
            }

            setLoadingVisits(true);
            try {
                const res = await axios.get(`/api/patients/history/${patientId}`);
                
                // Get all visits for the patient
                const allVisits = res.data;
                
                // Find the most recent visit date from patient's actual data
                let latestVisitDate = new Date();
                if (allVisits && allVisits.length > 0) {
                    const dates = allVisits
                        .map(v => new Date(v.visit_date))
                        .filter(d => !isNaN(d.getTime()));
                    if (dates.length > 0) {
                        latestVisitDate = new Date(Math.max(...dates));
                    }
                }
                
                // Calculate 1 year back from the latest visit date
                const oneYearAgo = new Date(latestVisitDate);
                oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
                
                // Filter visits to show last 1 year from the patient's latest visit
                const filteredVisits = allVisits.filter(v => {
                    const visitDate = new Date(v.visit_date);
                    return visitDate >= oneYearAgo && visitDate <= latestVisitDate;
                });
                
                setPatientVisits(filteredVisits);
            } catch (err) {
                console.error("Error fetching patient history:", err);
                setPatientVisits([]);
            } finally {
                setLoadingVisits(false);
            }
        };

        fetchPatientHistory();
    }, [selectedPatient?.patient_id || selectedPatient?.patientId]);

    // Calculate risk scores for all patients locally
    const scoredPatients = useMemo(() => {
        return patients.map(p => {
            const riskData = calculateRiskScore(p);
            return { 
                ...p, 
                riskScore: riskData.riskScore, 
                riskLabel: riskData.riskLabel, 
                trend: riskData.trend 
            };
        }).sort((a, b) => b.riskScore - a.riskScore);
    }, [patients]);

    const handleSelect = (patient) => {
        // Find the full patient data with risk scores
        const fullPatient = scoredPatients.find(p => 
            (p.patient_id || p.patientId || p.uhid) === (patient.patient_id || patient.patientId || patient.uhid)
        );
        setSelectedPatient(fullPatient || patient);
    };

    const selectedPatientId = selectedPatient?.patient_id || selectedPatient?.patientId || selectedPatient?.uhid;

    if (loading) {
        return (
            <div className="p-6 bg-slate-50 min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium">Loading patient data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-slate-50 min-h-screen">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <span className="p-2 bg-white rounded-full shadow-sm">🧠</span> 
                    Predictive Risk Engine
                </h1>
                <p className="text-slate-500 mt-2 max-w-3xl">
                    This module uses deterministic algorithms to stratify patient risk and 
                    Generative AI to forecast individual health trajectories.
                </p>
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Left Column: Stats and List */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    <RiskStratificationPie patients={scoredPatients} />
                    <HighRiskList 
                        onSelect={handleSelect} 
                        selectedId={selectedPatientId} 
                        scoredPatients={scoredPatients} 
                    />
                </div>

                {/* Right Column: AI Analysis */}
                <div className="col-span-12 lg:col-span-8 bg-white rounded-2xl shadow-sm border border-slate-100 min-h-[600px]">
                    {selectedPatient ? (
                        <PatientPrognosisCard 
                            patient={selectedPatient} 
                            visits={loadingVisits ? [] : patientVisits}
                            isLoadingVisits={loadingVisits}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-12">
                            <span className="text-5xl mb-4 opacity-20">🧠</span>
                            <h3 className="text-lg font-bold text-slate-700">No Patient Selected</h3>
                            <p className="text-slate-400 max-w-xs">
                                Select a patient from the High Risk list to generate a future health trajectory prediction.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PredictiveDashboard;

