import { useState } from 'react';
import { X, Search, Plus, Trash2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

interface AddExerciseToSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: number;
}

export default function AddExerciseToSessionModal({ isOpen, onClose, sessionId }: AddExerciseToSessionModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const exercises = useLiveQuery(
    async () => {
      const all = await db.exercises.toArray();
      if (!searchTerm) return all;
      return all.filter(ex => ex.name.toLowerCase().includes(searchTerm.toLowerCase()) || ex.category.toLowerCase().includes(searchTerm.toLowerCase()));
    },
    [searchTerm]
  );

  if (!isOpen) return null;

  const handleAddExercise = async (exercise: any) => {
    // Get current order
    const sessionExercises = await db.session_exercises.where('sessionId').equals(sessionId).toArray();
    const order = sessionExercises.length;

    const sessionExerciseId = await db.session_exercises.add({
      sessionId,
      exerciseId: exercise.id!,
      order,
      rhythm: exercise.defaultRhythm || ''
    });

    // Add a default first set
    await db.sets.add({
      sessionExerciseId: sessionExerciseId as number,
      weight: 0,
      reps: exercise.defaultReps || '',
      restTime: exercise.defaultRestTime || '1:30',
      order: 0
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/60 backdrop-blur-sm p-4">
      <div className="bg-bg-alt rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-6 border-b border-accent-light/30 bg-white">
          <h2 className="text-xl font-bold text-primary">Ajouter un exercice</h2>
          <button onClick={onClose} className="text-accent hover:bg-accent-light/20 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 border-b border-accent-light/30 bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" size={18} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-bg-alt/50 border border-accent-light/50 rounded-xl pl-10 pr-4 py-2.5 text-primary focus:outline-none focus:ring-2 focus:ring-accent transition-all"
              placeholder="Rechercher un exercice..."
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {exercises?.length === 0 ? (
            <div className="p-8 text-center text-secondary">
              Aucun exercice trouvé.
            </div>
          ) : (
            <div className="space-y-1">
              {exercises?.map(ex => (
                <div key={ex.id} className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-white transition-colors group text-left">
                  <button
                    onClick={() => handleAddExercise(ex)}
                    className="flex-1 text-left"
                  >
                    <h3 className="font-bold text-primary">{ex.name}</h3>
                    <span className="text-xs font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full">{ex.category}</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Voulez-vous vraiment supprimer cet exercice de la base de données ?')) {
                          db.exercises.delete(ex.id!);
                        }
                      }}
                      className="text-accent-light hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                      title="Supprimer l'exercice"
                    >
                      <Trash2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleAddExercise(ex)}
                      className="text-accent-light group-hover:text-accent p-2 transition-colors"
                      title="Ajouter à la séance"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
