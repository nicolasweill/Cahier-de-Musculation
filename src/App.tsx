import { useEffect, useState } from 'react';
import { Activity, BarChart2, History, Dumbbell, Settings, FileText, List, FlaskConical } from 'lucide-react';
import { initDefaultData } from './db';
import SessionsTab from './components/SessionsTab';
import StatsTab from './components/StatsTab';
import HistoryTab from './components/HistoryTab';
import SettingsTab, { PREDEFINED_THEMES } from './components/SettingsTab';
import TemplatesManagerTab from './components/TemplatesManagerTab';
import ExercisesManagerTab from './components/ExercisesManagerTab';
import LabTab from './components/LabTab';

function App() {
  const [activeTab, setActiveTab] = useState<'sessions' | 'templates' | 'exercises' | 'stats' | 'history' | 'settings' | 'lab'>('sessions');
  const [viewedSessionId, setViewedSessionId] = useState<number | null>(null);

  useEffect(() => {
    initDefaultData();

    // Theme initialization
    const applyColors = (colors: any) => {
      const root = document.documentElement;
      root.style.setProperty('--theme-primary', colors.primary);
      root.style.setProperty('--theme-secondary', colors.secondary);
      root.style.setProperty('--theme-accent', colors.accent);
      root.style.setProperty('--theme-accent-light', colors.accentLight);
      root.style.setProperty('--theme-bg-alt', colors.bgAlt);
    };

    const savedTheme = localStorage.getItem('app-theme-id');
    if (savedTheme === 'custom') {
      const savedCustom = localStorage.getItem('app-custom-colors');
      if (savedCustom) {
        applyColors(JSON.parse(savedCustom));
      }
    } else if (savedTheme) {
      const theme = PREDEFINED_THEMES.find(t => t.id === savedTheme);
      if (theme) applyColors(theme.colors);
    }
  }, []);

  return (
    <div className="flex h-screen bg-bg-alt text-primary overflow-hidden font-sans">
      {/* Sidebar (Left 1/3) */}
      <div className="w-1/3 max-w-sm bg-secondary text-bg-alt p-6 flex flex-col shadow-xl z-10 overflow-y-auto">
        <div className="flex items-center gap-3 mb-10 shrink-0">
          <Dumbbell size={32} className="text-accent-light" />
          <h1 className="text-2xl font-bold tracking-tight">Carnet Muscu</h1>
        </div>

        <nav className="flex flex-col gap-2 flex-grow">
          <button 
            onClick={() => { setActiveTab('sessions'); setViewedSessionId(null); }}
            className={`flex items-center gap-3 p-4 rounded-xl transition-all ${activeTab === 'sessions' && !viewedSessionId ? 'bg-primary shadow-lg translate-x-2' : 'hover:bg-primary/50 hover:translate-x-1'}`}
          >
            <Activity size={20} className={activeTab === 'sessions' && !viewedSessionId ? 'text-accent-light' : ''} />
            <span className="font-semibold text-lg">Nouvelle séance</span>
          </button>
          
          <button 
            onClick={() => { setActiveTab('history'); setViewedSessionId(null); }}
            className={`flex items-center gap-3 p-4 rounded-xl transition-all ${activeTab === 'history' || viewedSessionId ? 'bg-primary shadow-lg translate-x-2' : 'hover:bg-primary/50 hover:translate-x-1'}`}
          >
            <History size={20} className={activeTab === 'history' || viewedSessionId ? 'text-accent-light' : ''} />
            <span className="font-semibold text-lg">Historique</span>
          </button>

          <button 
            onClick={() => { setActiveTab('stats'); setViewedSessionId(null); }}
            className={`flex items-center gap-3 p-4 rounded-xl transition-all ${activeTab === 'stats' ? 'bg-primary shadow-lg translate-x-2' : 'hover:bg-primary/50 hover:translate-x-1'}`}
          >
            <BarChart2 size={20} className={activeTab === 'stats' ? 'text-accent-light' : ''} />
            <span className="font-semibold text-lg">Statistiques</span>
          </button>

          <button
            onClick={() => { setActiveTab('lab'); setViewedSessionId(null); }}
            className={`flex items-center gap-3 p-4 rounded-xl transition-all ${activeTab === 'lab' ? 'bg-primary shadow-lg translate-x-2' : 'hover:bg-primary/50 hover:translate-x-1'}`}
          >
            <FlaskConical size={20} className={activeTab === 'lab' ? 'text-accent-light' : ''} />
            <span className="font-semibold text-lg">Laboratoire</span>
          </button>

          <button
            onClick={() => { setActiveTab('settings'); setViewedSessionId(null); }}
            className={`flex items-center gap-3 p-4 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-primary shadow-lg translate-x-2' : 'hover:bg-primary/50 hover:translate-x-1'}`}
          >
            <Settings size={20} className={activeTab === 'settings' ? 'text-accent-light' : ''} />
            <span className="font-semibold text-lg">Paramètres</span>
          </button>
        </nav>

        <div className="mt-auto space-y-2 pt-6 border-t border-bg-alt/20">
          <button 
            onClick={() => { setActiveTab('templates'); setViewedSessionId(null); }}
            className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all ${activeTab === 'templates' ? 'bg-primary shadow-lg translate-x-2' : 'hover:bg-primary/50 hover:translate-x-1'}`}
          >
            <FileText size={20} className={activeTab === 'templates' ? 'text-accent-light' : ''} />
            <span className="font-semibold text-lg">Gérer les Modèles</span>
          </button>

          <button 
            onClick={() => { setActiveTab('exercises'); setViewedSessionId(null); }}
            className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all ${activeTab === 'exercises' ? 'bg-primary shadow-lg translate-x-2' : 'hover:bg-primary/50 hover:translate-x-1'}`}
          >
            <List size={20} className={activeTab === 'exercises' ? 'text-accent-light' : ''} />
            <span className="font-semibold text-lg">Gérer les Exercices</span>
          </button>
        </div>
      </div>

      {/* Main Content (Right 2/3) */}
      <div className="flex-1 overflow-y-auto bg-white/50 backdrop-blur-sm relative">
        <div className="p-8 h-full">
          {activeTab === 'sessions' && <SessionsTab viewedSessionId={viewedSessionId} setViewedSessionId={setViewedSessionId} />}
          {activeTab === 'templates' && <TemplatesManagerTab onViewTemplate={(id) => { setViewedSessionId(id); setActiveTab('sessions'); }} />}
          {activeTab === 'exercises' && <ExercisesManagerTab />}
          {activeTab === 'stats' && <StatsTab />}
          {activeTab === 'lab' && <LabTab />}
          {activeTab === 'history' && <HistoryTab onViewSession={(id) => { setViewedSessionId(id); setActiveTab('sessions'); }} />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </div>
    </div>
  );
}

export default App;
