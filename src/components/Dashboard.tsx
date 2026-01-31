import { useEffect, useState } from 'react';
import { GraduationCap, Users, TrendingUp, Calendar } from 'lucide-react';
import { getClasses, getStudents, getAttendance, calculateStudentStats } from '../utils/storage';

export default function Dashboard() {
    const [stats, setStats] = useState({
        totalClasses: 0,
        totalStudents: 0,
        averageAttendance: 0,
        totalRecords: 0,
    });

    useEffect(() => {
        const classes = getClasses();
        const students = getStudents();
        const attendance = getAttendance();

        // Calculate average attendance
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

        setStats({
            totalClasses: classes.length,
            totalStudents: students.length,
            averageAttendance: avgAttendance,
            totalRecords: attendance.length,
        });
    }, []);

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

            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Bem-vindo ao Sistema de Frequência</h2>
                </div>
                <div>
                    <p style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
                        Este sistema permite gerenciar turmas, cadastrar protagonistas e registrar a frequência diária de forma simples e eficiente.
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
    );
}
