import { useEffect, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLiveQuery } from 'dexie-react-hooks';
import { GripVertical, Trash2, Link as LinkIcon, Unlink } from 'lucide-react';
import { db, type SessionExercise } from '../db';
import SetTable from './SetTable';

interface SortableExerciseCardProps {
  sessionExercise: SessionExercise;
  isSupersetWithPrevious?: boolean;
  isSupersetWithNext?: boolean;
  onToggleSuperset?: () => void;
  canLink?: boolean;
  isFirstItem?: boolean;
}

export default function SortableExerciseCard({ 
  sessionExercise, 
  isSupersetWithPrevious = false,
  isSupersetWithNext = false,
  onToggleSuperset,
  canLink = false,
  isFirstItem = false
}: SortableExerciseCardProps) {
  const [rhythmEnabled, setRhythmEnabled] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sessionExercise.id! });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  const exercise = useLiveQuery(
    () => db.exercises.get(sessionExercise.exerciseId),
    [sessionExercise.exerciseId]
  );

  useEffect(() => {
    setRhythmEnabled(localStorage.getItem('app-rhythm-enabled') === 'true');
  }, []);

  const handleDelete = async () => {
    if (confirm('Voulez-vous vraiment supprimer cet exercice de la séance ?')) {
      await db.sets.where('sessionExerciseId').equals(sessionExercise.id!).delete();
      await db.session_exercises.delete(sessionExercise.id!);
    }
  };

  if (!exercise) return null;

  let containerClasses = `bg-white shadow-sm overflow-hidden transition-all relative ${!isFirstItem && !isSupersetWithPrevious ? 'mt-4' : ''} ${isDragging ? 'shadow-2xl opacity-80 ring-4 ring-accent' : ''}`;
  
  if (isSupersetWithPrevious || isSupersetWithNext) {
    containerClasses += ' border-accent';
    if (!isSupersetWithPrevious && isSupersetWithNext) {
      containerClasses += ' rounded-t-2xl rounded-b-none border-t-2 border-l-2 border-r-2 border-b';
    } else if (isSupersetWithPrevious && isSupersetWithNext) {
      containerClasses += ' rounded-none border-l-2 border-r-2 border-t-0 border-b';
    } else if (isSupersetWithPrevious && !isSupersetWithNext) {
      containerClasses += ' rounded-b-2xl rounded-t-none border-b-2 border-l-2 border-r-2 border-t-0';
    }
  } else {
    containerClasses += ' rounded-2xl border border-accent-light/30';
  }

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={containerClasses}
    >
      {/* Banner Superset */}
      {!isSupersetWithPrevious && isSupersetWithNext && (
        <div className="bg-accent text-white text-[10px] font-black px-4 py-1.5 flex items-center justify-center gap-2 uppercase tracking-[0.2em] w-full">
          <LinkIcon size={12} strokeWidth={3} />
          SUPERSET
        </div>
      )}

      {/* Header */}
      <div className={`p-4 flex items-center justify-between ${isSupersetWithPrevious ? 'bg-bg-alt/10' : 'bg-bg-alt/30 border-b border-accent-light/30'}`}>
        <div className="flex items-center gap-3">
          <button 
            {...attributes} 
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-accent-light hover:text-accent p-1 transition-colors"
          >
            <GripVertical size={20} />
          </button>
          <div>
            <h3 className="font-bold text-primary text-lg flex items-center gap-2">
              {exercise.name}
            </h3>
            <span className="text-xs font-semibold text-accent">{exercise.category}</span>
            {rhythmEnabled && (
              <input
                type="text"
                value={sessionExercise.rhythm || ''}
                onChange={(e) => db.session_exercises.update(sessionExercise.id!, { rhythm: e.target.value })}
                className="block mt-2 w-40 bg-white/70 border border-accent-light/40 rounded-lg px-2 py-1 text-xs font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Rythme ex: 3-1-1"
              />
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {canLink && onToggleSuperset && (
            <button 
              onClick={onToggleSuperset}
              className={`p-2 rounded-full transition-colors ${isSupersetWithPrevious ? 'text-accent bg-accent/10 hover:bg-accent/20' : 'text-accent-light hover:text-accent hover:bg-bg-alt'}`}
              title={isSupersetWithPrevious ? "Délier du précédent" : "Lier en superset avec le précédent"}
            >
              {isSupersetWithPrevious ? <Unlink size={18} /> : <LinkIcon size={18} />}
            </button>
          )}
          <button 
            onClick={handleDelete}
            className="text-accent-light hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
            title="Supprimer l'exercice"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Body: Sets */}
      <div className="py-4 pl-4 pr-2">
        <SetTable sessionExerciseId={sessionExercise.id!} />
      </div>
    </div>
  );
}
