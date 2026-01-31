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

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      console.log('App starting...');
      // Initialize sample data on first load
      initializeSampleData();
      console.log('App initialized.');
    } catch (err) {
      console.error('Initialization error:', err);
      setError(String(err));
    }
  }, []);

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

export default App;
