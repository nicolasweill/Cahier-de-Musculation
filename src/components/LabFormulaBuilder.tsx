import { useMemo, useState } from 'react';
import { X, Save, Plus, Trash2, Edit2, Play, Wand2, FlaskConical } from 'lucide-react';
import type { CustomFormula, FormulaTag, SetContext } from '../utils/formulaUtils';
import { evaluateFormula } from '../utils/formulaUtils';

interface LabFormulaBuilderProps {
  onClose?: () => void;
  onSave: (formulas: CustomFormula[]) => void;
  initialFormulas: CustomFormula[];
  asPage?: boolean;
}

type TestSet = SetContext & {
  label: string;
};

const DEFAULT_CODE = `def fatigue(rest):
    return max(0.6, min(1.2, rest / 120))

def score(w, r, rm, rir, rest, idx, sup):
    intensity = 1 + (rm / 200)
    return w * r * intensity * fatigue(rest)`;

const LEGACY_TOKEN_LABELS: Record<string, string> = {
  POIDS: 'w',
  REPS: 'r',
  RM: 'rm',
  RIR: 'rir',
  RECUP: 'rest',
  SERIE_IDX: 'idx',
  IS_SUPERSET: 'sup',
  'log(': 'log(',
  'exp(': 'exp(',
  'sqrt(': 'sqrt(',
  '^': '**'
};

const SAMPLE_SETS: TestSet[] = [
  { label: 'Echauffement', w: 60, r: 12, rm: 84, rir: 4, rest: 90, idx: 1, sup: 0 },
  { label: 'Travail lourd', w: 100, r: 6, rm: 120, rir: 1, rest: 180, idx: 2, sup: 0 },
  { label: 'Superset', w: 72.5, r: 10, rm: 96.7, rir: 2, rest: 75, idx: 3, sup: 1 }
];

const DOC_VARIABLES = [
  ['w', 'Charge utilisée en kg, poids du corps inclus si la charge contient BW.'],
  ['r', 'Nombre total de répétitions de la série.'],
  ['rm', '1RM estimé de la série avec la formule actuelle de l\'app.'],
  ['rir', 'RIR ou score métrique saisi sur la série.'],
  ['rest', 'Temps de récupération en secondes.'],
  ['idx', 'Position de la série dans l\'exercice, en commençant à 1.'],
  ['sup', '1 si la série appartient à un superset, sinon 0.']
];

const DOC_FUNCTIONS = [
  ['score(...)', 'Obligatoire. Retourne le score numérique de chaque série.'],
  ['def ma_fonction(...):', 'Permet de créer vos propres fonctions auxiliaires.'],
  ['min, max, abs, round', 'Fonctions numériques disponibles.'],
  ['log, exp, sqrt', 'Fonctions mathématiques disponibles, utilisables directement.']
];

function legacyTokensToCode(tokens?: string[]) {
  if (!tokens || tokens.length === 0) return DEFAULT_CODE;
  const expression = tokens.map(token => LEGACY_TOKEN_LABELS[token] || token).join(' ');
  return `def score(w, r, rm, rir, rest, idx, sup):
    return ${expression}`;
}

function aggregateScores(scores: number[], aggregator: CustomFormula['aggregator']) {
  if (scores.length === 0) return 0;
  if (aggregator === 'max') return Math.max(...scores);
  if (aggregator === 'avg') return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return scores.reduce((sum, score) => sum + score, 0);
}

function makeRandomSet(index: number): TestSet {
  const weight = Math.round((40 + Math.random() * 100) * 2) / 2;
  const reps = Math.floor(4 + Math.random() * 12);
  const rir = Math.floor(Math.random() * 5);
  const rest = [60, 75, 90, 120, 150, 180][Math.floor(Math.random() * 6)];
  return {
    label: `Serie ${index}`,
    w: weight,
    r: reps,
    rm: Math.round(weight * (1 + reps / 30) * 10) / 10,
    rir,
    rest,
    idx: index,
    sup: Math.random() > 0.75 ? 1 : 0
  };
}

