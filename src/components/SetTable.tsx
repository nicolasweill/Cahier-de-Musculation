import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Trash2 } from 'lucide-react';
import { db, type Set } from '../db';

interface SetTableProps {
  sessionExerciseId: number;
}

export default function SetTable({ sessionExerciseId }: SetTableProps) {
  const sets = useLiveQuery(
    () => db.sets.where('sessionExerciseId').equals(sessionExerciseId).sortBy('order'),
    [sessionExerciseId]
  );

  const [advancedMetrics, setAdvancedMetrics] = useState(false);
  const [metricType, setMetricType] = useState<'RIR' | 'RPE'>('RIR');

  useEffect(() => {
    const savedMetrics = localStorage.getItem('app-advanced-metrics');
    if (savedMetrics === 'true') {
      setAdvancedMetrics(true);
      const savedType = localStorage.getItem('app-metric-type');
      if (savedType === 'RIR' || savedType === 'RPE') {
        setMetricType(savedType);
      }
    }
  }, []);

  if (!sets) return null;

  const handleAddSet = async () => {
    const lastSet = sets[sets.length - 1];
    
    await db.sets.add({
      sessionExerciseId,
      weight: lastSet ? lastSet.weight : '',
      reps: lastSet ? lastSet.reps : '',
      restTime: lastSet ? lastSet.restTime : '1:30',
      order: sets.length
    });
  };

  const handleUpdateSet = async (id: number, field: keyof Set, value: string | number) => {
    await db.sets.update(id, { [field]: value });
  };

  const handleDeleteSet = async (id: number) => {
    await db.sets.delete(id);
    
    // Reorder remaining sets
    const remainingSets = await db.sets.where('sessionExerciseId').equals(sessionExerciseId).sortBy('order');
    await Promise.all(
      remainingSets.map((set, index) => db.sets.update(set.id!, { order: index }))
    );
  };

  const gridStyle = {
    gridTemplateColumns: advancedMetrics
      ? "24px minmax(0, 3fr) minmax(0, 3fr) minmax(0, 2fr) minmax(0, 2fr) 36px"
      : "24px minmax(0, 3fr) minmax(0, 4fr) minmax(0, 3fr) 36px"
  };

  return (
    <div className="space-y-2">
      <div 
        className="grid gap-1 md:gap-2 mb-2 pl-1 pr-0 text-xs font-bold text-secondary uppercase tracking-wider text-center items-center"
        style={gridStyle}
      >
        <div>Série</div>
        <div>Poids (kg)</div>
        <div>Répétitions</div>
        <div>Repos</div>
        {advancedMetrics && <div>{metricType}</div>}
        <div></div>
      </div>

      {sets.map((set, index) => (
        <div 
          key={set.id} 
          className="grid gap-1 md:gap-2 items-center pl-1 pr-0 py-1 rounded-lg hover:bg-bg-alt/30 transition-colors group"
          style={gridStyle}
        >
          <div className="text-center font-bold text-accent">
            {index + 1}
          </div>
          <div>
            <input 
              type="text" 
              value={set.weight || ''}
              onChange={(e) => handleUpdateSet(set.id!, 'weight', e.target.value)}
              className="w-full bg-bg-alt/50 border border-accent-light/30 rounded-lg px-1 md:px-2 py-1.5 text-center text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:bg-white transition-all font-semibold text-sm md:text-base placeholder:opacity-40"
              placeholder="ex: BW+10"
            />
          </div>
          <div>
            <input 
              type="text" 
              value={set.reps}
              onChange={(e) => handleUpdateSet(set.id!, 'reps', e.target.value)}
              className="w-full bg-bg-alt/50 border border-accent-light/30 rounded-lg px-1 md:px-2 py-1.5 text-center text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:bg-white transition-all font-semibold text-sm md:text-base placeholder:opacity-40"
              placeholder="ex: 10 ou 7,3"
            />
          </div>
          <div>
            <input 
              type="text" 
              value={set.restTime}
              onChange={(e) => handleUpdateSet(set.id!, 'restTime', e.target.value)}
              className="w-full bg-bg-alt/50 border border-accent-light/30 rounded-lg px-1 md:px-2 py-1.5 text-center text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:bg-white transition-all text-sm md:text-base placeholder:opacity-40"
              placeholder="1:30"
            />
          </div>
          {advancedMetrics && (
            <div>
              <input 
                type="text" 
                value={set.metricScore || ''}
                onChange={(e) => handleUpdateSet(set.id!, 'metricScore', e.target.value)}
                className="w-full bg-bg-alt/50 border border-accent-light/30 rounded-lg px-1 md:px-2 py-1.5 text-center text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:bg-white transition-all font-semibold text-sm md:text-base placeholder:opacity-40"
                placeholder={metricType === 'RIR' ? "ex: 2" : "ex: 8"}
              />
            </div>
          )}
          <div className="flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => handleDeleteSet(set.id!)}
              className="text-accent-light hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}

      <button 
        onClick={handleAddSet}
        className="w-full mt-2 py-2 flex items-center justify-center gap-2 text-sm font-bold text-accent hover:bg-accent/10 rounded-xl transition-colors border border-dashed border-accent/30"
      >
        <Plus size={16} />
        Ajouter une série
      </button>
    </div>
  );
}
