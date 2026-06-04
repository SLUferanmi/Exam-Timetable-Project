import React from 'react';
import { TrendingUp } from 'lucide-react';

export const Card = ({ children, className = '', hover = false, onClick }) => (
    <div
        className={`card-flat rounded-xl p-6 ${hover ? 'card-hover cursor-pointer' : ''} ${className}`}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
    >
        {children}
    </div>
);

export const Button = ({ children, onClick, variant = 'primary', className = '', type = 'button', disabled = false, icon: Icon }) => {
    const baseStyles = "px-5 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
    const variants = {
        primary: "bg-amber-700 text-white hover:bg-amber-800",
        secondary: "bg-white text-stone-700 border border-stone-200 hover:bg-stone-50 hover:text-stone-900",
        outline: "bg-transparent text-amber-700 border border-amber-700 hover:bg-amber-50",
        success: "bg-green-600 text-white hover:bg-green-700",
        danger: "bg-white text-red-600 border border-stone-200 hover:bg-red-50 hover:border-red-200"
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`${baseStyles} ${variants[variant]} ${className}`}
        >
            {Icon && <Icon size={16} />}
            {children}
        </button>
    );
};

export const Input = ({ label, icon: Icon, error, ...props }) => (
    <div className="space-y-1.5 flex-1">
        {label && <label className="text-sm font-medium text-stone-700 ml-0.5">{label}</label>}
        <div className="relative flex items-center">
            {Icon && (
                <div className="absolute left-3 text-stone-400">
                    <Icon size={18} />
                </div>
            )}
            <input
                {...props}
                className={`w-full bg-white border border-stone-200 rounded-lg ${Icon ? 'pl-10' : 'pl-3'} pr-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600/20 focus:border-amber-600 transition-colors ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}`}
            />
        </div>
        {error && <p className="text-red-500 text-xs ml-0.5">{error}</p>}
    </div>
);

export const Badge = ({ children, variant = 'default', className = '' }) => {
    const variants = {
        default: 'bg-stone-100 text-stone-600 border border-stone-200',
        primary: 'bg-amber-50 text-amber-700 border border-amber-200',
        success: 'bg-green-50 text-green-700 border border-green-200',
        warning: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
        danger: 'bg-red-50 text-red-700 border border-red-200'
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${variants[variant]} ${className}`}>
            {children}
        </span>
    );
};

export const StatCard = ({ title, value, icon: Icon, trend, color = 'brown' }) => {
    // Simplified flat design colors
    const colors = {
        brown: 'bg-amber-50 border-amber-100 text-amber-700',
        cream: 'bg-stone-50 border-stone-200 text-stone-700',
        green: 'bg-green-50 border-green-100 text-green-700',
        orange: 'bg-orange-50 border-orange-100 text-orange-700'
    };

    return (
        <div className={`bg-white border border-stone-200 rounded-xl p-5 shadow-sm flex items-start justify-between`}>
            <div>
                <p className="text-stone-500 text-sm font-medium mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-stone-900 mb-1">{value}</h3>
                {trend && (
                    <p className="text-xs text-green-700 font-semibold flex items-center gap-1 mt-0.5">
                        <TrendingUp size={11} />
                        {trend}
                    </p>
                )}
            </div>
            {Icon && (
                <div className={`p-2.5 rounded-lg border ${colors[color]}`}>
                    <Icon size={20} />
                </div>
            )}
        </div>
    );
};

export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
            onClick={onClose}
        >
            <div
                className={`bg-white rounded-2xl shadow-xl w-full ${maxWidth} overflow-hidden`}
                onClick={e => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
                    <h3 className="text-lg font-bold text-stone-900">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
                {/* Modal Body */}
                <div className="px-6 py-5">
                    {children}
                </div>
            </div>
        </div>
    );
};
