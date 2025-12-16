import { Check, Shield, X } from 'lucide-react';
import { useMemo } from 'react';
import './PasswordStrengthMeter.scss';

const PasswordStrengthMeter = ({ password }) => {
    // Calculate password strength
    const strength = useMemo(() => {
        if (!password) return { score: 0, label: '', color: '', criteria: [] };

        let score = 0;
        const criteria = [
            { label: 'At least 8 characters', met: password.length >= 8 },
            { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
            { label: 'Contains lowercase letter', met: /[a-z]/.test(password) },
            { label: 'Contains number', met: /[0-9]/.test(password) },
            { label: 'Contains special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
        ];

        score = criteria.filter(c => c.met).length;

        let label = '';
        let color = '';

        if (score === 0) {
            label = '';
            color = '';
        } else if (score === 1) {
            label = 'Very Weak';
            color = 'very-weak';
        } else if (score === 2) {
            label = 'Weak';
            color = 'weak';
        } else if (score === 3) {
            label = 'Fair';
            color = 'fair';
        } else if (score === 4) {
            label = 'Strong';
            color = 'strong';
        } else if (score === 5) {
            label = 'Very Strong';
            color = 'very-strong';
        }

        return { score, label, color, criteria };
    }, [password]);

    if (!password) return null;

    const percentage = (strength.score / 5) * 100;

    return (
        <div className="password-strength-meter">
            {/* Strength Bar */}
            <div className="strength-bar-container">
                <div className="strength-bar-track">
                    <div
                        className={`strength-bar-fill ${strength.color}`}
                        style={{ width: `${percentage}%` }}
                    >
                        <div className="glow-effect"></div>
                    </div>

                    {/* Segment markers */}
                    <div className="segment-markers">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="segment-marker"></div>
                        ))}
                    </div>
                </div>

                {/* Label */}
                {strength.label && (
                    <div className={`strength-label ${strength.color}`}>
                        <Shield size={14} />
                        <span>{strength.label}</span>
                    </div>
                )}
            </div>

            {/* Criteria List */}
            <div className="criteria-list">
                {strength.criteria.map((criterion, index) => (
                    <div
                        key={index}
                        className={`criterion ${criterion.met ? 'met' : 'unmet'}`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                    >
                        <div className="criterion-icon">
                            {criterion.met ? (
                                <Check size={12} />
                            ) : (
                                <X size={12} />
                            )}
                        </div>
                        <span>{criterion.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PasswordStrengthMeter;
