const TYPE_ICONS = {
    frontend: '🖥️',
    backend: '⚙️',
    database: '🗄️',
    api: '🔌',
    'third-party': '🌐',
};

export default function ArchitectureGraph({ components, connections }) {
    if (!components || components.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-icon">📐</div>
                <h3>No architecture defined</h3>
                <p>Add components and connections to visualize your architecture.</p>
            </div>
        );
    }

    return (
        <div>
            {/* Component nodes */}
            <div className="arch-graph">
                {components.map((comp, index) => (
                    <div
                        key={index}
                        className={`arch-node ${comp.stores_sensitive_data ? 'sensitive' : ''}`}
                        style={{ animationDelay: `${index * 0.1}s` }}
                    >
                        <span className="node-icon">{TYPE_ICONS[comp.type] || '📦'}</span>
                        <span className="node-name">{comp.name}</span>
                        <span className="node-type">{comp.type}</span>
                    </div>
                ))}
            </div>

            {/* Connections */}
            {connections && connections.length > 0 && (
                <div className="arch-connections">
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 600 }}>
                        DATA FLOWS
                    </h4>
                    {connections.map((conn, index) => (
                        <div key={index} className="arch-connection animate-in" style={{ animationDelay: `${index * 0.05}s` }}>
                            <span style={{ fontWeight: 600 }}>{conn.source}</span>
                            <span className="conn-arrow">→</span>
                            <span style={{ fontWeight: 600 }}>{conn.target}</span>
                            <span className={`conn-status ${conn.encrypted ? 'conn-encrypted' : 'conn-unencrypted'}`}>
                                {conn.encrypted ? '🔒 Encrypted' : '🔓 Unencrypted'}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
