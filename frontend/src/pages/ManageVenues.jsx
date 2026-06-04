import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, Button, Input, Modal } from '../components/UI';
import api from '../api';
import { Building2, Plus, Trash2, Edit2, Check, Users } from 'lucide-react';

const ManageVenues = () => {
    const [venues, setVenues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ 
        name: '', 
        capacity: '',
        exam_capacity_single: '',
        exam_capacity_mixed: ''
    });

    useEffect(() => { fetchVenues(); }, []);

    const fetchVenues = async () => {
        try {
            setLoading(true);
            const res = await api.get('/global-halls/');
            setVenues(Array.isArray(res.data) ? res.data : res.data.results || []);
        } catch (error) {
            console.error('Failed to fetch venues:', error);
        } finally {
            setLoading(false);
        }
    };

    const openAdd = () => {
        setFormData({ name: '', capacity: '', exam_capacity_single: '', exam_capacity_mixed: '' });
        setEditingId(null);
        setIsModalOpen(true);
    };

    const openEdit = (venue) => {
        setFormData({ 
            name: venue.name, 
            capacity: venue.capacity ? venue.capacity.toString() : '',
            exam_capacity_single: venue.exam_capacity_single ? venue.exam_capacity_single.toString() : '',
            exam_capacity_mixed: venue.exam_capacity_mixed ? venue.exam_capacity_mixed.toString() : ''
        });
        setEditingId(venue.id);
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const payload = { 
                name: formData.name, 
                capacity: parseInt(formData.capacity, 10),
                exam_capacity_single: formData.exam_capacity_single ? parseInt(formData.exam_capacity_single, 10) : null,
                exam_capacity_mixed: formData.exam_capacity_mixed ? parseInt(formData.exam_capacity_mixed, 10) : null
            };
            
            if (editingId) {
                await api.put(`/global-halls/${editingId}/`, payload);
            } else {
                await api.post('/global-halls/', payload);
            }
            setIsModalOpen(false);
            fetchVenues();
        } catch (error) {
            alert('Failed to save venue. Ensure the name is unique.');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this venue from the global catalog?')) return;
        try {
            await api.delete(`/global-halls/${id}/`);
            fetchVenues();
        } catch {
            alert('Failed to delete venue.');
        }
    };

    return (
        <Layout>
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-stone-900 mb-2">Manage Venues</h2>
                    <p className="text-stone-500 font-medium">Configure global examination halls and spacing rules.</p>
                </div>
                <Button onClick={openAdd} icon={Plus}>Add Venue</Button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-stone-500">Loading venues...</div>
            ) : venues.length === 0 ? (
                <div className="text-center py-12 text-stone-500 bg-white rounded-xl border border-stone-200">
                    No venues found. Add one to get started.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {venues.map(venue => (
                        <Card key={venue.id} className="flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-stone-900 text-lg mb-1">{venue.name}</h3>
                                    <div className="space-y-1 text-xs text-stone-500">
                                        <div className="flex justify-between gap-4">
                                            <span>Single Course:</span>
                                            <span className="font-semibold text-stone-700">{venue.exam_capacity_single || venue.capacity}</span>
                                        </div>
                                        <div className="flex justify-between gap-4">
                                            <span>Mixed Courses:</span>
                                            <span className="font-semibold text-stone-700">{venue.exam_capacity_mixed || venue.capacity}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 bg-amber-50 text-amber-800 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
                                    <Users size={12} />
                                    {venue.capacity} total
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-stone-100">
                                <button onClick={() => openEdit(venue)} className="p-1.5 text-stone-400 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors" title="Edit">
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDelete(venue.id)} className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Venue' : 'Add New Venue'}>
                <form onSubmit={handleSave} className="space-y-4">
                    <Input
                        label="Venue Name" type="text" required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Virtual Library"
                    />
                    <Input
                        label="Total Physical Capacity" type="number" required min="1"
                        value={formData.capacity}
                        onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                        placeholder="e.g. 500"
                    />
                    <Input
                        label="Single Course Exam Capacity" type="number" min="1"
                        value={formData.exam_capacity_single}
                        onChange={(e) => setFormData({ ...formData, exam_capacity_single: e.target.value })}
                        placeholder="e.g. 100 (Spacing required)"
                    />
                    <Input
                        label="Mixed Courses Exam Capacity" type="number" min="1"
                        value={formData.exam_capacity_mixed}
                        onChange={(e) => setFormData({ ...formData, exam_capacity_mixed: e.target.value })}
                        placeholder="e.g. 200 (Adjoining permitted)"
                    />
                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" icon={Check}>Save Venue</Button>
                    </div>
                </form>
            </Modal>
        </Layout>
    );
};

export default ManageVenues;
