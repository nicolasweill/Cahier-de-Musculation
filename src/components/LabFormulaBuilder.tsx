import { useState } from 'react';
import { X, Save, Plus, Trash2, Edit2, Play } from 'lucide-react';
import type { CustomFormula } from '../utils/formulaUtils';
import { 
  AVAILABLE_VARIABLES, 
  AVAILABLE_OPERATORS, 
  AVAILABLE_FUNCTIONS, 
  evaluateFormula 
} from '../utils/formulaUtils';

interface LabFormulaBuilderProps {
  onClose: () => void;
  onSave: (formulas: CustomFormula[]) => void;
  initialFormulas: CustomFormula[];
}

export default function LabFormulaBuilder({ onClose, onSave, initialFormulas }: LabFormulaBuilderProps) {
  const [formulas, setFormulas] = useState<CustomFormula[]>(initialFormulas);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [aggregator, setAggregator] = useState<'sum' | 'max' | 'avg'>('sum');
  const [tokens, setTokens] = useState<string[]>([]);

  const [testResult, setTestResult] = useState<number | null>(null);

  const startEditing = (f?: CustomFormula) => {
    if (f) {
      setEditingId(f.id);
      setName(f.name);
      setAggregator(f.aggregator);
      setTokens([...f.tokens]);
    } else {
      setEditingId('new');
      setName('Nouvelle Formule');
      setAggregator('sum');
      setTokens([]);
    }
    setTestResult(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const deleteFormula = (id: string) => {
    if (confirm("Supprimer cette formule ?")) {
      const newFormulas = formulas.filter(f => f.id !== id);
      setFormulas(newFormulas);
      onSave(newFormulas);
    }
  };

  const saveCurrent = () => {
    if (!name.trim() || tokens.length === 0) {
      alert("La formule doit avoir un nom et ne pas être vide.");
      return;
    }

    const newFormula: CustomFormula = {
      id: editingId === 'new' ? `lab-${Date.now()}` : editingId!,
      name: name.trim(),
      tokens,
      aggregator
    };

    let newFormulas;
    if (editingId === 'new') {
      newFormulas = [...formulas, newFormula];
    } else {
      newFormulas = formulas.map(f => f.id === editingId ? newFormula : f);
    }

    setFormulas(newFormulas);
    onSave(newFormulas);
    setEditingId(null);
  };

  const addToken = (tokenId: string) => {
    setTokens([...tokens, tokenId]);
  };

  const removeLastToken = () => {
    setTokens(tokens.slice(0, -1));
  };

  const clearTokens = () => {
    setTokens([]);
  };

  const testFormula = () => {
    const dummyCtx = { w: 100, r: 10, rm: 133.3, rir: 2, rest: 120, idx: 1, sup: 0 };
    const res = evaluateFormula({ id: 'test', name: 'test', tokens, aggregator }, dummyCtx);
    setTestResult(res);
  };

  const renderToken = (tokenId: string, idx?: number) => {
    const v = AVAILABLE_VARIABLES.find(x => x.id === tokenId);
    if (v) {
      return (
        <span key={idx !== undefined ? idx : tokenId} className={`inline-block px-2 py-1 m-0.5 rounded-md border text-sm font-bold ${v.color}`}>
          {v.label}
        </span>
      );
    }
    const isFunc = AVAILABLE_FUNCTIONS.some(x => x.id === tokenId);
    return (
      <span key={idx !== undefined ? idx : tokenId} className={`inline-block px-2 py-1 m-0.5 rounded-md border text-sm font-bold ${isFunc ? 'bg-indigo-100 text-indigo-800 border-indigo-300' : 'bg-gray-200 text-gray-800 border-gray-400'}`}>
        {tokenId}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-full overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-bg-alt flex justify-between items-center bg-primary text-white">
          <div className="flex items-center gap-3">
            <div className="bg-accent p-2 rounded-xl text-white">
              <Play size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Laboratoire de Performances</h2>
              <p className="text-sm opacity-80">Créez vos propres métriques de calcul</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-bg-alt/30">
          {!editingId ? (
            // LIST VIEW
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-primary">Vos Formules</h3>
                <button 
                  onClick={() => startEditing()}
                  className="bg-accent text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-accent-light transition-colors shadow-sm"
                >
                  <Plus size={18} />
                  Nouvelle Formule
                </button>
              </div>

              {formulas.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-accent-light/50 text-secondary">
                  <p>Aucune formule personnalisée.</p>
                  <p className="text-sm mt-1">Créez votre première formule pour l'utiliser dans vos statistiques !</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {formulas.map(f => (
                    <div key={f.id} className="bg-white p-4 rounded-2xl border border-accent-light/30 shadow-sm flex items-center justify-between group">
                      <div>
                        <h4 className="font-bold text-primary text-lg">{f.name}</h4>
                        <div className="flex flex-wrap items-center mt-2 opacity-80 pointer-events-none">
                          {f.tokens.map((t, i) => renderToken(t, i))}
                        </div>
                        <div className="mt-2 text-xs font-bold text-secondary uppercase tracking-wider">
                          Agrégation Séance : {f.aggregator === 'sum' ? 'Somme' : f.aggregator === 'max' ? 'Maximum' : 'Moyenne'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEditing(f)} className="p-2 text-accent-light hover:text-accent hover:bg-accent/10 rounded-lg transition-colors">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => deleteFormula(f.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // EDITOR VIEW
            <div className="bg-white p-6 rounded-2xl border border-accent shadow-sm flex flex-col h-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-primary">Éditeur d'Expression</h3>
                <div className="flex gap-2">
                  <button onClick={cancelEditing} className="px-4 py-2 text-secondary font-bold hover:bg-bg-alt rounded-xl transition-colors">
                    Annuler
                  </button>
                  <button onClick={saveCurrent} className="bg-accent text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-accent-light transition-colors shadow-sm">
                    <Save size={18} />
                    Sauvegarder
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-bold text-secondary uppercase mb-1">Nom de la formule</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-bg-alt/50 border border-accent-light/50 rounded-xl px-4 py-2.5 text-primary focus:outline-none focus:ring-2 focus:ring-accent font-semibold"
                    placeholder="Ex: Score d'Hypertrophie"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-secondary uppercase mb-1">Agrégation sur la séance</label>
                  <select 
                    value={aggregator}
                    onChange={e => setAggregator(e.target.value as 'sum' | 'max' | 'avg')}
                    className="w-full bg-bg-alt/50 border border-accent-light/50 rounded-xl px-4 py-2.5 text-primary focus:outline-none focus:ring-2 focus:ring-accent font-semibold cursor-pointer"
                  >
                    <option value="sum">Somme de toutes les séries</option>
                    <option value="max">Prendre la meilleure série (Max)</option>
                    <option value="avg">Moyenne des séries</option>
                  </select>
                </div>
              </div>

              {/* Expression Area */}
              <div className="mb-6 flex flex-col">
                <label className="block text-sm font-bold text-secondary uppercase mb-1">Formule de la Série</label>
                <div className="min-h-[100px] p-4 bg-gray-50 border-2 border-dashed border-accent-light/50 rounded-xl flex flex-wrap content-start items-center gap-1">
                  {tokens.length === 0 ? (
                    <span className="text-secondary/50 italic">Cliquez sur les éléments ci-dessous pour construire votre formule...</span>
                  ) : (
                    tokens.map((t, idx) => renderToken(t, idx))
                  )}
                  {tokens.length > 0 && (
                    <button onClick={removeLastToken} className="ml-2 text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 px-2 py-1 rounded border border-red-200">
                      ← Effacer
                    </button>
                  )}
                </div>
                <div className="flex justify-between items-center mt-2">
                  <div className="flex gap-2">
                    <button onClick={testFormula} className="text-sm font-bold text-accent hover:underline flex items-center gap-1">
                      <Play size={14} /> Tester avec des valeurs fictives
                    </button>
                    {testResult !== null && (
                      <span className="text-sm font-bold bg-accent/10 text-accent px-2 py-0.5 rounded">Résultat : {testResult.toFixed(2)}</span>
                    )}
                  </div>
                  <button onClick={clearTokens} className="text-sm text-secondary hover:text-primary transition-colors">
                    Tout vider
                  </button>
                </div>
              </div>

              {/* Toolbar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-bg-alt pt-6">
                <div>
                  <h4 className="text-xs font-bold text-secondary uppercase mb-3">Variables</h4>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_VARIABLES.map(v => (
                      <button 
                        key={v.id} 
                        onClick={() => addToken(v.id)}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-bold shadow-sm hover:scale-105 active:scale-95 transition-transform ${v.color}`}
                        title={v.label}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-xs font-bold text-secondary uppercase mb-3">Opérateurs</h4>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_OPERATORS.map(o => (
                      <button 
                        key={o.id} 
                        onClick={() => addToken(o.id)}
                        className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-400 bg-gray-200 text-gray-800 text-lg font-black shadow-sm hover:bg-gray-300 active:scale-95 transition-all"
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-secondary uppercase mb-3">Fonctions & Nombres</h4>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {AVAILABLE_FUNCTIONS.map(f => (
                      <button 
                        key={f.id} 
                        onClick={() => addToken(f.id)}
                        className="px-3 py-1.5 rounded-lg border border-indigo-300 bg-indigo-100 text-indigo-800 text-sm font-bold shadow-sm hover:bg-indigo-200 active:scale-95 transition-all"
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5, 10, 100].map(n => (
                      <button 
                        key={n} 
                        onClick={() => addToken(n.toString())}
                        className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-800 text-sm font-bold shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 text-xs text-secondary bg-bg-alt/50 p-4 rounded-xl border border-accent-light/30">
                <strong>Astuce :</strong> Le moteur utilise une syntaxe mathématique standard. Assurez-vous d'équilibrer vos parenthèses. <br/>
                <em>Exemples :</em> <code>POIDS * REPS</code> ou <code>( POIDS * REPS ) / log( RIR + 1 )</code>.
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
