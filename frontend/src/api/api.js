import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Send architecture data for analysis (does not persist).
 */
export const analyzeArchitecture = async (architectureData) => {
    const response = await api.post('/analyze', architectureData);
    return response.data;
};

/**
 * Save architecture to Supabase and get risk report.
 */
export const saveArchitecture = async (name, architectureData) => {
    const response = await api.post('/architectures', {
        name,
        architecture: architectureData,
    });
    return response.data;
};

/**
 * List all saved architectures.
 */
export const getArchitectures = async () => {
    const response = await api.get('/architectures');
    return response.data;
};

/**
 * Get a specific risk report by ID.
 */
export const getReport = async (reportId) => {
    const response = await api.get(`/reports/${reportId}`);
    return response.data;
};

/**
 * List all risk reports.
 */
export const getReports = async () => {
    const response = await api.get('/reports');
    return response.data;
};

/**
 * Validate a workflow draft (components, data_flows, roles).
 */
export const validateDraft = async (draft) => {
    const response = await api.post('/input/validate', draft);
    return response.data;
};

/**
 * Convert a draft into analyzer-ready model.
 */
export const generateModelFromDraft = async (draft) => {
    const response = await api.post('/input/model', draft);
    return response.data;
};

/**
 * Create a temporary draft session.
 */
export const createDraftSession = async () => {
    const response = await api.post('/input/sessions');
    return response.data;
};

/**
 * Update a draft session.
 */
export const updateDraftSession = async (sessionId, draft) => {
    const response = await api.put(`/input/sessions/${sessionId}`, draft);
    return response.data;
};

/**
 * Fetch a draft session.
 */
export const getDraftSession = async (sessionId) => {
    const response = await api.get(`/input/sessions/${sessionId}`);
    return response.data;
};

export default api;
