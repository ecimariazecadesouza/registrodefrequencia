import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import './App.css';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import ClassManager from './components/ClassManager';
import StudentManager from './components/StudentManager';
import AttendanceTracker from './components/AttendanceTracker';
import Reports from './components/Reports';
import Settings from './components/Settings';
import { initializeSampleData } from './utils/storage';

import { DataProvider, useData } from './context/DataContext';

function AppContent() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { hydrateFromCloud } = useData();

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const { processSyncQueue } = await import('./utils/api');
      await processSyncQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const initApp = async () => {
      try {
        initializeSampleData();
        const { fetchCloudData, processSyncQueue } = await import('./utils/api');

        // Initial sync attempt
        if (navigator.onLine) {
          await processSyncQueue();
        }

        try {
          const cloudData = await fetchCloudData();
          if (cloudData && cloudData.classes && cloudData.classes.length > 0) {
            hydrateFromCloud(cloudData);
          }
        } catch (syncErr) {
          console.warn('Initial cloud sync failed:', syncErr);
        }
      } catch (err) {
        console.error('Initialization error:', err);
        setError(String(err));
      }
    };
    initApp();
  }, [hydrateFromCloud]);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [currentView]);

  const renderView = () => {
    try {
      switch (currentView) {
        case 'dashboard': return <Dashboard />;
        case 'classes': return <ClassManager />;
        case 'students': return <StudentManager />;
        case 'attendance': return <AttendanceTracker />;
        case 'reports': return <Reports />;
        case 'settings': return <Settings />;
        default: return <Dashboard />;
      }
    } catch (err) {
      console.error('Render error:', err);
      return (
        <div className="card" style={{ margin: '2rem', padding: '2rem', background: '#fee2e2', color: '#991b1b' }}>
          <h2 style={{ marginBottom: '1rem' }}>Erro ao renderizar seção</h2>
          <p>{String(err)}</p>
          <button className="btn btn-primary mt-lg" onClick={() => setCurrentView('dashboard')}>
            Voltar para Dashboard
          </button>
        </div>
      );
    }
  };

  if (error) {
    return (
      <div style={{ padding: '2rem', background: '#0f172a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyItems: 'center' }}>
        <div className="card" style={{ maxWidth: '600px', margin: 'auto', background: '#fee2e2', color: '#991b1b' }}>
          <h2 style={{ marginBottom: '1rem' }}>Erro Inesperado</h2>
          <p>{error}</p>
          <button className="btn btn-danger mt-lg" onClick={() => { localStorage.clear(); window.location.reload(); }}>
            Limpar Dados e Reiniciar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="logo" style={{ width: '32px', height: '32px', fontSize: '1rem' }}>📚</div>
          <span style={{ fontWeight: '700', fontSize: '1rem' }}>Sistema MZS</span>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isOnline ? 'var(--color-success)' : 'var(--color-danger)',
            marginLeft: '0.5rem'
          }} title={isOnline ? 'Online' : 'Offline'} />
        </div>
        <button className="menu-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'visible' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <Navigation
        currentView={currentView}
        onNavigate={setCurrentView}
        isOpen={isSidebarOpen}
      />

      <main className="main-content">
        {renderView()}
      </main>
    </div>
  );
}

function App() {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
}

export default App;
