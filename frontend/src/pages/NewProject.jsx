import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Card, Button, Input } from '../components/UI';
import api from '../api';
import { FilePlus, ArrowRight } from 'lucide-react';

const NewProject = () => {
    const navigate = useNavigate();
    const [projectData, setProjectData] = useState({
        name: '',
        academic_session: '',
        semester: ''
    });
    const [loading, setLoading] = useState(false);

    const handleCreateProject = async () => {
        setLoading(true);
        try {
            const res = await api.post('projects/', projectData);
            // Redirect to setup page immediately
            navigate(`/project/${res.data.id}/setup`);
        } catch (e) {
            console.error(e);
            alert('Failed to create project');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="max-w-2xl mx-auto">
                <div className="mb-8">
                    <h2 className="text-4xl font-bold text-stone-900 mb-2">Create New Project</h2>
                    <p className="text-stone-600 text-lg">
                        Start by entering your project details, then you'll configure dates, courses, and halls
                    </p>
                </div>

                <Card className="glass-strong p-8">
                    <div className="space-y-6">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 rounded-2xl bg-amber-900/10 border border-amber-200 mx-auto mb-4 flex items-center justify-center">
                                <svg width="32" height="32" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                    <rect x="7" y="11" width="22" height="17" rx="2.5" fill="none" stroke="#92400E" strokeWidth="2" />
                                    <line x1="7" y1="16" x2="29" y2="16" stroke="#92400E" strokeWidth="1.8" />
                                    <line x1="12" y1="9" x2="12" y2="13.5" stroke="#92400E" strokeWidth="2" strokeLinecap="round" />
                                    <line x1="24" y1="9" x2="24" y2="13.5" stroke="#92400E" strokeWidth="2" strokeLinecap="round" />
                                    <rect x="10" y="19.5" width="4" height="3" rx="0.8" fill="#92400E" opacity="0.5" />
                                    <rect x="16" y="19.5" width="4" height="3" rx="0.8" fill="#92400E" opacity="0.9" />
                                    <rect x="22" y="19.5" width="4" height="3" rx="0.8" fill="#92400E" opacity="0.3" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-stone-900 mb-2">Project Information</h3>
                            <p className="text-stone-600">Enter the basic details for your timetable project</p>
                        </div>

                        <Input
                            label="Project Name"
                            value={projectData.name}
                            onChange={e => setProjectData({ ...projectData, name: e.target.value })}
                            placeholder="e.g. First Semester 2023/2024 Final Exams"
                            required
                        />
                        <Input
                            label="Academic Session"
                            value={projectData.academic_session}
                            onChange={e => setProjectData({ ...projectData, academic_session: e.target.value })}
                            placeholder="2023/2024"
                            required
                        />
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-stone-700 ml-0.5">Semester</label>
                            <select
                                value={projectData.semester}
                                onChange={e => setProjectData({ ...projectData, semester: e.target.value })}
                                className="w-full bg-white border border-stone-200 rounded-lg pl-3 pr-8 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600/20 focus:border-amber-600 transition-colors"
                                required
                            >
                                <option value="">Select a semester...</option>
                                <option value="First Semester">First Semester</option>
                                <option value="Second Semester">Second Semester</option>
                            </select>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
                            <p className="text-sm text-amber-800">
                                <strong>Next steps:</strong> After creating the project, you'll be able to:
                            </p>
                            <ul className="text-sm text-amber-700 mt-2 ml-4 list-disc">
                                <li>Set exam start and end dates</li>
                                <li>Add/edit courses and halls</li>
                                <li>Configure scheduling constraints</li>
                                <li>Generate your timetable</li>
                            </ul>
                        </div>

                        <div className="flex justify-between pt-6">
                            <Button
                                onClick={() => navigate('/dashboard')}
                                variant="secondary"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateProject}
                                disabled={loading || !projectData.name || !projectData.academic_session || !projectData.semester}
                                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
                            >
                                {loading ? 'Creating...' : 'Create Project & Continue Setup'}
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </Layout>
    );
};

export default NewProject;
