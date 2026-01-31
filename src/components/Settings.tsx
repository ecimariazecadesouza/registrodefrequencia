import { useState, useEffect } from 'react';
import { Save, RefreshCw, Calendar, CloudUpload, CloudDownload, Trash2, Plus, Palmtree } from 'lucide-react';
import {
    getBimesters,
    saveBimesters,
    getClasses,
    getStudents,
    getAttendance,
    getHolidays,
    saveHoliday,
    deleteHoliday as removeHoliday,
    saveToStorage,
    STORAGE_KEYS
} from '../utils/storage';
import { fetchCloudData, saveCloudData, triggerCloudSync } from '../utils/api';
import type { Bimester, Holiday } from '../types';

export default function Settings() {
    const [bimesters, setBimesters] = useState<Bimester[]>([]);
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // New holiday form state
    const [newHoliday, setNewHoliday] = useState({
        date: '',
        description: '',
        type: 'Feriado' as Holiday['type']
    });

    useEffect(() => {
        setBimesters(getBimesters());
        setHolidays(getHolidays());
    }, []);

    const handleChange = (id: number, field: 'start' | 'end', value: string) => {
        setBimesters(prev => prev.map(b =>
            b.id === id ? { ...b, [field]: value } : b
        ));
    };

    const handleSaveBimesters = () => {
        setIsSaving(true);
        try {
            saveBimesters(bimesters);
            setMessage({ type: 'success', text: 'Configurações de bimestres salvas com sucesso!' });
            triggerCloudSync();
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: 'Erro ao salvar configurações.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddHoliday = () => {
        if (!newHoliday.date || !newHoliday.description) {
            alert('Preencha a data e a descrição.');
            return;
        }

        const holiday: Holiday = {
            id: Date.now().toString(),
            ...newHoliday
        };

        saveHoliday(holiday);
        setHolidays(prev => [...prev].sort((a, b) => a.date.localeCompare(b.date)));
        setHolidays(getHolidays().sort((a, b) => a.date.localeCompare(b.date)));
        setNewHoliday({ date: '', description: '', type: 'Feriado' });
        setMessage({ type: 'success', text: 'Evento adicionado com sucesso!' });
        triggerCloudSync();
        setTimeout(() => setMessage(null), 3000);
    };

    const handleDeleteHoliday = (id: string) => {
        if (!confirm('Deseja excluir este evento?')) return;
        removeHoliday(id);
        setHolidays(getHolidays());
        triggerCloudSync();
    };

    const handleExport = async () => {
        if (!confirm('Isso irá sobrescrever os dados na Planilha Google. Deseja continuar?')) return;
        setIsSyncing(true);
        try {
            const data = {
                classes: getClasses(),
                students: getStudents(),
                attendance: getAttendance(),
                bimesters: getBimesters(),
                holidays: getHolidays()
            };
            await saveCloudData(data);
            setMessage({ type: 'success', text: 'Dados exportados para a nuvem com sucesso!' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Erro ao exportar dados: ' + String(error) });
        } finally {
            setIsSyncing(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const handleImport = async () => {
        if (!confirm('Isso irá sobrescrever os dados locais pelos dados da Planilha. Deseja continuar?')) return;
        setIsSyncing(true);
        try {
            const cloudData = await fetchCloudData();

            if (cloudData.classes) {
                saveToStorage(STORAGE_KEYS.CLASSES, cloudData.classes);
                saveToStorage(STORAGE_KEYS.STUDENTS, cloudData.students);
                saveToStorage(STORAGE_KEYS.ATTENDANCE, cloudData.attendance);
                saveToStorage(STORAGE_KEYS.BIMESTERS, cloudData.bimesters);
                if (cloudData.holidays) {
                    saveToStorage(STORAGE_KEYS.HOLIDAYS, cloudData.holidays);
                    setHolidays(cloudData.holidays);
                }

                setBimesters(cloudData.bimesters);
                setMessage({ type: 'success', text: 'Dados importados da nuvem com sucesso!' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Erro ao importar dados: ' + String(error) });
        } finally {
            setIsSyncing(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    return (
        <div style={{ paddingBottom: '2rem' }}>
            <div className="page-header">
                <h1 className="page-title">Configurações do Sistema</h1>
                <p className="page-subtitle">Configure os períodos letivos, feriados e sincronização com a nuvem</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Calendar size={24} color="var(--color-primary)" />
                            Configurar Bimestres (2026)
                        </h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {bimesters.map((b) => (
                            <div key={b.id} style={{
                                padding: '1rem',
                                background: 'var(--color-bg-secondary)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--color-border)'
                            }}>
                                <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary)', fontSize: '1.1rem' }}>{b.name}</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Data de Início</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={b.start}
                                            onChange={(e) => handleChange(b.id, 'start', e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Data de Término</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={b.end}
                                            onChange={(e) => handleChange(b.id, 'end', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="modal-footer" style={{ marginTop: '2rem', padding: 0, border: 'none', justifyContent: 'flex-start' }}>
                        <button
                            className="btn btn-primary"
                            onClick={handleSaveBimesters}
                            disabled={isSaving}
                            style={{ width: 'auto', minWidth: '150px' }}
                        >
                            {isSaving ? <RefreshCw className="spin" size={20} /> : <Save size={20} />}
                            Salvar Bimestres
                        </button>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Palmtree size={24} color="var(--color-warning)" />
                            Feriados e Férias
                        </h2>
                    </div>

                    <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                        <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Novo Evento</h3>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Data</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={newHoliday.date}
                                    onChange={e => setNewHoliday({ ...newHoliday, date: e.target.value })}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Descrição</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Ex: Carnaval, Férias de Julho"
                                    value={newHoliday.description}
                                    onChange={e => setNewHoliday({ ...newHoliday, description: e.target.value })}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Tipo</label>
                                <select
                                    className="form-select"
                                    value={newHoliday.type}
                                    onChange={e => setNewHoliday({ ...newHoliday, type: e.target.value as any })}
                                >
                                    <option value="Feriado">Feriado</option>
                                    <option value="Recesso">Recesso</option>
                                    <option value="Férias">Férias</option>
                                </select>
                            </div>
                            <button className="btn btn-primary" onClick={handleAddHoliday}>
                                <Plus size={18} /> Adicionar
                            </button>
                        </div>
                    </div>

                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Descrição</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {holidays.sort((a, b) => a.date.localeCompare(b.date)).map(h => (
                                    <tr key={h.id}>
                                        <td>{h.date.split('-').reverse().join('/')}</td>
                                        <td>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{h.type}</div>
                                            {h.description}
                                        </td>
                                        <td>
                                            <button className="btn-icon" onClick={() => handleDeleteHoliday(h.id)}>
                                                <Trash2 size={18} color="var(--color-danger)" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {holidays.length === 0 && (
                                    <tr>
                                        <td colSpan={3} style={{ textAlign: 'center', padding: '1rem', color: 'var(--color-text-muted)' }}>
                                            Nenhum feriado cadastrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CloudUpload size={24} color="var(--color-success)" />
                            Sincronização Cloud
                        </h2>
                    </div>

                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                        Conecte o sistema com sua Planilha Google para salvar os dados na nuvem e permitir o acesso de outros dispositivos.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <button
                            className="btn btn-outline"
                            onClick={handleExport}
                            disabled={isSyncing}
                            style={{ justifyContent: 'center', borderColor: 'var(--color-success)', color: 'var(--color-success)' }}
                        >
                            {isSyncing ? <RefreshCw className="spin" size={20} /> : <CloudUpload size={20} />}
                            Exportar para Google Sheets
                        </button>

                        <button
                            className="btn btn-outline"
                            onClick={handleImport}
                            disabled={isSyncing}
                            style={{ justifyContent: 'center', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                        >
                            {isSyncing ? <RefreshCw className="spin" size={20} /> : <CloudDownload size={20} />}
                            Importar do Google Sheets
                        </button>
                    </div>

                    <div style={{
                        marginTop: '1.5rem',
                        padding: '1rem',
                        background: 'var(--color-bg-secondary)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.875rem',
                        color: 'var(--color-text-muted)',
                        border: '1px solid var(--color-border)'
                    }}>
                        <strong>Nota:</strong> A exportação sobrescreve a planilha. Use a importação para recuperar dados em um novo navegador.
                    </div>
                </div>
            </div>

            {message && (
                <div style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    padding: '1rem 2rem',
                    borderRadius: 'var(--radius-md)',
                    background: message.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
                    color: 'white',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    zIndex: 1000
                }}>
                    {message.text}
                </div>
            )}
        </div>
    );
}
