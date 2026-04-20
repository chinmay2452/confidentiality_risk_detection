import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ArchitectureForm from '../components/ArchitectureForm';
import JsonUploader from '../components/JsonUploader';
import ArchitectureGraph from '../components/ArchitectureGraph';
import RiskTable from '../components/RiskTable';
import { analyzeArchitecture, saveArchitecture } from '../api/api';

const SAMPLE_JSON = {
    components: [
        { name: "Web App", type: "frontend", stores_sensitive_data: true, has_authentication: true },
        { name: "API Server", type: "backend", stores_sensitive_data: true, has_authentication: true },
        { name: "User DB", type: "database", stores_sensitive_data: true, has_authentication: true },
        { name: "Payment Gateway", type: "third-party", stores_sensitive_data: false, has_authentication: true },
        { name: "Analytics API", type: "api", stores_sensitive_data: false, has_authentication: false }
    ],
    connections: [
        { source: "Web App", target: "API Server", encrypted: true, has_authentication: true },
        { source: "API Server", target: "User DB", encrypted: false, has_authentication: true },
        { source: "API Server", target: "Payment Gateway", encrypted: true, has_authentication: true },
        { source: "Web App", target: "Analytics API", encrypted: false, has_authentication: false }
    ]
};

export default function AnalyzePage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('builder');
    const [jsonText, setJsonText] = useState('');
    const [architecture, setArchitecture] = useState(null);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [saveName, setSaveName] = useState('');
    const [saved, setSaved] = useState(false);

    // Optional: allow other pages (like /input) to prefill an analysis run.
    // This keeps /input independent while still reusing the analysis UI.
    useEffect(() => {
        try {
            const prefill = sessionStorage.getItem('prefill_architecture_json');
            if (!prefill) return;
            const parsed = JSON.parse(prefill);
            sessionStorage.removeItem('prefill_architecture_json');
            setActiveTab('json');
            setArchitecture(parsed);
            setJsonText(JSON.stringify(parsed, null, 2));
            setReport(null);
            setError('');
            setSaved(false);
        } catch {
            // ignore
        }
    }, []);

    const handleJsonLoaded = (json) => {
        setArchitecture(json);
        setJsonText(JSON.stringify(json, null, 2));
        setReport(null);
        setError('');
        setSaved(false);
    };

    const handleFormSubmit = (data) => {
        setArchitecture(data);
        setJsonText(JSON.stringify(data, null, 2));
        runAnalysis(data);
    };

    const handleJsonTextAnalyze = () => {
        try {
            const parsed = JSON.parse(jsonText);
            setArchitecture(parsed);
            runAnalysis(parsed);
        } catch {
            setError('Invalid JSON. Please check the format.');
        }
    };

    const loadSample = () => {
        setArchitecture(SAMPLE_JSON);
        setJsonText(JSON.stringify(SAMPLE_JSON, null, 2));
        setReport(null);
        setError('');
        setSaved(false);
    };

    const runAnalysis = async (data) => {
        setLoading(true);
        setError('');
        setReport(null);
        setSaved(false);
        try {
            const result = await analyzeArchitecture(data);
            setReport(result);
        } catch (err) {
            setError(err.response?.data?.detail || 'Analysis failed. Make sure the backend is running.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!architecture || !saveName.trim()) {
            setError('Please provide a name and valid architecture to save.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await saveArchitecture(saveName, architecture);
            setSaved(true);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to save. Check Supabase configuration.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Analyze Architecture</h1>
                <p>Define your architecture and detect confidentiality risks in real time.</p>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {saved && <div className="alert alert-success">✅ Architecture saved to database successfully!</div>}

            {/* Input Tabs */}
            <div className="tabs">
                <button className={`tab-btn ${activeTab === 'builder' ? 'active' : ''}`} onClick={() => setActiveTab('builder')}>
                    🏗️ Builder
                </button>
                <button className={`tab-btn ${activeTab === 'json' ? 'active' : ''}`} onClick={() => setActiveTab('json')}>
                    📝 JSON Editor
                </button>
                <button className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`} onClick={() => setActiveTab('upload')}>
                    📁 Upload
                </button>
            </div>

            {/* Builder Tab */}
            {activeTab === 'builder' && (
                <div className="animate-in">
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary btn-sm" onClick={loadSample}>
                            Load Sample Architecture
                        </button>
                    </div>
                    <ArchitectureForm onSubmit={handleFormSubmit} />
                </div>
            )}

            {/* JSON Editor Tab */}
            {activeTab === 'json' && (
                <div className="animate-in">
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button className="btn btn-secondary btn-sm" onClick={loadSample}>
                            Load Sample
                        </button>
                    </div>
                    <div className="card" style={{ marginBottom: '1rem' }}>
                        <div className="card-title"><span className="icon">📝</span> Architecture JSON</div>
                        <textarea
                            className="form-textarea"
                            value={jsonText}
                            onChange={(e) => setJsonText(e.target.value)}
                            placeholder={`Paste your architecture JSON here...\n\nExample format:\n${JSON.stringify(SAMPLE_JSON, null, 2)}`}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={handleJsonTextAnalyze} disabled={loading} style={{ width: '100%' }}>
                        {loading ? <><span className="loading-spinner"></span> Analyzing...</> : '🔍 Analyze Architecture'}
                    </button>
                </div>
            )}

            {/* Upload Tab */}
            {activeTab === 'upload' && (
                <div className="animate-in">
                    <JsonUploader onJsonLoaded={(json) => { handleJsonLoaded(json); runAnalysis(json); }} />
                </div>
            )}

            {/* Architecture Preview */}
            {architecture && (
                <div className="card animate-in" style={{ marginTop: '2rem' }}>
                    <div className="card-title"><span className="icon">📐</span> Architecture Preview</div>
                    <ArchitectureGraph components={architecture.components} connections={architecture.connections} />
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="loading-overlay">
                    <span className="loading-spinner" style={{ width: '36px', height: '36px' }}></span>
                    <span>Running risk analysis...</span>
                </div>
            )}

            {/* Risk Report */}
            {report && !loading && (
                <div className="animate-in" style={{ marginTop: '2rem' }}>
                    {/* Stats */}
                    <div className="stats-grid">
                        <div className="stat-card stat-total">
                            <div className="stat-value">{report.total_risks}</div>
                            <div className="stat-label">Total Risks</div>
                        </div>
                        <div className="stat-card stat-high">
                            <div className="stat-value">{report.high_risks}</div>
                            <div className="stat-label">High</div>
                        </div>
                        <div className="stat-card stat-medium">
                            <div className="stat-value">{report.medium_risks}</div>
                            <div className="stat-label">Medium</div>
                        </div>
                        <div className="stat-card stat-low">
                            <div className="stat-value">{report.low_risks}</div>
                            <div className="stat-label">Low</div>
                        </div>
                    </div>

                    {/* Risk Table */}
                    <div className="card">
                        <div className="card-title"><span className="icon">⚠️</span> Detected Risks</div>
                        <RiskTable risks={report.risks} />
                    </div>

                    {/* Save Section */}
                    <div className="card" style={{ marginTop: '1.5rem' }}>
                        <div className="card-title"><span className="icon">💾</span> Save to Database</div>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'end' }}>
                            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                <label>Architecture Name</label>
                                <input
                                    className="form-input"
                                    placeholder="e.g. E-Commerce Platform v2"
                                    value={saveName}
                                    onChange={(e) => setSaveName(e.target.value)}
                                />
                            </div>
                            <button className="btn btn-primary" onClick={handleSave} disabled={loading || !saveName.trim()}>
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
