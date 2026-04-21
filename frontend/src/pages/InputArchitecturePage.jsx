import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ArchitectureForm from '../components/ArchitectureForm';
import JsonUploader from '../components/JsonUploader';
import ArchitectureGraph from '../components/ArchitectureGraph';

const SAMPLE_JSON = {
    roles: [
        { name: "Admin", privileges: ["read", "write", "delete", "admin"] },
        { name: "User", privileges: ["read"] }
    ],
    components: [
        { name: "Web App", type: "frontend", stores_sensitive_data: true, has_authentication: true, is_untrusted: false, has_hardcoded_credentials: false, logs_sensitive_data: false, exposes_session_tokens: false },
        { name: "API Server", type: "backend", stores_sensitive_data: true, has_authentication: true, is_untrusted: false, has_hardcoded_credentials: false, logs_sensitive_data: false, exposes_session_tokens: false },
        { name: "User DB", type: "database", stores_sensitive_data: true, has_authentication: true, is_untrusted: false, has_hardcoded_credentials: false, logs_sensitive_data: false, exposes_session_tokens: false },
        { name: "Payment Gateway", type: "third-party", stores_sensitive_data: false, has_authentication: true, is_untrusted: true, has_hardcoded_credentials: false, logs_sensitive_data: true, exposes_session_tokens: false },
        { name: "Analytics API", type: "api", stores_sensitive_data: false, has_authentication: false, is_untrusted: false, has_hardcoded_credentials: false, logs_sensitive_data: false, exposes_session_tokens: false }
    ],
    connections: [
        { source: "Web App", target: "API Server", encrypted: true, has_authentication: true, missing_authorization_headers: false },
        { source: "API Server", target: "User DB", encrypted: false, has_authentication: true, missing_authorization_headers: false },
        { source: "API Server", target: "Payment Gateway", encrypted: true, has_authentication: true, missing_authorization_headers: false },
        { source: "Web App", target: "Analytics API", encrypted: false, has_authentication: false, missing_authorization_headers: true }
    ]
};

export default function InputArchitecturePage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('builder');
    
    // Unified Architecture State
    const [architecture, setArchitecture] = useState({
        components: [],
        connections: [],
        roles: []
    });
    
    const [jsonText, setJsonText] = useState(JSON.stringify(architecture, null, 2));

    // Keep JSON editor text in sync when architecture state changes from other tabs
    useEffect(() => {
        if (activeTab !== 'json') {
            setJsonText(JSON.stringify(architecture, null, 2));
        }
    }, [architecture, activeTab]);

    const handleFormSubmit = (data) => {
        setArchitecture(data);
        setActiveTab('review');
    };

    const handleJsonLoaded = (json) => {
        setArchitecture(json);
        setActiveTab('review');
    };

    const handleJsonTextUpdate = () => {
        try {
            const parsed = JSON.parse(jsonText);
            setArchitecture({
                components: parsed.components || [],
                connections: parsed.connections || [],
                roles: parsed.roles || []
            });
            setActiveTab('review');
        } catch (e) {
            alert("Invalid JSON format: " + e.message);
        }
    };

    const loadSample = () => {
        setArchitecture(SAMPLE_JSON);
        setActiveTab('review');
    };

    const handleRunAnalysis = () => {
        if (!architecture.components || architecture.components.length === 0) {
            alert("Cannot analyze empty architecture. Please add at least one component.");
            return;
        }

        // Pass the architecture data to the analyze page via session storage
        sessionStorage.setItem('pending_analysis_json', JSON.stringify(architecture));
        navigate('/analyze');
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Architecture Input</h1>
                <p>Define your architecture components, connections, and roles before running an analysis.</p>
            </div>

            <div className="tabs">
                <button className={`tab-btn ${activeTab === 'builder' ? 'active' : ''}`} onClick={() => setActiveTab('builder')}>
                    🏗️ Builder
                </button>
                <button className={`tab-btn ${activeTab === 'json' ? 'active' : ''}`} onClick={() => setActiveTab('json')}>
                    📝 JSON Editor
                </button>
                <button className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`} onClick={() => setActiveTab('upload')}>
                    📁 Upload File
                </button>
                <button className={`tab-btn ${activeTab === 'review' ? 'active' : ''}`} onClick={() => setActiveTab('review')}>
                    🔍 Review & Validate
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
                    {/* The ArchitectureForm component triggers handleFormSubmit when user clicks the generic submit button inside it */}
                    {/* However ArchitectureForm has its own local state until onSubmit is called. */}
                    {/* We provide existing state to it if need be, but for simplicity it starts fresh or from what user puts in. */}
                    <div className="alert alert-success" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Define your system using the visual builder below.</span>
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
                    <button className="btn btn-primary" onClick={handleJsonTextUpdate} style={{ width: '100%', padding: '1rem' }}>
                        ✓ Save and Review
                    </button>
                </div>
            )}

            {/* Upload Tab */}
            {activeTab === 'upload' && (
                <div className="animate-in">
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                         <button className="btn btn-secondary btn-sm" onClick={loadSample}>
                            Use Sample Instead
                        </button>
                    </div>
                    <JsonUploader onJsonLoaded={handleJsonLoaded} />
                </div>
            )}

            {/* Review Tab */}
            {activeTab === 'review' && (
                <div className="animate-in">
                    {architecture.components && architecture.components.length > 0 ? (
                        <>
                            <div className="card" style={{ marginBottom: '1.5rem' }}>
                                <div className="card-title"><span className="icon">📐</span> Architecture Graph Preview</div>
                                <ArchitectureGraph components={architecture.components} connections={architecture.connections} />
                            </div>

                            <button className="btn btn-primary" onClick={handleRunAnalysis} style={{ width: '100%', padding: '1.25rem', fontSize: '1.1rem' }}>
                                🚀 Run Analysis Now
                            </button>
                        </>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-icon">📐</div>
                            <h3>No Architecture Defined</h3>
                            <p>Please use the Builder, JSON Editor, or Upload feature to define components first.</p>
                            <button
                                className="btn btn-primary"
                                style={{ marginTop: '1rem' }}
                                onClick={() => setActiveTab('builder')}
                            >
                                Go to Builder
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
