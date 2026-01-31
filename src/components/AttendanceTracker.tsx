import { useState, useEffect } from 'react';
import { Calendar, Save, Check } from 'lucide-react';
import type { Student, AttendanceRecord, AttendanceStatus, StudentSituation } from '../types';
import {
    getAttendanceByDate,
    saveAttendance
} from '../utils/storage';
import { useData } from '../context/DataContext';

export default function AttendanceTracker() {
    const { classes, students: allStudents, refreshData } = useData();
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [lessonsPerDay, setLessonsPerDay] = useState<number>(1);
    const [filterSituation, setFilterSituation] = useState<StudentSituation | 'Todas'>('Cursando');
    const [students, setStudents] = useState<Student[]>([]);
    // Map key: studentId-lessonIndex value: status
    const [attendance, setAttendance] = useState<Map<string, AttendanceStatus>>(new Map());
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Filter students when class, situation or allStudents change
    useEffect(() => {
        if (!selectedClassId) {
            setStudents([]);
            return;
        }

        let classStudents = allStudents.filter(s => s.classId === selectedClassId);

        if (filterSituation !== 'Todas') {
            classStudents = classStudents.filter(s => s.situation === filterSituation);
        }

        setStudents(classStudents);
    }, [selectedClassId, filterSituation, allStudents]);

    // Load attendance when date or students change
    useEffect(() => {
        if (selectedClassId && students.length >= 0) {
            // Load existing attendance for the selected date
            const existingAttendance = getAttendanceByDate(selectedDate);
            const attendanceMap = new Map<string, AttendanceStatus>();

            // First, set everyone visible to 'P' as default if no records exist
            if (existingAttendance.length === 0) {
                students.forEach(student => {
                    for (let i = 0; i < lessonsPerDay; i++) {
                        attendanceMap.set(`${student.id}-${i}`, 'P');
                    }
                });
            } else {
                // Otherwise just load what's there
                existingAttendance.forEach(record => {
                    attendanceMap.set(`${record.studentId}-${record.lessonIndex}`, record.status);
                });
            }

            // Adjust lessonsPerDay if records exist
            if (existingAttendance.length > 0) {
                const classRecords = existingAttendance.filter(r => students.some(s => s.id === r.studentId));
                if (classRecords.length > 0) {
                    const maxIdx = Math.max(...classRecords.map(r => r.lessonIndex));
                    setLessonsPerDay(maxIdx + 1);
                }
            }

            setAttendance(attendanceMap);
            setHasUnsavedChanges(false);
        } else {
            setAttendance(new Map());
            setHasUnsavedChanges(false);
        }
    }, [selectedClassId, selectedDate, students]);

    const handleAttendanceChange = (studentId: string, lessonIndex: number, status: AttendanceStatus) => {
        const key = `${studentId}-${lessonIndex}`;
        const newAttendance = new Map(attendance);
        newAttendance.set(key, status);
        setAttendance(newAttendance);
        setHasUnsavedChanges(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { saveBatchAttendanceToCloud } = await import('../utils/api');
            const records: AttendanceRecord[] = [];
            attendance.forEach((status, key) => {
                const [studentId, lessonIndexStr] = key.split('-');
                const lessonIndex = parseInt(lessonIndexStr);

                records.push({
                    id: `${studentId}-${selectedDate}-${lessonIndex}`,
                    studentId,
                    date: selectedDate,
                    lessonIndex,
                    status,
                });
            });

            // Save all to local storage
            records.forEach(record => saveAttendance(record));

            // Sync all to cloud in a single batch
            await saveBatchAttendanceToCloud(records);

            // Refresh local data context
            refreshData();

            setHasUnsavedChanges(false);
            setMessage({ type: 'success', text: 'Chamada salva com sucesso na nuvem!' });
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: 'Erro ao salvar chamada: ' + String(error) });
        } finally {
            setIsSaving(false);
        }
    };

    const markAllAsPresent = () => {
        const newAttendance = new Map(attendance);
        students.forEach(student => {
            for (let i = 0; i < lessonsPerDay; i++) {
                newAttendance.set(`${student.id}-${i}`, 'P');
            }
        });
        setAttendance(newAttendance);
        setHasUnsavedChanges(true);
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getStatusCount = () => {
        const counts = {
            present: 0,
            absent: 0,
            justified: 0,
            noClass: 0,
            total: students.length * lessonsPerDay
        };

        attendance.forEach((status, key) => {
            // Only count records for students in the current view and selection
            if (students.some(s => key.startsWith(s.id))) {
                switch (status) {
                    case 'P': counts.present++; break;
                    case 'F': counts.absent++; break;
                    case 'J': counts.justified++; break;
                    case '-': counts.noClass++; break;
                }
            }
        });

        return counts;
    };

    const statusCounts = getStatusCount();

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Registro de Frequência</h1>
                <p className="page-subtitle">Marque a presença dos protagonistas</p>
            </div>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Turma</label>
                        <select
                            className="form-select"
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                        >
                            <option value="">Selecione uma turma</option>
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name} - {c.period}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Data</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="date"
                                className="form-input"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                style={{ paddingLeft: '2.5rem' }}
                            />
                            <Calendar
                                size={20}
                                style={{
                                    position: 'absolute',
                                    left: '0.75rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--color-text-muted)'
                                }}
                            />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Aulas por Dia</label>
                        <select
                            className="form-select"
                            value={lessonsPerDay}
                            onChange={(e) => setLessonsPerDay(parseInt(e.target.value))}
                            disabled={!selectedClassId}
                        >
                            <option value={1}>1 Aula</option>
                            <option value={2}>2 Aulas</option>
                            <option value={3}>3 Aulas</option>
                        </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Filtrar Situação</label>
                        <select
                            className="form-select"
                            value={filterSituation}
                            onChange={(e) => setFilterSituation(e.target.value as any)}
                            disabled={!selectedClassId}
                        >
                            <option value="Todas">Todas</option>
                            <option value="Cursando">Cursando</option>
                            <option value="Evasão">Evasão</option>
                            <option value="Transferência">Transferência</option>
                        </select>
                    </div>
                </div>
            </div>

            {selectedClassId && students.length > 0 && (
                <>
                    {message && (
                        <div className={`message ${message.type}`} style={{
                            marginBottom: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '1rem',
                            borderRadius: 'var(--radius-md)',
                            background: message.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                            color: message.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
                            border: `1px solid ${message.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)'}`
                        }}>
                            {message.type === 'success' && <Check size={18} />}
                            {message.text}
                        </div>
                    )}

                    <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                        <div className="stat-card">
                            <div className="stat-icon success">
                                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>P</span>
                            </div>
                            <div className="stat-content">
                                <div className="stat-label">Presentes</div>
                                <div className="stat-value">{statusCounts.present}</div>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon danger">
                                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>F</span>
                            </div>
                            <div className="stat-content">
                                <div className="stat-label">Faltas</div>
                                <div className="stat-value">{statusCounts.absent}</div>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon warning">
                                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>J</span>
                            </div>
                            <div className="stat-content">
                                <div className="stat-label">Justificadas</div>
                                <div className="stat-value">{statusCounts.justified}</div>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: 'var(--color-neutral)' }}>
                                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>-</span>
                            </div>
                            <div className="stat-content">
                                <div className="stat-label">Sem Aula</div>
                                <div className="stat-value">{statusCounts.noClass}</div>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <h2 className="card-title">Lista de Protagonistas</h2>
                                <div style={{ color: 'var(--color-text-muted)' }}>
                                    {students.length} protagonista{students.length !== 1 ? 's' : ''} • {lessonsPerDay} aula{lessonsPerDay !== 1 ? 's' : ''}/dia
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button
                                    className="btn btn-sm"
                                    onClick={markAllAsPresent}
                                    disabled={isSaving}
                                    style={{
                                        color: 'var(--color-success)',
                                        borderColor: 'var(--color-success)',
                                        background: 'transparent',
                                        border: '1px solid var(--color-success)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem'
                                    }}
                                >
                                    <Check size={16} /> Marcar Todos P
                                </button>

                                {hasUnsavedChanges && (
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        style={{ boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                    >
                                        <Save size={18} />
                                        {isSaving ? 'Salvando...' : 'Salvar Chamada'}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="attendance-grid">
                            {students.map(student => (
                                <div key={student.id} className="attendance-row" style={{ gridTemplateColumns: '1fr auto', padding: '1rem' }}>
                                    <div className="student-info">
                                        <div className="student-avatar">
                                            {getInitials(student.name)}
                                        </div>
                                        <div>
                                            <div className="student-name">{student.name}</div>
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <span style={{
                                                    fontSize: '0.7rem',
                                                    padding: '0 0.4rem',
                                                    borderRadius: '4px',
                                                    background: student.situation === 'Cursando' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                                                    color: student.situation === 'Cursando' ? 'var(--color-success)' : 'var(--color-danger)'
                                                }}>
                                                    {student.situation}
                                                </span>
                                                <div className="student-registration">RA: {student.registration}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {Array.from({ length: lessonsPerDay }).map((_, idx) => (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                {lessonsPerDay > 1 && (
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', minWidth: '45px' }}>
                                                        Aula {idx + 1}
                                                    </span>
                                                )}
                                                <div className="attendance-buttons">
                                                    <button
                                                        className={`attendance-btn present ${attendance.get(`${student.id}-${idx}`) === 'P' ? 'active' : ''}`}
                                                        onClick={() => handleAttendanceChange(student.id, idx, 'P')}
                                                        title="Presente"
                                                    >P</button>
                                                    <button
                                                        className={`attendance-btn absent ${attendance.get(`${student.id}-${idx}`) === 'F' ? 'active' : ''}`}
                                                        onClick={() => handleAttendanceChange(student.id, idx, 'F')}
                                                        title="Falta"
                                                    >F</button>
                                                    <button
                                                        className={`attendance-btn justified ${attendance.get(`${student.id}-${idx}`) === 'J' ? 'active' : ''}`}
                                                        onClick={() => handleAttendanceChange(student.id, idx, 'J')}
                                                        title="Justificada"
                                                    >J</button>
                                                    <button
                                                        className={`attendance-btn no-class ${attendance.get(`${student.id}-${idx}`) === '-' ? 'active' : ''}`}
                                                        onClick={() => handleAttendanceChange(student.id, idx, '-')}
                                                        title="Sem Aula"
                                                    >-</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {selectedClassId && students.length === 0 && (
                <div className="card text-center">
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '1.125rem' }}>
                        Esta turma não possui protagonistas cadastrados.
                    </p>
                </div>
            )}

            {!selectedClassId && (
                <div className="card text-center">
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '1.125rem' }}>
                        Selecione uma turma e uma data para registrar a frequência.
                    </p>
                </div>
            )}
        </div>
    );
}
