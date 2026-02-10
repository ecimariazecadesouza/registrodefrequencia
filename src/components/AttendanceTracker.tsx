import { useState, useEffect, useMemo } from 'react';
import { Calendar, Save, Check, Pencil, Search, History } from 'lucide-react';
import type { AttendanceRecord, AttendanceStatus, StudentSituation } from '../types';
import {
    getAttendanceByDate,
    saveAttendance
} from '../utils/storage';
import { useData } from '../context/DataContext';

export default function AttendanceTracker() {
    const { classes, students: allStudents, attendance: allRecords, bimesters, holidays, refreshData } = useData();
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [lessonsPerDay, setLessonsPerDay] = useState<number>(1);
    const [filterSituation, setFilterSituation] = useState<StudentSituation | 'Todas'>('Cursando');
    // Map key: studentId-lessonIndex value: status
    const [attendance, setAttendance] = useState<Map<string, AttendanceStatus>>(new Map());
    const [classNotes, setClassNotes] = useState<string>('');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
    const [recordExists, setRecordExists] = useState(false);
    const [currentHoliday, setCurrentHoliday] = useState<{ description: string, type: string } | null>(null);
    const [searchStudent, setSearchStudent] = useState('');

    // Filter students when class, situation, allStudents or search change
    const students = useMemo(() => {
        if (!selectedClassId) return [];

        let classStudents = allStudents.filter(s => String(s.classId) === String(selectedClassId));

        if (filterSituation !== 'Todas') {
            classStudents = classStudents.filter(s =>
                String(s.situation).trim().toLowerCase() === String(filterSituation).trim().toLowerCase()
            );
        }

        if (searchStudent) {
            const query = searchStudent.toLowerCase();
            classStudents = classStudents.filter(s => {
                const name = String(s.name || '').toLowerCase();
                const registration = String(s.registration || '').toLowerCase();
                return name.includes(query) || registration.includes(query);
            });
        }

        return classStudents;
    }, [selectedClassId, filterSituation, allStudents, searchStudent]);

    // Check for holiday
    useEffect(() => {
        const holiday = holidays.find(h => h.date.substring(0, 10) === selectedDate.substring(0, 10));
        setCurrentHoliday(holiday ? { description: holiday.description, type: holiday.type } : null);
    }, [selectedDate, holidays]);

    // Load attendance when date or students change
    useEffect(() => {
        if (selectedClassId && students.length >= 0) {
            const classItem = classes.find(c => String(c.id) === String(selectedClassId));

            // 1. First, determine how many lessons to show
            const existingAttendance = getAttendanceByDate(selectedDate);
            const classStudentIds = students.map(s => String(s.id));
            const classRecords = existingAttendance.filter(r => classStudentIds.includes(String(r.studentId)));

            if (classRecords.length > 0) {
                // If we have records, use the max index recorded
                const maxIdx = Math.max(...classRecords.map(r => r.lessonIndex));
                setLessonsPerDay(maxIdx + 1);
            } else if (classItem?.lessonsPerDay) {
                // If no records but class has a default, use that
                setLessonsPerDay(classItem.lessonsPerDay);
            } else {
                setLessonsPerDay(1);
            }

            setRecordExists(classRecords.length > 0);

            const attendanceMap = new Map<string, AttendanceStatus>();

            // 2. Set defaults or load existing
            if (classRecords.length === 0) {
                students.forEach(student => {
                    for (let i = 0; i < (classItem?.lessonsPerDay || 1); i++) {
                        attendanceMap.set(`${student.id}-${i}`, 'P');
                    }
                });
            } else {
                classRecords.forEach(record => {
                    attendanceMap.set(`${record.studentId}-${record.lessonIndex}`, record.status);
                });
            }

            setAttendance(attendanceMap);

            // 3. Load notes
            if (classRecords.length > 0) {
                setClassNotes(classRecords[0]?.notes || '');
            } else {
                setClassNotes('');
            }

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
                    subject: getSubjectForLesson(lessonIndex),
                    notes: classNotes
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
            const isOffline = String(error).includes('Offline');
            if (isOffline) {
                setHasUnsavedChanges(false);
                setMessage({
                    type: 'info',
                    text: 'Sem conexão. Chamada salva localmente e será sincronizada automaticamente assim que houver internet.'
                });
                refreshData();
            } else {
                setMessage({ type: 'error', text: 'Erro ao salvar chamada: ' + String(error) });
            }
        } finally {
            setIsSaving(false);
        }
    };

    const getSubjectForLesson = (lessonIndex: number) => {
        if (!selectedClassId) return '';
        const classItem = classes.find(c => String(c.id) === String(selectedClassId));
        if (!classItem || !classItem.schedule) return '';

        const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        // Normaliza a data para YYYY-MM-DD caso venha no formato ISO longo
        const cleanDate = selectedDate.substring(0, 10);
        const [year, month, day] = cleanDate.split('-').map(Number);

        // Use Noon to avoid any DST/Midnight jump issues
        const d = new Date(year, month - 1, day, 12, 0, 0);
        const dayName = days[d.getDay()];

        return classItem.schedule[dayName]?.[lessonIndex] || '';
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

    const statusCounts = useMemo(() => {
        const counts = {
            present: 0,
            absent: 0,
            justified: 0,
            noClass: 0,
            total: students.length * lessonsPerDay
        };

        attendance.forEach((status, key) => {
            if (students.some(s => key.startsWith(String(s.id)))) {
                switch (status) {
                    case 'P': counts.present++; break;
                    case 'F': counts.absent++; break;
                    case 'J': counts.justified++; break;
                    case '-': counts.noClass++; break;
                }
            }
        });

        return counts;
    }, [attendance, students, lessonsPerDay]);

    const historySummary = useMemo(() => {
        if (!selectedClassId) return [];

        const classStudentIds = allStudents.filter(s => String(s.classId) === String(selectedClassId)).map(s => String(s.id));
        const classAttendance = allRecords.filter(r => classStudentIds.includes(String(r.studentId)));

        const groups = new Map<string, {
            date: string,
            bimester: string,
            lessons: number,
            presenceRate: number,
            presentCount: number,
            totalCount: number
        }>();

        classAttendance.forEach(record => {
            const date = record.date.substring(0, 10);
            if (!groups.has(date)) {
                const recordDate = new Date(date);
                const bimester = bimesters.find(b => {
                    const start = new Date(b.start);
                    const end = new Date(b.end);
                    return recordDate >= start && recordDate <= end;
                });

                groups.set(date, {
                    date,
                    bimester: bimester ? bimester.name : 'N/A',
                    lessons: 0,
                    presenceRate: 0,
                    presentCount: 0,
                    totalCount: 0
                });
            }

            const group = groups.get(date)!;
            group.totalCount++;
            if (record.status === 'P' || record.status === 'J') {
                group.presentCount++;
            }
            group.lessons = Math.max(group.lessons, record.lessonIndex + 1);
        });

        return Array.from(groups.values())
            .map(g => ({
                ...g,
                presenceRate: (g.presentCount / g.totalCount) * 100
            }))
            .sort((a, b) => b.date.localeCompare(a.date));
    }, [selectedClassId, allStudents, allRecords, bimesters]);

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

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Buscar Protagonista</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Nome ou RA..."
                                value={searchStudent}
                                onChange={(e) => setSearchStudent(e.target.value)}
                                style={{ paddingLeft: '2.5rem' }}
                                disabled={!selectedClassId}
                            />
                            <Search
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
                </div>

                {selectedClassId && !classes.find(c => String(c.id) === String(selectedClassId))?.schedule && (
                    <div style={{
                        marginTop: '1rem',
                        padding: '0.75rem',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid var(--color-danger)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--color-danger)',
                        fontSize: '0.875rem'
                    }}>
                        ⚠️ Esta turma ainda não possui um <strong>Horário Semanal</strong> configurado.
                        As disciplinas não aparecerão automaticamente até que você defina o horário em "Gestão de Turmas".
                    </div>
                )}

                {selectedClassId && (
                    <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Pencil size={16} /> Conteúdo da Aula / Anotações
                            </label>
                            <textarea
                                className="form-input"
                                placeholder="Descreva o que foi trabalhado nesta aula..."
                                value={classNotes}
                                onChange={(e) => {
                                    setClassNotes(e.target.value);
                                    setHasUnsavedChanges(true);
                                }}
                                style={{ minHeight: '80px', resize: 'vertical' }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {selectedClassId && students.length > 0 && (
                <>
                    {currentHoliday && (
                        <div style={{
                            marginBottom: '1rem',
                            padding: '0.75rem 1rem',
                            backgroundColor: 'rgba(245, 158, 11, 0.1)',
                            border: '1px solid var(--color-warning)',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: 'var(--color-warning)',
                            fontWeight: '500'
                        }}>
                            <Calendar size={20} />
                            Atenção: Esta data está marcada como {currentHoliday.type.toUpperCase()}: {currentHoliday.description}.
                        </div>
                    )}

                    {recordExists && !currentHoliday && (
                        <div style={{
                            marginBottom: '1rem',
                            padding: '0.75rem 1rem',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid var(--color-success)',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: 'var(--color-success)',
                            fontWeight: '500'
                        }}>
                            <Check size={20} />
                            Frequência já registrada para esta turma nesta data. Os dados abaixo foram carregados da nuvem.
                        </div>
                    )}

                    {message && (
                        <div className={`message ${message.type}`} style={{
                            marginBottom: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '1rem',
                            borderRadius: 'var(--radius-md)',
                            background: message.type === 'success' ? 'var(--color-success-bg)' :
                                message.type === 'info' ? 'rgba(59, 130, 246, 0.1)' : 'var(--color-danger-bg)',
                            color: message.type === 'success' ? 'var(--color-success)' :
                                message.type === 'info' ? '#3b82f6' : 'var(--color-danger)',
                            border: `1px solid ${message.type === 'success' ? 'var(--color-success)' :
                                message.type === 'info' ? '#3b82f6' : 'var(--color-danger)'}`
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
                                    {selectedDate && (
                                        <span style={{ marginLeft: '0.5rem', opacity: 0.8 }}>
                                            • {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][new Date(selectedDate + 'T12:00:00').getDay()]}
                                        </span>
                                    )}
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
                                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', minWidth: '120px' }}>
                                                    {lessonsPerDay > 1 ? `${idx + 1}ª Aula` : '1ª Aula'} {getSubjectForLesson(idx) && (
                                                        <span style={{ color: 'var(--color-primary)', display: 'block' }}>
                                                            {getSubjectForLesson(idx)}
                                                        </span>
                                                    )}
                                                </span>
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

            {selectedClassId && (
                <div className="card" style={{ marginTop: '2rem' }}>
                    <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <History size={20} color="var(--color-primary)" />
                        <h2 className="card-title">Histórico de Chamadas - {classes.find(c => String(c.id) === String(selectedClassId))?.name}</h2>
                    </div>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>DATA</th>
                                    <th>PERÍODO</th>
                                    <th>TEMPO</th>
                                    <th>PRESENÇA</th>
                                    <th style={{ textAlign: 'right' }}>AÇÕES</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historySummary.length > 0 ? (
                                    historySummary.map((item, index) => (
                                        <tr key={index}>
                                            <td style={{ paddingRight: '2rem' }}>{item.date.substring(0, 10).split('-').reverse().join('/')}</td>
                                            <td style={{ paddingRight: '2rem' }}>{item.bimester}</td>
                                            <td style={{ paddingRight: '2rem' }}>{item.lessons} Tempo(s)</td>
                                            <td style={{ paddingRight: '2rem' }}>
                                                <span style={{
                                                    color: item.presenceRate >= 75 ? 'var(--color-success)' : 'var(--color-danger)',
                                                    fontWeight: '600'
                                                }}>
                                                    {item.presenceRate.toFixed(2)}%
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                    <button
                                                        className="btn-icon"
                                                        title="Ver Detalhes"
                                                        onClick={() => {
                                                            setSelectedDate(item.date);
                                                            setLessonsPerDay(item.lessons);
                                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                                        }}
                                                    >
                                                        <Search size={18} />
                                                    </button>
                                                    <button
                                                        className="btn-primary"
                                                        style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                                        onClick={() => {
                                                            setSelectedDate(item.date);
                                                            setLessonsPerDay(item.lessons);
                                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                                        }}
                                                    >
                                                        <Pencil size={14} style={{ marginRight: '4px' }} />
                                                        Editar
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                                            Nenhum registro encontrado para esta turma.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* DEBUG SECTION - REMOVE LATER */}
            {selectedClassId && (
                <div style={{ marginTop: '2rem', padding: '1rem', background: '#f3f4f6', borderRadius: '4px', fontSize: '0.75rem' }}>
                    <strong>🔍 Debug Info (Temporário):</strong>
                    <pre style={{ whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify({
                            aula: lessonsPerDay,
                            dataSelecionada: selectedDate,
                            dataLimpa: selectedDate.substring(0, 10),
                            diaSemana: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][new Date(selectedDate.substring(0, 10).split('-').map(Number)[0], selectedDate.substring(0, 10).split('-').map(Number)[1] - 1, selectedDate.substring(0, 10).split('-').map(Number)[2], 12).getDay()],
                            gradeHoraria: classes.find(c => String(c.id) === String(selectedClassId))?.schedule
                        }, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}
