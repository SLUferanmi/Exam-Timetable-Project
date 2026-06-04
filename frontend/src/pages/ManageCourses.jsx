import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { Card, Button, Input, Badge, Modal } from '../components/UI';
import api from '../api';
import { BookMarked, Plus, Trash2, Edit2, Check, FolderEdit } from 'lucide-react';

const ManageCourses = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('First');

    // Course modal
    const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
    const [editingCourseId, setEditingCourseId] = useState(null);
    const [courseForm, setCourseForm] = useState({ code: '', title: '', department: '', semester: 'First' });

    // Rename Department modal
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [oldDeptName, setOldDeptName] = useState('');
    const [newDeptName, setNewDeptName] = useState('');

    useEffect(() => { fetchCourses(); }, []);

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const res = await api.get('/global-courses/');
            setCourses(Array.isArray(res.data) ? res.data : res.data.results || []);
        } catch (error) {
            console.error('Failed to fetch courses:', error);
        } finally {
            setLoading(false);
        }
    };

    const groupedCourses = useMemo(() => {
        const filtered = courses.filter(c => c.semester === activeTab || c.semester === 'Both');
        const grouped = {};
        filtered.forEach(c => {
            const dept = c.department || 'Unassigned';
            if (!grouped[dept]) grouped[dept] = [];
            grouped[dept].push(c);
        });
        const sortedGroups = {};
        Object.keys(grouped).sort().forEach(key => {
            sortedGroups[key] = grouped[key].sort((a, b) => a.code.localeCompare(b.code));
        });
        return sortedGroups;
    }, [courses, activeTab]);

    // ——— Course Handlers ———
    const openAddCourse = (defaultDept = '') => {
        setCourseForm({ code: '', title: '', department: defaultDept, semester: activeTab });
        setEditingCourseId(null);
        setIsCourseModalOpen(true);
    };

    const openEditCourse = (course) => {
        setCourseForm({ code: course.code, title: course.title || '', department: course.department, semester: course.semester });
        setEditingCourseId(course.id);
        setIsCourseModalOpen(true);
    };

    const handleSaveCourse = async (e) => {
        e.preventDefault();
        try {
            if (editingCourseId) {
                await api.put(`/global-courses/${editingCourseId}/`, courseForm);
            } else {
                await api.post('/global-courses/', courseForm);
            }
            setIsCourseModalOpen(false);
            fetchCourses();
        } catch {
            alert('Failed to save course. Ensure the course code is unique.');
        }
    };

    const handleDeleteCourse = async (id, code) => {
        if (!window.confirm(`Delete ${code}?`)) return;
        try {
            await api.delete(`/global-courses/${id}/`);
            fetchCourses();
        } catch {
            alert('Failed to delete course.');
        }
    };

    // ——— Department Rename Handlers ———
    const openRename = (deptName) => {
        setOldDeptName(deptName);
        setNewDeptName(deptName);
        setIsRenameModalOpen(true);
    };

    const handleSaveRename = async (e) => {
        e.preventDefault();
        if (oldDeptName === newDeptName) { setIsRenameModalOpen(false); return; }
        try {
            await api.post('/global-courses/rename_department/', { old_name: oldDeptName, new_name: newDeptName });
            setIsRenameModalOpen(false);
            fetchCourses();
        } catch {
            alert('Failed to rename department.');
        }
    };

    return (
        <Layout>
            {/* Header */}
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-stone-900 mb-2">Manage Courses</h2>
                    <p className="text-stone-500 font-medium">Manage the global catalog of courses, departments, and semesters.</p>
                </div>
                <Button onClick={() => openAddCourse('')} icon={Plus}>Add Course</Button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-stone-200 mb-6">
                {['First', 'Second'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === tab ? 'border-amber-600 text-amber-700' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
                    >
                        {tab} Semester Courses
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="text-center py-12 text-stone-500">Loading courses...</div>
            ) : Object.keys(groupedCourses).length === 0 ? (
                <div className="text-center py-12 text-stone-500 bg-white rounded-xl border border-stone-200">
                    No courses found for the {activeTab} Semester.
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(groupedCourses).map(([dept, deptCourses]) => (
                        <Card key={dept} className="p-0 overflow-hidden">
                            <div className="bg-stone-50 px-6 py-4 border-b border-stone-200 flex justify-between items-center group">
                                <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                                    {dept}
                                    <Badge>{deptCourses.length} courses</Badge>
                                </h3>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openAddCourse(dept)} className="flex items-center gap-1 text-xs font-semibold text-stone-500 hover:text-amber-700 bg-white px-2 py-1 rounded border border-stone-200">
                                        <Plus size={14} /> Add Course Here
                                    </button>
                                    <button onClick={() => openRename(dept)} className="flex items-center gap-1 text-xs font-semibold text-stone-500 hover:text-blue-700 bg-white px-2 py-1 rounded border border-stone-200">
                                        <FolderEdit size={14} /> Rename Dept
                                    </button>
                                </div>
                            </div>
                            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {deptCourses.map(course => (
                                    <div key={course.id} className="border border-stone-200 rounded-lg p-4 hover:border-amber-300 transition-colors bg-white relative group">
                                        <div className="font-bold text-stone-900 mb-1">{course.code}</div>
                                        {course.title && <div className="text-xs text-stone-500 truncate mb-3" title={course.title}>{course.title}</div>}
                                        <div className="absolute top-3 right-3 flex gap-1 bg-white shadow-sm border border-stone-100 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openEditCourse(course)} className="p-1 text-stone-400 hover:text-amber-700 transition-colors" title="Edit">
                                                <Edit2 size={14} />
                                            </button>
                                            <button onClick={() => handleDeleteCourse(course.id, course.code)} className="p-1 text-stone-400 hover:text-red-600 transition-colors" title="Delete">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Course Add/Edit Modal */}
            <Modal
                isOpen={isCourseModalOpen}
                onClose={() => setIsCourseModalOpen(false)}
                title={editingCourseId ? 'Edit Course' : 'Create New Course'}
                maxWidth="max-w-xl"
            >
                <form onSubmit={handleSaveCourse} className="space-y-4">
                    <Input
                        label="Course Code" required
                        value={courseForm.code}
                        onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value.toUpperCase() })}
                        placeholder="e.g. GST 111"
                    />
                    <Input
                        label="Course Title (Optional)"
                        value={courseForm.title}
                        onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                        placeholder="e.g. Logic and Philosophy"
                    />
                    <Input
                        label="Department" required
                        value={courseForm.department}
                        onChange={(e) => setCourseForm({ ...courseForm, department: e.target.value })}
                        placeholder="e.g. Mass Communication"
                    />
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-stone-700 ml-0.5">Semester</label>
                        <select
                            value={courseForm.semester}
                            onChange={(e) => setCourseForm({ ...courseForm, semester: e.target.value })}
                            className="w-full bg-white border border-stone-200 rounded-lg pl-3 pr-8 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600/20 focus:border-amber-600 transition-colors"
                        >
                            <option value="First">First Semester</option>
                            <option value="Second">Second Semester</option>
                            <option value="Both">Both Semesters</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="secondary" onClick={() => setIsCourseModalOpen(false)}>Cancel</Button>
                        <Button type="submit" icon={Check}>Save Course</Button>
                    </div>
                </form>
            </Modal>

            {/* Department Rename Modal */}
            <Modal
                isOpen={isRenameModalOpen}
                onClose={() => setIsRenameModalOpen(false)}
                title="Rename Department"
            >
                <p className="text-sm text-stone-600 mb-4">
                    This will rename <strong>{oldDeptName}</strong> across all its courses instantly.
                </p>
                <form onSubmit={handleSaveRename} className="space-y-4">
                    <Input
                        label="New Department Name" required
                        value={newDeptName}
                        onChange={(e) => setNewDeptName(e.target.value)}
                    />
                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="secondary" onClick={() => setIsRenameModalOpen(false)}>Cancel</Button>
                        <Button type="submit" icon={Check}>Update All Courses</Button>
                    </div>
                </form>
            </Modal>
        </Layout>
    );
};

export default ManageCourses;
