import { useMemo } from 'react';
import { GraduationCap, Users, TrendingUp, Calendar, History, CheckCircle2 } from 'lucide-react';
import { calculateStudentStats } from '../utils/storage';
import { useData } from '../context/DataContext';

export default function Dashboard() {
    const { classes, students, attendance } = useData();
    const stats = useMemo(() => {
        let totalAttendance = 0;
        let studentCount = 0;

        students.forEach((student) => {
            const studentStats = calculateStudentStats(student.id);
            if (studentStats.totalDays > 0) {
                totalAttendance += studentStats.attendanceRate;
                studentCount++;
            }
        });

        const avgAttendance = studentCount > 0 ? totalAttendance / studentCount : 0;

        return {
            totalClasses: classes.length,
            totalStudents: students.length,
            averageAttendance: avgAttendance,
            totalRecords: attendance.length,
        };
    }, [classes, students, attendance]);

    const recentActivity = useMemo(() => {
        const activityMap = new Map<string, { date: string, className: string, count: number }>();
        const sortedAttendance = [...attendance].sort((a, b) => b.date.localeCompare(a.date));

        sortedAttendance.forEach(record => {
            const student = students.find(s => String(s.id) === String(record.studentId));
            if (!student) return;

            const classItem = classes.find(c => String(c.id) === String(student.classId));
            if (!classItem) return;

            const key = `${record.date.substring(0, 10)}-${classItem.id}`;
            if (!activityMap.has(key)) {
                activityMap.set(key, {
                    date: record.date.substring(0, 10),
                    className: classItem.name,
                    count: 1
                });
            } else {
                const existing = activityMap.get(key)!;
                activityMap.set(key, { ...existing, count: existing.count + 1 });
            }
        });

        return Array.from(activityMap.values()).slice(0, 5);
    }, [classes, students, attendance]);

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">Visão geral do sistema de frequência escolar</p>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon primary">
                        <GraduationCap size={32} color="white" />
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Total de Turmas</div>
                        <div className="stat-value">{stats.totalClasses}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon success">
                        <Users size={32} color="white" />
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Protagonistas</div>
                        <div className="stat-value">{stats.totalStudents}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon warning">
                        <TrendingUp size={32} color="white" />
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Frequência Média</div>
                        <div className="stat-value">{stats.averageAttendance.toFixed(1)}%</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon danger">
                        <Calendar size={32} color="white" />
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Registros Totais</div>
                        <div className="stat-value">{stats.totalRecords}</div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                <div className="card">
                    <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <History size={20} color="var(--color-primary)" />
                        <h2 className="card-title">Atividade Recente</h2>
                    </div>
                    <div>
                        {recentActivity.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {recentActivity.map((activity, index) => (
                                    <div key={index} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '0.75rem',
                                        backgroundColor: 'var(--color-bg-secondary)',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--color-border)'
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>
                                                {activity.className}
                                            </div>
                                            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                                                Data: {activity.date.split('-').reverse().join('/')} • {activity.count} Registros
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-success)' }}>
                                            <CheckCircle2 size={16} />
                                            <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Registrado</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem 0' }}>
                                Nenhum registro de frequência encontrado.
                            </p>
                        )}
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Legenda de Presença</h2>
                    </div>
                    <div>
                        <p style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
                            Este sistema utiliza os seguintes códigos para registro:
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '6px',
                                    background: 'var(--color-success)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontWeight: 'bold'
                                }}>P</span>
                                <span style={{ color: 'var(--color-text-secondary)' }}>Presente</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '6px',
                                    background: 'var(--color-danger)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontWeight: 'bold'
                                }}>F</span>
                                <span style={{ color: 'var(--color-text-secondary)' }}>Falta</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '6px',
                                    background: 'var(--color-warning)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontWeight: 'bold'
                                }}>J</span>
                                <span style={{ color: 'var(--color-text-secondary)' }}>Justificada</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '6px',
                                    background: 'var(--color-neutral)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontWeight: 'bold'
                                }}>-</span>
                                <span style={{ color: 'var(--color-text-secondary)' }}>Sem Aula</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
