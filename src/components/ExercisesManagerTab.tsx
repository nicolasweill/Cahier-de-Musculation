import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Exercise } from '../db';
import { Dumbbell, Trash2, Plus, Edit2 } from 'lucide-react';
import CreateExerciseModal from './CreateExerciseModal';

export default function ExercisesManagerTab() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [exerciseToEdit, setExerciseToEdit] = useState<Exercise | undefined>(undefined);
  
  const exercises = useLiveQuery(() => db.exercises.toArray());

  const groupedExercises = exercises?.reduce((acc, ex) => {
    if (!acc[ex.category]) acc[ex.category] = [];
    acc[ex.category].push(ex);
    return acc;
  }, {} as Record<string, Exercise[]>) || {};

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
        {Object.entries(groupedExercises).map(([category, catExercises]) => (
          <div key={category} className="bg-white p-6 rounded-2xl shadow-sm border border-accent-light/30">
            <h3 className="text-xl font-bold text-accent mb-6 pb-2 border-b border-bg-alt/50">{category}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {catExercises.map(ex => (
                <div key={ex.id} className="bg-bg-alt/30 p-4 rounded-xl border border-accent-light/20 flex flex-col group hover:border-accent/50 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="font-bold text-primary">{ex.name}</h4>
                    {ex.isDefault && (
                      <span className="text-[10px] bg-accent/10 text-accent font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                        Défaut
                      </span>
                    )}
                  </div>
                  <div className="mt-auto flex justify-end items-center pt-3 border-t border-accent-light/10 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => startEdit(ex)}
                      className="text-secondary hover:text-accent transition-colors p-2 rounded-lg hover:bg-white shadow-sm"
                      title="Modifier"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(ex.id!)}
                      className="text-secondary hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-white shadow-sm"
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
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
