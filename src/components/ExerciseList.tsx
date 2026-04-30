import { useLiveQuery } from 'dexie-react-hooks';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { db } from '../db';
import SortableExerciseCard from './SortableExerciseCard';

interface ExerciseListProps {
  sessionId: number;
}

export default function ExerciseList({ sessionId }: ExerciseListProps) {
  const sessionExercises = useLiveQuery(
    () => db.session_exercises.where('sessionId').equals(sessionId).sortBy('order'),
    [sessionId]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement before drag starts to allow clicking inside
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (!sessionExercises) return null;

  if (sessionExercises.length === 0) {
    return (
      <div className="text-center p-10 bg-white/50 rounded-2xl border-2 border-dashed border-accent-light/30 mt-6">
        <p className="text-secondary">Aucun exercice dans cette séance.</p>
        <p className="text-secondary text-sm mt-2">Cliquez sur "Ajouter un exercice" pour commencer.</p>
      </div>
    );
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sessionExercises.findIndex((item) => item.id === active.id);
      const newIndex = sessionExercises.findIndex((item) => item.id === over.id);

      const newOrder = arrayMove(sessionExercises, oldIndex, newIndex);
      
      // Update order in DB
      await Promise.all(
        newOrder.map((item, index) => 
          db.session_exercises.update(item.id!, { order: index })
        )
      );
    }
  };

  const handleToggleSuperset = async (currentIndex: number) => {
    if (currentIndex === 0) return;
    const current = sessionExercises[currentIndex];
    const prev = sessionExercises[currentIndex - 1];

    if (current.supersetId && current.supersetId === prev.supersetId) {
      // Unlink
      await db.session_exercises.update(current.id!, { supersetId: undefined });
    } else {
      // Link
      let newId = prev.supersetId;
      if (!newId) {
        newId = crypto.randomUUID();
        await db.session_exercises.update(prev.id!, { supersetId: newId });
      }
      await db.session_exercises.update(current.id!, { supersetId: newId });
    }
  };

  return (
    <div className="mt-6 flex flex-col">
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={sessionExercises.map(se => se.id!)}
          strategy={verticalListSortingStrategy}
        >
          {sessionExercises.map((se, index) => {
            const isSupersetWithPrevious = index > 0 && se.supersetId && se.supersetId === sessionExercises[index - 1].supersetId;
            const isSupersetWithNext = index < sessionExercises.length - 1 && se.supersetId && se.supersetId === sessionExercises[index + 1].supersetId;
            
            return (
              <SortableExerciseCard 
                key={se.id} 
                sessionExercise={se} 
                isSupersetWithPrevious={!!isSupersetWithPrevious}
                isSupersetWithNext={!!isSupersetWithNext}
                onToggleSuperset={() => handleToggleSuperset(index)}
                canLink={index > 0}
                isFirstItem={index === 0}
              />
            );
          })}
        </SortableContext>
      </DndContext>
    </div>
  );
}
