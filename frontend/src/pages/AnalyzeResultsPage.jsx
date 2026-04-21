import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import RiskTable from '../components/RiskTable';
import RiskSummaryCards from '../components/RiskSummaryCards';
import RiskDistributionCharts from '../components/RiskDistributionCharts';
import MitigationPanel, { getUnfixedCounts, loadCompletedSteps } from '../components/MitigationPanel';
import NotificationToast, { generateAlerts } from '../components/NotificationToast';
import { processRisk, sortRisks } from '../utils/riskScoring';
import { insertClassifiedRisks } from '../api/supabaseClient';
import { analyzeArchitecture, saveArchitecture, mitigateFromRisks } from '../api/api';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export default function AnalyzeResultsPage() {
    const navigate = useNavigate();
    const [architecture, setArchitecture] = useState(null);
    const [report, setReport] = useState(null);
    const [mitigationReport, setMitigationReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mitigationLoading, setMitigationLoading] = useState(false);
    const [error, setError] = useState('');
    const [saveName, setSaveName] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [activeTab, setActiveTab] = useState('risks'); // 'risks' | 'mitigations'
    const [notifications, setNotifications] = useState([]);
    const [liveUnfixedCritical, setLiveUnfixedCritical] = useState(0);
    
    const reportRef = useRef(null);

    useEffect(() => {
        const storedJsonStr = sessionStorage.getItem('pending_analysis_json');
        
        if (!storedJsonStr) {
            console.log('No architecture found. Loading mock data for demonstration purposes.');
            setArchitecture({ name: 'Mock Architecture Validation' });
            runAnalysis(null); // passing null will trigger mock response logic
            return;
        }

        try {
            const parsed = JSON.parse(storedJsonStr);
            setArchitecture(parsed);
            runAnalysis(parsed);
        } catch (e) {
            setError('Invalid architecture data stored.');
            setLoading(false);
        }
    }, []);

    const runAnalysis = async (data) => {
        setLoading(true);
        setError('');
        setReport(null);
        setMitigationReport(null);
        setSaved(false);
        setNotifications([]);
        try {
            let result;
            if (!data) {
                // Load dummy data if we hit the route directly for tests
                const { sampleRuleEngineResponses } = await import('../utils/sampleData.js');
                result = sampleRuleEngineResponses;
            } else {
                result = await analyzeArchitecture(data);
            }
            
            const processedRisks = sortRisks((result.risks || []).map(processRisk));
            const reportData = { ...result, risks: processedRisks };
            setReport(reportData);

            // Auto-run mitigation engine
            fetchMitigations(result.risks || []);
        } catch (err) {
            let errMsg = 'Analysis failed. Make sure the backend is running.';
            if (err.response?.data?.detail) {
                const detail = err.response.data.detail;
                if (typeof detail === 'string') {
                    errMsg = detail;
                } else if (Array.isArray(detail)) {
                    errMsg = detail.map(d => d.msg || JSON.stringify(d)).join(' | ');
                }
            }
            setError("Backend Error: " + errMsg);
        } finally {
            setLoading(false);
        }
    };

    const fetchMitigations = async (rawRisks) => {
        if (!rawRisks || rawRisks.length === 0) return;
        setMitigationLoading(true);
        try {
            const mitigation = await mitigateFromRisks(rawRisks);
            setMitigationReport(mitigation);

            // Compute initial live critical count
            const initialCompleted = loadCompletedSteps();
            const counts = getUnfixedCounts(mitigation, initialCompleted);
            setLiveUnfixedCritical(counts.critical);

            // Generate and show alerts
            const alerts = generateAlerts(mitigation);
            setNotifications(alerts);
        } catch (err) {
            console.error('Mitigation engine error:', err);
            // Non-blocking — we still have the risk report
        } finally {
            setMitigationLoading(false);
        }
    };

    const dismissNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const handleSaveToDatabase = async () => {
        if (!architecture || !saveName.trim()) {
            alert('Please provide an architecture name to save.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            await saveArchitecture(saveName, architecture);
            
            // Insert classified risks into Supabase if there are any
            if (report && report.risks && report.risks.length > 0) {
                await insertClassifiedRisks(saveName, report.risks);
            }

            setSaved(true);
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to save. Check Supabase configuration.');
        } finally {
            setSaving(false);
        }
    };

    const exportToPDF = async () => {
        if (!reportRef.current) return;
        try {
            const canvas = await html2canvas(reportRef.current, { backgroundColor: '#0a0e1a' });
            const imgData = canvas.toDataURL('image/png');
            
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save('Architecture_Risk_Report.pdf');
        } catch (err) {
            alert('Failed to generate PDF. Check console logs.');
            console.error(err);
        }
    };

    if (loading) {
        return (
            <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '4rem' }}>
                <span className="loading-spinner" style={{ width: '48px', height: '48px', marginBottom: '1.5rem' }}></span>
                <h2>Running Risk Analysis Engine...</h2>
                <p style={{ color: 'var(--text-muted)' }}>Evaluating 17 confidentiality rules against your architecture.</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="page-container">
                <div className="alert alert-error">{error}</div>
                <button className="btn btn-primary" onClick={() => navigate('/input')}>
                    ← Go back to Input
                </button>
            </div>
        );
    }

    if (!report) {
         return (
            <div className="page-container">
                <div className="empty-state">
                    <h3>No report generated.</h3>
                    <button className="btn btn-primary" onClick={() => navigate('/input')}>
                        ← Go back to Input
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            {/* Toast Notifications */}
            <NotificationToast notifications={notifications} onDismiss={dismissNotification} />

            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>Analysis Results</h1>
                    <p>Review the detected confidentiality risks and mitigation strategies.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-secondary" onClick={() => navigate('/input')}>
                        ✏️ Edit Architecture
                    </button>
                    <button className="btn btn-secondary" onClick={exportToPDF}>
                        📄 Export PDF
                    </button>
                </div>
            </div>

            {saved && <div className="alert alert-success">✅ Report successfully saved to database!</div>}

            {/* Tab Switcher */}
            <div className="tabs" style={{ marginBottom: '1.5rem' }}>
                <button
                    className={`tab-btn ${activeTab === 'risks' ? 'active' : ''}`}
                    onClick={() => setActiveTab('risks')}
                >
                    ⚠️ Risk Analysis
                </button>
                <button
                    className={`tab-btn ${activeTab === 'mitigations' ? 'active' : ''}`}
                    onClick={() => setActiveTab('mitigations')}
                    style={{ position: 'relative' }}
                >
                    🛡️ Mitigation & Fixes
                    {mitigationReport && liveUnfixedCritical > 0 && (
                        <span style={{
                            position: 'absolute',
                            top: '-4px',
                            right: '-4px',
                            width: '18px',
                            height: '18px',
                            background: '#dc2626',
                            borderRadius: '50%',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            {liveUnfixedCritical}
                        </span>
                    )}
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'risks' && (
                <div ref={reportRef} style={{ padding: '0 0.5rem', marginTop: '1rem' }}>
                    <RiskDistributionCharts risks={report.risks} />
                    <RiskSummaryCards risks={report.risks} />

                    {/* Detected Risks List */}
                    <div className="card">
                        <div className="card-title"><span className="icon">⚠️</span> Rule Engine Detections</div>
                        <RiskTable risks={report.risks} />
                    </div>
                </div>
            )}

            {activeTab === 'mitigations' && (
                <div style={{ marginTop: '1rem' }}>
                    {mitigationLoading ? (
                        <div className="loading-overlay">
                            <span className="loading-spinner" style={{ width: '36px', height: '36px' }}></span>
                            <span>Generating mitigation recommendations...</span>
                        </div>
                    ) : mitigationReport ? (
                        <MitigationPanel 
                            mitigationReport={mitigationReport} 
                            onStepsChange={(completed) => {
                                const counts = getUnfixedCounts(mitigationReport, completed);
                                setLiveUnfixedCritical(counts.critical);
                            }}
                        />
                    ) : (
                        <div className="empty-state">
                            <div className="empty-icon">🛡️</div>
                            <h3>Mitigation engine unavailable</h3>
                            <p>The mitigation engine could not generate recommendations. Make sure the backend is running.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Save to DB Component */}
            {!saved && (
                <div className="card" style={{ marginTop: '2rem', border: '1px dashed var(--accent-primary)' }}>
                    <div className="card-title"><span className="icon">💾</span> Save Report to Database</div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                        Store this architecture and analysis report in your historical dashboard.
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'end' }}>
                        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                            <label>Architecture Name</label>
                            <input
                                className="form-input"
                                placeholder="e.g. My Secure Web App v1"
                                value={saveName}
                                onChange={(e) => setSaveName(e.target.value)}
                            />
                        </div>
                        <button className="btn btn-primary" onClick={handleSaveToDatabase} disabled={saving || !saveName.trim()}>
                            {saving ? 'Saving...' : 'Save Report'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
