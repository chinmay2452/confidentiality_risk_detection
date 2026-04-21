import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ArchitectureForm from '../components/ArchitectureForm';
import JsonUploader from '../components/JsonUploader';
import ArchitectureGraph from '../components/ArchitectureGraph';

const SAMPLE_JSON = {
    roles: [
        { name: "Admin", privileges: ["read", "write", "delete", "admin"] },
        { name: "User", privileges: ["read"] },
        { name: "Finance", privileges: ["read", "write"] }
    ],
    components: [
        { name: "API Gateway", type: "frontend", stores_sensitive_data: false, has_authentication: false, is_untrusted: false, has_hardcoded_credentials: false, logs_sensitive_data: false, exposes_session_tokens: true },
        { name: "Auth Service", type: "backend", stores_sensitive_data: true, has_authentication: true, is_untrusted: false, has_hardcoded_credentials: false, logs_sensitive_data: false, exposes_session_tokens: false },
        { name: "User Service", type: "backend", stores_sensitive_data: false, has_authentication: true, is_untrusted: false, has_hardcoded_credentials: false, logs_sensitive_data: false, exposes_session_tokens: false },
        { name: "Payment Service", type: "backend", stores_sensitive_data: true, has_authentication: true, is_untrusted: true, has_hardcoded_credentials: false, logs_sensitive_data: false, exposes_session_tokens: false },
        { name: "Customer DB", type: "database", stores_sensitive_data: true, has_authentication: true, is_untrusted: false, has_hardcoded_credentials: false, logs_sensitive_data: false, exposes_session_tokens: false }
    ],
    connections: [
        { source: "API Gateway", target: "Auth Service", encrypted: true, has_authentication: false, missing_authorization_headers: false },
        { source: "API Gateway", target: "User Service", encrypted: true, has_authentication: true, missing_authorization_headers: false },
        { source: "API Gateway", target: "Payment Service", encrypted: true, has_authentication: true, missing_authorization_headers: false },
        { source: "User Service", target: "Customer DB", encrypted: false, has_authentication: true, missing_authorization_headers: false },
        { source: "Payment Service", target: "Customer DB", encrypted: true, has_authentication: true, missing_authorization_headers: false }
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
    const [jsonError, setJsonError] = useState(null);

    // Keep JSON editor text in sync when architecture state changes from other tabs
    useEffect(() => {
        if (activeTab !== 'json') {
            setJsonText(JSON.stringify(architecture, null, 2));
            setJsonError(null);
        }
    }, [architecture, activeTab]);

    // Handle JSON Text Update with Debounce-like effect (validate on change)
    const handleJsonTextChange = (text) => {
        setJsonText(text);
        try {
            const parsed = JSON.parse(text);
            setArchitecture({
                components: parsed.components || [],
                connections: parsed.connections || [],
                roles: parsed.roles || []
            });
            setJsonError(null);
        } catch (e) {
            setJsonError("Invalid JSON format");
        }
    };

    const handleJsonLoaded = (json) => {
        setArchitecture(json);
        setActiveTab('review');
    };

    const loadSample = () => {
        setArchitecture(SAMPLE_JSON);
        setActiveTab('review');
    };

    const handleFormChange = (newArchitecture) => {
        setArchitecture(newArchitecture);
    };

    // --- VALIDATION ENGINE ---
    const validation = useMemo(() => {
        const errors = [];
        const warnings = [];
        const passed = [];
        
        const comps = architecture.components || [];
        const conns = architecture.connections || [];
        const roles = architecture.roles || [];

        // Errors (Blockers)
        if (comps.length === 0) {
            errors.push("No components defined.");
        } else {
            passed.push("Components added.");
        }
        
        if (conns.length === 0 && comps.length > 1) {
            errors.push("No data flows defined between components.");
        } else if (conns.length > 0) {
            passed.push("Data flows connected.");
        }
        
        if (jsonError) {
            errors.push("Invalid structure: " + jsonError);
        } else if (comps.length > 0) {
            passed.push("Structure is valid.");
        }

        // Warnings
        const nameCounts = {};
        comps.forEach(c => {
            if (c.name) {
                nameCounts[c.name] = (nameCounts[c.name] || 0) + 1;
            }
        });
        const duplicates = Object.keys(nameCounts).filter(name => nameCounts[name] > 1);
        if (duplicates.length > 0) {
            warnings.push(`Duplicate component names: ${duplicates.join(', ')}`);
        }

        if (roles.length === 0 && comps.some(c => c.has_authentication)) {
            warnings.push("Authentication enabled but no roles defined.");
        } else if (roles.length > 0) {
            passed.push("Roles mapped.");
        }

        const sensitiveUnencrypted = comps.some(c => c.stores_sensitive_data) && conns.some(cn => !cn.encrypted);
        if (sensitiveUnencrypted) {
            warnings.push("Sensitive components detected with unencrypted flows.");
        }
        
        // Readiness Score
        const totalChecks = 4; // Comps > 0, Conns > 0, JSON Valid, Roles > 0
        let passedChecks = 0;
        if (comps.length > 0) passedChecks++;
        if (conns.length > 0) passedChecks++;
        if (!jsonError && comps.length > 0) passedChecks++;
        if (roles.length > 0) passedChecks++;
        
        const score = Math.round((passedChecks / totalChecks) * 100) || 0;

        return { errors, warnings, passed, score };
    }, [architecture, jsonError]);

    const handleRunAnalysis = () => {
        if (validation.errors.length > 0) {
            alert("Cannot run analysis due to critical errors:\n- " + validation.errors.join('\n- '));
            return;
        }

        // Pass the architecture data to the analyze page via session storage
        sessionStorage.setItem('pending_analysis_json', JSON.stringify(architecture));
        navigate('/analyze');
    };

    return (
        <div className="page-container">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>Input Architecture</h1>
                    <p>Build, upload, or paste your JSON to define system boundaries before analysis.</p>
                </div>
                {validation.score > 0 && (
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>READINESS SCORE</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: validation.errors.length === 0 ? 'var(--success)' : 'var(--severity-high)' }}>
                            {validation.score}%
                        </div>
                    </div>
                )}
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
                    <div className="alert alert-success" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Define your system using the visual builder below.</span>
                        <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('review')}>Review →</button>
                    </div>
                    <ArchitectureForm architecture={architecture} onChange={handleFormChange} />
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
                    <div className="card" style={{ marginBottom: '1rem', border: jsonError ? '1px solid var(--severity-high)' : '1px solid var(--border-color)' }}>
                        <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                            <span><span className="icon">📝</span> Architecture JSON</span>
                            {jsonError && <span style={{ color: 'var(--severity-high)', fontSize: '0.85rem' }}>{jsonError}</span>}
                        </div>
                        <textarea
                            className="form-textarea"
                            value={jsonText}
                            onChange={(e) => handleJsonTextChange(e.target.value)}
                            placeholder={`Paste your architecture JSON here...`}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={() => setActiveTab('review')} style={{ width: '100%', padding: '1rem' }}>
                        ✓ Continue to Review
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
                <div className="animate-in two-col" style={{ gridTemplateColumns: '3fr 2fr' }}>
                    {/* Left Column: Data Summaries */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="card">
                            <div className="card-title">📦 Components Summary ({architecture.components?.length || 0})</div>
                            {architecture.components?.length > 0 ? (
                                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                                    {architecture.components.map((c, i) => (
                                        <li key={i} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontWeight: 600 }}>{c.name || 'Unnamed'}</span>
                                            <span className="severity-badge" style={{ background: 'var(--bg-glass)', color: 'var(--text-secondary)' }}>{c.type}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : <p className="text-muted" style={{ fontSize: '0.85rem' }}>No components defined.</p>}
                        </div>

                        <div className="card">
                            <div className="card-title">🔗 Data Flow Summary ({architecture.connections?.length || 0})</div>
                            {architecture.connections?.length > 0 ? (
                                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                                    {architecture.connections.map((conn, i) => (
                                        <li key={i} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span>{conn.source || '?'}</span>
                                            <span style={{ color: 'var(--accent-primary)' }}>→</span>
                                            <span>{conn.target || '?'}</span>
                                            {conn.encrypted && <span title="Encrypted" style={{ marginLeft: 'auto' }}>🔒</span>}
                                        </li>
                                    ))}
                                </ul>
                            ) : <p className="text-muted" style={{ fontSize: '0.85rem' }}>No data flows defined.</p>}
                        </div>

                        <div className="card">
                            <div className="card-title">👥 Roles Summary ({architecture.roles?.length || 0})</div>
                            {architecture.roles?.length > 0 ? (
                                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                                    {architecture.roles.map((r, i) => (
                                        <li key={i} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                                            <strong style={{ display: 'inline-block', width: '100px' }}>{r.name || 'Unnamed'}</strong>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                {Array.isArray(r.privileges) ? r.privileges.join(', ') : r.privileges}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : <p className="text-muted" style={{ fontSize: '0.85rem' }}>No roles defined.</p>}
                        </div>

                        <div className="card">
                            <div className="card-title">🔐 Sensitive Assets</div>
                            {architecture.components?.filter(c => c.stores_sensitive_data).length > 0 ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {architecture.components.filter(c => c.stores_sensitive_data).map((c, i) => (
                                        <span key={i} className="severity-badge severity-HIGH" style={{ background: 'var(--severity-high-bg)', color: 'var(--severity-high)' }}>
                                            {c.name}
                                        </span>
                                    ))}
                                </div>
                            ) : <p className="text-muted" style={{ fontSize: '0.85rem' }}>No components marked as storing sensitive data.</p>}
                        </div>
                    </div>

                    {/* Right Column: Validation & Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="card" style={{ border: validation.errors.length > 0 ? '1px solid var(--severity-high)' : '1px solid var(--success)' }}>
                            <div className="card-title">✓ Validation Checklist</div>
                            <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: '0.9rem', lineHeight: 1.8 }}>
                                {/* Display Passed Checks */}
                                {validation.passed.map((msg, i) => (
                                    <li key={`p-${i}`} style={{ color: 'var(--success)', display: 'flex', gap: '0.5rem' }}>
                                        <span>✓</span> <span>{msg}</span>
                                    </li>
                                ))}
                                {/* Display Warnings */}
                                {validation.warnings.map((msg, i) => (
                                    <li key={`w-${i}`} style={{ color: 'var(--severity-medium)', display: 'flex', gap: '0.5rem' }}>
                                        <span>⚠</span> <span>{msg}</span>
                                    </li>
                                ))}
                                {/* Display Errors */}
                                {validation.errors.map((msg, i) => (
                                    <li key={`e-${i}`} style={{ color: 'var(--severity-high)', display: 'flex', gap: '0.5rem' }}>
                                        <span>✗</span> <span style={{ fontWeight: 600 }}>{msg}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <button 
                            className="btn btn-secondary" 
                            onClick={() => setActiveTab('builder')} 
                            style={{ padding: '1rem' }}
                        >
                            ← Back to Builder
                        </button>
                        
                        <button 
                            className="btn btn-primary" 
                            onClick={handleRunAnalysis} 
                            style={{ padding: '1.25rem', fontSize: '1.1rem', opacity: validation.errors.length > 0 ? 0.6 : 1 }}
                        >
                            {validation.errors.length > 0 ? 'Contains Errors ✗' : '🚀 Run Analysis Now'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
