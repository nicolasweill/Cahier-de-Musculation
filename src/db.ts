import Dexie, { type EntityTable } from 'dexie';

export interface Exercise {
  id?: number;
  name: string;
  category: string;
  isDefault?: boolean;
  defaultReps?: string;
  defaultRestTime?: string;
}

export interface Session {
  id?: number;
  date: string; // ISO date string
  name: string;
  isFinished: boolean;
  isTemplate?: boolean;
}

export interface SessionExercise {
  id?: number;
  sessionId: number;
  exerciseId: number;
  order: number;
  supersetId?: string;
}

export interface Set {
  id?: number;
  sessionExerciseId: number;
  weight: string | number;
  reps: string; // Stored as string to allow "7,3"
  restTime: string; // Stored as string, indicative
  metricScore?: string; // Optional RIR or RPE score
  order: number;
}

const db = new Dexie('CarnetMusculationDB') as Dexie & {
  exercises: EntityTable<Exercise, 'id'>;
  sessions: EntityTable<Session, 'id'>;
  session_exercises: EntityTable<SessionExercise, 'id'>;
  sets: EntityTable<Set, 'id'>;
};

// Schema declaration
db.version(1).stores({
  exercises: '++id, name, isDefault',
  sessions: '++id, date, isFinished',
  session_exercises: '++id, sessionId, exerciseId, order',
  sets: '++id, sessionExerciseId, order'
});

db.version(2).stores({
  sessions: '++id, date, isFinished, isTemplate',
});

export const DEFAULT_EXERCISES = [
  { name: 'Développé couché', category: 'Pectoraux', isDefault: true },
  { name: 'Squat', category: 'Jambes', isDefault: true },
  { name: 'Soulevé de terre', category: 'Dos', isDefault: true },
  { name: 'Traction', category: 'Dos', isDefault: true },
  { name: 'Développé militaire', category: 'Épaules', isDefault: true },
  { name: 'Rowing barre', category: 'Dos', isDefault: true },
  { name: 'Curl biceps', category: 'Bras', isDefault: true },
  { name: 'Extension triceps', category: 'Bras', isDefault: true }
];

export async function initDefaultData() {
  const count = await db.exercises.count();
  if (count === 0) {
    const exerciseIds = await db.exercises.bulkAdd(DEFAULT_EXERCISES as Exercise[], { allKeys: true }) as number[];
    
    // Add synthetic data for stats so the user sees something initially
    const sessionsCount = await db.sessions.count();
    if (sessionsCount === 0) {
      const now = new Date();
      // Create 3 past sessions
      for (let i = 2; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - (i * 3 + 1)); // 7, 4, and 1 days ago
        
        const sessionId = await db.sessions.add({
          date: d.toISOString(),
          name: `Séance d'exemple ${3 - i}`,
          isFinished: true,
          isTemplate: false
        });

        // Add 2 exercises to each session
        for (let j = 0; j < 2; j++) {
          const exerciseId = exerciseIds[j]; // Développé couché and Squat
          const sessionExerciseId = await db.session_exercises.add({
            sessionId: sessionId as number,
            exerciseId,
            order: j
          });

          // Add 3 sets with progressive weight
          for (let k = 0; k < 3; k++) {
            await db.sets.add({
              sessionExerciseId: sessionExerciseId as number,
              weight: 60 + (k * 5) + (3 - i) * 2, // Progressive weight over sessions
              reps: '10',
              restTime: '1:30',
              order: k
            });
          }
        }
      }
    }
  }
}

export async function generateSyntheticMonth() {
  await Promise.all([
    db.sessions.clear(),
    db.session_exercises.clear(),
    db.sets.clear()
  ]);

  let exercises = await db.exercises.toArray();
  if (exercises.length === 0) {
    await initDefaultData();
    exercises = await db.exercises.toArray();
  }
  const exerciseIds = exercises.map(ex => ex.id!);

  const now = new Date();
  
  for (let i = 12; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - (i * 2 + Math.floor(Math.random() * 2))); 
    
    const sessionId = await db.sessions.add({
      date: d.toISOString(),
      name: `Séance Synthétique ${13 - i}`,
      isFinished: true,
      isTemplate: false
    });

    for (let j = 0; j < 3; j++) {
      const exerciseId = exerciseIds[(j + i) % exerciseIds.length];
      const sessionExerciseId = await db.session_exercises.add({
        sessionId: sessionId as number,
        exerciseId,
        order: j
      });

      for (let k = 0; k < 4; k++) {
        await db.sets.add({
          sessionExerciseId: sessionExerciseId as number,
          weight: 40 + (k * 10) + (13 - i) * 2.5,
          reps: '8', 
          restTime: '1:30',
          order: k
        });
      }
    }
  }
}

export { db };
