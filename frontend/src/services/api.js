import axios from 'axios';

const API_URL = 'http://localhost:5000/api/patients';

export const fetchRegistry = async (filters = {}) => {
    try {
        const queryParams = new URLSearchParams();
        const IGNORED = new Set([
            '',
            null,
            undefined,
            'All',
            'All Consultants',
            'All Sites',
            'All Categories',
            'All Levels',
            'All Genders',
            'All Ages',
            'All Statuses'
        ]);

        Object.keys(filters).forEach(key => {
            const val = filters[key];
            if (IGNORED.has(val)) return; // skip sentinel values

            // Map frontend keys to backend query param names
            let paramName = key;
            if (key === 'diabetes') paramName = 'status';
            if (key === 'searchTerm') paramName = 'search';

            // Only append non-empty values (but allow valid date strings)
            if (val !== undefined && val !== null) {
                // For date parameters, only skip empty strings
                if ((key === 'startDate' || key === 'endDate') && !val.trim()) {
                    return; // skip empty dates
                }
                queryParams.append(paramName, val);
            }
        });

        const q = queryParams.toString();
        const url = `${API_URL}/registry${q ? ('?' + q) : ''}`;
        console.log('API fetchRegistry URL:', url);
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error("API Error:", error);
        return [];
    }
};

export const fetchPatientHistory = async (patientId) => {
    try {
        const response = await axios.get(`${API_URL}/history/${patientId}`);
        return response.data; // Returns array of visits from v_master_diabetes_visit_history
    } catch (error) {
        console.error("Error fetching patient history:", error);
        return null;
    }
};