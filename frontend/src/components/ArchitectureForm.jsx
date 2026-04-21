import { useState } from 'react';

const COMPONENT_TYPES = ['frontend', 'backend', 'database', 'api', 'third-party'];

const defaultComponent = { 
    name: '', type: 'backend', 
    stores_sensitive_data: false, has_authentication: true,
    is_untrusted: false, has_hardcoded_credentials: false, 
    logs_sensitive_data: false, exposes_session_tokens: false 
};

const defaultConnection = { 
    source: '', target: '', 
    encrypted: false, has_authentication: true, 
    missing_authorization_headers: false 
};

const defaultRole = { name: '', privileges: '' }; // privileges as a comma-separated string for input

export default function ArchitectureForm({ architecture, onChange }) {
    const components = architecture.components || [];
    const connections = architecture.connections || [];
    const roles = architecture.roles || [];

    const addComponent = () => onChange({ ...architecture, components: [...components, { ...defaultComponent }] });
    const removeComponent = (i) => onChange({ ...architecture, components: components.filter((_, idx) => idx !== i) });
    const updateComponent = (i, field, value) => {
        const updated = [...components];
        updated[i] = { ...updated[i], [field]: value };
        onChange({ ...architecture, components: updated });
    };

    const addConnection = () => onChange({ ...architecture, connections: [...connections, { ...defaultConnection }] });
    const removeConnection = (i) => onChange({ ...architecture, connections: connections.filter((_, idx) => idx !== i) });
    const updateConnection = (i, field, value) => {
        const updated = [...connections];
        updated[i] = { ...updated[i], [field]: value };
        onChange({ ...architecture, connections: updated });
    };

    const addRole = () => onChange({ ...architecture, roles: [...roles, { ...defaultRole }] });
    const removeRole = (i) => onChange({ ...architecture, roles: roles.filter((_, idx) => idx !== i) });
    const updateRole = (i, field, value) => {
        let val = value;
        // Keep it as a raw string for editing, or array if parsed. To make it smooth, we handle string updates and array conversion later.
        // Wait, if it's already an array from JSON, we should join it for the input.
        if (field === 'privileges' && Array.isArray(value)) {
            val = value.join(', ');
        }
        const updated = [...roles];
        
        // When updating from string, store it as array to keep JSON valid. 
        if (field === 'privileges' && typeof value === 'string') {
             updated[i] = { ...updated[i], [field]: value.split(',').map(p => p.trim()).filter(p => p) };
        } else {
             updated[i] = { ...updated[i], [field]: val };
        }
        
        onChange({ ...architecture, roles: updated });
    };

    const getRolePrivilegesString = (rolePrivileges) => {
        if (Array.isArray(rolePrivileges)) return rolePrivileges.join(', ');
        return rolePrivileges || '';
    };

    return (
        <div>
            {/* Roles Section */}
            <div className="card" style={{ marginBottom: '1.5rem', background: 'rgba(99, 102, 241, 0.05)', borderColor: 'rgba(99, 102, 241, 0.2)' }}>
                <div className="card-title">
                    <span className="icon">👥</span> Roles (Access Control)
                </div>
                {roles.map((role, i) => (
                    <div key={i} className="builder-row" style={{ gridTemplateColumns: '1fr 2fr auto' }}>
                        <div className="form-group">
                            <label>Role Name</label>
                            <input
                                className="form-input"
                                placeholder="e.g. Admin"
                                value={role.name || ''}
                                onChange={(e) => updateRole(i, 'name', e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Privileges (comma separated)</label>
                            <input
                                className="form-input"
                                placeholder="e.g. read, write, *"
                                value={getRolePrivilegesString(role.privileges)}
                                onChange={(e) => updateRole(i, 'privileges', e.target.value)}
                            />
                        </div>
                        <button className="btn-remove" onClick={() => removeRole(i)} title="Remove">✕</button>
                    </div>
                ))}
                <button className="btn-add" onClick={addRole}>+ Add Role</button>
            </div>

            {/* Components Section */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-title">
                    <span className="icon">📦</span> Components
                </div>
                {components.map((comp, i) => (
                    <div key={i} style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                        <div className="builder-row" style={{ background: 'transparent', padding: 0, border: 'none', marginBottom: '0.5rem' }}>
                            <div className="form-group">
                                <label>Name</label>
                                <input
                                    className="form-input"
                                    placeholder="e.g. User Dashboard"
                                    value={comp.name || ''}
                                    onChange={(e) => updateComponent(i, 'name', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label>Type</label>
                                <select
                                    className="form-select"
                                    value={comp.type || 'backend'}
                                    onChange={(e) => updateComponent(i, 'type', e.target.value)}
                                >
                                    {COMPONENT_TYPES.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                            <button className="btn-remove" onClick={() => removeComponent(i)} title="Remove" style={{ height: 'max-content', alignSelf: 'end', marginBottom: '0.2rem' }}>✕</button>
                        </div>
                        
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '4px' }}>
                            <div className="form-checkbox">
                                <input type="checkbox" checked={comp.stores_sensitive_data || false} onChange={(e) => updateComponent(i, 'stores_sensitive_data', e.target.checked)} />
                                <label style={{ marginBottom: 0 }}>Stores Sensitive Data</label>
                            </div>
                            <div className="form-checkbox">
                                <input type="checkbox" checked={comp.has_authentication || false} onChange={(e) => updateComponent(i, 'has_authentication', e.target.checked)} />
                                <label style={{ marginBottom: 0 }}>Has Authentication</label>
                            </div>
                            <div className="form-checkbox">
                                <input type="checkbox" checked={comp.is_untrusted || false} onChange={(e) => updateComponent(i, 'is_untrusted', e.target.checked)} />
                                <label style={{ marginBottom: 0, color: 'var(--severity-high)' }} title="E.g., external unverified plugin">Is Untrusted</label>
                            </div>
                            <div className="form-checkbox">
                                <input type="checkbox" checked={comp.has_hardcoded_credentials || false} onChange={(e) => updateComponent(i, 'has_hardcoded_credentials', e.target.checked)} />
                                <label style={{ marginBottom: 0, color: 'var(--severity-high)' }}>Hardcoded Credentials</label>
                            </div>
                            <div className="form-checkbox">
                                <input type="checkbox" checked={comp.logs_sensitive_data || false} onChange={(e) => updateComponent(i, 'logs_sensitive_data', e.target.checked)} />
                                <label style={{ marginBottom: 0, color: 'var(--severity-medium)' }}>Logs Sensitive Data</label>
                            </div>
                            <div className="form-checkbox">
                                <input type="checkbox" checked={comp.exposes_session_tokens || false} onChange={(e) => updateComponent(i, 'exposes_session_tokens', e.target.checked)} />
                                <label style={{ marginBottom: 0, color: 'var(--severity-high)' }}>Exposes Tokens</label>
                            </div>
                        </div>
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
                    <div key={i} style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                        <div className="connection-row" style={{ background: 'transparent', padding: 0, border: 'none', marginBottom: '0.5rem', gridTemplateColumns: '1fr 1fr auto' }}>
                            <div className="form-group">
                                <label>Source Component</label>
                                <input
                                    className="form-input"
                                    placeholder="Source name"
                                    value={conn.source || ''}
                                    onChange={(e) => updateConnection(i, 'source', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label>Target Component</label>
                                <input
                                    className="form-input"
                                    placeholder="Target name"
                                    value={conn.target || ''}
                                    onChange={(e) => updateConnection(i, 'target', e.target.value)}
                                />
                            </div>
                            <button className="btn-remove" onClick={() => removeConnection(i)} title="Remove" style={{ height: 'max-content', alignSelf: 'end', marginBottom: '0.2rem' }}>✕</button>
                        </div>
                        
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginTop: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '4px' }}>
                            <div className="form-checkbox">
                                <input type="checkbox" checked={conn.encrypted || false} onChange={(e) => updateConnection(i, 'encrypted', e.target.checked)} />
                                <label style={{ marginBottom: 0, color: 'var(--success)' }}>Encrypted (TLS)</label>
                            </div>
                            <div className="form-checkbox">
                                <input type="checkbox" checked={conn.has_authentication || false} onChange={(e) => updateConnection(i, 'has_authentication', e.target.checked)} />
                                <label style={{ marginBottom: 0 }}>Has Authentication</label>
                            </div>
                            <div className="form-checkbox">
                                <input type="checkbox" checked={conn.missing_authorization_headers || false} onChange={(e) => updateConnection(i, 'missing_authorization_headers', e.target.checked)} />
                                <label style={{ marginBottom: 0, color: 'var(--severity-medium)' }}>Missing Auth Headers</label>
                            </div>
                        </div>
                    </div>
                ))}
                <button className="btn-add" onClick={addConnection}>+ Add Connection</button>
            </div>
        </div>
    );
}
