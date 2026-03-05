import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getReport } from '../api/api';
import RiskTable from '../components/RiskTable';
import ArchitectureGraph from '../components/ArchitectureGraph';

export default function ReportPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchReport();
    }, [id]);

    const fetchReport = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await getReport(id);
            setReport(data);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to load report.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="page-container">
                <div className="loading-overlay">
                    <span className="loading-spinner" style={{ width: '36px', height: '36px' }}></span>
                    <span>Loading report...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="page-container">
                <div className="alert alert-error">{error}</div>
                <button className="btn btn-secondary" onClick={() => navigate('/')}>
                    ← Back to Dashboard
                </button>
            </div>
        );
    }

    const risks = report?.risks_json;

    return (
        <div className="page-container">
            <div className="page-header">
                <button className="btn btn-secondary btn-sm" onClick={() => navigate('/')} style={{ marginBottom: '1rem' }}>
                    ← Back to Dashboard
                </button>
                <h1>Risk Report</h1>
                <p>Report ID: {id}</p>
                {risks?.architecture_name && (
                    <p style={{ color: 'var(--accent-primary-hover)', fontWeight: 600 }}>
                        Architecture: {risks.architecture_name}
                    </p>
                )}
            </div>

            {risks && (
                <>
                    {/* Stats */}
                    <div className="stats-grid">
                        <div className="stat-card stat-total">
                            <div className="stat-value">{risks.total_risks}</div>
                            <div className="stat-label">Total Risks</div>
                        </div>
                        <div className="stat-card stat-high">
                            <div className="stat-value">{risks.high_risks}</div>
                            <div className="stat-label">High</div>
                        </div>
                        <div className="stat-card stat-medium">
                            <div className="stat-value">{risks.medium_risks}</div>
                            <div className="stat-label">Medium</div>
                        </div>
                        <div className="stat-card stat-low">
                            <div className="stat-value">{risks.low_risks}</div>
                            <div className="stat-label">Low</div>
                        </div>
                    </div>

                    {/* Risk Details */}
                    <div className="card animate-in">
                        <div className="card-title"><span className="icon">⚠️</span> Detected Risks</div>
                        <RiskTable risks={risks.risks} />
                    </div>

                    {/* Analyzed At */}
                    {risks.analyzed_at && (
                        <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                            Analyzed: {new Date(risks.analyzed_at).toLocaleString()}
                        </p>
                    )}
                </>
            )}
        </div>
    );
}
