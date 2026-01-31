import { Home, Users, GraduationCap, ClipboardCheck, BarChart3, Settings } from 'lucide-react';

interface NavigationProps {
    currentView: string;
    onNavigate: (view: string) => void;
    isOpen: boolean;
}

export default function Navigation({ currentView, onNavigate, isOpen }: NavigationProps) {
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: Home },
        { id: 'classes', label: 'Turmas', icon: GraduationCap },
        { id: 'students', label: 'Protagonistas', icon: Users },
        { id: 'attendance', label: 'Frequência', icon: ClipboardCheck },
        { id: 'reports', label: 'Relatórios', icon: BarChart3 },
        { id: 'settings', label: 'Configurações', icon: Settings },
    ];

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
                <div className="logo">📚</div>
                <h1 className="app-title">Sistema de Frequência</h1>
            </div>

            <nav>
                <ul className="nav-menu">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <li
                                key={item.id}
                                className={`nav-item ${currentView === item.id ? 'active' : ''}`}
                                onClick={() => onNavigate(item.id)}
                            >
                                <Icon />
                                <span>{item.label}</span>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </aside>
    );
}
