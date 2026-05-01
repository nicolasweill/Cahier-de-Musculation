import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Session } from '../db';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Save, Plus, CheckCircle, FileText, Copy, Play } from 'lucide-react';
import ExerciseList from './ExerciseList';
import AddExerciseToSessionModal from './AddExerciseToSessionModal';
import MarkdownEditor from './MarkdownEditor';

interface SessionsTabProps {
  viewedSessionId?: number | null;
  setViewedSessionId?: (id: number | null) => void;
}

export default function SessionsTab({ viewedSessionId, setViewedSessionId }: SessionsTabProps) {
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [isAddExerciseModalOpen, setIsAddExerciseModalOpen] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // Load the requested session or the most recent unfinished one
  const activeSession = useLiveQuery(
    async () => {
      if (viewedSessionId) {
        return await db.sessions.get(viewedSessionId);
      }
      const sessions = await db.sessions.filter(s => !s.isFinished && !s.isTemplate).toArray();
      return sessions.length > 0 ? sessions[sessions.length - 1] : undefined;
    },
    [viewedSessionId]
  );

  const templates = useLiveQuery(() => db.sessions.filter(s => s.isTemplate === true).toArray());

  useEffect(() => {
    if (activeSession?.id) {
      setActiveSessionId(activeSession.id);
    } else {
      setActiveSessionId(null);
    }
  }, [activeSession]);

  const handleStartEmptySession = async () => {
    const id = await db.sessions.add({
      date: new Date().toISOString(),
      name: `Séance du ${format(new Date(), 'dd MMM yyyy', { locale: fr })}`,
      isFinished: false,
      isTemplate: false,
      notes: ''
    });
    setActiveSessionId(id as number);
    if (setViewedSessionId) setViewedSessionId(null);
  };

  const handleStartFromTemplate = async (template: Session) => {
    const newSessionId = await db.sessions.add({
      date: new Date().toISOString(),
      name: `${template.name}`,
      isFinished: false,
      isTemplate: false,
      notes: template.notes || ''
    });

    const templateExercises = await db.session_exercises.where('sessionId').equals(template.id!).toArray();
    for (const te of templateExercises) {
      const newTeId = await db.session_exercises.add({
        sessionId: newSessionId as number,
        exerciseId: te.exerciseId,
        order: te.order,
        supersetId: te.supersetId,
        rhythm: te.rhythm
      });
      const templateSets = await db.sets.where('sessionExerciseId').equals(te.id!).toArray();
      for (const ts of templateSets) {
        await db.sets.add({
          sessionExerciseId: newTeId as number,
          weight: ts.weight,
          reps: ts.reps,
          restTime: ts.restTime,
          metricScore: ts.metricScore,
          order: ts.order
        });
      }
    }
    setActiveSessionId(newSessionId as number);
    if (setViewedSessionId) setViewedSessionId(null);
  };

  const handleFinishSession = async () => {
    if (activeSessionId) {
      await db.sessions.update(activeSessionId, { isFinished: true });
      setActiveSessionId(null);
      if (setViewedSessionId) setViewedSessionId(null);
    }
  };

  const handleUpdateDate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (activeSessionId && e.target.value) {
      await db.sessions.update(activeSessionId, {
        date: new Date(e.target.value).toISOString(),
      });
    }
  };

  if (!activeSession) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-bg-alt">
          <div>
            <h2 className="text-2xl font-bold text-primary">Nouvelle séance</h2>
            <p className="text-secondary mt-1">Commencez un entraînement pour enregistrer vos performances.</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-8">
            <button 
              onClick={handleStartEmptySession}
              className="flex flex-col items-center justify-center p-10 bg-white hover:bg-bg-alt/50 border-2 border-accent/20 hover:border-accent rounded-3xl transition-all shadow-sm group"
            >
              <div className="bg-accent/10 p-6 rounded-full mb-6 group-hover:scale-110 transition-transform">
                <Plus size={48} className="text-accent" />
              </div>
              <h3 className="text-2xl font-bold text-primary mb-2">Séance Libre</h3>
              <p className="text-secondary text-center">Démarrez une séance vide et ajoutez vos exercices au fur et à mesure.</p>
            </button>

            <button 
              onClick={() => setShowTemplates(!showTemplates)}
              className={`flex flex-col items-center justify-center p-10 bg-white hover:bg-bg-alt/50 border-2 transition-all shadow-sm rounded-3xl group ${showTemplates ? 'border-primary bg-bg-alt/20' : 'border-accent-light/30 hover:border-primary/50'}`}
            >
              <div className="bg-primary/5 p-6 rounded-full mb-6 group-hover:scale-110 transition-transform">
                <FileText size={48} className="text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-primary mb-2">À partir d'un Modèle</h3>
              <p className="text-secondary text-center">Utilisez une routine pré-enregistrée pour gagner du temps.</p>
            </button>
          </div>

          {showTemplates && (
            <div className="max-w-4xl mx-auto mt-8 bg-white p-8 rounded-3xl shadow-sm border border-accent-light/30 animate-in slide-in-from-top-4 fade-in duration-300">
              <h3 className="text-xl font-bold text-primary mb-6 flex items-center gap-2">
                <Copy size={24} className="text-accent" />
                Vos Modèles Disponibles
              </h3>
              
              {(!templates || templates.length === 0) ? (
                <div className="text-center p-8 bg-bg-alt/50 rounded-2xl border border-dashed border-accent-light/50">
                  <p className="text-secondary">Aucun modèle disponible. Allez dans l'onglet "Gérer les Modèles" pour en créer un.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map(template => (
                    <div key={template.id} className="bg-bg-alt/30 p-5 rounded-2xl border border-accent-light/30 flex justify-between items-center hover:border-accent transition-colors group">
                      <h4 className="font-bold text-primary text-lg truncate pr-4">{template.name}</h4>
                      <button 
                        onClick={() => handleStartFromTemplate(template)}
                        className="flex items-center gap-2 bg-primary hover:bg-secondary text-white px-4 py-2 rounded-xl font-bold transition-colors shadow-sm shrink-0"
                      >
                        <Play size={16} fill="currentColor" />
                        Démarrer
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-bg-alt">
        <div className="flex items-center gap-4 w-2/3">
          <div className="flex-1 w-full">
            <h2 className="text-sm font-semibold text-accent uppercase tracking-wider mb-1">
              {activeSession.isTemplate ? 'Modèle de séance' : (activeSession.isFinished ? 'Séance passée' : 'Séance Active')}
            </h2>
            <input 
              type="text" 
              value={activeSession.name}
              onChange={async (e) => {
                await db.sessions.update(activeSession.id!, { name: e.target.value });
              }}
              className="text-2xl font-bold text-primary bg-transparent border-none p-0 focus:ring-0 cursor-text hover:bg-bg-alt rounded px-2 -ml-2 transition-colors w-full"
            />
            {!activeSession.isTemplate && (
              <input 
                type="date" 
                value={format(new Date(activeSession.date), 'yyyy-MM-dd')}
                onChange={handleUpdateDate}
                className="text-sm font-semibold text-secondary bg-transparent border-none p-0 focus:ring-0 cursor-pointer hover:text-primary transition-colors block mt-1"
              />
            )}
          </div>
        </div>
        {activeSession.isTemplate ? (
          <button 
            onClick={() => {
              if (setViewedSessionId) setViewedSessionId(null);
            }}
            className="flex items-center gap-2 bg-accent hover:bg-accent-light text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-md shrink-0"
          >
            <Save size={20} />
            Sauvegarder le modèle
          </button>
        ) : activeSession.isFinished ? (
          <button 
            onClick={() => {
              if (setViewedSessionId) setViewedSessionId(null);
            }}
            className="flex items-center gap-2 bg-secondary hover:bg-primary text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-md shrink-0"
          >
            <CheckCircle size={20} />
            Enregistrer et Fermer
          </button>
        ) : (
          <button 
            onClick={handleFinishSession}
            className="flex items-center gap-2 bg-primary hover:bg-secondary text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-md shrink-0"
          >
            <Save size={20} />
            Terminer la séance
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pb-20 pr-2">
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-accent-light/30 mb-6">
          <label className="block text-sm font-bold text-secondary uppercase mb-2">Notes Markdown</label>
          <MarkdownEditor
            value={activeSession.notes || ''}
            onChange={(notes) => {
              db.sessions.update(activeSession.id!, { notes });
            }}
            placeholder="Objectif, sensations, charge cible..."
          />
        </section>

        <ExerciseList sessionId={activeSession.id!} />
        
        <button 
          onClick={() => setIsAddExerciseModalOpen(true)}
          className="w-full mt-6 py-4 flex items-center justify-center gap-2 font-bold text-accent bg-white hover:bg-bg-alt rounded-2xl transition-colors shadow-sm border-2 border-dashed border-accent-light/50"
        >
          <Plus size={20} />
          Ajouter un exercice
        </button>
      </div>

      <AddExerciseToSessionModal 
        isOpen={isAddExerciseModalOpen} 
        onClose={() => setIsAddExerciseModalOpen(false)} 
        sessionId={activeSession.id!} 
      />
    </div>
  );
}
