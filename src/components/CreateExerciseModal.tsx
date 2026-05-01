import { useState, useMemo, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Exercise } from '../db';

interface CreateExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseToEdit?: Exercise;
}

export default function CreateExerciseModal({ isOpen, onClose, exerciseToEdit }: CreateExerciseModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [defaultReps, setDefaultReps] = useState('');
  const [defaultRestTime, setDefaultRestTime] = useState('');
  const [defaultRhythm, setDefaultRhythm] = useState('');
  const [rhythmEnabled, setRhythmEnabled] = useState(false);

  const exercises = useLiveQuery(() => db.exercises.toArray());

  useEffect(() => {
    if (isOpen) {
      if (exerciseToEdit) {
        setName(exerciseToEdit.name);
        setCategory(exerciseToEdit.category);
        setDefaultReps(exerciseToEdit.defaultReps || '');
        setDefaultRestTime(exerciseToEdit.defaultRestTime || '');
        setDefaultRhythm(exerciseToEdit.defaultRhythm || '');
      } else {
        setName('');
        setCategory('');
        setDefaultReps('');
        setDefaultRestTime('');
        setDefaultRhythm('');
      }
      setRhythmEnabled(localStorage.getItem('app-rhythm-enabled') === 'true');
    }
  }, [isOpen, exerciseToEdit]);

  const existingTags = useMemo(() => {
    if (!exercises) return [];
    const tags = new Set<string>();
    exercises.forEach(ex => {
      // Split by space, handle legacy categories without #
      const parts = ex.category.split(/\s+/);
      parts.forEach(p => {
        const clean = p.trim();
        if (clean) {
          if (clean.startsWith('#')) tags.add(clean);
          else tags.add(`#${clean}`);
        }
      });
    });
    return Array.from(tags).sort();
  }, [exercises]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !category.trim()) return;

    // Ensure all categories start with #
    const formattedCategories = category
      .split(/\s+/)
      .filter(c => c.trim())
      .map(c => c.startsWith('#') ? c : `#${c}`)
      .join(' ');

    if (exerciseToEdit && exerciseToEdit.id) {
      await db.exercises.update(exerciseToEdit.id, {
        name: name.trim(),
        category: formattedCategories,
        defaultReps: defaultReps.trim() || undefined,
        defaultRestTime: defaultRestTime.trim() || undefined,
        defaultRhythm: defaultRhythm.trim() || undefined
      });
    } else {
      await db.exercises.add({
        name: name.trim(),
        category: formattedCategories,
        isDefault: false,
        defaultReps: defaultReps.trim() || undefined,
        defaultRestTime: defaultRestTime.trim() || undefined,
        defaultRhythm: defaultRhythm.trim() || undefined
      });
    }

    setName('');
    setCategory('');
    setDefaultReps('');
    setDefaultRestTime('');
    setDefaultRhythm('');
    onClose();
  };

  const handleTagClick = (tag: string) => {
    if (!category.includes(tag)) {
      setCategory(prev => prev ? `${prev} ${tag}` : tag);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/60 backdrop-blur-sm p-4">
      <div className="bg-bg-alt rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-6 border-b border-accent-light/30 bg-white">
          <h2 className="text-xl font-bold text-primary">{exerciseToEdit ? 'Modifier un Exercice' : 'Créer un Exercice'}</h2>
          <button onClick={onClose} className="text-accent hover:bg-accent-light/20 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-secondary mb-2">Nom de l'exercice</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-accent-light/50 rounded-xl px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-accent transition-all shadow-sm"
              placeholder="ex: Développé incliné haltères"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-secondary mb-2">Muscles (Tags multiples)</label>
            <input 
              type="text" 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-white border border-accent-light/50 rounded-xl px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-accent transition-all shadow-sm mb-2"
              placeholder="ex: #Pectoraux #Épaules"
            />
            {existingTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {existingTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagClick(tag)}
                    className="text-xs bg-accent-light/20 text-primary hover:bg-accent hover:text-white px-2 py-1 rounded-md transition-colors flex items-center gap-1 font-semibold"
                  >
                    <Plus size={12} /> {tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-secondary mb-2">Répétitions par défaut</label>
              <input 
                type="text" 
                value={defaultReps}
                onChange={(e) => setDefaultReps(e.target.value)}
                className="w-full bg-white border border-accent-light/50 rounded-xl px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-accent transition-all shadow-sm"
                placeholder="ex: 10 ou 7,3"
              />
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-semibold text-secondary mb-2">Repos par défaut</label>
              <input 
                type="text" 
                value={defaultRestTime}
                onChange={(e) => setDefaultRestTime(e.target.value)}
                className="w-full bg-white border border-accent-light/50 rounded-xl px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-accent transition-all shadow-sm"
                placeholder="ex: 1:30"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-secondary mb-2">Rythme par défaut</label>
            <input 
              type="text" 
              value={defaultRhythm}
              onChange={(e) => setDefaultRhythm(e.target.value)}
              className="w-full bg-white border border-accent-light/50 rounded-xl px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-accent transition-all shadow-sm"
              placeholder="ex: 3-1-1 ou contrôlé"
            />
          </div>
          
          <div className="pt-2">
            <button 
              type="submit"
              disabled={!name.trim() || !category.trim()}
              className="w-full bg-accent hover:bg-accent-light disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-lg transition-colors shadow-md"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
