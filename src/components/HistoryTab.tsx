import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Trash2, Download, Upload, Eye } from 'lucide-react';

interface HistoryTabProps {
  onViewSession: (id: number) => void;
}

export default function HistoryTab({ onViewSession }: HistoryTabProps) {
  const sessions = useLiveQuery(
    async () => {
      const all = await db.sessions.orderBy('date').reverse().toArray();
      return all.filter(s => !s.isTemplate);
    }
  );

  const handleDeleteSession = async (id: number) => {
    if (confirm('Voulez-vous vraiment supprimer cette séance et toutes ses données ?')) {
      // Find all session exercises for this session
      const sessionExercises = await db.session_exercises.where('sessionId').equals(id).toArray();
      const sessionExerciseIds = sessionExercises.map(se => se.id!);

      // Delete sets for these session exercises
      await db.sets.where('sessionExerciseId').anyOf(sessionExerciseIds).delete();
      
      // Delete session exercises
      await db.session_exercises.where('sessionId').equals(id).delete();

      // Delete session
      await db.sessions.delete(id);
    }
  };

  const handleExportData = async () => {
    try {
      const data = {
        exercises: await db.exercises.toArray(),
        sessions: await db.sessions.toArray(),
        session_exercises: await db.session_exercises.toArray(),
        sets: await db.sets.toArray(),
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `carnet_muscu_export_${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Erreur lors de l'exportation des données.");
    }
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (confirm('L\'importation remplacera toutes vos données actuelles. Continuer ?')) {
          await db.transaction('rw', db.exercises, db.sessions, db.session_exercises, db.sets, async () => {
            await db.exercises.clear();
            await db.sessions.clear();
            await db.session_exercises.clear();
            await db.sets.clear();

            if (data.exercises) await db.exercises.bulkAdd(data.exercises);
            if (data.sessions) await db.sessions.bulkAdd(data.sessions);
            if (data.session_exercises) await db.session_exercises.bulkAdd(data.session_exercises);
            if (data.sets) await db.sets.bulkAdd(data.sets);
          });
          alert('Données importées avec succès !');
        }
      } catch (err) {
        alert("Fichier JSON invalide.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-bg-alt">
        <div>
          <h2 className="text-2xl font-bold text-primary">Historique des séances</h2>
          <p className="text-secondary mt-1">Retrouvez toutes vos performances passées.</p>
        </div>
        
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer bg-bg-alt hover:bg-accent-light/20 text-accent px-4 py-2 rounded-xl font-semibold transition-colors border border-accent-light/30">
            <Upload size={18} />
            Importer JSON
            <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
          </label>
          
          <button 
            onClick={handleExportData}
            className="flex items-center gap-2 bg-secondary hover:bg-primary text-white px-4 py-2 rounded-xl font-semibold transition-colors shadow-sm"
          >
            <Download size={18} />
            Exporter JSON
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        {(!sessions || sessions.length === 0) ? (
          <div className="text-center p-10 bg-white/50 rounded-2xl border-2 border-dashed border-accent-light/30">
            <p className="text-secondary">Aucune séance enregistrée pour le moment.</p>
          </div>
        ) : (
          sessions.map(session => (
            <div key={session.id} className="bg-white p-6 rounded-2xl shadow-sm border border-accent-light/30 flex justify-between items-center group">
              <div>
                <h3 className="font-bold text-lg text-primary">
                  {session.name}
                  {!session.isFinished && (
                    <span className="ml-3 text-xs font-semibold bg-accent/10 text-accent px-2 py-1 rounded-full">
                      En cours
                    </span>
                  )}
                </h3>
                <p className="text-secondary text-sm mt-1">
                  {format(new Date(session.date), 'EEEE d MMMM yyyy', { locale: fr })}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => onViewSession(session.id!)}
                  className="text-accent-light hover:text-accent p-3 rounded-full hover:bg-bg-alt transition-colors opacity-0 group-hover:opacity-100"
                  title="Voir la séance"
                >
                  <Eye size={20} />
                </button>
                <button 
                  onClick={() => handleDeleteSession(session.id!)}
                  className="text-accent-light hover:text-red-500 p-3 rounded-full hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                  title="Supprimer la séance"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
