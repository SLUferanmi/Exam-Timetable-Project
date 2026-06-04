import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Card, Button, Input } from '../components/UI';
import { Mail, ShieldCheck } from 'lucide-react';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState({ loading: false, success: false, error: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ loading: true, success: false, error: '' });

        try {
            await api.post('auth/reset-password/request/', { email });
            setStatus({ loading: false, success: true, error: '' });
        } catch (err) {
            console.error('Password reset request error:', err);
            // Always show success on the frontend to prevent email enumeration attacks
            setStatus({ loading: false, success: true, error: '' });
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-stone-50">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center mb-4">
                        <svg width="56" height="56" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="ExamScheduler logo">
                            <rect width="36" height="36" rx="8" fill="#92400E" />
                            <rect x="7" y="11" width="22" height="17" rx="2.5" fill="none" stroke="#FEF3C7" strokeWidth="1.8" />
                            <line x1="7" y1="16" x2="29" y2="16" stroke="#FEF3C7" strokeWidth="1.5" />
                            <line x1="12" y1="9" x2="12" y2="13.5" stroke="#FEF3C7" strokeWidth="1.8" strokeLinecap="round" />
                            <line x1="24" y1="9" x2="24" y2="13.5" stroke="#FEF3C7" strokeWidth="1.8" strokeLinecap="round" />
                            <rect x="10" y="19.5" width="4" height="3" rx="0.8" fill="#FEF3C7" opacity="0.6" />
                            <rect x="16" y="19.5" width="4" height="3" rx="0.8" fill="#FEF3C7" />
                            <rect x="22" y="19.5" width="4" height="3" rx="0.8" fill="#FEF3C7" opacity="0.4" />
                            <rect x="10" y="24.5" width="4" height="2.5" rx="0.8" fill="#FEF3C7" opacity="0.9" />
                            <rect x="16" y="24.5" width="4" height="2.5" rx="0.8" fill="#FEF3C7" opacity="0.5" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight mb-1 text-stone-900">
                        Secure Password Reset
                    </h1>
                    <p className="text-stone-400 text-xs font-medium tracking-wide uppercase">ExamScheduler &mdash; Elizade University</p>
                </div>

                <Card className="w-full mb-6 py-8">
                    {status.success ? (
                        <div className="text-center space-y-4">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                                <Mail className="h-8 w-8 text-green-600" />
                            </div>
                            <h3 className="text-lg font-medium text-stone-900">Check your email</h3>
                            <p className="text-sm text-stone-500 pb-2">
                                If <strong>{email}</strong> is registered, a secure reset link has been dispatched.
                            </p>
                            <Link to="/">
                                <Button className="w-full justify-center">Return to Login</Button>
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="mb-6 text-center">
                                <p className="text-stone-500 text-sm">
                                    Enter your registered email address and we'll send you a securely timed link to reset your password.
                                </p>
                            </div>

                            <Input
                                label="Email Address"
                                type="email"
                                icon={Mail}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@examscheduler.edu"
                                autoFocus
                                required
                            />

                            <div className="pt-2">
                                <Button
                                    type="submit"
                                    variant="primary"
                                    className="w-full justify-center text-sm py-3"
                                    disabled={status.loading}
                                >
                                    {status.loading ? 'Transmitting Request...' : 'Send Secure Reset Link'}
                                </Button>
                            </div>
                            <div className="text-center mt-4">
                                <Link to="/" className="text-sm font-medium text-amber-700 hover:text-amber-800">
                                    Cancel and return to login
                                </Link>
                            </div>
                        </form>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default ForgotPassword;
