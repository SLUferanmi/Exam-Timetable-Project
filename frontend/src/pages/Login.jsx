import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { Card, Button, Input } from '../components/UI';
import { User, Lock } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await api.post('auth/login/', { username, password });
            console.log('Login response:', response.data);

            login(response.data); // PASSING THE ENTIRE RESPONSE DATA FOR TOKENS & USER INFO
            navigate('/dashboard');
        } catch (err) {
            console.error('Login error:', err);
            setError('Invalid credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-stone-50">
            <div className="w-full max-w-md">
                {/* Logo Section */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center mb-4">
                        <svg width="60" height="60" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="ExamScheduler logo">
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
                    <h1 className="text-4xl font-bold tracking-tight mb-2 text-stone-900">
                        ExamScheduler
                    </h1>
                    <p className="text-stone-400 text-sm font-medium tracking-wide uppercase">
                        Elizade University &mdash; Admin Portal
                    </p>
                </div>

                {/* Login Card */}
                <Card className="w-full mb-6 py-8">
                    <div className="mb-6 text-center">
                        <h2 className="text-xl font-bold text-stone-900 mb-1">Welcome Back</h2>
                        <p className="text-stone-500 text-sm">Sign in to manage your examination schedules</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <Input
                            label="Username"
                            icon={User}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your username"
                            autoFocus
                            required
                        />

                        <div className="space-y-1">
                            <Input
                                label="Password"
                                icon={Lock}
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                            />
                            <div className="flex justify-end">
                                <Link to="/forgot-password" className="text-xs font-medium text-amber-700 hover:text-amber-800">
                                    Forgot your password?
                                </Link>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                                {error}
                            </div>
                        )}

                        <div className="pt-2">
                            <Button
                                type="submit"
                                variant="primary"
                                className="w-full justify-center text-sm py-3"
                                disabled={loading}
                            >
                                {loading ? 'Signing in...' : 'Sign In'}
                            </Button>
                        </div>
                    </form>
                </Card>

                {/* Footer */}
                <div className="text-center text-stone-400 text-xs font-medium space-y-1 mt-8">
                    <p>Elizade University • Examination Management System</p>
                    <p>© 2026 ExamScheduler. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
