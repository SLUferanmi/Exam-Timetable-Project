import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    FilePlus,
    LogOut,
    GraduationCap,
    BookMarked,
    Building2,
    UsersRound,
} from 'lucide-react';

// Custom ExamScheduler logomark — calendar grid with academic accent
const LogoMark = () => (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
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
);

const SidebarItem = ({ icon: Icon, label, path, active }) => {
    return (
        <Link
            to={path}
            className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-150 cursor-pointer ${active
                ? 'bg-amber-50 text-amber-900 font-semibold border border-amber-200/70'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100 font-medium border border-transparent'
                }`}
        >
            <Icon
                size={17}
                className={`shrink-0 ${active ? 'text-amber-700' : 'text-stone-400'}`}
                strokeWidth={active ? 2.2 : 1.8}
            />
            <span className="text-sm">{label}</span>
        </Link>
    );
};

const Layout = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };

    return (
        <div className="flex h-screen bg-stone-50 text-stone-900 overflow-hidden">
            {/* Sidebar */}
            <div className="w-60 bg-white border-r border-stone-200 flex flex-col z-10 relative no-print">
                {/* Logo */}
                <div className="px-5 py-5 border-b border-stone-100">
                    <div className="flex items-center space-x-3">
                        <LogoMark />
                        <div>
                            <h1 className="text-base font-bold text-stone-900 tracking-tight leading-none mb-0.5"
                                style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>
                                ExamScheduler
                            </h1>
                            <p className="text-[11px] text-stone-400 font-medium tracking-wide uppercase">
                                Admin Portal
                            </p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-3 py-5 overflow-y-auto space-y-6">
                    {/* Main */}
                    <div className="space-y-0.5">
                        <SidebarItem
                            icon={LayoutDashboard}
                            label="Dashboard"
                            path="/dashboard"
                            active={location.pathname === '/dashboard'}
                        />
                        <SidebarItem
                            icon={FilePlus}
                            label="New Project"
                            path="/new-project"
                            active={location.pathname === '/new-project'}
                        />
                    </div>

                    {/* Global Management */}
                    <div>
                        <p className="px-3 mb-2 text-[10px] font-bold tracking-widest text-stone-400 uppercase">
                            Global Catalog
                        </p>
                        <div className="space-y-0.5">
                            <SidebarItem
                                icon={BookMarked}
                                label="Courses"
                                path="/manage/courses"
                                active={location.pathname.startsWith('/manage/courses')}
                            />
                            <SidebarItem
                                icon={Building2}
                                label="Venues"
                                path="/manage/venues"
                                active={location.pathname.startsWith('/manage/venues')}
                            />
                            <SidebarItem
                                icon={UsersRound}
                                label="Students"
                                path="/manage/students"
                                active={location.pathname.startsWith('/manage/students')}
                            />
                        </div>
                    </div>
                </nav>

                {/* Logout */}
                <div className="p-3 border-t border-stone-100">
                    <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 text-stone-500 hover:text-red-700 transition-colors px-3 py-2.5 w-full rounded-lg hover:bg-red-50 border border-transparent hover:border-red-100 cursor-pointer"
                    >
                        <LogOut size={17} strokeWidth={1.8} className="text-stone-400 shrink-0" />
                        <span className="font-medium text-sm">Sign Out</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto bg-stone-50">
                <div className="p-8 max-w-7xl mx-auto h-full">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Layout;
