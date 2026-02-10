import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Filter, PieChart as PieChartIcon, BarChart3, TrendingUp as TrendingUpIcon } from 'lucide-react';
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    LineChart, Line
} from 'recharts';
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

    const reportData = useMemo(() => {
        let bimesterStart: string | undefined;
        let bimesterEnd: string | undefined;

        if (selectedBimester > 0 && bimesters.length >= selectedBimester) {
            const b = bimesters[selectedBimester - 1];
            bimesterStart = b.start;
            bimesterEnd = b.end;
        }

        let filteredStudents = selectedClassId === 'all'
            ? students
            : students.filter(s => String(s.classId) === String(selectedClassId));

        if (selectedSituation !== 'all') {
            filteredStudents = filteredStudents.filter(s =>
                String(s.situation).trim().toLowerCase() === String(selectedSituation).trim().toLowerCase()
            );
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

        return [...finalData].sort((a, b) => b.stats.attendanceRate - a.stats.attendanceRate);
    }, [selectedClassId, selectedBimester, selectedSituation, selectedFrequencyLevel, students, classes, bimesters]);

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

    // Chart colors matching design system
    const COLORS = {
        excelente: '#10b981', // var(--color-success)
        regular: '#f59e0b',   // var(--color-warning)
        critico: '#ef4444'    // var(--color-danger)
    };

    // Chart Data 1: Frequency Distribution (Pie Chart)
    const frequencyDistribution = useMemo(() => {
        const distribution = {
            excelente: 0,
            regular: 0,
            critico: 0
        };

        reportData.forEach(({ stats }) => {
            const rate = stats.attendanceRate;
            if (rate >= 90) distribution.excelente++;
            else if (rate >= 75) distribution.regular++;
            else distribution.critico++;
        });

        return [
            { name: 'Excelente (≥90%)', value: distribution.excelente, color: COLORS.excelente },
            { name: 'Regular (75-89%)', value: distribution.regular, color: COLORS.regular },
            { name: 'Crítico (<75%)', value: distribution.critico, color: COLORS.critico }
        ].filter(item => item.value > 0);
    }, [reportData]);

    // Chart Data 2: Class Summary (Bar Chart)
    const classSummary = useMemo(() => {
        const classMap = new Map<string, { total: number, sum: number, count: number }>();

        reportData.forEach(({ className, stats }) => {
            if (!classMap.has(className)) {
                classMap.set(className, { total: 0, sum: 0, count: 0 });
            }
            const classData = classMap.get(className)!;
            classData.sum += stats.attendanceRate;
            classData.count++;
        });

        return Array.from(classMap.entries())
            .map(([name, data]) => ({
                name,
                frequencia: parseFloat((data.sum / data.count).toFixed(1)),
                alunos: data.count
            }))
            .sort((a, b) => b.frequencia - a.frequencia);
    }, [reportData]);

    // Chart Data 3: Bimester Trend (Line Chart)
    const bimesterTrend = useMemo(() => {
        if (selectedBimester > 0) return []; // Only show for "all year" view

        return bimesters.map((bim) => {
            let totalRate = 0;
            let count = 0;

            students.forEach(student => {
                const stats = calculateStudentStats(student.id, bim.start, bim.end);
                if (stats.totalDays > 0) {
                    totalRate += stats.attendanceRate;
                    count++;
                }
            });

            return {
                name: bim.name,
                frequencia: count > 0 ? parseFloat((totalRate / count).toFixed(1)) : 0
            };
        });
    }, [bimesters, students, selectedBimester]);

    // Chart Data 4: Top 10 Students (Stacked Bar Chart)
    const topStudentsData = useMemo(() => {
        return reportData
            .slice(0, 10)
            .map(({ student, stats }) => ({
                name: student.name.split(' ')[0] + ' ' + (student.name.split(' ').pop() || ''),
                Presenças: stats.present,
                Faltas: stats.absent,
                Justificadas: stats.justified
            }));
    }, [reportData]);

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

            {reportData.length > 0 && (
                <>
                    {/* Charts Section */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                        gap: '1.5rem',
                        marginBottom: '2rem'
                    }}>
                        {/* Chart 1: Frequency Distribution */}
                        {frequencyDistribution.length > 0 && (
                            <div className="card">
                                <div className="card-header">
                                    <h3 className="card-title" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <PieChartIcon size={18} />
                                        Distribuição de Frequência
                                    </h3>
                                </div>
                                <ResponsiveContainer width="100%" height={280}>
                                    <PieChart>
                                        <Pie
                                            data={frequencyDistribution}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {frequencyDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                background: 'var(--color-bg-primary)',
                                                border: '1px solid var(--color-border)',
                                                borderRadius: 'var(--radius-md)'
                                            }}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Chart 2: Class Summary */}
                        {classSummary.length > 0 && (
                            <div className="card">
                                <div className="card-header">
                                    <h3 className="card-title" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <BarChart3 size={18} />
                                        Frequência Média por Turma
                                    </h3>
                                </div>
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={classSummary}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                        <XAxis
                                            dataKey="name"
                                            tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                                            angle={-45}
                                            textAnchor="end"
                                            height={80}
                                        />
                                        <YAxis
                                            tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                                            domain={[0, 100]}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                background: 'var(--color-bg-primary)',
                                                border: '1px solid var(--color-border)',
                                                borderRadius: 'var(--radius-md)'
                                            }}
                                            formatter={(value) => value != null ? [`${Number(value).toFixed(1)}%`, 'Frequência'] : ['', '']}
                                        />
                                        <Bar
                                            dataKey="frequencia"
                                            fill="#6366f1"
                                            radius={[8, 8, 0, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Chart 3: Bimester Trend */}
                        {bimesterTrend.length > 0 && selectedBimester === 0 && (
                            <div className="card">
                                <div className="card-header">
                                    <h3 className="card-title" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <TrendingUpIcon size={18} />
                                        Evolução ao Longo do Ano
                                    </h3>
                                </div>
                                <ResponsiveContainer width="100%" height={280}>
                                    <LineChart data={bimesterTrend}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                        <XAxis
                                            dataKey="name"
                                            tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                                        />
                                        <YAxis
                                            tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                                            domain={[0, 100]}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                background: 'var(--color-bg-primary)',
                                                border: '1px solid var(--color-border)',
                                                borderRadius: 'var(--radius-md)'
                                            }}
                                            formatter={(value) => value != null ? [`${Number(value).toFixed(1)}%`, 'Frequência Média'] : ['', '']}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="frequencia"
                                            stroke="#10b981"
                                            strokeWidth={3}
                                            dot={{ fill: '#10b981', r: 5 }}
                                            activeDot={{ r: 7 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Chart 4: Top 10 Students */}
                        {topStudentsData.length > 0 && (
                            <div className="card">
                                <div className="card-header">
                                    <h3 className="card-title" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <TrendingUp size={18} />
                                        Top 10 Protagonistas
                                    </h3>
                                </div>
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={topStudentsData} layout="horizontal">
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                        <XAxis type="number" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                                        <YAxis
                                            type="category"
                                            dataKey="name"
                                            tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }}
                                            width={100}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                background: 'var(--color-bg-primary)',
                                                border: '1px solid var(--color-border)',
                                                borderRadius: 'var(--radius-md)'
                                            }}
                                        />
                                        <Legend />
                                        <Bar dataKey="Presenças" stackId="a" fill={COLORS.excelente} />
                                        <Bar dataKey="Justificadas" stackId="a" fill={COLORS.regular} />
                                        <Bar dataKey="Faltas" stackId="a" fill={COLORS.critico} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </>
            )}

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

                    <div className="table-container">
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                                    <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Protagonista</th>
                                    <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Turma</th>
                                    <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontWeight: 600, textAlign: 'center' }}>Presenças</th>
                                    <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontWeight: 600, textAlign: 'center' }}>Faltas</th>
                                    <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontWeight: 600, textAlign: 'center' }}>Justif.</th>
                                    <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontWeight: 600, textAlign: 'center' }}>Aulas</th>
                                    <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontWeight: 600, textAlign: 'center' }}>Taxa</th>
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
