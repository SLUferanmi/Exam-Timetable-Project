import React, { useEffect, useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Card, Button, StatCard, Badge } from '../components/UI';
import { Plus, Calendar, Clock, ArrowRight, Users, BookOpen, Building2, Layers } from 'lucide-react';

const Dashboard = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ courses: 0, halls: 0 });
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const projectsRes = await api.get('projects/');
                const allProjects = projectsRes.data
                    .filter(p => p.name !== "University Master Data")
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                setProjects(allProjects);

                // Fetch per-project course and hall counts in parallel
                if (allProjects.length > 0) {
                    const perProject = await Promise.all(
                        allProjects.map(p => Promise.all([
                            api.get(`courses/?project=${p.id}&page_size=1`),
                            api.get(`halls/?project=${p.id}&page_size=1`),
                        ]))
                    );
                    const totalCourses = perProject.reduce((sum, [c]) =>
                        sum + (c.data.count ?? c.data.length ?? 0), 0);
                    const totalHalls = perProject.reduce((sum, [, h]) =>
                        sum + (h.data.count ?? h.data.length ?? 0), 0);
                    setStats({ courses: totalCourses, halls: totalHalls });
                }
            } catch (err) {
                console.error('Failed to fetch dashboard data', err);
                if (err.response?.status === 403 || err.response?.status === 401) {
                    localStorage.removeItem('token');
                    navigate('/');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [navigate]);

    return (
        <Layout>
            {/* Header */}
            <div className="mb-8">
                <div className="mb-2">
                    <h2 className="text-3xl font-bold tracking-tight text-stone-900">Dashboard</h2>
                </div>
                <p className="text-stone-500 font-medium">Manage your examination schedules with intelligent automation</p>
            </div>

            {/* Stats Grid — 3 cards, all real data */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <StatCard
                    title="Total Projects"
                    value={loading ? '…' : projects.length}
                    icon={Building2}
                    color="brown"
                    trend="Active"
                />
                <StatCard
                    title="Courses Across Projects"
                    value={loading ? '…' : stats.courses}
                    icon={BookOpen}
                    color="green"
                />
                <StatCard
                    title="Halls Across Projects"
                    value={loading ? '…' : stats.halls}
                    icon={Layers}
                    color="cream"
                />
            </div>

            {/* Action Bar */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-bold text-stone-900 mb-1">Your Projects</h3>
                    <p className="text-stone-500 text-sm font-medium">Create and manage examination timetables</p>
                </div>
                <Button
                    onClick={() => navigate('/new-project')}
                    variant="primary"
                    icon={Plus}
                >
                    Create New Project
                </Button>
            </div>

            {/* Projects Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white border border-stone-200 rounded-xl p-6 h-64 animate-pulse">
                            <div className="h-6 bg-stone-100 rounded w-3/4 mb-4" />
                            <div className="h-4 bg-stone-100 rounded w-1/2 mb-2" />
                            <div className="h-4 bg-stone-100 rounded w-2/3" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Create New Card */}
                    <div
                        onClick={() => navigate('/new-project')}
                        className="bg-stone-50 border-2 border-dashed border-stone-200 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-amber-50 hover:border-amber-300 transition-colors duration-200 group min-h-[280px]"
                    >
                        <div className="w-14 h-14 rounded-full bg-white border border-stone-200 flex items-center justify-center group-hover:border-amber-300 transition-colors mb-4 shadow-sm">
                            <Plus className="text-stone-400 group-hover:text-amber-600 transition-colors" size={28} />
                        </div>
                        <span className="text-stone-700 font-bold group-hover:text-amber-700 transition-colors">Start New Timetable</span>
                        <p className="text-stone-500 text-sm mt-1">Click to create</p>
                    </div>

                    {/* Project Cards */}
                    {projects.map((project) => (
                        <Card
                            key={project.id}
                            className="group flex flex-col min-h-[280px] hover:border-amber-300"
                            onClick={() => navigate(`/project/${project.id}`)}
                            hover={true}
                        >
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center border border-amber-200">
                                        <Calendar size={20} className="text-amber-700" />
                                    </div>
                                    <Badge variant="primary">Active</Badge>
                                </div>

                                <h3 className="text-lg font-bold text-stone-900 mb-4 group-hover:text-amber-700 transition-colors line-clamp-2">
                                    {project.name}
                                </h3>

                                <div className="space-y-2 mt-auto">
                                    <div className="flex items-center text-stone-600 text-sm">
                                        <BookOpen size={14} className="mr-2 text-stone-400" />
                                        <span className="font-medium">{project.academic_session}</span>
                                        <span className="mx-2 text-stone-300">•</span>
                                        <span className="text-stone-500">{project.semester}</span>
                                    </div>
                                    <div className="flex items-center text-stone-500 text-sm">
                                        <Clock size={14} className="mr-2 text-stone-400" />
                                        <span>Created {new Date(project.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="mt-5 pt-4 border-t border-stone-100 flex justify-between items-center group-hover:border-amber-100 transition-colors">
                                <span className="text-xs font-mono text-stone-400">ID: {project.id}</span>
                                <span className="text-sm text-amber-700 font-semibold group-hover:text-amber-800 flex items-center gap-1">
                                    View Details
                                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                </span>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {!loading && projects.length === 0 && (
                <div className="bg-white border border-stone-200 rounded-xl text-center py-16 px-6">
                    <div className="w-16 h-16 bg-stone-100 rounded-full mx-auto mb-4 flex items-center justify-center border border-stone-200">
                        <Calendar size={32} className="text-stone-400" />
                    </div>
                    <h3 className="text-xl font-bold text-stone-900 mb-2">No Projects Yet</h3>
                    <p className="text-stone-500 mb-6 text-sm">Get started by creating your first examination timetable</p>
                    <Button onClick={() => navigate('/new-project')} variant="primary" icon={Plus}>
                        Create Project
                    </Button>
                </div>
            )}
        </Layout>
    );
};

export default Dashboard;
