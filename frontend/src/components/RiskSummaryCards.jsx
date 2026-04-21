import React from 'react';

const RiskSummaryCards = ({ risks = [] }) => {
    // We expect risks array to already have `severity` classification from our utility
    const highRisks = risks.filter(r => r.severity === 'High').length;
    const mediumRisks = risks.filter(r => r.severity === 'Medium').length;
    const lowRisks = risks.filter(r => r.severity === 'Low').length;
    const totalRisks = risks.length;

    return (
        <div className="stats-grid" style={{ marginBottom: '2rem' }}>
            <div className="stat-card stat-total" style={{ borderTop: '4px solid #6b7280' }}>
                <div className="stat-value">{totalRisks}</div>
                <div className="stat-label">Total Classified Risks</div>
            </div>
            <div className="stat-card stat-high" style={{ borderTop: '4px solid #ef4444' }}>
                <div className="stat-value" style={{ color: '#ef4444' }}>{highRisks}</div>
                <div className="stat-label">High Severity</div>
            </div>
            <div className="stat-card stat-medium" style={{ borderTop: '4px solid #f97316' }}>
                <div className="stat-value" style={{ color: '#f97316' }}>{mediumRisks}</div>
                <div className="stat-label">Medium Severity</div>
            </div>
            <div className="stat-card stat-low" style={{ borderTop: '4px solid #22c55e' }}>
                <div className="stat-value" style={{ color: '#22c55e' }}>{lowRisks}</div>
                <div className="stat-label">Low Severity</div>
            </div>
        </div>
    );
};

export default RiskSummaryCards;
