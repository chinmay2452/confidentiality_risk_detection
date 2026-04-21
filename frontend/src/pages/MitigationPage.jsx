import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MitigationPanel from '../components/MitigationPanel';
import NotificationToast, { generateAlerts } from '../components/NotificationToast';
import { mitigateArchitecture } from '../api/api';

export default function MitigationPage() {
    const navigate = useNavigate();
    const [mitigationReport, setMitigationReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        const storedJsonStr = sessionStorage.getItem('pending_analysis_json');

        if (!storedJsonStr) {
            setError('No architecture data found. Please define an architecture first.');
            setLoading(false);
            return;
        }

        try {
            const parsed = JSON.parse(storedJsonStr);
            fetchMitigation(parsed);
        } catch (e) {
            setError('Invalid architecture data.');
            setLoading(false);
        }
    }, []);

    const fetchMitigation = async (architectureData) => {
        setLoading(true);
        setError('');
        try {
            const report = await mitigateArchitecture(architectureData);
            setMitigationReport(report);

            // Generate alerts
            const alerts = generateAlerts(report);
            setNotifications(alerts);
        } catch (err) {
            let errMsg = 'Mitigation analysis failed. Is the backend running?';
            if (err.response?.data?.detail) {
                errMsg = typeof err.response.data.detail === 'string'
                    ? err.response.data.detail
                    : JSON.stringify(err.response.data.detail);
            }
            setError(errMsg);
        } finally {
            setLoading(false);
        }
    };

    const dismissNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    if (loading) {
        return (
            <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '4rem' }}>
                <span className="loading-spinner" style={{ width: '48px', height: '48px', marginBottom: '1.5rem' }}></span>
                <h2>Generating Mitigation Report...</h2>
                <p style={{ color: 'var(--text-muted)' }}>Analyzing risks and computing remediation strategies.</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="page-container">
                <div className="alert alert-error">{error}</div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                    <button className="btn btn-primary" onClick={() => navigate('/input')}>
                        🏗️ Define Architecture
                    </button>
                    <button className="btn btn-secondary" onClick={() => navigate('/analyze')}>
                        ⚠️ View Analysis
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <NotificationToast notifications={notifications} onDismiss={dismissNotification} />

            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>Mitigation Recommendations</h1>
                    <p>Actionable security fixes prioritized by severity and implementation effort.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-secondary" onClick={() => navigate('/analyze')}>
                        ⚠️ Risk Analysis
                    </button>
                    <button className="btn btn-secondary" onClick={() => navigate('/input')}>
                        ✏️ Edit Architecture
                    </button>
                </div>
            </div>

            <MitigationPanel mitigationReport={mitigationReport} />
        </div>
    );
}
