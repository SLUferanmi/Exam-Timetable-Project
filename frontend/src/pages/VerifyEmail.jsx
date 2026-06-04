import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api';
import { Card, Button } from '../components/UI';
import { ShieldAlert, ShieldCheck, Loader2 } from 'lucide-react';

const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState({ loading: true, success: false, error: '' });
    const hasAttempted = useRef(false);

    const uid = searchParams.get('uid');
    const token = searchParams.get('token');

    useEffect(() => {
        if (!uid || !token) {
            setStatus({ loading: false, success: false, error: 'Invalid or missing secure verification token.' });
            return;
        }

        // Only fire once in React StrictMode
        if (hasAttempted.current) return;
        hasAttempted.current = true;

        const verify = async () => {
            try {
                await api.post('auth/email/verify/', { uid, token });
                setStatus({ loading: false, success: true, error: '' });
            } catch (err) {
                console.error('Email verification error:', err);
                const msg = err.response?.data?.error || 'Your security token is invalid or has expired.';
                setStatus({ loading: false, success: false, error: msg });
            }
        };

        verify();
    }, [uid, token]);

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-stone-50">
            <div className="w-full max-w-md">
                <Card className="w-full mb-6 py-8 text-center">
                    {status.loading ? (
                        <div className="space-y-4">
                            <Loader2 className="mx-auto h-12 w-12 text-amber-600 animate-spin" />
                            <h3 className="text-xl font-bold text-stone-900">Verifying security token...</h3>
                            <p className="text-sm text-stone-500">Please do not close this window.</p>
                        </div>
                    ) : status.success ? (
                        <div className="space-y-4">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-6">
                                <ShieldCheck className="h-8 w-8 text-green-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-stone-900 mb-2">Email Verified</h3>
                            <p className="text-stone-500 pb-4">
                                Your account is now fully secured and verified. You have complete access to the ExamScheduler system.
                            </p>
                            <Link to="/dashboard">
                                <Button className="w-full justify-center">Proceed to Dashboard</Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-6">
                                <ShieldAlert className="h-8 w-8 text-red-600" />
                            </div>
                            <h3 className="text-xl font-bold text-stone-900 mb-2">Verification Failed</h3>
                            <p className="text-stone-600 pb-4">{status.error}</p>
                            <Link to="/dashboard">
                                <Button variant="secondary" className="w-full justify-center">Return to App</Button>
                            </Link>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default VerifyEmail;
