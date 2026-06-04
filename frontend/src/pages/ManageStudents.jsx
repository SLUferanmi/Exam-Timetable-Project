import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, Button, Input, Badge, Modal } from '../components/UI';
import api from '../api';
import { Plus, Trash2, Edit2, Check, User } from 'lucide-react';

const ManageStudents = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ matric_no: '', department: '', level: '100' });

    // Details Modal State
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // Project & Course Selection for Add/Edit Form
    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [projectCourses, setProjectCourses] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [isCarryoverCheckbox, setIsCarryoverCheckbox] = useState(false);
    const [selectedStudentCourses, setSelectedStudentCourses] = useState([]);

    useEffect(() => { 
        fetchStudents(); 
        fetchProjects();
    }, []);

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const res = await api.get('/students/');
            setStudents(Array.isArray(res.data) ? res.data : res.data.results || []);
        } catch (error) {
            console.error('Failed to fetch students:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProjects = async () => {
        try {
            const res = await api.get('/projects/');
            setProjects(res.data || []);
            if (res.data && res.data.length > 0) {
                setSelectedProjectId(res.data[0].id);
            }
        } catch (error) {
            console.error('Failed to fetch projects:', error);
        }
    };

    const fetchProjectCourses = async (projectId) => {
        if (!projectId) return;
        try {
            const res = await api.get(`/courses/?project=${projectId}&page_size=200`);
            setProjectCourses(res.data.results || []);
            if (res.data.results && res.data.results.length > 0) {
                setSelectedCourseId(res.data.results[0].id);
            } else {
                setSelectedCourseId('');
            }
        } catch (error) {
            console.error('Failed to fetch project courses:', error);
        }
    };

    useEffect(() => {
        fetchProjectCourses(selectedProjectId);
    }, [selectedProjectId]);

    const openAdd = () => {
        setFormData({ matric_no: '', department: '', level: '100' });
        setEditingId(null);
        setSelectedStudentCourses([]);
        setIsCarryoverCheckbox(false);
        if (projects.length > 0) {
            setSelectedProjectId(projects[0].id);
        }
        setIsModalOpen(true);
    };

    const openEdit = (student) => {
        setFormData({ matric_no: student.matric_no, department: student.department, level: student.level.toString() });
        setEditingId(student.id);
        setIsCarryoverCheckbox(false);
        
        // Find default project and load courses
        const projId = selectedProjectId || (projects[0]?.id || '');
        if (projId) {
            setSelectedProjectId(projId);
            const filtered = (student.courses || [])
                .filter(c => c.project_id === projId)
                .map(c => ({
                    project_course_id: c.project_course_id,
                    is_carryover: c.is_carryover,
                    course_code: c.course_code,
                    course_title: c.course_title
                }));
            setSelectedStudentCourses(filtered);
        } else {
            setSelectedStudentCourses([]);
        }
        setIsModalOpen(true);
    };

    const handleProjectChange = (projId) => {
        setSelectedProjectId(projId);
        if (editingId) {
            const student = students.find(s => s.id === editingId);
            if (student) {
                const filtered = (student.courses || [])
                    .filter(c => c.project_id === projId)
                    .map(c => ({
                        project_course_id: c.project_course_id,
                        is_carryover: c.is_carryover,
                        course_code: c.course_code,
                        course_title: c.course_title
                    }));
                setSelectedStudentCourses(filtered);
            }
        }
    };

    const handleAddCourseToStudent = () => {
        if (!selectedCourseId) return;
        if (selectedStudentCourses.some(c => c.project_course_id === selectedCourseId)) {
            alert('Course already added to this student.');
            return;
        }
        const pc = projectCourses.find(c => c.id === selectedCourseId);
        if (pc) {
            setSelectedStudentCourses([
                ...selectedStudentCourses,
                {
                    project_course_id: pc.id,
                    is_carryover: isCarryoverCheckbox,
                    course_code: pc.code,
                    course_title: pc.title
                }
            ]);
            setIsCarryoverCheckbox(false);
        }
    };

    const handleRemoveCourseFromStudent = (pcId) => {
        setSelectedStudentCourses(selectedStudentCourses.filter(c => c.project_course_id !== pcId));
    };

    const handleShowDetails = (student) => {
        setSelectedStudent(student);
        setIsDetailsOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const payload = { 
                matric_no: formData.matric_no, 
                department: formData.department, 
                level: parseInt(formData.level, 10),
                project_id: selectedProjectId,
                enrollments: selectedStudentCourses.map(c => ({
                    project_course_id: c.project_course_id,
                    is_carryover: c.is_carryover
                }))
            };
            if (editingId) {
                await api.put(`/students/${editingId}/`, payload);
            } else {
                await api.post('/students/', payload);
            }
            setIsModalOpen(false);
            fetchStudents();
        } catch (error) {
            console.error('Failed to save student:', error);
            alert('Failed to save student. Ensure Matric no. is unique.');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this student?')) return;
        try {
            await api.delete(`/students/${id}/`);
            fetchStudents();
        } catch {
            alert('Failed to delete student.');
        }
    };

    return (
        <Layout>
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-stone-900 mb-2">Manage Students</h2>
                    <p className="text-stone-500 font-medium">Add, edit, or remove students from the central database.</p>
                </div>
                <Button onClick={openAdd} icon={Plus}>Add Student</Button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-stone-500">Loading students...</div>
            ) : students.length === 0 ? (
                <div className="text-center py-12 text-stone-500 bg-white rounded-xl border border-stone-200">
                    No students currently registered in the system.
                </div>
            ) : (
                <Card className="overflow-hidden p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 text-xs uppercase tracking-wider">
                                    <th className="px-6 py-4 font-bold">Matric No.</th>
                                    <th className="px-6 py-4 font-bold">Department</th>
                                    <th className="px-6 py-4 font-bold">Level</th>
                                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {students.map((student) => (
                                    <tr 
                                        key={student.id} 
                                        onClick={() => handleShowDetails(student)}
                                        className="hover:bg-stone-50 cursor-pointer transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-amber-100 text-amber-700 p-2 rounded-full hidden sm:block">
                                                    <User size={16} />
                                                </div>
                                                <span className="font-semibold text-stone-900">{student.matric_no}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-stone-600 font-medium">{student.department}</td>
                                        <td className="px-6 py-4">
                                            <Badge variant={student.level >= 400 ? 'primary' : 'default'}>{student.level} Level</Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); openEdit(student); }} 
                                                    className="p-1.5 text-stone-400 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors" 
                                                    title="Edit"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(student.id); }} 
                                                    className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" 
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Add / Edit Student Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Student Details' : 'Register New Student'} maxWidth="max-w-xl">
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Matric / ID No." type="text" required
                            value={formData.matric_no}
                            onChange={(e) => setFormData({ ...formData, matric_no: e.target.value })}
                            placeholder="e.g. 21/11SA001"
                        />
                        <Input
                            label="Department" type="text" required
                            value={formData.department}
                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                            placeholder="e.g. Mass Communication"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-stone-700 ml-0.5">Level</label>
                        <select
                            value={formData.level}
                            onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                            className="w-full bg-white border border-stone-200 rounded-lg pl-3 pr-8 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600/20 focus:border-amber-600 transition-colors"
                        >
                            {[100, 200, 300, 400, 500].map(l => <option key={l} value={l}>{l} Level</option>)}
                        </select>
                    </div>

                    {/* Course Registration Section */}
                    <div className="border-t border-stone-200 pt-4 space-y-4">
                        <h4 className="text-sm font-semibold text-stone-900">Configure Course Enrolments</h4>
                        
                        {/* Project selector */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider ml-0.5">Active Project / Semester</label>
                            <select
                                value={selectedProjectId}
                                onChange={(e) => handleProjectChange(e.target.value)}
                                className="w-full bg-white border border-stone-200 rounded-lg pl-3 pr-8 py-2 text-xs text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-600/20 focus:border-amber-600 transition-colors"
                            >
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.academic_session})</option>)}
                            </select>
                        </div>

                        {/* Course picker & Carryover flag */}
                        <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/60 space-y-3">
                            <div className="flex gap-3 items-end">
                                <div className="space-y-1 flex-1">
                                    <label className="text-[11px] font-semibold text-stone-500 ml-0.5">Select Course</label>
                                    <select
                                        value={selectedCourseId}
                                        onChange={(e) => setSelectedCourseId(e.target.value)}
                                        className="w-full bg-white border border-stone-200 rounded-lg pl-3 pr-8 py-2 text-xs text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-600/20 focus:border-amber-600 transition-colors"
                                    >
                                        {projectCourses.length === 0 ? (
                                            <option value="">No courses available in project</option>
                                        ) : (
                                            projectCourses.map(pc => (
                                                <option key={pc.id} value={pc.id}>{pc.code} - {pc.title}</option>
                                            ))
                                        )}
                                    </select>
                                </div>
                                <Button 
                                    type="button" 
                                    onClick={handleAddCourseToStudent}
                                    disabled={!selectedCourseId || projectCourses.length === 0}
                                    className="py-2 text-xs px-4"
                                >
                                    Add Course
                                </Button>
                            </div>

                            <div className="flex items-center gap-2 pl-0.5">
                                <input
                                    id="carryover-checkbox"
                                    type="checkbox"
                                    checked={isCarryoverCheckbox}
                                    onChange={(e) => setIsCarryoverCheckbox(e.target.checked)}
                                    className="w-4 h-4 text-amber-600 accent-amber-600 rounded focus:ring-amber-500 cursor-pointer"
                                />
                                <label htmlFor="carryover-checkbox" className="text-xs text-stone-600 font-medium cursor-pointer">
                                    Flag this course as a <strong>Carryover</strong> for this student
                                </label>
                            </div>
                        </div>

                        {/* List of currently selected courses */}
                        <div className="space-y-2">
                            <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider ml-0.5">
                                Enrolled Courses ({selectedStudentCourses.length})
                            </div>
                            {selectedStudentCourses.length === 0 ? (
                                <div className="text-xs text-stone-400 py-3 text-center bg-stone-50/50 rounded-lg border border-stone-200/50 border-dashed">
                                    No courses added for this project/semester yet.
                                </div>
                            ) : (
                                <div className="max-h-40 overflow-y-auto divide-y divide-stone-100 border border-stone-200 rounded-lg bg-white">
                                    {selectedStudentCourses.map(c => (
                                        <div key={c.project_course_id} className="flex justify-between items-center p-2.5 hover:bg-stone-50 transition-colors">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-bold text-xs text-stone-900">{c.course_code}</span>
                                                <span className="text-[10px] text-stone-400 truncate max-w-[200px]">{c.course_title}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {c.is_carryover ? (
                                                    <Badge variant="warning" className="text-[9px] px-1.5 py-0">Carryover</Badge>
                                                ) : (
                                                    <Badge variant="success" className="text-[9px] px-1.5 py-0">Regular</Badge>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveCourseFromStudent(c.project_course_id)}
                                                    className="text-red-500 hover:text-red-700 text-xs font-semibold"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" icon={Check}>Save Student</Button>
                    </div>
                </form>
            </Modal>

            {/* Student Details & Rundown Modal */}
            <Modal isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} title="Student Details & Course Rundown" maxWidth="max-w-xl">
                {selectedStudent && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-start border-b border-stone-100 pb-4">
                            <div>
                                <h4 className="text-lg font-bold text-stone-900 mb-1">{selectedStudent.matric_no}</h4>
                                <p className="text-sm text-stone-500">{selectedStudent.department}</p>
                            </div>
                            <Badge variant={selectedStudent.level >= 400 ? 'primary' : 'default'}>
                                {selectedStudent.level} Level
                            </Badge>
                        </div>

                        <div>
                            <h5 className="text-sm font-semibold text-stone-700 mb-3">Enrolled Courses ({selectedStudent.courses?.length || 0})</h5>
                            {(!selectedStudent.courses || selectedStudent.courses.length === 0) ? (
                                <div className="text-sm text-stone-400 py-6 text-center bg-stone-50 rounded-xl border border-stone-200/50">
                                    No course enrollments found for this student.
                                </div>
                            ) : (
                                <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                    {selectedStudent.courses.map((c, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-4 hover:bg-stone-50 transition-colors">
                                            <div>
                                                <span className="font-mono font-bold text-sm text-stone-900 mr-2">{c.course_code}</span>
                                                <span className="text-xs text-stone-500">{c.course_title}</span>
                                                <p className="text-[10px] text-stone-400 mt-0.5">{c.project_name}</p>
                                            </div>
                                            <div>
                                                {c.is_carryover ? (
                                                    <Badge variant="warning" className="font-bold text-[9px] px-2 py-0.5 uppercase tracking-wide">
                                                        Carryover
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="success" className="font-bold text-[9px] px-2 py-0.5 uppercase tracking-wide">
                                                        Regular
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button onClick={() => setIsDetailsOpen(false)}>Close</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </Layout>
    );
};

export default ManageStudents;
