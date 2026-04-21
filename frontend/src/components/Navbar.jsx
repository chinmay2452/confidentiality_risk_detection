import { NavLink } from 'react-router-dom';

export default function Navbar() {
    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <div className="brand-icon">🛡️</div>
                <span>Risk Detector</span>
            </div>
            <div className="navbar-links">
                <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''} end>
                    Dashboard
                </NavLink>
                <NavLink to="/input" className={({ isActive }) => isActive ? 'active' : ''}>
                    Input Architecture
                </NavLink>
                <NavLink to="/analyze" className={({ isActive }) => isActive ? 'active' : ''}>
                    Analyze Results
                </NavLink>
                <NavLink to="/mitigate" className={({ isActive }) => isActive ? 'active' : ''}>
                    Mitigations
                </NavLink>
            </div>
        </nav>
    );
}
