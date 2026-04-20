import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    analyzeArchitecture,
    createDraftSession,
    generateModelFromDraft,
    updateDraftSession,
    validateDraft,
} from '../api/api';
import ArchitectureGraph from '../components/ArchitectureGraph';

const COMPONENT_TYPES = ['frontend', 'backend', 'database', 'api', 'third-party'];
const SENSITIVITY_LEVELS = ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'];

const defaultComponent = { name: '', type: 'backend', stores_sensitive_data: false, has_authentication: true };
const defaultFlow = {
    source: '',
    target: '',
    data_types: [],
    sensitivity: 'INTERNAL',
    encrypted: false,
    auth_required: true,
    initiated_by_roles: [],
};
const defaultRole = { name: '', description: '', privileges: [] };

function parseCsv(value) {
    return value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

export default function InputWorkflowPage() {
    const navigate = useNavigate();

    const [step, setStep] = useState(0);
    const [sessionId, setSessionId] = useState('');

    const [components, setComponents] = useState([{ ...defaultComponent }]);
    const [dataFlows, setDataFlows] = useState([{ ...defaultFlow }]);
    const [roles, setRoles] = useState([{ ...defaultRole }]);

    const [validation, setValidation] = useState(null);
    const [model, setModel] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const draft = useMemo(() => ({
        components,
        data_flows: dataFlows,
        roles,
    }), [components, dataFlows, roles]);

    useEffect(() => {
        (async () => {
            try {
                const s = await createDraftSession();
                setSessionId(s.session_id);
            } catch {
                // session is a convenience; workflow still works without it
            }
        })();
    }, []);

    useEffect(() => {
        if (!sessionId) return;
        const t = setTimeout(() => {
            updateDraftSession(sessionId, draft).catch(() => {});
        }, 400);
        return () => clearTimeout(t);
    }, [sessionId, draft]);

    const steps = ['Components', 'Data Flows', 'Roles', 'Review'];

    const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
    const back = () => setStep((s) => Math.max(s - 1, 0));

    const normalizedComponents = components.filter((c) => c.name.trim());
    const normalizedFlows = dataFlows.filter((f) => f.source.trim() && f.target.trim());
    const analysisPreview = model?.analysis_input || {
        components: normalizedComponents,
        connections: normalizedFlows.map((f) => ({
            source: f.source,
            target: f.target,
            encrypted: !!f.encrypted,
            has_authentication: !!f.auth_required,
        })),
    };

    const runValidate = async () => {
        setLoading(true);
        setError('');
        setValidation(null);
        setModel(null);
        try {
            const res = await validateDraft(draft);
            setValidation(res);
            if (!res.ok) setStep(3);
        } catch (err) {
            setError(err.response?.data?.detail || 'Validation failed. Make sure the backend is running.');
        } finally {
            setLoading(false);
        }
    };

    const generateModel = async () => {
        setLoading(true);
        setError('');
        setModel(null);
        try {
            const res = await generateModelFromDraft(draft);
            setModel(res);
            setValidation({ ok: true, errors: [], warnings: [], normalized: res.draft });
            setStep(3);
        } catch (err) {
            const detail = err.response?.data?.detail;
            if (detail?.errors) {
                setValidation({ ok: false, errors: detail.errors || [], warnings: detail.warnings || [], normalized: null });
                setStep(3);
            } else {
                setError(detail || 'Model generation failed.');
            }
        } finally {
            setLoading(false);
        }
    };

    const analyze = async () => {
        setLoading(true);
        setError('');
        try {
            const data = model?.analysis_input || (await generateModelFromDraft(draft)).analysis_input;
            const report = await analyzeArchitecture(data);
            // Reuse existing report page by saving in history would require Supabase.
            // For now, redirect to /analyze with prefilled JSON is simplest:
            sessionStorage.setItem('prefill_architecture_json', JSON.stringify(data));
            sessionStorage.setItem('prefill_report_json', JSON.stringify(report));
            navigate('/analyze');
        } catch (err) {
            setError(err.response?.data?.detail || 'Analysis failed.');
        } finally {
            setLoading(false);
        }
    };

    const updateComponent = (i, field, value) => {
        const updated = [...components];
        updated[i] = { ...updated[i], [field]: value };
        setComponents(updated);
    };
    const addComponent = () => setComponents([...components, { ...defaultComponent }]);
    const removeComponent = (i) => setComponents(components.filter((_, idx) => idx !== i));

    const updateFlow = (i, field, value) => {
        const updated = [...dataFlows];
        updated[i] = { ...updated[i], [field]: value };
        setDataFlows(updated);
    };
    const addFlow = () => setDataFlows([...dataFlows, { ...defaultFlow }]);
    const removeFlow = (i) => setDataFlows(dataFlows.filter((_, idx) => idx !== i));

    const updateRole = (i, field, value) => {
        const updated = [...roles];
        updated[i] = { ...updated[i], [field]: value };
        setRoles(updated);
    };
    const addRole = () => setRoles([...roles, { ...defaultRole }]);
    const removeRole = (i) => setRoles(roles.filter((_, idx) => idx !== i));

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Architecture Input Workflow</h1>
                <p>Enter architecture data step-by-step. Validate missing fields, generate a model, and feed it into the analyzer.</p>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="tabs" style={{ marginBottom: '1rem' }}>
                {steps.map((label, idx) => (
                    <button
                        key={label}
                        className={`tab-btn ${step === idx ? 'active' : ''}`}
                        onClick={() => setStep(idx)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {step === 0 && (
                <div className="card animate-in" style={{ marginBottom: '1.5rem' }}>
                    <div className="card-title"><span className="icon">📦</span> Components</div>
                    {components.map((comp, i) => (
                        <div key={i} className="builder-row">
                            <div className="form-group">
                                <label>Name</label>
                                <input
                                    className="form-input"
                                    placeholder="e.g. API Server"
                                    value={comp.name}
                                    onChange={(e) => updateComponent(i, 'name', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label>Type</label>
                                <select
                                    className="form-select"
                                    value={comp.type}
                                    onChange={(e) => updateComponent(i, 'type', e.target.value)}
                                >
                                    {COMPONENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <div className="form-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={comp.stores_sensitive_data}
                                        onChange={(e) => updateComponent(i, 'stores_sensitive_data', e.target.checked)}
                                    />
                                    <label style={{ marginBottom: 0 }}>Stores sensitive data</label>
                                </div>
                            </div>
                            <button className="btn-remove" onClick={() => removeComponent(i)} title="Remove">✕</button>
                        </div>
                    ))}
                    <button className="btn-add" onClick={addComponent}>+ Add Component</button>
                </div>
            )}

            {step === 1 && (
                <div className="card animate-in" style={{ marginBottom: '1.5rem' }}>
                    <div className="card-title"><span className="icon">🔗</span> Data Flows</div>
                    {dataFlows.map((flow, i) => (
                        <div key={i} className="connection-row" style={{ gridTemplateColumns: '1fr 1fr 1fr auto auto auto' }}>
                            <div className="form-group">
                                <label>Source</label>
                                <input
                                    className="form-input"
                                    placeholder="Source component"
                                    value={flow.source}
                                    onChange={(e) => updateFlow(i, 'source', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label>Target</label>
                                <input
                                    className="form-input"
                                    placeholder="Target component"
                                    value={flow.target}
                                    onChange={(e) => updateFlow(i, 'target', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label>Data Types (comma-separated)</label>
                                <input
                                    className="form-input"
                                    placeholder="e.g. PII, auth_token"
                                    value={(flow.data_types || []).join(', ')}
                                    onChange={(e) => updateFlow(i, 'data_types', parseCsv(e.target.value))}
                                />
                            </div>
                            <div className="form-group">
                                <label>Sensitivity</label>
                                <select
                                    className="form-select"
                                    value={flow.sensitivity}
                                    onChange={(e) => updateFlow(i, 'sensitivity', e.target.value)}
                                >
                                    {SENSITIVITY_LEVELS.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <div className="form-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={flow.encrypted}
                                        onChange={(e) => updateFlow(i, 'encrypted', e.target.checked)}
                                    />
                                    <label style={{ marginBottom: 0 }}>Encrypted</label>
                                </div>
                            </div>
                            <button className="btn-remove" onClick={() => removeFlow(i)} title="Remove">✕</button>
                        </div>
                    ))}
                    <button className="btn-add" onClick={addFlow}>+ Add Data Flow</button>
                </div>
            )}

            {step === 2 && (
                <div className="card animate-in" style={{ marginBottom: '1.5rem' }}>
                    <div className="card-title"><span className="icon">👤</span> Roles</div>
                    {roles.map((role, i) => (
                        <div key={i} className="builder-row" style={{ gridTemplateColumns: '1fr 1fr 1fr auto' }}>
                            <div className="form-group">
                                <label>Name</label>
                                <input
                                    className="form-input"
                                    placeholder="e.g. Customer, Admin, ServiceAccount"
                                    value={role.name}
                                    onChange={(e) => updateRole(i, 'name', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <input
                                    className="form-input"
                                    placeholder="Optional"
                                    value={role.description || ''}
                                    onChange={(e) => updateRole(i, 'description', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label>Privileges (comma-separated)</label>
                                <input
                                    className="form-input"
                                    placeholder="e.g. read_profile, update_billing"
                                    value={(role.privileges || []).join(', ')}
                                    onChange={(e) => updateRole(i, 'privileges', parseCsv(e.target.value))}
                                />
                            </div>
                            <button className="btn-remove" onClick={() => removeRole(i)} title="Remove">✕</button>
                        </div>
                    ))}
                    <button className="btn-add" onClick={addRole}>+ Add Role</button>
                </div>
            )}

            {step === 3 && (
                <div className="two-col animate-in" style={{ marginBottom: '1.5rem' }}>
                    <div className="card">
                        <div className="card-title"><span className="icon">✅</span> Validation</div>
                        {!validation ? (
                            <div className="empty-state" style={{ padding: '1.5rem' }}>
                                <p>Run validation to check missing fields and references.</p>
                            </div>
                        ) : (
                            <div>
                                {validation.ok ? (
                                    <div className="alert alert-success">Draft looks good.</div>
                                ) : (
                                    <div className="alert alert-error">Draft has issues that must be fixed.</div>
                                )}
                                {(validation.errors || []).length > 0 && (
                                    <div style={{ marginTop: '0.75rem' }}>
                                        <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Errors</div>
                                        <ul>
                                            {validation.errors.map((e, idx) => <li key={idx}>{e}</li>)}
                                        </ul>
                                    </div>
                                )}
                                {(validation.warnings || []).length > 0 && (
                                    <div style={{ marginTop: '0.75rem' }}>
                                        <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Warnings</div>
                                        <ul>
                                            {validation.warnings.map((w, idx) => <li key={idx}>{w}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                            <button className="btn btn-secondary" onClick={runValidate} disabled={loading} style={{ flex: 1 }}>
                                {loading ? 'Validating…' : 'Validate'}
                            </button>
                            <button className="btn btn-primary" onClick={generateModel} disabled={loading} style={{ flex: 1 }}>
                                {loading ? 'Generating…' : 'Generate Model'}
                            </button>
                        </div>
                        <button className="btn btn-secondary" onClick={analyze} disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
                            Run Analysis
                        </button>
                    </div>

                    <div className="card">
                        <div className="card-title"><span className="icon">📄</span> Structured Input Data (Draft JSON)</div>
                        <textarea className="form-textarea" readOnly value={JSON.stringify(draft, null, 2)} />
                    </div>
                </div>
            )}

            <div className="card" style={{ marginTop: '1.5rem' }}>
                <div className="card-title"><span className="icon">📐</span> Preview</div>
                <ArchitectureGraph components={analysisPreview.components} connections={analysisPreview.connections} />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button className="btn btn-secondary" onClick={back} disabled={step === 0}>Back</button>
                <button className="btn btn-primary" onClick={next} disabled={step === steps.length - 1} style={{ marginLeft: 'auto' }}>
                    Next
                </button>
            </div>

            {sessionId && (
                <div style={{ marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Session: {sessionId}
                </div>
            )}
        </div>
    );
}

