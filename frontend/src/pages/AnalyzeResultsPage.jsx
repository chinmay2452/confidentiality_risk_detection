import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import RiskTable from '../components/RiskTable';
import { analyzeArchitecture, saveArchitecture } from '../api/api';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export default function AnalyzeResultsPage() {
    const navigate = useNavigate();
    const [architecture, setArchitecture] = useState(null);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [saveName, setSaveName] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    
    const reportRef = useRef(null);

    useEffect(() => {
        const storedJsonStr = sessionStorage.getItem('pending_analysis_json');
        
        if (!storedJsonStr) {
            setError('No architecture data found. Please input architecture first.');
            setLoading(false);
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
        setSaved(false);
        try {
            const result = await analyzeArchitecture(data);
            setReport(result);
            // Optionally clear the pending analysis if we assert it's consumed
            // sessionStorage.removeItem('pending_analysis_json'); 
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

    const handleSaveToDatabase = async () => {
        if (!architecture || !saveName.trim()) {
            alert('Please provide an architecture name to save.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            await saveArchitecture(saveName, architecture);
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

            <div ref={reportRef} style={{ padding: '0 0.5rem' }}>
                {/* Severity Classification */}
                <div className="stats-grid">
                    <div className="stat-card stat-total">
                        <div className="stat-value">{report.total_risks}</div>
                        <div className="stat-label">Total Risks</div>
                    </div>
                    <div className="stat-card stat-high">
                        <div className="stat-value">{report.high_risks}</div>
                        <div className="stat-label">High Severity</div>
                    </div>
                    <div className="stat-card stat-medium">
                        <div className="stat-value">{report.medium_risks}</div>
                        <div className="stat-label">Medium Severity</div>
                    </div>
                    <div className="stat-card stat-low">
                        <div className="stat-value">{report.low_risks}</div>
                        <div className="stat-label">Low Severity</div>
                    </div>
                </div>

                {/* Detected Risks List */}
                <div className="card">
                    <div className="card-title"><span className="icon">⚠️</span> Rule Engine Detections</div>
                    <RiskTable risks={report.risks} />
                </div>
            </div>

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
