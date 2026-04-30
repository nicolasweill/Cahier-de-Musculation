export interface CustomFormula {
  id: string;
  name: string;
  tokens: string[];
  aggregator: 'sum' | 'max' | 'avg';
}

export interface SetContext {
  w: number;
  r: number;
  rm: number;
  rir: number;
  rest: number;
  idx: number;
  sup: number;
}

export function parseRestTime(restStr: string): number {
  if (!restStr) return 0;
  const parts = restStr.split(':');
  if (parts.length === 2) {
    return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
  }
  return parseInt(restStr) || 0;
}

export function evaluateFormula(formula: CustomFormula, ctx: SetContext): number {
  if (!formula.tokens || formula.tokens.length === 0) return 0;

  const tokenMap: Record<string, string> = {
    'POIDS': 'w',
    'REPS': 'r',
    'RM': 'rm',
    'RIR': 'rir',
    'RECUP': 'rest',
    'SERIE_IDX': 'idx',
    'IS_SUPERSET': 'sup',
    'log(': 'Math.log(',
    'exp(': 'Math.exp(',
    'sqrt(': 'Math.sqrt(',
    '^': '**'
  };

  const jsExpr = formula.tokens.map(t => tokenMap[t] || t).join(' ');

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function('w', 'r', 'rm', 'rir', 'rest', 'idx', 'sup', `return ${jsExpr};`);
    const val = fn(ctx.w, ctx.r, ctx.rm, ctx.rir, ctx.rest, ctx.idx, ctx.sup);
    return isNaN(val) || !isFinite(val) ? 0 : val;
  } catch (e) {
    console.warn("Formula evaluation error:", e);
    return 0;
  }
}

export const AVAILABLE_VARIABLES = [
  { id: 'POIDS', label: 'Poids', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { id: 'REPS', label: 'Reps', color: 'bg-green-100 text-green-800 border-green-300' },
  { id: 'RM', label: '1RM Estimé', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  { id: 'RIR', label: 'RIR (Réserve)', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  { id: 'RECUP', label: 'Récupération (s)', color: 'bg-teal-100 text-teal-800 border-teal-300' },
  { id: 'SERIE_IDX', label: 'Index Série', color: 'bg-gray-100 text-gray-800 border-gray-300' },
  { id: 'IS_SUPERSET', label: 'Est Superset?', color: 'bg-pink-100 text-pink-800 border-pink-300' },
];

export const AVAILABLE_OPERATORS = [
  { id: '+', label: '+' },
  { id: '-', label: '-' },
  { id: '*', label: '×' },
  { id: '/', label: '÷' },
  { id: '^', label: '^' },
  { id: '(', label: '(' },
  { id: ')', label: ')' },
];

export const AVAILABLE_FUNCTIONS = [
  { id: 'log(', label: 'log(' },
  { id: 'exp(', label: 'exp(' },
  { id: 'sqrt(', label: 'sqrt(' },
];
