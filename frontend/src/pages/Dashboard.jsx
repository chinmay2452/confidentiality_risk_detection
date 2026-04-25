import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getArchitectures, getReports } from '../api/api';

export default function Dashboard() {
    const navigate = useNavigate();
    const [architectures, setArchitectures] = useState([]);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [mlTestResult, setMlTestResult] = useState(null);
    const [mlLoading, setMlLoading] = useState(false);

    const runMLTest = async () => {
        setMlLoading(true);
        try {
            const res = await fetch('http://localhost:8000/api/hybrid-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    "risk_type": "Unencrypted API",
                    "rule_severity": "High",
                    "component": "Auth Service"
                })
            });
            const data = await res.json();
            setMlTestResult(data);
        } catch (e) {
            console.error(e);
        } finally {
            setMlLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const [archData, reportData] = await Promise.all([
                getArchitectures(),
                getReports(),
            ]);
            setArchitectures(archData || []);
            setReports(reportData || []);
        } catch (err) {
            setError(
                'Could not load data. Make sure the backend is running and Supabase is configured.'
            );
            setArchitectures([]);
            setReports([]);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr) => {
        try {
            return new Date(dateStr).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return dateStr;
        }
    };

    const getReportForArch = (archId) => {
        return reports.find((r) => r.architecture_id === archId);
    };

    const getRiskSummary = (report) => {
        if (!report || !report.risks_json) return null;
        const data = report.risks_json;
        return {
            total: data.total_risks || 0,
            high: data.high_risks || 0,
            medium: data.medium_risks || 0,
            low: data.low_risks || 0,
        };
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Dashboard</h1>
                <p>View previously analyzed architectures and their risk reports.</p>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {/* Quick Stats */}
            <div className="stats-grid">
                <div className="stat-card stat-total">
                    <div className="stat-value">{architectures.length}</div>
                    <div className="stat-label">Architectures</div>
                </div>
                <div className="stat-card stat-high">
                    <div className="stat-value">{reports.length}</div>
                    <div className="stat-label">Reports</div>
                </div>
                <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/input')}>
                    <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>+</div>
                    <div className="stat-label">New Analysis</div>
                </div>
            </div>

            {/* ML Hybrid Engine Live Test */}
            <div className="card animate-in" style={{ marginTop: '2rem', borderLeft: '4px solid var(--accent-primary)' }}>
                <div className="card-title"><span className="icon">🤖</span> AI Hybrid Risk Engine (Live Test)</div>
                <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                    Simulate sending a deterministic "High Risk" rule to the ML engine to see how it automatically reclassifies risks using machine learning confidence thresholds.
                </p>
                
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px' }}>
                        <h4 style={{ marginBottom: '0.5rem' }}>Input (Rule Engine)</h4>
                        <pre style={{ fontSize: '13px', margin: 0, color: 'var(--text-secondary)' }}>
{`{
  "risk_type": "Unencrypted API",
  "rule_severity": "High",
  "component": "Auth Service"
}`}
                        </pre>
                        <button 
                            className="btn btn-primary" 
                            style={{ marginTop: '1rem', width: '100%' }}
                            onClick={runMLTest}
                            disabled={mlLoading}
                        >
                            {mlLoading ? 'Analyzing via ML...' : 'Run Hybrid ML Analysis'}
                        </button>
                    </div>

                    <div style={{ flex: 1, background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', minHeight: '160px' }}>
                        <h4 style={{ marginBottom: '0.5rem' }}>Output (Hybrid ML Logic)</h4>
                        {mlTestResult ? (
                            <pre style={{ fontSize: '13px', margin: 0, color: mlTestResult.decision_source === 'ml' ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
{JSON.stringify(mlTestResult, null, 2)}
                            </pre>
                        ) : (
                            <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                                Awaiting input...
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="loading-overlay">
                    <span className="loading-spinner" style={{ width: '36px', height: '36px' }}></span>
                    <span>Loading data from Supabase...</span>
                </div>
            )}

            {/* Architecture List */}
            {!loading && (
                <div className="card animate-in">
                    <div className="card-title"><span className="icon">🏗️</span> Analyzed Architectures</div>
                    {architectures.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">📐</div>
                            <h3>No architectures yet</h3>
                            <p>Go to the Input Architecture page to define your first architecture for analysis.</p>
                            <button
                                className="btn btn-primary"
                                style={{ marginTop: '1rem' }}
                                onClick={() => navigate('/input')}
                            >
                                Define Architecture
                            </button>
                        </div>
                    ) : (
                        <div className="arch-list">
                            {architectures.map((arch) => {
                                const report = getReportForArch(arch.id);
                                const summary = getRiskSummary(report);
                                return (
                                    <div key={arch.id} className="arch-list-item">
                                        <div className="item-info">
                                            <h3>{arch.name}</h3>
                                            <p>Created: {formatDate(arch.created_at)}</p>
                                            {summary && (
                                                <p style={{ marginTop: '0.25rem' }}>
                                                    <span style={{ color: 'var(--severity-high)' }}>⬤ {summary.high} High</span>
                                                    {' · '}
                                                    <span style={{ color: 'var(--severity-medium)' }}>⬤ {summary.medium} Medium</span>
                                                    {' · '}
                                                    <span style={{ color: 'var(--severity-low)' }}>⬤ {summary.low} Low</span>
                                                </p>
                                            )}
                                        </div>
                                        <div className="item-actions">
                                            {report && (
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => navigate(`/report/${report.id}`)}
                                                >
                                                    View Report
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
