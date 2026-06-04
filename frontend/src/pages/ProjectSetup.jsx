import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button, Badge } from '../components/UI';
import api from '../api';
import { ArrowLeft, Calendar, BookMarked, Building2, CheckCircle2, AlertCircle, Plus, Pencil, Trash2, Settings } from 'lucide-react';

const ProjectSetup = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [activeTab, setActiveTab] = useState('dates');
    const [loading, setLoading] = useState(true);
    const [isSampleMode, setIsSampleMode] = useState(false);
    const [togglingMode, setTogglingMode] = useState(false);

    // Date state
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [generatingSlots, setGeneratingSlots] = useState(false);

    // Data state
    const [courses, setCourses] = useState([]);
    const [coursesPage, setCoursesPage] = useState(1);
    const [coursesMeta, setCoursesMeta] = useState({ count: 0, next: null, previous: null });
    const [halls, setHalls] = useState([]);
    const [constraints, setConstraints] = useState([]);

    // Modal state
    const [showCourseModal, setShowCourseModal] = useState(false);
    const [showHallModal, setShowHallModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    const COURSES_PAGE_SIZE = 25;

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchCourses = async (pageNum = 1) => {
        const coursesRes = await api.get(
            `courses/?project=${id}&page=${pageNum}&page_size=${COURSES_PAGE_SIZE}`
        );
        setCourses(coursesRes.data.results || []);
        setCoursesMeta({
            count: coursesRes.data.count || 0,
            next: coursesRes.data.next,
            previous: coursesRes.data.previous,
        });
        setCoursesPage(pageNum);
    };

    const fetchData = async () => {
        try {
            const pRes = await api.get(`projects/${id}/`);
            setProject(pRes.data);
            setStartDate(pRes.data.exam_start_date || '');
            setEndDate(pRes.data.exam_end_date || '');
            setIsSampleMode(pRes.data.is_sample_mode || false);

            const [hallsRes, constraintsRes] = await Promise.all([
                api.get(`halls/?project=${id}`),
                api.get(`constraints/?project=${id}`)
            ]);

            setHalls(hallsRes.data);
            setConstraints(constraintsRes.data);
            await fetchCourses(1);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateTimeslots = async () => {
        if (!startDate || !endDate) {
            alert('Please select both start and end dates');
            return;
        }

        setGeneratingSlots(true);
        try {
            const response = await api.post(`projects/${id}/generate_timeslots/`, {
                start_date: startDate,
                end_date: endDate
            });

            alert(`Generated ${response.data.timeslots_created} timeslots for ${response.data.exam_days} exam days`);
            await fetchData();
        } catch (error) {
            console.error('Error generating timeslots:', error);
            alert(error.response?.data?.error || 'Failed to generate timeslots');
        } finally {
            setGeneratingSlots(false);
        }
    };

    const handleDeleteCourse = async (courseId) => {
        if (!confirm('Are you sure you want to delete this course?')) return;

        try {
            await api.delete(`courses/${courseId}/`);
            await fetchData();
        } catch (error) {
            console.error('Error deleting course:', error);
            alert('Failed to delete course');
        }
    };

    const handleDeleteHall = async (hallId) => {
        if (!confirm('Are you sure you want to delete this hall?')) return;

        try {
            await api.delete(`halls/${hallId}/`);
            await fetchData();
        } catch (error) {
            console.error('Error deleting hall:', error);
            alert('Failed to delete hall');
        }
    };

    const handleToggleConstraint = async (constraintId, currentEnabled) => {
        try {
            const constraint = constraints.find(c => c.id === constraintId);
            await api.patch(`constraints/${constraintId}/`, {
                enabled: !currentEnabled
            });
            await fetchData();
        } catch (error) {
            console.error('Error toggling constraint:', error);
            alert('Failed to update constraint');
        }
    };

    const handleSaveCourse = async (courseData) => {
        try {
            if (editingItem) {
                await api.patch(`courses/${editingItem.id}/`, courseData);
            } else {
                await api.post('courses/', { ...courseData, project: id });
            }
            setShowCourseModal(false);
            setEditingItem(null);
            await fetchData();
        } catch (error) {
            console.error('Error saving course:', error);
            alert('Failed to save course');
        }
    };

    const handleSaveHall = async (hallData) => {
        try {
            if (editingItem) {
                await api.patch(`halls/${editingItem.id}/`, hallData);
            } else {
                await api.post('halls/', { ...hallData, project: id });
            }
            setShowHallModal(false);
            setEditingItem(null);
            await fetchData();
        } catch (error) {
            console.error('Error saving hall:', error);
            alert('Failed to save hall');
        }
    };

    const handleToggleSampleMode = async (enable) => {
        if (!confirm(enable ? 'Switch to 32-course sample dataset? This will replace current courses and halls for this project.' : 'Restore full catalog? This will replace the sample data with the global catalog.')) return;
        
        setTogglingMode(true);
        try {
            await api.post(`projects/${id}/toggle_sample_mode/`, { enable });
            await fetchData();
        } catch (error) {
            console.error('Error toggling sample mode:', error);
            alert('Failed to toggle sample mode');
        } finally {
            setTogglingMode(false);
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-stone-200 rounded w-1/3" />
                    <div className="h-64 bg-stone-200 rounded" />
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="bg-white border border-stone-200 shadow-sm rounded-xl p-6">
                    <button
                        onClick={() => navigate(`/project/${id}`)}
                        className="flex items-center gap-2 text-stone-600 hover:text-stone-900 mb-4"
                    >
                        <ArrowLeft size={20} />
                        Back to Timetable
                    </button>

                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-stone-900">{project?.name} - Setup</h1>
                            <p className="text-stone-600 mt-1">Configure exam dates, data, and constraints</p>
                        </div>
                        <Button
                            onClick={() => navigate(`/project/${id}`)}
                            variant="primary"
                        >
                            View Timetable
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white border border-stone-200 shadow-sm rounded-xl p-6">
                    <div className="flex gap-2 border-b border-stone-200 mb-6">
                        {[
                            { id: 'dates', label: 'Exam Dates', icon: Calendar },
                            { id: 'courses', label: 'Courses', icon: BookMarked },
                            { id: 'halls', label: 'Halls', icon: Building2 },
                            { id: 'constraints', label: 'Constraints', icon: Settings }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${activeTab === tab.id
                                    ? 'border-amber-600 text-amber-600'
                                    : 'border-transparent text-stone-600 hover:text-stone-900'
                                    }`}
                            >
                                <tab.icon size={18} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Dates Tab */}
                    {activeTab === 'dates' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-stone-900">Exam Period</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-stone-700 mb-2">
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-stone-700 mb-2">
                                        End Date
                                    </label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                                    />
                                </div>
                            </div>
                            <Button
                                onClick={handleGenerateTimeslots}
                                disabled={generatingSlots || !startDate || !endDate}
                                className="mt-4"
                            >
                                {generatingSlots ? 'Generating...' : 'Generate Timeslots'}
                            </Button>
                            <p className="text-sm text-stone-600 mt-2">
                                Creates 3 time slots per day (8:15-10:15, 11am-1pm, 2pm-5pm) for Monday-Saturday
                            </p>
                        </div>
                    )}

                    {/* Courses Tab */}
                    {activeTab === 'courses' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h2 className="text-lg font-semibold text-stone-900">Courses ({coursesMeta.count})</h2>
                                <div className="flex items-center gap-4">
                                    <SampleToggle isSampleMode={isSampleMode} onToggle={handleToggleSampleMode} loading={togglingMode} />
                                    <Button onClick={() => { setEditingItem(null); setShowCourseModal(true); }}>
                                        <Plus size={18} className="mr-2" />
                                        Add Course
                                    </Button>
                                </div>
                            </div>
                            
                            {isSampleMode && (
                                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-start gap-3">
                                    <AlertCircle size={20} className="mt-0.5 text-amber-600" />
                                    <div>
                                        <p className="font-semibold">Sample Mode active &mdash; 32 test courses across 6 departments.</p>
                                        <p className="text-sm mt-1">Generate will use only this dataset. <button onClick={() => handleToggleSampleMode(false)} className="underline hover:text-amber-900 font-medium">Switch to Full Catalog</button></p>
                                    </div>
                                </div>
                            )}

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-stone-50">
                                        <tr>
                                            <th className="text-left p-3 text-sm font-semibold text-stone-700">Code</th>
                                            <th className="text-left p-3 text-sm font-semibold text-stone-700">Title</th>
                                            <th className="text-left p-3 text-sm font-semibold text-stone-700">Department</th>
                                            <th className="text-left p-3 text-sm font-semibold text-stone-700">Students</th>
                                            <th className="text-right p-3 text-sm font-semibold text-stone-700">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {courses.map(course => (
                                            <tr key={course.id} className="border-t border-stone-200">
                                                <td className="p-3 text-sm font-medium">{course.code}</td>
                                                <td className="p-3 text-sm">{course.title}</td>
                                                <td className="p-3 text-sm">{course.department}</td>
                                                <td className="p-3 text-sm">{course.required_capacity}</td>
                                                <td className="p-3 text-right">
                                                    <button
                                                        onClick={() => { setEditingItem(course); setShowCourseModal(true); }}
                                                        className="text-amber-600 hover:text-amber-700 mr-3"
                                                    >
                                                        <Pencil size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCourse(course.id)}
                                                        className="text-red-600 hover:text-red-700"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex items-center justify-between mt-4">
                                <Button
                                    variant="secondary"
                                    disabled={!coursesMeta.previous}
                                    onClick={() => fetchCourses(Math.max(1, coursesPage - 1))}
                                >
                                    Previous
                                </Button>
                                <span className="text-sm text-stone-600">
                                    Page {coursesPage} of {Math.max(1, Math.ceil((coursesMeta.count || 0) / COURSES_PAGE_SIZE))}
                                </span>
                                <Button
                                    variant="primary"
                                    disabled={!coursesMeta.next}
                                    onClick={() => fetchCourses(coursesPage + 1)}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Halls Tab */}
                    {activeTab === 'halls' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-lg font-semibold text-stone-900">Halls ({halls.length})</h2>
                                    <p className="text-xs text-stone-400">Toggle halls to include in this project</p>
                                </div>
                                <SampleToggle isSampleMode={isSampleMode} onToggle={handleToggleSampleMode} loading={togglingMode} />
                            </div>
                            
                            {isSampleMode && (
                                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-start gap-3">
                                    <AlertCircle size={20} className="mt-0.5 text-amber-600" />
                                    <div>
                                        <p className="font-semibold">Sample Mode active &mdash; 5 selected test halls.</p>
                                        <p className="text-sm mt-1">Generate will use only this dataset. <button onClick={() => handleToggleSampleMode(false)} className="underline hover:text-amber-900 font-medium">Switch to Full Catalog</button></p>
                                    </div>
                                </div>
                            )}

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-stone-50">
                                        <tr>
                                            <th className="text-left p-3 text-sm font-semibold text-stone-700">Status</th>
                                            <th className="text-left p-3 text-sm font-semibold text-stone-700">Name</th>
                                            <th className="text-left p-3 text-sm font-semibold text-stone-700">Total Capacity</th>
                                            <th className="text-left p-3 text-sm font-semibold text-stone-700">Single Course</th>
                                            <th className="text-left p-3 text-sm font-semibold text-stone-700">Mixed Courses</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {halls.map(hall => (
                                            <tr key={hall.id} className="border-t border-stone-200">
                                                <td className="p-3">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={hall.enabled} 
                                                        onChange={async () => {
                                                            try {
                                                                await api.patch(`halls/${hall.id}/`, { enabled: !hall.enabled });
                                                                await fetchData();
                                                            } catch (err) {
                                                                console.error("Error toggling hall:", err);
                                                                alert("Failed to update hall status");
                                                            }
                                                        }}
                                                        className="w-5 h-5 text-amber-600 accent-amber-600 rounded focus:ring-amber-500 cursor-pointer"
                                                    />
                                                </td>
                                                <td className="p-3 text-sm font-medium text-stone-900">{hall.name}</td>
                                                <td className="p-3 text-sm text-stone-600">{hall.capacity}</td>
                                                <td className="p-3 text-sm text-stone-500">{hall.exam_capacity_single ?? '—'}</td>
                                                <td className="p-3 text-sm text-stone-500">{hall.exam_capacity_mixed ?? '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Constraints Tab */}
                    {activeTab === 'constraints' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-stone-900">Scheduling Constraints</h2>
                            <p className="text-sm text-stone-600">
                                Select which constraints should be applied when generating the timetable
                            </p>
                            <div className="space-y-3">
                                {constraints.map(constraint => (
                                    <div
                                        key={constraint.id}
                                        className="flex items-center justify-between p-4 bg-white rounded-lg border border-stone-200"
                                    >
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={constraint.enabled}
                                                onChange={() => handleToggleConstraint(constraint.id, constraint.enabled)}
                                                className="w-5 h-5 text-amber-600 accent-amber-600 rounded focus:ring-amber-500"
                                            />
                                            <div>
                                                <div className="font-medium text-stone-900">
                                                    {constraint.constraint_label}
                                                </div>
                                            </div>
                                        </div>
                                        {constraint.enabled ? (
                                            <CheckCircle2 className="text-green-600" size={20} />
                                        ) : (
                                            <AlertCircle className="text-stone-400" size={20} />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Course Modal */}
                {showCourseModal && (
                    <CourseModal
                        course={editingItem}
                        onSave={handleSaveCourse}
                        onClose={() => { setShowCourseModal(false); setEditingItem(null); }}
                    />
                )}

                {/* Hall Modal */}
                {showHallModal && (
                    <HallModal
                        hall={editingItem}
                        onSave={handleSaveHall}
                        onClose={() => { setShowHallModal(false); setEditingItem(null); }}
                    />
                )}
            </div>
        </Layout>
    );
};

// Course Modal Component
const CourseModal = ({ course, onSave, onClose }) => {
    const [formData, setFormData] = useState({
        code: course?.code || '',
        title: course?.title || '',
        department: course?.department || '',
        required_capacity: course?.required_capacity || 0
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-6 border-b border-stone-100">
                    <h3 className="text-xl font-bold text-stone-900">
                        {course ? 'Edit Course' : 'Add Course'}
                    </h3>
                </div>
                <div className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">Course Code</label>
                        <input
                            type="text"
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">Title</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">Department</label>
                        <input
                            type="text"
                            value={formData.department}
                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                            className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">Number of Students</label>
                        <input
                            type="number"
                            value={formData.required_capacity}
                            onChange={(e) => setFormData({ ...formData, required_capacity: parseInt(e.target.value) })}
                            className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                            required
                        />
                    </div>
                        <div className="flex gap-3 pt-2">
                            <Button type="submit" className="flex-1">Save</Button>
                            <Button type="button" onClick={onClose} variant="secondary" className="flex-1">Cancel</Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// Hall Modal Component
const HallModal = ({ hall, onSave, onClose }) => {
    const [formData, setFormData] = useState({
        name: hall?.name || '',
        capacity: hall?.capacity || 0
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-6 border-b border-stone-100">
                    <h3 className="text-xl font-bold text-stone-900">
                        {hall ? 'Edit Hall' : 'Add Hall'}
                    </h3>
                </div>
                <div className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">Hall Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">Capacity</label>
                        <input
                            type="number"
                            value={formData.capacity}
                            onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                            className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                            required
                        />
                    </div>
                        <div className="flex gap-3 pt-2">
                            <Button type="submit" className="flex-1">Save</Button>
                            <Button type="button" onClick={onClose} variant="secondary" className="flex-1">Cancel</Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// Sample Toggle Component
const SampleToggle = ({ isSampleMode, onToggle, loading }) => (
    <div className="flex items-center gap-2">
        <span className={`text-sm font-medium ${isSampleMode ? 'text-amber-600' : 'text-stone-500'}`}>
            Sample Mode
        </span>
        <button
            onClick={() => onToggle(!isSampleMode)}
            disabled={loading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                isSampleMode ? 'bg-amber-600' : 'bg-stone-300'
            } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            title={isSampleMode ? "Turn off sample mode" : "Turn on sample mode"}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isSampleMode ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
        </button>
    </div>
);

export default ProjectSetup;
