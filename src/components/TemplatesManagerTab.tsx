import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { FileText, Eye, Trash2, Plus, Search } from 'lucide-react';
import { getSessionSummaries } from '../utils/sessionSummary';

interface TemplatesManagerTabProps {
  onViewTemplate: (id: number) => void;
}

export default function TemplatesManagerTab({ onViewTemplate }: TemplatesManagerTabProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const templates = useLiveQuery(async () =>
    getSessionSummaries(await db.sessions.filter(s => s.isTemplate === true).toArray())
  );

  const filteredTemplates = templates?.filter(({ session }) =>
    session.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateTemplate = async () => {
    const id = await db.sessions.add({
      date: new Date().toISOString(),
      name: "Nouveau Modèle",
      isFinished: false,
      isTemplate: true,
      notes: ''
    });
    onViewTemplate(id as number);
  };

  const handleDeleteTemplate = async (id: number) => {
    if (confirm("Voulez-vous vraiment supprimer ce modèle ?")) {
      const sessionExercises = await db.session_exercises.where('sessionId').equals(id).toArray();
      for (const se of sessionExercises) {
        await db.sets.where('sessionExerciseId').equals(se.id!).delete();
      }
      await db.session_exercises.where('sessionId').equals(id).delete();
      await db.sessions.delete(id);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-bg-alt">
        <div>
          <h2 className="text-2xl font-bold text-primary">Gérer les Modèles</h2>
          <p className="text-secondary mt-1">Créez et organisez vos modèles de séance.</p>
        </div>
        <button 
          onClick={handleCreateTemplate}
          className="flex items-center gap-2 bg-accent hover:bg-accent-light text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-md"
        >
          <Plus size={20} />
          Nouveau modèle
        </button>
      </div>

      <div className="relative mb-6">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher un modèle..."
          className="w-full bg-white border border-accent-light/50 rounded-xl pl-11 pr-4 py-3 text-sm text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-accent shadow-sm"
        />
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-10">
        {!filteredTemplates || filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-secondary bg-white rounded-2xl border border-accent-light/30">
            <FileText size={48} className="text-accent/50 mb-4" />
            <p className="text-lg">{searchQuery ? 'Aucun résultat.' : 'Aucun modèle pour le moment.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map(({ session: template, exercises, exerciseCount, setCount }) => (
              <div key={template.id} className="bg-white p-6 rounded-2xl shadow-sm border border-accent-light/30 flex flex-col group hover:border-accent transition-colors">
                <div className="flex-1 mb-6">
                  <div className="flex items-start justify-between">
                    <h3 className="text-xl font-bold text-primary mb-2 line-clamp-2">{template.name}</h3>
                    <div className="bg-accent/10 p-2 rounded-lg">
                      <FileText size={20} className="text-accent" />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3 text-xs font-bold text-secondary">
                    <span className="bg-bg-alt/60 border border-accent-light/30 rounded-full px-2 py-1">{exerciseCount} exercice{exerciseCount > 1 ? 's' : ''}</span>
                    <span className="bg-bg-alt/60 border border-accent-light/30 rounded-full px-2 py-1">{setCount} série{setCount > 1 ? 's' : ''}</span>
                  </div>
                  {exercises.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {exercises.slice(0, 3).map(exercise => (
                        <div key={exercise.id} className="text-sm text-secondary bg-bg-alt/30 rounded-xl px-3 py-2 border border-accent-light/20">
                          <div className="font-bold text-primary">{exercise.name}</div>
                          <div className="text-xs mt-1">
                            {exercise.setsCount} série{exercise.setsCount > 1 ? 's' : ''}
                            {exercise.defaultReps ? ` · ${exercise.defaultReps} reps` : ''}
                            {exercise.defaultRestTime ? ` · repos ${exercise.defaultRestTime}` : ''}
                            {exercise.rhythm ? ` · rythme ${exercise.rhythm}` : ''}
                          </div>
                        </div>
                      ))}
                      {exercises.length > 3 && (
                        <div className="text-xs font-semibold text-secondary">+ {exercises.length - 3} autre{exercises.length - 3 > 1 ? 's' : ''}</div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-bg-alt/50">
                  <button 
                    onClick={() => onViewTemplate(template.id!)}
                    className="flex items-center gap-2 text-primary hover:text-accent font-semibold transition-colors"
                  >
                    <Eye size={18} />
                    Modifier
                  </button>
                  <button 
                    onClick={() => handleDeleteTemplate(template.id!)}
                    className="text-secondary hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
