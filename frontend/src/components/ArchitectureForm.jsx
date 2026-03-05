import { useState } from 'react';

const COMPONENT_TYPES = ['frontend', 'backend', 'database', 'api', 'third-party'];

const defaultComponent = { name: '', type: 'backend', stores_sensitive_data: false, has_authentication: true };
const defaultConnection = { source: '', target: '', encrypted: false, has_authentication: true };

export default function ArchitectureForm({ onSubmit }) {
    const [components, setComponents] = useState([{ ...defaultComponent }]);
    const [connections, setConnections] = useState([{ ...defaultConnection }]);

    const addComponent = () => setComponents([...components, { ...defaultComponent }]);
    const removeComponent = (i) => setComponents(components.filter((_, idx) => idx !== i));

    const updateComponent = (i, field, value) => {
        const updated = [...components];
        updated[i] = { ...updated[i], [field]: value };
        setComponents(updated);
    };

    const addConnection = () => setConnections([...connections, { ...defaultConnection }]);
    const removeConnection = (i) => setConnections(connections.filter((_, idx) => idx !== i));

    const updateConnection = (i, field, value) => {
        const updated = [...connections];
        updated[i] = { ...updated[i], [field]: value };
        setConnections(updated);
    };

    const handleSubmit = () => {
        const validComponents = components.filter((c) => c.name.trim());
        const validConnections = connections.filter((c) => c.source.trim() && c.target.trim());
        if (validComponents.length === 0) {
            alert('Please add at least one component with a name.');
            return;
        }
        onSubmit({ components: validComponents, connections: validConnections });
    };

    return (
        <div>
            {/* Components Section */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-title">
                    <span className="icon">📦</span> Components
                </div>
                {components.map((comp, i) => (
                    <div key={i} className="builder-row">
                        <div className="form-group">
                            <label>Name</label>
                            <input
                                className="form-input"
                                placeholder="e.g. User Dashboard"
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
                                {COMPONENT_TYPES.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <div className="form-checkbox">
                                <input
                                    type="checkbox"
                                    checked={comp.stores_sensitive_data}
                                    onChange={(e) => updateComponent(i, 'stores_sensitive_data', e.target.checked)}
                                />
                                <label style={{ marginBottom: 0 }}>Sensitive</label>
                            </div>
                        </div>
                        <button className="btn-remove" onClick={() => removeComponent(i)} title="Remove">✕</button>
                    </div>
                ))}
                <button className="btn-add" onClick={addComponent}>+ Add Component</button>
            </div>

            {/* Connections Section */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-title">
                    <span className="icon">🔗</span> Connections
                </div>
                {connections.map((conn, i) => (
                    <div key={i} className="connection-row">
                        <div className="form-group">
                            <label>Source</label>
                            <input
                                className="form-input"
                                placeholder="Source component"
                                value={conn.source}
                                onChange={(e) => updateConnection(i, 'source', e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Target</label>
                            <input
                                className="form-input"
                                placeholder="Target component"
                                value={conn.target}
                                onChange={(e) => updateConnection(i, 'target', e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <div className="form-checkbox">
                                <input
                                    type="checkbox"
                                    checked={conn.encrypted}
                                    onChange={(e) => updateConnection(i, 'encrypted', e.target.checked)}
                                />
                                <label style={{ marginBottom: 0 }}>Encrypted</label>
                            </div>
                        </div>
                        <div className="form-group">
                            <div className="form-checkbox">
                                <input
                                    type="checkbox"
                                    checked={conn.has_authentication}
                                    onChange={(e) => updateConnection(i, 'has_authentication', e.target.checked)}
                                />
                                <label style={{ marginBottom: 0 }}>Auth</label>
                            </div>
                        </div>
                        <button className="btn-remove" onClick={() => removeConnection(i)} title="Remove">✕</button>
                    </div>
                ))}
                <button className="btn-add" onClick={addConnection}>+ Add Connection</button>
            </div>

            <button className="btn btn-primary" onClick={handleSubmit} style={{ width: '100%' }}>
                🔍 Analyze Architecture
            </button>
        </div>
    );
}
