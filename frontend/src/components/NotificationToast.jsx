import React, { useEffect, useState } from 'react';

/**
 * NotificationToast — a floating toast notification system.
 * 
 * Usage:
 *   <NotificationToast notifications={[{ id, type, title, message }]} onDismiss={fn} />
 * 
 * Types: 'critical', 'warning', 'info', 'success'
 */

const TYPE_CONFIG = {
    critical: {
        icon: '🚨',
        bg: 'linear-gradient(135deg, rgba(220, 38, 38, 0.95), rgba(185, 28, 28, 0.95))',
        border: 'rgba(239, 68, 68, 0.4)',
        glow: '0 0 30px rgba(239, 68, 68, 0.3)',
    },
    warning: {
        icon: '⚠️',
        bg: 'linear-gradient(135deg, rgba(217, 119, 6, 0.95), rgba(180, 83, 9, 0.95))',
        border: 'rgba(249, 115, 22, 0.4)',
        glow: '0 0 30px rgba(249, 115, 22, 0.3)',
    },
    info: {
        icon: 'ℹ️',
        bg: 'linear-gradient(135deg, rgba(59, 130, 246, 0.95), rgba(37, 99, 235, 0.95))',
        border: 'rgba(59, 130, 246, 0.4)',
        glow: '0 0 30px rgba(59, 130, 246, 0.3)',
    },
    success: {
        icon: '✅',
        bg: 'linear-gradient(135deg, rgba(22, 163, 74, 0.95), rgba(21, 128, 61, 0.95))',
        border: 'rgba(34, 197, 94, 0.4)',
        glow: '0 0 30px rgba(34, 197, 94, 0.3)',
    },
};

function SingleToast({ notification, onDismiss }) {
    const [visible, setVisible] = useState(false);
    const [exiting, setExiting] = useState(false);

    const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.info;

    useEffect(() => {
        // Trigger entrance animation
        requestAnimationFrame(() => setVisible(true));

        // Auto dismiss after 6s
        const timer = setTimeout(() => handleDismiss(), 6000);
        return () => clearTimeout(timer);
    }, []);

    const handleDismiss = () => {
        setExiting(true);
        setTimeout(() => onDismiss(notification.id), 300);
    };

    return (
        <div
            className={`notification-toast ${visible ? 'toast-enter' : ''} ${exiting ? 'toast-exit' : ''}`}
            style={{
                background: config.bg,
                borderColor: config.border,
                boxShadow: config.glow,
            }}
        >
            <div className="toast-icon">{config.icon}</div>
            <div className="toast-body">
                {notification.title && <div className="toast-title">{notification.title}</div>}
                <div className="toast-message">{notification.message}</div>
            </div>
            <button className="toast-close" onClick={handleDismiss}>✕</button>
        </div>
    );
}

export default function NotificationToast({ notifications = [], onDismiss }) {
    if (notifications.length === 0) return null;

    return (
        <div className="notification-container">
            {notifications.map(n => (
                <SingleToast key={n.id} notification={n} onDismiss={onDismiss} />
            ))}
        </div>
    );
}

/**
 * Helper: generate alert notifications from a mitigation report.
 */
export function generateAlerts(mitigationReport) {
    if (!mitigationReport) return [];

    const alerts = [];
    let id = 0;

    // Critical alert if health score is very low
    if (mitigationReport.health_score < 40) {
        alerts.push({
            id: id++,
            type: 'critical',
            title: 'Architecture at Risk',
            message: `Health score is ${mitigationReport.health_score}/100 (Grade ${mitigationReport.health_grade}). Immediate action required.`,
        });
    }

    // Critical actions alert
    if (mitigationReport.critical_actions > 0) {
        alerts.push({
            id: id++,
            type: 'critical',
            title: `${mitigationReport.critical_actions} Critical Issue${mitigationReport.critical_actions > 1 ? 's' : ''} Found`,
            message: 'These issues pose immediate confidentiality threats. Address them before deployment.',
        });
    }

    // High actions warning
    if (mitigationReport.high_actions > 0) {
        alerts.push({
            id: id++,
            type: 'warning',
            title: `${mitigationReport.high_actions} High-Priority Fix${mitigationReport.high_actions > 1 ? 'es' : ''} Needed`,
            message: 'High-priority issues require prompt attention to maintain data confidentiality.',
        });
    }

    // Success if clean
    if (mitigationReport.total_risks === 0) {
        alerts.push({
            id: id++,
            type: 'success',
            title: 'All Clear!',
            message: 'No confidentiality risks detected. Your architecture looks solid.',
        });
    } else if (mitigationReport.health_score >= 75) {
        alerts.push({
            id: id++,
            type: 'info',
            title: 'Good Health Score',
            message: `Architecture scores ${mitigationReport.health_score}/100. See improvement suggestions below.`,
        });
    }

    return alerts;
}
