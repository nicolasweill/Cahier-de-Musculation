import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Exercise } from '../db';
import { Dumbbell, Trash2, Plus, Edit2 } from 'lucide-react';
import CreateExerciseModal from './CreateExerciseModal';
import { getMuscleTags } from '../utils/muscleTags';

export default function ExercisesManagerTab() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [exerciseToEdit, setExerciseToEdit] = useState<Exercise | undefined>(undefined);
  const [rhythmEnabled, setRhythmEnabled] = useState(false);
  
  const exercises = useLiveQuery(() => db.exercises.toArray());

  useEffect(() => {
    setRhythmEnabled(localStorage.getItem('app-rhythm-enabled') === 'true');
  }, []);

  const groupedExercises = exercises?.reduce((acc, ex) => {
    const tags = getMuscleTags(ex.category);
    for (const tag of tags.length > 0 ? tags : ['Sans catégorie']) {
      const key = tag.toLocaleLowerCase();
      if (!acc[key]) acc[key] = { label: `#${tag}`, exercises: [] };
      acc[key].exercises.push(ex);
    }
    return acc;
  }, {} as Record<string, { label: string; exercises: Exercise[] }>) || {};

  const handleDelete = async (id: number) => {
    if (confirm("Voulez-vous vraiment supprimer cet exercice ? Il ne sera plus disponible pour les futures séances (l'historique est conservé).")) {
      await db.exercises.delete(id);
    }
  };

  const startEdit = (ex: Exercise) => {
    setExerciseToEdit(ex);
    setIsCreateModalOpen(true);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-bg-alt">
        <div>
          <h2 className="text-2xl font-bold text-primary">Gérer les Exercices</h2>
          <p className="text-secondary mt-1">Créez, modifiez ou supprimez vos exercices.</p>
        </div>
        <button 
          onClick={() => {
            setExerciseToEdit(undefined);
            setIsCreateModalOpen(true);
          }}
          className="flex items-center gap-2 bg-primary hover:bg-secondary text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-md"
        >
          <Plus size={20} />
          Nouvel exercice
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-10 space-y-8">
        {Object.entries(groupedExercises).map(([category, group]) => (
          <div key={category} className="bg-white p-6 rounded-2xl shadow-sm border border-accent-light/30">
            <h3 className="text-xl font-bold text-accent mb-6 pb-2 border-b border-bg-alt/50">{group.label}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.exercises.map(ex => (
                <div key={ex.id} className="bg-bg-alt/30 p-3 rounded-xl border border-accent-light/20 flex flex-col group hover:border-accent/50 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <h4 className="font-bold text-primary truncate">{ex.name}</h4>
                    {ex.isDefault && (
                      <span className="text-[10px] bg-accent/10 text-accent font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                        Défaut
                      </span>
                    )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => startEdit(ex)}
                        className="text-secondary hover:text-accent transition-colors p-1.5 rounded-lg hover:bg-white shadow-sm"
                        title="Modifier"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button 
                        onClick={() => handleDelete(ex.id!)}
                        className="text-secondary hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-white shadow-sm"
                        title="Supprimer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  {(ex.defaultReps || ex.defaultRestTime || ex.defaultRhythm) && (
                    <div className="flex flex-nowrap gap-2 mt-3 overflow-x-auto pb-1">
                      {rhythmEnabled && ex.defaultRhythm && (
                        <span className="text-xs font-semibold text-secondary bg-white/70 border border-accent-light/20 rounded-lg px-2 py-1 whitespace-nowrap">
                          Rythme : {ex.defaultRhythm}
                        </span>
                      )}
                      {ex.defaultReps && (
                        <span className="text-xs font-semibold text-secondary bg-white/70 border border-accent-light/20 rounded-lg px-2 py-1 whitespace-nowrap">
                          Reps : {ex.defaultReps}
                        </span>
                      )}
                      {ex.defaultRestTime && (
                        <span className="text-xs font-semibold text-secondary bg-white/70 border border-accent-light/20 rounded-lg px-2 py-1 whitespace-nowrap">
                          Repos : {ex.defaultRestTime}
                        </span>
                      )}
                      {!rhythmEnabled && ex.defaultRhythm && (
                        <span className="text-xs font-semibold text-secondary bg-white/70 border border-accent-light/20 rounded-lg px-2 py-1 whitespace-nowrap">
                          Rythme : {ex.defaultRhythm}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {exercises?.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-secondary bg-white rounded-2xl border border-accent-light/30">
            <Dumbbell size={48} className="text-accent/50 mb-4" />
            <p className="text-lg">Aucun exercice trouvé.</p>
          </div>
        )}
      </div>

      <CreateExerciseModal 
        isOpen={isCreateModalOpen} 
        onClose={() => {
          setIsCreateModalOpen(false);
          setExerciseToEdit(undefined);
        }}
        exerciseToEdit={exerciseToEdit}
      />
    </div>
  );
}
