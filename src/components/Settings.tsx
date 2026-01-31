import { useState, useEffect } from 'react';
import { Save, RefreshCw, Calendar, CloudUpload, CloudDownload } from 'lucide-react';
import { getBimesters, saveBimesters, getClasses, getStudents, getAttendance, saveToStorage, STORAGE_KEYS } from '../utils/storage';
import { fetchCloudData, saveCloudData, triggerCloudSync } from '../utils/api';
import type { Bimester } from '../types';

export default function Settings() {
    const [bimesters, setBimesters] = useState<Bimester[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        setBimesters(getBimesters());
    }, []);

    const handleChange = (id: number, field: 'start' | 'end', value: string) => {
        setBimesters(prev => prev.map(b =>
            b.id === id ? { ...b, [field]: value } : b
        ));
    };

    const handleSave = () => {
        setIsSaving(true);
        try {
            saveBimesters(bimesters);
            setMessage({ type: 'success', text: 'Configurações de bimesters salvas com sucesso!' });
            triggerCloudSync(); // Background sync
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: 'Erro ao salvar configurações.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleExport = async () => {
        if (!confirm('Isso irá sobrescrever os dados na Planilha Google. Deseja continuar?')) return;
        setIsSyncing(true);
        try {
            const data = {
                classes: getClasses(),
                students: getStudents(),
                attendance: getAttendance(),
                bimesters: getBimesters()
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

            // Validate and save
            if (cloudData.classes) {
                saveToStorage(STORAGE_KEYS.CLASSES, cloudData.classes);
                saveToStorage(STORAGE_KEYS.STUDENTS, cloudData.students);
                saveToStorage(STORAGE_KEYS.ATTENDANCE, cloudData.attendance);
                saveToStorage(STORAGE_KEYS.BIMESTERS, cloudData.bimesters);

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
                <p className="page-subtitle">Configure os períodos letivos e sincronização com a nuvem</p>
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
                            onClick={handleSave}
                            disabled={isSaving}
                            style={{ width: 'auto', minWidth: '150px' }}
                        >
                            {isSaving ? <RefreshCw className="spin" size={20} /> : <Save size={20} />}
                            Salvar Configurações
                        </button>
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
