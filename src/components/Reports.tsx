import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Filter } from 'lucide-react';
import type { Bimester } from '../types';

import {
    calculateStudentStats,
} from '../utils/storage';
import { useData } from '../context/DataContext';

export default function Reports() {
    const { classes, students, bimesters } = useData();
    const [selectedClassId, setSelectedClassId] = useState<string>('all');
    const [selectedBimester, setSelectedBimester] = useState<number>(0); // 0 = Todo o ano
    const [selectedSituation, setSelectedSituation] = useState<string>('Cursando');
    const [selectedFrequencyLevel, setSelectedFrequencyLevel] = useState<string>('all');
    const [reportData, setReportData] = useState<any[]>([]);

    useEffect(() => {
        let bimesterStart: string | undefined;
        let bimesterEnd: string | undefined;

        if (selectedBimester > 0) {
            const b = bimesters[selectedBimester - 1];
            bimesterStart = b.start;
            bimesterEnd = b.end;
        }

        let filteredStudents = selectedClassId === 'all'
            ? students
            : students.filter(s => s.classId === selectedClassId);

        // Filter by situation
        if (selectedSituation !== 'all') {
            filteredStudents = filteredStudents.filter(s => s.situation === selectedSituation);
        }

        const data = filteredStudents.map(student => {
            const stats = calculateStudentStats(student.id, bimesterStart, bimesterEnd);
            const classItem = classes.find(c => c.id === student.classId);

            return {
                student,
                className: classItem?.name || 'Sem turma',
                stats,
            };
        });

        // Filter by frequency level
        let finalData = data;
        if (selectedFrequencyLevel !== 'all') {
            finalData = data.filter(item => {
                const rate = item.stats.attendanceRate;
                if (selectedFrequencyLevel === 'excelente') return rate >= 90;
                if (selectedFrequencyLevel === 'regular') return rate >= 75 && rate < 90;
                if (selectedFrequencyLevel === 'critico') return rate < 75;
                return true;
            });
        }

        // Sort by attendance rate (descending)
        finalData.sort((a, b) => b.stats.attendanceRate - a.stats.attendanceRate);

        setReportData(finalData);
    }, [selectedClassId, selectedBimester, selectedSituation, selectedFrequencyLevel, students, classes]);

    const getAttendanceIcon = (rate: number) => {
        if (rate >= 90) return <TrendingUp size={20} color="var(--color-success)" />;
        if (rate >= 75) return <Minus size={20} color="var(--color-warning)" />;
        return <TrendingDown size={20} color="var(--color-danger)" />;
    };

    const getAttendanceColor = (rate: number) => {
        if (rate >= 90) return 'var(--color-success)';
        if (rate >= 75) return 'var(--color-warning)';
        return 'var(--color-danger)';
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
                <h1 className="page-title">Relatórios de Frequência</h1>
                <p className="page-subtitle">Análise detalhada da frequência dos protagonistas</p>
            </div>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Turma</label>
                        <select
                            className="form-select"
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                        >
                            <option value="all">Todas as Turmas</option>
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name} - {c.period}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Situação</label>
                        <select
                            className="form-select"
                            value={selectedSituation}
                            onChange={(e) => setSelectedSituation(e.target.value)}
                        >
                            <option value="all">Todas</option>
                            <option value="Cursando">Cursando</option>
                            <option value="Evasão">Evasão</option>
                            <option value="Transferência">Transferência</option>
                        </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Nível de Frequência</label>
                        <select
                            className="form-select"
                            value={selectedFrequencyLevel}
                            onChange={(e) => setSelectedFrequencyLevel(e.target.value)}
                        >
                            <option value="all">Todos os Níveis</option>
                            <option value="excelente">Excelente (≥ 90%)</option>
                            <option value="regular">Regular (75-89%)</option>
                            <option value="critico">Crítico (&lt; 75%)</option>
                        </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Período</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Filter size={20} color="var(--color-text-muted)" />
                            <select
                                className="form-select"
                                value={selectedBimester}
                                onChange={(e) => setSelectedBimester(parseInt(e.target.value))}
                            >
                                <option value={0}>2026 Completo</option>
                                {bimesters.map((b: Bimester) => (
                                    <option key={b.id} value={b.id}>
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {reportData.length > 0 ? (
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">
                            {selectedBimester === 0 ? 'Relatório Anual' : `Relatório - ${bimesters[selectedBimester - 1].name}`}
                        </h2>
                        <div style={{ color: 'var(--color-text-muted)' }}>
                            {reportData.length} protagonista{reportData.length !== 1 ? 's' : ''}
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: '0.875rem'
                        }}>
                            <thead>
                                <tr style={{
                                    borderBottom: '2px solid var(--color-border)',
                                    textAlign: 'left'
                                }}>
                                    <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                                        Protagonista
                                    </th>
                                    <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                                        Turma
                                    </th>
                                    <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontWeight: 600, textAlign: 'center' }}>
                                        Presenças
                                    </th>
                                    <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontWeight: 600, textAlign: 'center' }}>
                                        Faltas
                                    </th>
                                    <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontWeight: 600, textAlign: 'center' }}>
                                        Justif.
                                    </th>
                                    <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontWeight: 600, textAlign: 'center' }}>
                                        Total Aulas
                                    </th>
                                    <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontWeight: 600, textAlign: 'center' }}>
                                        Taxa
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.map(({ student, className, stats }) => (
                                    <tr
                                        key={student.id}
                                        style={{
                                            borderBottom: '1px solid var(--color-border)',
                                            transition: 'background var(--transition-fast)',
                                            opacity: student.situation !== 'Cursando' ? 0.6 : 1
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'var(--color-surface-hover)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                        }}
                                    >
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div className="student-avatar" style={{ width: '40px', height: '40px' }}>
                                                    {getInitials(student.name)}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                                                        {student.name}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.1rem' }}>
                                                        <span style={{
                                                            fontSize: '0.65rem',
                                                            padding: '0 0.3rem',
                                                            borderRadius: '4px',
                                                            background: student.situation === 'Cursando' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                                                            color: student.situation === 'Cursando' ? 'var(--color-success)' : 'var(--color-danger)'
                                                        }}>
                                                            {student.situation}
                                                        </span>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                            RA: {student.registration}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem', color: 'var(--color-text-secondary)' }}>
                                            {className}
                                        </td>
                                        <td style={{
                                            padding: '1rem',
                                            textAlign: 'center',
                                            color: 'var(--color-success)',
                                            fontWeight: 600
                                        }}>
                                            {stats.present}
                                        </td>
                                        <td style={{
                                            padding: '1rem',
                                            textAlign: 'center',
                                            color: 'var(--color-danger)',
                                            fontWeight: 600
                                        }}>
                                            {stats.absent}
                                        </td>
                                        <td style={{
                                            padding: '1rem',
                                            textAlign: 'center',
                                            color: 'var(--color-warning)',
                                            fontWeight: 600
                                        }}>
                                            {stats.justified}
                                        </td>
                                        <td style={{
                                            padding: '1rem',
                                            textAlign: 'center',
                                            color: 'var(--color-text-secondary)'
                                        }}>
                                            {stats.totalDays - stats.noClass}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.5rem'
                                            }}>
                                                {getAttendanceIcon(stats.attendanceRate)}
                                                <span style={{
                                                    fontWeight: 700,
                                                    fontSize: '1rem',
                                                    color: getAttendanceColor(stats.attendanceRate)
                                                }}>
                                                    {stats.attendanceRate.toFixed(1)}%
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div style={{
                        marginTop: '2rem',
                        padding: '1rem',
                        background: 'var(--color-bg-secondary)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        gap: '2rem',
                        flexWrap: 'wrap'
                    }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                                LEGENDA DE FREQUÊNCIA (MÉDIA)
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <TrendingUp size={16} color="var(--color-success)" />
                                    <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                                        ≥ 90% - Excelente
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Minus size={16} color="var(--color-warning)" />
                                    <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                                        75-89% - Regular
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <TrendingDown size={16} color="var(--color-danger)" />
                                    <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                                        &lt; 75% - Crítico (Retenção)
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="card text-center">
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '1.125rem' }}>
                        Nenhum dado de frequência disponível para este filtro.
                    </p>
                </div>
            )}
        </div>
    );
}
