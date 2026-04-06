import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    Users,
    BookOpen,
    BarChart3,
    LogOut,
    GraduationCap,
    Database,
    Building2,
    Layers,
    ChevronRight,
    Menu
} from 'lucide-react';
import './DashboardLayout.css';

const DashboardLayout = () => {
    const { user } = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleLogout = () => {
        dispatch(logout());
    };

    const menuItems = {
        Admin: [
            { name: 'Command Center', path: '/admin', icon: LayoutDashboard },
            { name: 'Data Pipeline', path: '/admin/imports', icon: Database },
            { name: 'Departments', path: '/admin/departments', icon: Building2 },
            { name: 'Batches', path: '/admin/batches', icon: GraduationCap },
            { name: 'Subjects', path: '/admin/subjects', icon: Layers },
            { name: 'Staff Management', path: '/admin/staff', icon: Users },
            { name: 'Staff Mappings', path: '/admin/mappings', icon: Layers },
        ],
        Faculty: [
            { name: 'Academic Hub', path: '/faculty', icon: BookOpen },
        ],
        // Mentors can also access /faculty (they may teach subjects) — App.js line 43
        Mentor: [
            { name: 'Academic Hub', path: '/faculty', icon: BookOpen },
            { name: 'Student Analytics', path: '/mentor', icon: BarChart3 },
        ],
        Student: [
            { name: 'My Dashboard', path: '/student', icon: LayoutDashboard },
        ],
    };

    const currentItems = menuItems[user?.role] || [];

    return (
        <div className="flex min-h-screen">
            <div className="bg-mesh"></div>

            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`w-[280px] border-r border-border-subtle/30 flex flex-col glass fixed h-full z-50 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="p-8 flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 ring-1 ring-white/20">
                        <GraduationCap className="text-white" size={28} />
                    </div>
                    <div>
                        <span className="text-2xl font-black font-outfit tracking-tighter text-white block leading-none">SLAA</span>
                        <span className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase mt-1 block">Analytics Platform</span>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-8 space-y-1.5 overflow-y-auto">
                    <p className="px-5 text-[10px] font-bold text-text-dim uppercase tracking-widest mb-4">Main Menu</p>
                    {currentItems.map((item) => {
                        // Check if current path matches item path OR is a sub-route
                        // Special case: Command Center (/admin) shouldn't catch everything
                        const isActive = item.path === '/admin'
                            ? location.pathname === '/admin'
                            : location.pathname.startsWith(item.path);

                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsSidebarOpen(false)}
                                className={`flex items-center justify-between px-5 py-3.5 rounded-2xl transition-all duration-150 group ${isActive
                                    ? 'bg-primary/10 text-white border border-primary/20 sidebar-active-glow'
                                    : 'text-text-muted hover:bg-white/5 hover:text-white border border-transparent'
                                    }`}
                            >
                                <div className="flex items-center gap-3.5">
                                    <item.icon size={20} className={isActive ? 'text-primary' : 'group-hover:text-primary transition-colors'} />
                                    <span className="font-semibold text-sm tracking-wide">{item.name}</span>
                                </div>
                                {isActive && <ChevronRight size={14} className="text-primary animate-in fade-in slide-in-from-left-2 duration-200" />}
                            </NavLink>
                        );
                    })}
                </nav>

                <div className="p-6 border-t border-border-subtle/30">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3.5 px-5 py-4 w-full rounded-2xl text-text-dim hover:bg-danger/10 hover:text-danger border border-transparent hover:border-danger/20 transition-all duration-300 group"
                    >
                        <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
                        <span className="font-bold text-sm">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 lg:ml-[280px] flex flex-col min-h-screen relative w-full overflow-x-hidden">
                {/* Top Navbar */}
                <header className="h-20 lg:h-24 border-b border-border-subtle/20 flex items-center justify-between px-6 lg:px-10 glass sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <button
                            className="lg:hidden p-2 text-white hover:bg-white/10 rounded-xl"
                            onClick={() => setIsSidebarOpen(true)}
                        >
                            <Menu size={24} />
                        </button>
                        <div className="animate-slide-up">
                            <h2 className="text-lg lg:text-xl font-bold text-white font-outfit flex items-center gap-2">
                                Hello, <span className="text-primary hidden sm:inline">{user?.name}</span>
                                <span className="animate-bounce">👋</span>
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="w-2 h-2 rounded-full bg-success"></span>
                                <p className="text-[10px] text-text-muted font-bold uppercase tracking-[0.15em] hidden sm:block">{user?.role} Portal • Active Session</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-white">{user?.email}</p>
                            <p className="text-[10px] text-primary font-black uppercase tracking-widest mt-0.5">{user?.staff_id || user?.roll_no}</p>
                        </div>
                        <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-gradient-to-tr from-bg-surface-light to-bg-surface p-0.5 ring-1 ring-border-subtle/50 overflow-hidden">
                            <div className="w-full h-full rounded-[14px] bg-bg-surface flex items-center justify-center font-bold text-primary font-outfit text-base lg:text-lg overflow-hidden">
                                {user?.profile_pic ? (
                                    <img src={user.profile_pic} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                    user?.name?.charAt(0)
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Dynamic Content */}
                <div className="p-4 md:p-6 lg:p-10 max-w-7xl mx-auto w-full flex-1">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
