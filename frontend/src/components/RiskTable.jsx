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
        <div className="risk-table-wrapper">
            <table className="risk-table">
                <thead>
                    <tr>
                        <th>Severity</th>
                        <th>Rule Triggered</th>
                        <th>Description</th>
                        <th>Affected Components</th>
                        <th>Recommendation</th>
                    </tr>
                </thead>
                <tbody>
                    {risks.map((risk, index) => (
                        <tr key={index} className="animate-in" style={{ animationDelay: `${index * 0.05}s` }}>
                            <td>
                                <span className={`severity-badge severity-${risk.severity}`}>
                                    {risk.severity === 'HIGH' ? '🔴' : risk.severity === 'MEDIUM' ? '🟠' : '🟡'}{' '}
                                    {risk.severity}
                                </span>
                            </td>
                            <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{risk.rule}</td>
                            <td>{risk.description}</td>
                            <td>
                                {risk.affected_components.map((comp, i) => (
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
                            <td style={{ fontSize: '0.85rem' }}>{risk.recommendation}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
