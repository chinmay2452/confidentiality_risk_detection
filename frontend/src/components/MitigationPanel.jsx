import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'mitigation_completed_steps';

export const loadCompletedSteps = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
};

const saveCompletedSteps = (steps) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(steps));
    } catch {
        // localStorage unavailable — silent fail
    }
};

/**
 * Check if all steps for a given mitigation index are completed.
 */
const isMitigationFixed = (mitigationIdx, stepCount, completed) => {
    if (stepCount === 0) return false;
    for (let si = 0; si < stepCount; si++) {
        if (!completed[`${mitigationIdx}-${si}`]) return false;
    }
    return true;
};

/**
 * Compute remaining unfixed counts by priority from a mitigation report + completed steps.
 * Export so parent components (like the tab badge) can use it.
 */
export const getUnfixedCounts = (mitigationReport, completed) => {
    if (!mitigationReport || !mitigationReport.mitigations) {
        return { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
    }
    let critical = 0, high = 0, medium = 0, low = 0;
    mitigationReport.mitigations.forEach((m, idx) => {
        if (!isMitigationFixed(idx, m.steps.length, completed)) {
            if (m.priority === 'CRITICAL') critical++;
            else if (m.priority === 'HIGH') high++;
            else if (m.priority === 'MEDIUM') medium++;
            else low++;
        }
    });
    return { critical, high, medium, low, total: critical + high + medium + low };
};

const CATEGORY_CONFIG = {
    encryption: { icon: '🔒', label: 'Encryption', color: '#6366f1' },
    'access-control': { icon: '🛡️', label: 'Access Control', color: '#8b5cf6' },
    architecture: { icon: '🏗️', label: 'Architecture', color: '#3b82f6' },
    'data-handling': { icon: '📦', label: 'Data Handling', color: '#06b6d4' },
    secrets: { icon: '🔑', label: 'Secrets Mgmt', color: '#f59e0b' },
    monitoring: { icon: '📡', label: 'Monitoring', color: '#10b981' },
    general: { icon: '⚙️', label: 'General', color: '#64748b' },
};

const PRIORITY_CONFIG = {
    CRITICAL: { color: '#dc2626', bg: 'rgba(220, 38, 38, 0.12)', icon: '🚨' },
    HIGH:     { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', icon: '🔴' },
    MEDIUM:   { color: '#f97316', bg: 'rgba(249, 115, 22, 0.12)', icon: '🟠' },
    LOW:      { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)', icon: '🟢' },
};

const EFFORT_CONFIG = {
    LOW:    { label: 'Quick Fix', color: '#22c55e' },
    MEDIUM: { label: 'Moderate', color: '#f97316' },
    HIGH:   { label: 'Major Effort', color: '#ef4444' },
};

export default function MitigationPanel({ mitigationReport, onStepsChange }) {
    const [expandedIdx, setExpandedIdx] = useState(null);
    const [filterPriority, setFilterPriority] = useState('ALL');
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [completedSteps, setCompletedSteps] = useState(loadCompletedSteps);

    // Persist to localStorage and notify parent whenever completedSteps changes
    useEffect(() => {
        saveCompletedSteps(completedSteps);
        if (onStepsChange) {
            onStepsChange(completedSteps);
        }
    }, [completedSteps]);

    if (!mitigationReport || !mitigationReport.mitigations) {
        return (
            <div className="empty-state">
                <div className="empty-icon">🛡️</div>
                <h3>No mitigation data</h3>
                <p>Run the analysis engine to generate mitigation suggestions.</p>
            </div>
        );
    }

    const { mitigations, health_score, health_grade } = mitigationReport;

    // Compute live remaining counts based on which mitigations have all steps completed
    const liveCounts = getUnfixedCounts(mitigationReport, completedSteps);
    const critical_actions = liveCounts.critical;
    const high_actions = liveCounts.high;
    const medium_actions = liveCounts.medium;
    const low_actions = liveCounts.low;

    const toggleExpand = (idx) => {
        setExpandedIdx(expandedIdx === idx ? null : idx);
    };

    const toggleStep = (mitigationIdx, stepIdx) => {
        const key = `${mitigationIdx}-${stepIdx}`;
        setCompletedSteps(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Filters
    let filtered = mitigations;
    if (filterPriority !== 'ALL') {
        filtered = filtered.filter(m => m.priority === filterPriority);
    }
    if (filterCategory !== 'ALL') {
        filtered = filtered.filter(m => m.category === filterCategory);
    }

    // Health score ring
    const healthColor = health_score >= 75 ? '#22c55e' : health_score >= 50 ? '#f97316' : '#ef4444';
    const circumference = 2 * Math.PI * 54;
    const dashOffset = circumference - (health_score / 100) * circumference;

    // Unique categories from data
    const categories = [...new Set(mitigations.map(m => m.category))];

    return (
        <div className="mitigation-panel">
            {/* Health Score + Action Priority Summary */}
            <div className="mitigation-header">
                <div className="health-score-card card">
                    <div className="health-ring-container">
                        <svg width="130" height="130" viewBox="0 0 130 130">
                            <circle cx="65" cy="65" r="54" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                            <circle
                                cx="65" cy="65" r="54"
                                fill="none"
                                stroke={healthColor}
                                strokeWidth="8"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={dashOffset}
                                transform="rotate(-90 65 65)"
                                style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                            />
                        </svg>
                        <div className="health-ring-text">
                            <span className="health-score-value" style={{ color: healthColor }}>{health_score}</span>
                            <span className="health-grade" style={{ color: healthColor }}>{health_grade}</span>
                        </div>
                    </div>
                    <div className="health-label">Architecture Health</div>
                </div>

                <div className="priority-summary">
                    <div className="priority-stat" style={{ borderLeft: '4px solid #dc2626' }}>
                        <span className="priority-count" style={{ color: '#dc2626' }}>{critical_actions}</span>
                        <span className="priority-label">Critical</span>
                    </div>
                    <div className="priority-stat" style={{ borderLeft: '4px solid #ef4444' }}>
                        <span className="priority-count" style={{ color: '#ef4444' }}>{high_actions}</span>
                        <span className="priority-label">High</span>
                    </div>
                    <div className="priority-stat" style={{ borderLeft: '4px solid #f97316' }}>
                        <span className="priority-count" style={{ color: '#f97316' }}>{medium_actions}</span>
                        <span className="priority-label">Medium</span>
                    </div>
                    <div className="priority-stat" style={{ borderLeft: '4px solid #22c55e' }}>
                        <span className="priority-count" style={{ color: '#22c55e' }}>{low_actions}</span>
                        <span className="priority-label">Low</span>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="mitigation-filters">
                <div className="filter-group">
                    <label>Priority</label>
                    <select
                        className="form-select"
                        value={filterPriority}
                        onChange={e => setFilterPriority(e.target.value)}
                        style={{ minWidth: '140px' }}
                    >
                        <option value="ALL">All Priorities</option>
                        <option value="CRITICAL">🚨 Critical</option>
                        <option value="HIGH">🔴 High</option>
                        <option value="MEDIUM">🟠 Medium</option>
                        <option value="LOW">🟢 Low</option>
                    </select>
                </div>
                <div className="filter-group">
                    <label>Category</label>
                    <select
                        className="form-select"
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                        style={{ minWidth: '160px' }}
                    >
                        <option value="ALL">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>
                                {CATEGORY_CONFIG[cat]?.icon || '⚙️'} {CATEGORY_CONFIG[cat]?.label || cat}
                            </option>
                        ))}
                    </select>
                </div>
                <span className="filter-result-count">
                    Showing {filtered.length} of {mitigations.length} mitigations
                </span>
            </div>

            {/* Mitigation Cards */}
            <div className="mitigation-list">
                {filtered.map((m, idx) => {
                    const actualIdx = mitigations.indexOf(m);
                    const isExpanded = expandedIdx === actualIdx;
                    const priConf = PRIORITY_CONFIG[m.priority] || PRIORITY_CONFIG.MEDIUM;
                    const catConf = CATEGORY_CONFIG[m.category] || CATEGORY_CONFIG.general;
                    const effConf = EFFORT_CONFIG[m.effort] || EFFORT_CONFIG.MEDIUM;

                    const completedCount = m.steps.filter((_, si) => completedSteps[`${actualIdx}-${si}`]).length;
                    const progress = m.steps.length > 0 ? (completedCount / m.steps.length) * 100 : 0;

                    return (
                        <div
                            key={actualIdx}
                            className={`mitigation-card card animate-in ${isExpanded ? 'expanded' : ''}`}
                            style={{ animationDelay: `${idx * 0.05}s`, borderLeft: `4px solid ${priConf.color}` }}
                        >
                            {/* Card Header */}
                            <div className="mitigation-card-header" onClick={() => toggleExpand(actualIdx)}>
                                <div className="mitigation-card-left">
                                    <span className="mitigation-priority-badge" style={{ background: priConf.bg, color: priConf.color }}>
                                        {priConf.icon} {m.priority}
                                    </span>
                                    <span className="mitigation-category-tag" style={{ color: catConf.color }}>
                                        {catConf.icon} {catConf.label}
                                    </span>
                                    <span className="mitigation-effort-tag" style={{ color: effConf.color }}>
                                        ⏱️ {effConf.label}
                                    </span>
                                </div>
                                <span className="mitigation-expand-icon">{isExpanded ? '▲' : '▼'}</span>
                            </div>

                            <h3 className="mitigation-rule-name">{m.rule}</h3>
                            <p className="mitigation-description">{m.description}</p>

                            {/* Primary Fix */}
                            <div className="mitigation-primary-fix">
                                <span className="fix-label">💡 Recommended Fix</span>
                                <span className="fix-text">{m.primary_fix}</span>
                            </div>

                            {/* Affected Components */}
                            {m.affected_components && m.affected_components.length > 0 && (
                                <div className="mitigation-affected">
                                    {m.affected_components.map((comp, ci) => (
                                        <span key={ci} className="affected-tag">{comp}</span>
                                    ))}
                                </div>
                            )}

                            {/* Progress Bar */}
                            {m.steps.length > 0 && (
                                <div className="mitigation-progress-bar">
                                    <div className="progress-track">
                                        <div
                                            className="progress-fill"
                                            style={{ width: `${progress}%`, background: progress === 100 ? '#22c55e' : 'var(--accent-gradient)' }}
                                        />
                                    </div>
                                    <span className="progress-label">{completedCount}/{m.steps.length} steps</span>
                                </div>
                            )}

                            {/* Expanded Steps */}
                            {isExpanded && m.steps.length > 0 && (
                                <div className="mitigation-steps">
                                    <h4 className="steps-heading">📋 Implementation Steps</h4>
                                    {m.steps.map((step, si) => {
                                        const stepKey = `${actualIdx}-${si}`;
                                        const done = completedSteps[stepKey];
                                        return (
                                            <div key={si} className={`mitigation-step ${done ? 'step-done' : ''}`}>
                                                <button
                                                    className="step-checkbox"
                                                    onClick={(e) => { e.stopPropagation(); toggleStep(actualIdx, si); }}
                                                    style={{ 
                                                        background: done ? 'var(--accent-gradient)' : 'transparent',
                                                        border: done ? 'none' : '2px solid var(--border-color)',
                                                    }}
                                                >
                                                    {done && '✓'}
                                                </button>
                                                <div className="step-content">
                                                    <div className="step-action">{step.action}</div>
                                                    <div className="step-detail">{step.detail}</div>
                                                    {step.tool_or_reference && (
                                                        <div className="step-reference">
                                                            🔗 {step.tool_or_reference}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {filtered.length === 0 && (
                <div className="empty-state" style={{ padding: '2rem' }}>
                    <p>No mitigations match the selected filters.</p>
                </div>
            )}
        </div>
    );
}
