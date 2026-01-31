import { useState, useEffect } from 'react';
import { Save, RefreshCw, Calendar } from 'lucide-react';
import { getBimesters, saveBimesters } from '../utils/storage';
import type { Bimester } from '../types';

export default function Settings() {
    const [bimesters, setBimesters] = useState<Bimester[]>([]);
    const [isSaving, setIsSaving] = useState(false);
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
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: 'Erro ao salvar configurações.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Configurações do Sistema</h1>
                <p className="page-subtitle">Configure os períodos letivos e bimesters</p>
            </div>

            <div className="card" style={{ maxWidth: '800px' }}>
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
                                <div className="form-group">
                                    <label className="form-label">Data de Início</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={b.start}
                                        onChange={(e) => handleChange(b.id, 'start', e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
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

                {message && (
                    <div style={{
                        marginTop: '1.5rem',
                        padding: '1rem',
                        borderRadius: 'var(--radius-md)',
                        background: message.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                        color: message.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
                        border: '1px solid currentColor'
                    }}>
                        {message.text}
                    </div>
                )}

                <div className="modal-footer" style={{ marginTop: '2rem', padding: 0, border: 'none' }}>
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
        </div>
    );
}
