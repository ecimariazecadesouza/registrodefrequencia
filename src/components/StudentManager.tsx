import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Filter } from 'lucide-react';
import type { Student, Class, StudentSituation } from '../types';
import { getStudents, saveStudent, deleteStudent, getClasses } from '../utils/storage';

export default function StudentManager() {
    const [students, setStudents] = useState<Student[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [filterClassId, setFilterClassId] = useState<string>('all');
    const [filterSituation, setFilterSituation] = useState<StudentSituation | 'all'>('Cursando');
    const [isBatchMode, setIsBatchMode] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        registration: '',
        classId: '',
        situation: 'Cursando' as any,
        batchNames: '',
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        setStudents(getStudents());
        setClasses(getClasses());
    };

    const filteredStudents = students.filter(s => {
        const matchesClass = filterClassId === 'all' || s.classId === filterClassId;
        const matchesSituation = filterSituation === 'all' || s.situation === filterSituation;
        return matchesClass && matchesSituation;
    });

    const generateRA = () => {
        const year = new Date().getFullYear();
        const random = Math.floor(1000 + Math.random() * 9000);
        return `${year}${random}`;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (isBatchMode) {
            const names = formData.batchNames.split('\n').filter(n => n.trim() !== '');
            names.forEach(name => {
                const student: Student = {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    name: name.trim(),
                    registration: generateRA(),
                    classId: formData.classId,
                    situation: formData.situation,
                    createdAt: new Date().toISOString(),
                };
                saveStudent(student);
            });
        } else {
            const student: Student = {
                id: editingStudent?.id || Date.now().toString(),
                name: formData.name,
                registration: formData.registration || generateRA(),
                classId: formData.classId,
                situation: formData.situation,
                createdAt: editingStudent?.createdAt || new Date().toISOString(),
            };
            saveStudent(student);
        }

        loadData();
        closeModal();
    };

    const handleEdit = (student: Student) => {
        setEditingStudent(student);
        setFormData({
            name: student.name,
            registration: student.registration,
            classId: student.classId,
            situation: student.situation || 'Cursando',
            batchNames: '',
        });
        setIsBatchMode(false);
        setShowModal(true);
    };

    const handleDelete = (studentId: string) => {
        if (confirm('Tem certeza que deseja excluir este protagonista? Todos os registros de frequência serão removidos.')) {
            deleteStudent(studentId);
            loadData();
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingStudent(null);
        setFormData({
            name: '',
            registration: '',
            classId: '',
            situation: 'Cursando',
            batchNames: '',
        });
        setIsBatchMode(false);
    };

    const getClassName = (classId: string) => {
        const classItem = classes.find(c => c.id === classId);
        return classItem?.name || 'Sem turma';
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div>
            <div className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 className="page-title">Gestão de Protagonistas</h1>
                        <p className="page-subtitle">Cadastre e gerencie os protagonistas da escola</p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Filter size={20} />
                            <select
                                className="form-select"
                                value={filterClassId}
                                onChange={(e) => setFilterClassId(e.target.value)}
                                style={{ width: 'auto', minWidth: '150px' }}
                            >
                                <option value="all">Todas as Turmas</option>
                                {classes.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <select
                                className="form-select"
                                value={filterSituation}
                                onChange={(e) => setFilterSituation(e.target.value as any)}
                                style={{ width: 'auto', minWidth: '150px' }}
                            >
                                <option value="all">Todas Situações</option>
                                <option value="Cursando">Cursando</option>
                                <option value="Evasão">Evasão</option>
                                <option value="Transferência">Transferência</option>
                            </select>
                        </div>
                        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                            <Plus size={20} />
                            Novo Protagonista
                        </button>
                    </div>
                </div>
            </div>

            <div className="card-grid">
                {filteredStudents.map((student) => (
                    <div key={student.id} className="card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                            <div className="student-avatar" style={{ width: '64px', height: '64px', fontSize: '1.5rem' }}>
                                {getInitials(student.name)}
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 className="card-title" style={{ marginBottom: '0.25rem' }}>{student.name}</h3>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                                    <span style={{
                                        padding: '0.125rem 0.5rem',
                                        borderRadius: '100px',
                                        fontSize: '0.75rem',
                                        background: student.situation === 'Cursando' ? 'var(--color-success-bg)' :
                                            student.situation === 'Evasão' ? 'var(--color-danger-bg)' : 'var(--color-warning-bg)',
                                        color: student.situation === 'Cursando' ? 'var(--color-success)' :
                                            student.situation === 'Evasão' ? 'var(--color-danger)' : 'var(--color-warning)',
                                        border: '1px solid currentColor'
                                    }}>
                                        {student.situation}
                                    </span>
                                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                                        RA: {student.registration}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div style={{
                            padding: '0.75rem',
                            background: 'var(--color-bg-secondary)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: '1rem'
                        }}>
                            <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                                <strong>Turma:</strong> {getClassName(student.classId)}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                className="btn btn-sm btn-outline"
                                onClick={() => handleEdit(student)}
                                style={{ flex: 1 }}
                            >
                                <Edit2 size={16} />
                                Editar
                            </button>
                            <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDelete(student.id)}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {filteredStudents.length === 0 && (
                <div className="card text-center">
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '1.125rem' }}>
                        {filterClassId === 'all'
                            ? 'Nenhum protagonista cadastrado. Clique em "Novo Protagonista" para começar.'
                            : 'Nenhum protagonista encontrado nesta turma.'}
                    </p>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">
                                {editingStudent ? 'Editar Protagonista' : 'Novo Protagonista'}
                            </h2>
                            <button className="modal-close" onClick={closeModal}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            {!editingStudent && (
                                <div className="card" style={{ marginBottom: '1.5rem', background: 'var(--color-bg-secondary)', border: '1px dashed var(--color-border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <h4 style={{ margin: 0 }}>Modo de Importação em Lote</h4>
                                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Criação múltipla de alunos</p>
                                        </div>
                                        <label className="switch">
                                            <input
                                                type="checkbox"
                                                checked={isBatchMode}
                                                onChange={(e) => setIsBatchMode(e.target.checked)}
                                            />
                                            <span className="slider round"></span>
                                        </label>
                                    </div>
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">Turma de Destino</label>
                                <select
                                    className="form-select"
                                    value={formData.classId}
                                    onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                                    required
                                >
                                    <option value="">Selecione uma turma</option>
                                    {classes.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} - {c.period}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {isBatchMode ? (
                                <>
                                    <div className="form-group">
                                        <label className="form-label">Nomes (Um por linha)</label>
                                        <textarea
                                            className="form-input"
                                            style={{ minHeight: '150px', fontFamily: 'monospace' }}
                                            value={formData.batchNames}
                                            onChange={(e) => setFormData({ ...formData, batchNames: e.target.value })}
                                            placeholder="FULANO DE TAL&#10;BELTRANO SILVA..."
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Situação Cadastral para o Lote</label>
                                        <select
                                            className="form-select"
                                            value={formData.situation}
                                            onChange={(e) => setFormData({ ...formData, situation: e.target.value as any })}
                                        >
                                            <option value="Cursando">Cursando</option>
                                            <option value="Evasão">Evasão</option>
                                            <option value="Transferência">Transferência</option>
                                        </select>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="form-group">
                                        <label className="form-label">Nome Completo</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Ex: Maria Silva Santos"
                                            required
                                        />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="form-group">
                                            <label className="form-label">Situação Cadastral</label>
                                            <select
                                                className="form-select"
                                                value={formData.situation}
                                                onChange={(e) => setFormData({ ...formData, situation: e.target.value as any })}
                                            >
                                                <option value="Cursando">Cursando</option>
                                                <option value="Evasão">Evasão</option>
                                                <option value="Transferência">Transferência</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">RA (Identificador)</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={formData.registration}
                                                onChange={(e) => setFormData({ ...formData, registration: e.target.value })}
                                                placeholder="Gerado automaticamente"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline" onClick={closeModal}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={classes.length === 0}>
                                    {editingStudent ? 'Salvar Alterações' : 'Confirmar Registro'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
