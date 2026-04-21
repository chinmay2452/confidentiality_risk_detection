export default function RiskTable({ risks }) {
    if (!risks || risks.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-icon">✅</div>
                <h3>No risks detected</h3>
                <p>Your architecture passed all confidentiality checks.</p>
            </div>
        );
    }

    return (
        <div className="risk-table-wrapper" style={{ overflowX: 'auto', paddingBottom: '1rem' }}>
            <table className="risk-table">
                <thead>
                    <tr>
                        <th>Severity</th>
                        <th style={{ textAlign: 'center' }}>Score</th>
                        <th>Rule Triggered</th>
                        <th>Summary</th>
                        <th>Affected Modules</th>
                    </tr>
                </thead>
                <tbody>
                    {risks.map((risk, index) => {
                        let badgeColor = '#22c55e'; // default green (low)
                        let badgeIcon = '🟢';
                        
                        if (risk.severity === 'High') {
                            badgeColor = '#ef4444'; // red
                            badgeIcon = '🔴';
                        } else if (risk.severity === 'Medium') {
                            badgeColor = '#f97316'; // orange
                            badgeIcon = '🟠';
                        }

                        // Parse affected modules to array if needed to render nicely
                        let modules = risk.affected_components || risk.affectedComponent || risk.sourceModule || [];
                        if (!Array.isArray(modules)) {
                             // Try making it an array based on source/dest if present
                             if (risk.sourceModule && risk.destinationModule) {
                                 modules = [risk.sourceModule, risk.destinationModule];
                             } else if (modules) {
                                 modules = [modules];
                             }
                        }

                        return (
                            <tr key={index} className="animate-in" style={{ animationDelay: `${index * 0.05}s` }}>
                                <td>
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '4px',
                                        background: `var(--bg-glass)`,
                                        border: `1px solid ${badgeColor}`,
                                        color: badgeColor,
                                        fontWeight: 600,
                                        fontSize: '0.85rem'
                                    }}>
                                        {badgeIcon} {risk.severity}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{risk.score ?? '-'}</td>
                                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{risk.rule || risk.riskName}</td>
                                <td style={{ fontSize: '0.9rem' }}>{risk.summary || risk.description}</td>
                                <td>
                                    {modules.map((comp, i) => (
                                        <span key={i} style={{
                                            display: 'inline-block',
                                            padding: '0.15rem 0.5rem',
                                            background: 'var(--bg-glass)',
                                            borderRadius: '4px',
                                            marginRight: '0.35rem',
                                            marginBottom: '0.25rem',
                                            fontSize: '0.8rem',
                                            border: '1px solid var(--border-color)',
                                        }}>
                                            {comp}
                                        </span>
                                    ))}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
