import { useState, useEffect } from 'react';
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
  const [error, setError] = useState<string | null>(null);
  const { hydrateFromCloud } = useData();

  useEffect(() => {
    const initApp = async () => {
      try {
        console.log('App starting and syncing...');

        // 1. Initialize sample data if empty (fallback)
        initializeSampleData();

        // 2. Auto-Sync from Cloud
        const { fetchCloudData } = await import('./utils/api');

        try {
          const cloudData = await fetchCloudData();
          if (cloudData && cloudData.classes && cloudData.classes.length > 0) {
            console.log('Cloud data found, hydrating local storage...');
            hydrateFromCloud(cloudData);
            console.log('Auto-sync complete.');
          }
        } catch (syncErr) {
          console.warn('Initial cloud sync failed, using local data:', syncErr);
        }

        console.log('App initialized.');
      } catch (err) {
        console.error('Initialization error:', err);
        setError(String(err));
      }
    };

    initApp();
  }, [hydrateFromCloud]);

  const renderView = () => {
    try {
      switch (currentView) {
        case 'dashboard':
          return <Dashboard />;
        case 'classes':
          return <ClassManager />;
        case 'students':
          return <StudentManager />;
        case 'attendance':
          return <AttendanceTracker />;
        case 'reports':
          return <Reports />;
        case 'settings':
          return <Settings />;
        default:
          return <Dashboard />;
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
      <Navigation currentView={currentView} onNavigate={setCurrentView} />
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
