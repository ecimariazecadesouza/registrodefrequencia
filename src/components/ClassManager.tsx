import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import type { Class } from '../types';
import { getClasses, saveClass, deleteClass, getStudentsByClass } from '../utils/storage';
import { triggerCloudSync } from '../utils/api';

export default function ClassManager() {
    const [classes, setClasses] = useState<Class[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingClass, setEditingClass] = useState<Class | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        year: new Date().getFullYear().toString(),
        period: 'Manhã',
    });

    useEffect(() => {
        loadClasses();
    }, []);

    const loadClasses = () => {
        setClasses(getClasses());
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const classData: Class = {
            id: editingClass?.id || Date.now().toString(),
            name: formData.name,
            year: formData.year,
            period: formData.period,
            createdAt: editingClass?.createdAt || new Date().toISOString(),
        };

        saveClass(classData);
        loadClasses();
        closeModal();
        triggerCloudSync(); // Background sync
    };

    const handleEdit = (classItem: Class) => {
        setEditingClass(classItem);
        setFormData({
            name: classItem.name,
            year: classItem.year,
            period: classItem.period,
        });
        setShowModal(true);
    };

    const handleDelete = (classId: string) => {
        if (confirm('Tem certeza que deseja excluir esta turma? Todos os protagonistas e registros de frequência serão removidos.')) {
            deleteClass(classId);
            loadClasses();
            triggerCloudSync(); // Background sync
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingClass(null);
        setFormData({
            name: '',
            year: new Date().getFullYear().toString(),
            period: 'Manhã',
        });
    };

    return (
        <div>
            <div className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 className="page-title">Gestão de Turmas</h1>
                        <p className="page-subtitle">Crie e gerencie as turmas da escola</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={20} />
                        Nova Turma
                    </button>
                </div>
            </div>

            <div className="card-grid">
                {classes.map((classItem) => {
                    const studentCount = getStudentsByClass(classItem.id).length;
                    return (
                        <div key={classItem.id} className="card">
                            <div className="card-header">
                                <h3 className="card-title">{classItem.name}</h3>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        className="btn btn-sm btn-outline"
                                        onClick={() => handleEdit(classItem)}
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        className="btn btn-sm btn-danger"
                                        onClick={() => handleDelete(classItem.id)}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ color: 'var(--color-text-secondary)' }}>
                                    <strong>Ano:</strong> {classItem.year}
                                </div>
                                <div style={{ color: 'var(--color-text-secondary)' }}>
                                    <strong>Período:</strong> {classItem.period}
                                </div>
                                <div style={{ color: 'var(--color-text-secondary)' }}>
                                    <strong>Protagonistas:</strong> {studentCount}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {classes.length === 0 && (
                <div className="card text-center">
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '1.125rem' }}>
                        Nenhuma turma cadastrada. Clique em "Nova Turma" para começar.
                    </p>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">
                                {editingClass ? 'Editar Turma' : 'Nova Turma'}
                            </h2>
                            <button className="modal-close" onClick={closeModal}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Nome da Turma</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ex: 1º Ano A"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Ano Letivo</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.year}
                                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                    placeholder="2026"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Período</label>
                                <select
                                    className="form-select"
                                    value={formData.period}
                                    onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                                    required
                                >
                                    <option value="Manhã">Manhã</option>
                                    <option value="Tarde">Tarde</option>
                                    <option value="Noite">Noite</option>
                                    <option value="Integral">Integral</option>
                                </select>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline" onClick={closeModal}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingClass ? 'Salvar Alterações' : 'Criar Turma'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
