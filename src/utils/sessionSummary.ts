import { db, type Session, type Exercise, type SessionExercise, type Set } from '../db';

export interface SessionExerciseSummary {
  id: number;
  name: string;
  category: string;
  setsCount: number;
  defaultReps?: string;
  defaultRestTime?: string;
  rhythm?: string;
}

export interface SessionSummary {
  session: Session;
  exercises: SessionExerciseSummary[];
  exerciseCount: number;
  setCount: number;
}

export async function getSessionSummaries(sessions: Session[]): Promise<SessionSummary[]> {
  const exercises = await db.exercises.toArray();
  const exerciseById = new Map<number, Exercise>(exercises.map(exercise => [exercise.id!, exercise]));

  return Promise.all(sessions.map(async (session) => {
    const sessionExercises = await db.session_exercises
      .where('sessionId')
      .equals(session.id!)
      .sortBy('order');

    const setGroups = await Promise.all(
      sessionExercises.map(async (sessionExercise) => ({
        sessionExercise,
        sets: await db.sets.where('sessionExerciseId').equals(sessionExercise.id!).sortBy('order')
      }))
    );

    const exerciseSummaries = setGroups.map(({ sessionExercise, sets }) => {
      const exercise = exerciseById.get(sessionExercise.exerciseId);
      return makeExerciseSummary(sessionExercise, exercise, sets);
    });

    return {
      session,
      exercises: exerciseSummaries,
      exerciseCount: exerciseSummaries.length,
      setCount: setGroups.reduce((sum, group) => sum + group.sets.length, 0)
    };
  }));
}

function makeExerciseSummary(
  sessionExercise: SessionExercise,
  exercise: Exercise | undefined,
  sets: Set[]
): SessionExerciseSummary {
  const firstSet = sets[0];

  return {
    id: sessionExercise.id!,
    name: exercise?.name || 'Exercice supprime',
    category: exercise?.category || '',
    setsCount: sets.length,
    defaultReps: firstSet?.reps || exercise?.defaultReps,
    defaultRestTime: firstSet?.restTime || exercise?.defaultRestTime,
    rhythm: sessionExercise.rhythm || exercise?.defaultRhythm
  };
}