export default function LabFormulaBuilder({ onClose, onSave, initialFormulas, asPage = false }: LabFormulaBuilderProps) {
  const [formulas, setFormulas] = useState<CustomFormula[]>(initialFormulas);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [aggregator, setAggregator] = useState<CustomFormula['aggregator']>('sum');
  const [tags, setTags] = useState<FormulaTag[]>(['volume']);
  const [showUnit, setShowUnit] = useState(false);
  const [unit, setUnit] = useState('points');
  const [code, setCode] = useState(DEFAULT_CODE);
  const [testSets, setTestSets] = useState<TestSet[]>(SAMPLE_SETS);

  const testScores = useMemo(() => {
    const draftFormula: CustomFormula = { id: 'test', name: 'test', code, aggregator };
    const scores = testSets.map(set => evaluateFormula(draftFormula, set));
    return {
      sets: scores,
      total: aggregateScores(scores, aggregator)
    };
  }, [aggregator, code, testSets]);

  const toggleTag = (tag: FormulaTag) => {
    setTags(prev =>
      prev.includes(tag)
        ? prev.length > 1 ? prev.filter(t => t !== tag) : prev // au moins 1 tag requis
        : [...prev, tag]
    );
  };

  const startEditing = (formula?: CustomFormula) => {
    if (formula) {
      setEditingId(formula.id);
      setName(formula.name);
      setAggregator(formula.aggregator);
      setTags(formula.tags && formula.tags.length > 0 ? formula.tags : ['volume']);
      setShowUnit(!!formula.showUnit);
      setUnit(formula.unit || 'points');
      setCode(formula.code || legacyTokensToCode(formula.tokens));
    } else {
      setEditingId('new');
      setName('Nouvelle formule Python');
      setAggregator('sum');
      setTags(['volume']);
      setShowUnit(false);
      setUnit('points');
      setCode(DEFAULT_CODE);
    }
  };

  const saveCurrent = () => {
    if (!name.trim() || !code.trim()) {
      alert('La formule doit avoir un nom et du code.');
      return;
    }

    const savedFormula: CustomFormula = {
      id: editingId === 'new' ? `lab-${Date.now()}` : editingId!,
      name: name.trim(),
      code,
      aggregator,
      tags,
      showUnit,
      unit: showUnit ? unit.trim() || 'points' : ''
    };

    const newFormulas = editingId === 'new'
      ? [...formulas, savedFormula]
      : formulas.map(formula => formula.id === editingId ? savedFormula : formula);

    setFormulas(newFormulas);
    onSave(newFormulas);
    setEditingId(null);
  };

  const deleteFormula = (id: string) => {
    if (!confirm('Supprimer cette formule ?')) return;
    const newFormulas = formulas.filter(formula => formula.id !== id);
    setFormulas(newFormulas);
    onSave(newFormulas);
  };

  const generateExercise = () => {
    const count = 3 + Math.floor(Math.random() * 4);
    setTestSets(Array.from({ length: count }, (_, index) => makeRandomSet(index + 1)));
  };

  const generateSession = () => {
    const count = 8 + Math.floor(Math.random() * 8);
    setTestSets(Array.from({ length: count }, (_, index) => makeRandomSet(index + 1)));
  };

  // Shared inner content (list or editor), used by both modal and page modes
  const innerContent = !editingId ? (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-primary">Vos formules Python</h3>
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
          <p className="text-sm mt-1">Créez votre première fonction score pour l'utiliser dans vos statistiques.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {formulas.map(formula => (
            <div key={formula.id} className="bg-white p-4 rounded-2xl border border-accent-light/30 shadow-sm flex items-center justify-between group">
              <div className="min-w-0">
                <h4 className="font-bold text-primary text-lg">{formula.name}</h4>
                <pre className="mt-2 max-h-20 overflow-hidden text-xs text-secondary bg-bg-alt/50 border border-accent-light/30 rounded-xl p-3 whitespace-pre-wrap">
                  {formula.code || legacyTokensToCode(formula.tokens)}
                </pre>
                <div className="mt-2 flex flex-wrap gap-1 items-center">
                  {(formula.tags || []).map(tag => {
                    const tagLabels: Record<string, string> = { performance: 'Performance', volume: 'Volume', efficiency: 'Efficacité' };
                    return <span key={tag} className="text-[10px] font-bold uppercase tracking-wider bg-accent/10 text-accent px-2 py-0.5 rounded-full">{tagLabels[tag]}</span>;
                  })}
                  <span className="text-xs text-secondary">· {formula.aggregator === 'sum' ? 'Somme' : formula.aggregator === 'max' ? 'Maximum' : 'Moyenne'}</span>
                  {formula.showUnit && formula.unit && <span className="text-xs text-secondary">· {formula.unit}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                <button onClick={() => startEditing(formula)} className="p-2 text-accent-light hover:text-accent hover:bg-accent/10 rounded-lg transition-colors">
                  <Edit2 size={18} />
                </button>
                <button onClick={() => deleteFormula(formula.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  ) : (
    <div className="bg-white p-6 rounded-2xl border border-accent shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-primary">Éditeur Python</h3>
        <div className="flex gap-2">
          <button onClick={() => setEditingId(null)} className="px-4 py-2 text-secondary font-bold hover:bg-bg-alt rounded-xl transition-colors">
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
            onChange={event => setName(event.target.value)}
            className="w-full bg-bg-alt/50 border border-accent-light/50 rounded-xl px-4 py-2.5 text-primary focus:outline-none focus:ring-2 focus:ring-accent font-semibold"
            placeholder="Ex: Score hypertrophie"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-secondary uppercase mb-1">Agrégation sur les séries</label>
          <select
            value={aggregator}
            onChange={event => setAggregator(event.target.value as CustomFormula['aggregator'])}
            className="w-full bg-bg-alt/50 border border-accent-light/50 rounded-xl px-4 py-2.5 text-primary focus:outline-none focus:ring-2 focus:ring-accent font-semibold cursor-pointer"
          >
            <option value="sum">Somme de toutes les séries</option>
            <option value="avg">Moyenne des séries</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-secondary uppercase mb-1">Type de score</label>
          <div className="flex gap-2 flex-wrap">
            {(['performance', 'volume', 'efficiency'] as FormulaTag[]).map(tag => {
              const labels: Record<FormulaTag, string> = { performance: 'Performance', volume: 'Volume', efficiency: 'Efficacité' };
              const active = tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-2 rounded-xl border text-sm font-bold transition-colors ${
                    active ? 'bg-accent text-white border-accent' : 'bg-bg-alt/50 text-secondary border-accent-light/50 hover:border-accent'
                  }`}
                >
                  {labels[tag]}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-secondary mt-1">Détermine dans quelles sections statistiques ce score apparaît.</p>
        </div>
        <div>
          <label className="block text-sm font-bold text-secondary uppercase mb-1">Unité du record</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowUnit(!showUnit)}
              className={`px-3 py-2.5 rounded-xl border text-sm font-bold transition-colors ${
                showUnit ? 'bg-accent text-white border-accent' : 'bg-bg-alt/50 text-secondary border-accent-light/50'
              }`}
            >
              {showUnit ? 'Avec' : 'Sans'}
            </button>
            <input
              type="text"
              value={unit}
              onChange={event => setUnit(event.target.value)}
              disabled={!showUnit}
              className="min-w-0 flex-1 bg-bg-alt/50 border border-accent-light/50 rounded-xl px-3 py-2.5 text-primary focus:outline-none focus:ring-2 focus:ring-accent font-semibold disabled:opacity-40"
              placeholder="points"
            />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.3fr_0.7fr] gap-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-secondary uppercase mb-2">Code Python</label>
            <textarea
              value={code}
              onChange={event => setCode(event.target.value)}
              spellCheck={false}
              className="w-full min-h-[320px] bg-gray-950 text-green-100 border border-accent-light/50 rounded-xl px-4 py-3 font-mono text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="bg-bg-alt/50 p-4 rounded-xl border border-accent-light/30">
            <h4 className="text-sm font-bold text-primary uppercase mb-3">Documentation</h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-secondary">
              <div>
                <div className="font-bold text-primary mb-2">Variables</div>
                <div className="space-y-2">
                  {DOC_VARIABLES.map(([variable, description]) => (
                    <div key={variable}><code className="font-bold text-accent">{variable}</code> : {description}</div>
                  ))}
                </div>
              </div>
              <div>
                <div className="font-bold text-primary mb-2">Fonctions</div>
                <div className="space-y-2">
                  {DOC_FUNCTIONS.map(([fn, description]) => (
                    <div key={fn}><code className="font-bold text-accent">{fn}</code> : {description}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-bg-alt/50 p-4 rounded-xl border border-accent-light/30">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h4 className="text-sm font-bold text-primary uppercase">Tests fictifs</h4>
              <Play size={16} className="text-accent" />
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              <button onClick={() => setTestSets([makeRandomSet(1)])} className="px-3 py-2 bg-white border border-accent-light/50 rounded-xl text-sm font-bold text-primary hover:bg-accent/10">
                Série
              </button>
              <button onClick={generateExercise} className="px-3 py-2 bg-white border border-accent-light/50 rounded-xl text-sm font-bold text-primary hover:bg-accent/10">
                Exercice
              </button>
              <button onClick={generateSession} className="px-3 py-2 bg-white border border-accent-light/50 rounded-xl text-sm font-bold text-primary hover:bg-accent/10 flex items-center gap-2">
                <Wand2 size={14} />
                Séance
              </button>
            </div>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {testSets.map((set, index) => (
                <div key={`${set.label}-${index}`} className="bg-white rounded-xl border border-accent-light/30 p-3 text-sm">
                  <div className="flex justify-between font-bold text-primary">
                    <span>{set.label}</span>
                    <span>{testScores.sets[index].toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-secondary mt-1">
                    {set.w} kg x {set.r} reps, 1RM {set.rm}, RIR {set.rir}, repos {set.rest}s
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 bg-primary text-white rounded-xl p-4">
              <div className="text-xs uppercase font-bold text-accent-light">Score agrégé</div>
              <div className="text-3xl font-black">{testScores.total.toFixed(2)}</div>
            </div>
          </div>

          <div className="text-xs text-secondary bg-white p-4 rounded-xl border border-accent-light/30">
            La syntaxe supporte les fonctions Python simples avec <code>def</code>, les variables locales, <code>return</code> et les expressions numériques. La fonction <code>score(w, r, rm, rir, rest, idx, sup)</code> est obligatoire.
          </div>
        </div>
      </div>
    </div>
  );

  if (asPage) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-3 mb-8 bg-primary text-white p-6 rounded-2xl shadow-sm">
          <div className="bg-accent p-2 rounded-xl">
            <FlaskConical size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold">Laboratoire de Performances</h2>
            <p className="text-sm opacity-80">Codez vos propres métriques en syntaxe Python.</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto pb-10">
          {innerContent}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-full overflow-hidden">
        <div className="p-6 border-b border-bg-alt flex justify-between items-center bg-primary text-white">
          <div className="flex items-center gap-3">
            <div className="bg-accent p-2 rounded-xl text-white">
              <FlaskConical size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Laboratoire de Performances</h2>
              <p className="text-sm opacity-80">Codez vos propres métriques en syntaxe Python.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-bg-alt/30">
          {innerContent}
        </div>
      </div>
    </div>
  );
}
