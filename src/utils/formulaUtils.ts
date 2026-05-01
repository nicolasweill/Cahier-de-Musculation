export interface CustomFormula {
  id: string;
  name: string;
  code?: string;
  tokens?: string[];
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
  if (formula.code?.trim()) {
    return evaluatePythonFormula(formula.code, ctx);
  }

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

function transformPythonExpression(expr: string): string {
  return expr
    .replace(/\bmath\./g, 'Math.')
    .replace(/\blog\s*\(/g, 'Math.log(')
    .replace(/\bexp\s*\(/g, 'Math.exp(')
    .replace(/\bsqrt\s*\(/g, 'Math.sqrt(')
    .replace(/\bfloor\s*\(/g, 'Math.floor(')
    .replace(/\bceil\s*\(/g, 'Math.ceil(')
    .replace(/\bmin\s*\(/g, 'Math.min(')
    .replace(/\bmax\s*\(/g, 'Math.max(')
    .replace(/\babs\s*\(/g, 'Math.abs(')
    .replace(/\bround\s*\(/g, 'Math.round(')
    .replace(/\bTrue\b/g, 'true')
    .replace(/\bFalse\b/g, 'false')
    .replace(/\bNone\b/g, 'null')
    .replace(/\band\b/g, '&&')
    .replace(/\bor\b/g, '||')
    .replace(/\bnot\b/g, '!')
    .replace(/\*\*/g, '**');
}

function compilePythonLikeCode(code: string): string {
  const lines = code.replace(/\r\n/g, '\n').split('\n');
  const jsLines: string[] = [];
  const indentStack: number[] = [];

  for (const rawLine of lines) {
    const withoutComment = rawLine.replace(/#.*$/, '');
    if (!withoutComment.trim()) continue;

    const indent = withoutComment.match(/^\s*/)?.[0].length ?? 0;
    while (indentStack.length > 0 && indent <= indentStack[indentStack.length - 1]) {
      jsLines.push('}');
      indentStack.pop();
    }

    const line = withoutComment.trim();
    const defMatch = line.match(/^def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*:\s*$/);
    if (defMatch) {
      jsLines.push(`function ${defMatch[1]}(${defMatch[2]}) {`);
      indentStack.push(indent);
      continue;
    }

    const returnMatch = line.match(/^return\s+(.+)$/);
    if (returnMatch) {
      jsLines.push(`return ${transformPythonExpression(returnMatch[1])};`);
      continue;
    }

    const assignmentMatch = line.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);
    if (assignmentMatch) {
      jsLines.push(`const ${assignmentMatch[1]} = ${transformPythonExpression(assignmentMatch[2])};`);
      continue;
    }

    throw new Error(`Ligne Python non supportee: ${line}`);
  }

  while (indentStack.length > 0) {
    jsLines.push('}');
    indentStack.pop();
  }

  return jsLines.join('\n');
}

export function evaluatePythonFormula(code: string, ctx: SetContext): number {
  try {
    const jsCode = compilePythonLikeCode(code);
    // The Lab executes user-authored local formulas. Inputs are numeric set context values.
    // eslint-disable-next-line no-new-func
    const fn = new Function(
      'w',
      'r',
      'rm',
      'rir',
      'rest',
      'idx',
      'sup',
      `${jsCode}
if (typeof score !== 'function') throw new Error('La fonction score(...) est obligatoire.');
return score(w, r, rm, rir, rest, idx, sup);`
    );
    const val = fn(ctx.w, ctx.r, ctx.rm, ctx.rir, ctx.rest, ctx.idx, ctx.sup);
    return isNaN(val) || !isFinite(val) ? 0 : Number(val);
  } catch (e) {
    console.warn("Python formula evaluation error:", e);
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
