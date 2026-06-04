import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api';
import { Card, Button, Input } from '../components/UI';
import { Lock, CheckCircle2 } from 'lucide-react';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [status, setStatus] = useState({ loading: false, success: false, error: '' });

    const uid = searchParams.get('uid');
    const token = searchParams.get('token');

    useEffect(() => {
        if (!uid || !token) {
            setStatus(prev => ({ ...prev, error: 'Invalid or missing secure token parameters in URL.' }));
        }
    }, [uid, token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (password !== confirm) {
            setStatus({ loading: false, success: false, error: 'Passwords do not match.' });
            return;
        }

        setStatus({ loading: true, success: false, error: '' });

        try {
            await api.post('auth/reset-password/confirm/', { uid, token, password });
            setStatus({ loading: false, success: true, error: '' });
        } catch (err) {
            console.error('Password reset confirmation error:', err);
            const msg = err.response?.data?.error || 'Your securely timed link has expired or is invalid. Please request a new one.';
            setStatus({ loading: false, success: false, error: msg });
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-stone-50">
            <div className="w-full max-w-md">
                <Card className="w-full mb-6 py-8">
                    {status.success ? (
                        <div className="text-center space-y-4">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                                <CheckCircle2 className="h-8 w-8 text-green-600" />
                            </div>
                            <h3 className="text-xl font-bold text-stone-900">Password Rewritten</h3>
                            <p className="text-sm text-stone-500 pb-2">
                                Your new credentials have been securely hashed and stored. You may now login.
                            </p>
                            <Link to="/">
                                <Button className="w-full justify-center">Sign In Now</Button>
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="mb-6 text-center">
                                <h2 className="text-xl font-bold text-stone-900 mb-1">Set New Password</h2>
                                <p className="text-stone-500 text-sm">Create a strong, unique password for your account.</p>
                            </div>

                            {status.error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 min-w-[6px] bg-red-500 rounded-full" />
                                    {status.error}
                                </div>
                            )}

                            {!status.error || status.error === 'Passwords do not match.' ? (
                                <>
                                    <Input
                                        label="New Password"
                                        type="password"
                                        icon={Lock}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={8}
                                        autoFocus
                                    />
                                    <Input
                                        label="Confirm Password"
                                        type="password"
                                        icon={Lock}
                                        value={confirm}
                                        onChange={(e) => setConfirm(e.target.value)}
                                        required
                                        minLength={8}
                                    />

                                    <div className="pt-2">
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            className="w-full justify-center text-sm py-3"
                                            disabled={status.loading}
                                        >
                                            {status.loading ? 'Encrypting...' : 'Save New Password'}
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center mt-6">
                                    <Link to="/forgot-password">
                                        <Button variant="secondary" className="w-full justify-center">Request New Link</Button>
                                    </Link>
                                </div>
                            )}
                        </form>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default ResetPassword;
