import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, Button, Input, Badge, Modal } from '../components/UI';
import api from '../api';
import { Users, Plus, Trash2, Edit2, Check, User } from 'lucide-react';

const ManageStudents = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ matric_no: '', department: '', level: '100' });

    useEffect(() => { fetchStudents(); }, []);

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

    const openAdd = () => {
        setFormData({ matric_no: '', department: '', level: '100' });
        setEditingId(null);
        setIsModalOpen(true);
    };

    const openEdit = (student) => {
        setFormData({ matric_no: student.matric_no, department: student.department, level: student.level.toString() });
        setEditingId(student.id);
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData, level: parseInt(formData.level, 10) };
            if (editingId) {
                await api.put(`/students/${editingId}/`, payload);
            } else {
                await api.post('/students/', payload);
            }
            setIsModalOpen(false);
            fetchStudents();
        } catch {
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
                                    <tr key={student.id} className="hover:bg-stone-50 transition-colors">
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
                                                <button onClick={() => openEdit(student)} className="p-1.5 text-stone-400 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors" title="Edit">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(student.id)} className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
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

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Student' : 'Register New Student'}>
                <form onSubmit={handleSave} className="space-y-4">
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
                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" icon={Check}>Save Student</Button>
                    </div>
                </form>
            </Modal>
        </Layout>
    );
};

export default ManageStudents;
