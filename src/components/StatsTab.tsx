import { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { format, startOfDay, startOfWeek, startOfMonth, isSameDay, isSameWeek, isSameMonth, isSameYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import { TrendingUp, Medal, Weight, Target } from 'lucide-react';
import TrainingCalendar from './TrainingCalendar';
import type { CustomFormula } from '../utils/formulaUtils';
import { evaluateFormula, parseRestTime } from '../utils/formulaUtils';
import { getMuscleTags } from '../utils/muscleTags';

export default function StatsTab() {
  const [userWeight, setUserWeight] = useState<number>(() => {
    const stored = localStorage.getItem('userWeight');
    return stored ? parseFloat(stored) : 75;
  });

  const [volumePeriod, setVolumePeriod] = useState<'day' | 'week' | 'month'>('week');
  const [radarPeriod, setRadarPeriod] = useState<'day' | 'week' | 'month' | 'year' | 'all'>('all');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');

  const [exerciseId, setExerciseId] = useState<number | null>(null);
  const [setsCount, setSetsCount] = useState<number>(1);

  // Metric indépendant par section
  const [volumeSectionMetric, setVolumeSectionMetric] = useState<string>('volume');
  const [radarSectionMetric, setRadarSectionMetric] = useState<string>('volume');
  const [perfSectionMetric, setPerfSectionMetric] = useState<string>(() => localStorage.getItem('app-active-metric') || 'charge');

  const [customFormulas] = useState<CustomFormula[]>(() => {
    const saved = localStorage.getItem('app-custom-formulas');
    return saved ? JSON.parse(saved) : [];
  });

  const updatePerfMetric = (m: string) => {
    setPerfSectionMetric(m);
    localStorage.setItem('app-active-metric', m);
  };

  useEffect(() => {
    if (perfSectionMetric !== 'charge' && perfSectionMetric !== '1rm' && !customFormulas.find(f => f.id === perfSectionMetric)) {
      updatePerfMetric('charge');
    }
  }, []);

  const exercises = useLiveQuery(() => db.exercises.toArray());
  const allSessions = useLiveQuery(async () => {
    return await db.sessions.orderBy('date').filter(s => s.isFinished === true && !s.isTemplate).toArray();
  });
  const allSessionExercises = useLiveQuery(() => db.session_exercises.toArray());
  const allSets = useLiveQuery(() => db.sets.toArray());

  useEffect(() => {
    if (exercises && exercises.length > 0) {
      if (exerciseId === null) setExerciseId(exercises[0].id!);
    }
  }, [exercises, exerciseId]);

  useEffect(() => {
    const savedWeightUnit = localStorage.getItem('app-weight-unit');
    if (savedWeightUnit === 'kg' || savedWeightUnit === 'lbs') {
      setWeightUnit(savedWeightUnit);
    }
  }, []);

  const handleUserWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) || 0;
    setUserWeight(val);
    localStorage.setItem('userWeight', val.toString());
  };

  const parseReps = (repString: string): number => {
    if (!repString) return 0;
    return repString.split(',').reduce((sum, current) => sum + (parseInt(current, 10) || 0), 0);
  };

  const parseWeight = (weight: string | number, userW: number, defaultUnit: 'kg' | 'lbs'): number => {
    const convertToKg = (value: number, unit: 'kg' | 'lbs') => unit === 'lbs' ? value * 0.45359237 : value;
    if (typeof weight === 'number') return convertToKg(weight, defaultUnit);
    if (!weight) return 0;
    const str = String(weight).toUpperCase();

    if (!/[+\-]/.test(str) && !str.includes('BW')) {
      const singleMatch = str.match(/(-?\d+(?:[.,]\d+)?)\s*(KG|KGS|LB|LBS)?/);
      if (!singleMatch) return 0;
      const value = parseFloat(singleMatch[1].replace(',', '.')) || 0;
      const unit = singleMatch[2]?.startsWith('LB') ? 'lbs' : singleMatch[2]?.startsWith('KG') ? 'kg' : defaultUnit;
      return convertToKg(value, unit);
    }

    const normalized = str.replace(/\s+/g, '').replace(/-/g, '+-');
    return normalized.split('+').reduce((total, part) => {
      if (!part) return total;
      if (part === 'BW') return total + userW;

      const match = part.match(/^(-?\d+(?:[.,]\d+)?)(KG|KGS|LB|LBS)?$/);
      if (!match) return total;
      const value = parseFloat(match[1].replace(',', '.')) || 0;
      const unit = match[2]?.startsWith('LB') ? 'lbs' : match[2]?.startsWith('KG') ? 'kg' : defaultUnit;
      return total + convertToKg(value, unit);
    }, 0);
  };

  const calculate1RM = (weight: number, reps: number) => {
    if (reps === 0) return 0;
    if (reps === 1) return weight;
    return weight * (1 + reps / 30);
  };

  // Formules filtrées par tag pour chaque section
  const volumeEfficacyFormulas = customFormulas.filter(f => (f.tags || []).some(t => t === 'volume' || t === 'efficiency'));
  const perfEfficacyFormulas = customFormulas.filter(f => (f.tags || []).some(t => t === 'performance' || t === 'efficiency'));

  const {
    sessionStats,
    globalVolumeData,
    perfChartData,
    muscleData,
    personalRecord,
    volumeFormula,
    radarFormula,
    perfFormula,
  } = useMemo(() => {
    if (!allSessions || !allSessionExercises || !allSets || !exercises) {
      return {
        sessionStats: [],
        globalVolumeData: [],
        perfChartData: [],
        muscleData: [],
        personalRecord: null,
        volumeFormula: undefined,
        radarFormula: undefined,
        perfFormula: undefined,
      };
    }

    const volF = customFormulas.find(f => f.id === volumeSectionMetric);
    const radF = customFormulas.find(f => f.id === radarSectionMetric);
    const perF = customFormulas.find(f => f.id === perfSectionMetric);

    const sStats: { date: Date; volume: number; reps: number }[] = [];
    const volumeGroups: Record<string, number> = {};
    const statsByCategory: Record<string, { volume: number; reps: number; frequency: number; formulaScore: number }> = {};
    const pChartData: { date: string; Score: number }[] = [];

    let bestRecordScore = 0;
    let bestRecordSetsBreakdown: { weight: number; reps: number }[] = [];
    let bestRecordDate = '';
    let bestRecordUnit = 'kg';
    const now = new Date();

    for (const session of allSessions) {
      const sessionDate = new Date(session.date);
      const isWithinRadarPeriod = radarPeriod === 'all'
        || (radarPeriod === 'day' && isSameDay(sessionDate, now))
        || (radarPeriod === 'week' && isSameWeek(sessionDate, now, { weekStartsOn: 1 }))
        || (radarPeriod === 'month' && isSameMonth(sessionDate, now))
        || (radarPeriod === 'year' && isSameYear(sessionDate, now));

      const ses = allSessionExercises.filter(se => se.sessionId === session.id);
      let sessionTotalVolume = 0;
      let sessionTotalReps = 0;
      let sessionVolFormScore = 0;

      let perfSessionScore = 0;
      let hasPerfExercise = false;
      let sessionBest1RMSet: { weight: number; reps: number; rm1: number } | null = null;
      let sessionTopSets: { weight: number; reps: number; volume: number; perfScore: number }[] = [];

      for (const se of ses) {
        const exercise = exercises.find(ex => ex.id === se.exerciseId);
        if (!exercise) continue;

        const setsForSe = allSets.filter(s => s.sessionExerciseId === se.id);

        const processedSets = setsForSe.map((set, idx) => {
          const reps = parseReps(set.reps);
          const weight = parseWeight(set.weight, userWeight, weightUnit);
          const rm1 = calculate1RM(weight, reps);
          const ctx = {
            w: weight, r: reps, rm: rm1,
            rir: parseFloat(set.metricScore || '0') || 0,
            rest: parseRestTime(set.restTime),
            idx: idx + 1,
            sup: se.supersetId ? 1 : 0,
          };
          // Évaluer chaque formule une seule fois avec cache par id
          const scoreCache: Record<string, number> = {};
          const evalF = (f: typeof volF) => {
            if (!f) return 0;
            if (!(f.id in scoreCache)) scoreCache[f.id] = evaluateFormula(f, ctx);
            return scoreCache[f.id];
          };
          return {
            weight, reps, volume: weight * reps, rm1,
            volScore: evalF(volF),
            radScore: evalF(radF),
            perfScore: evalF(perF),
          };
        });

        // Accumulation volume/reps et scores par section
        let exerciseVolFormScore = 0;
        let exerciseRadFormScore = 0;

        for (const pSet of processedSets) {
          sessionTotalVolume += pSet.volume;
          sessionTotalReps += pSet.reps;
          exerciseVolFormScore += pSet.volScore;
          exerciseRadFormScore += pSet.radScore;

          if ((pSet.volume > 0 || pSet.reps > 0) && isWithinRadarPeriod) {
            for (const muscle of getMuscleTags(exercise.category)) {
              if (!statsByCategory[muscle]) statsByCategory[muscle] = { volume: 0, reps: 0, frequency: 0, formulaScore: 0 };
              statsByCategory[muscle].volume += pSet.volume;
              statsByCategory[muscle].reps += pSet.reps;
              statsByCategory[muscle].frequency += 1;
            }
          }
        }

        sessionVolFormScore += exerciseVolFormScore;

        // Radar : formulaScore = somme par exercice (agrégation toujours somme)
        if (radF && isWithinRadarPeriod && exerciseRadFormScore > 0) {
          for (const muscle of getMuscleTags(exercise.category)) {
            if (!statsByCategory[muscle]) statsByCategory[muscle] = { volume: 0, reps: 0, frequency: 0, formulaScore: 0 };
            statsByCategory[muscle].formulaScore += exerciseRadFormScore;
          }
        }

        // Par exercice : perf score
        if (se.exerciseId === exerciseId) {
          hasPerfExercise = true;
          if (perfSectionMetric === '1rm') {
            const bestSet = processedSets.reduce(
              (best, cur) => cur.rm1 > best.rm1 ? cur : best,
              { weight: 0, reps: 0, rm1: 0, volume: 0, volScore: 0, radScore: 0, perfScore: 0 }
            );
            if (!sessionBest1RMSet || bestSet.rm1 > sessionBest1RMSet.rm1) sessionBest1RMSet = bestSet;
            if (bestSet.rm1 > perfSessionScore) perfSessionScore = bestSet.rm1;
          } else if (perF) {
            const topSets = [...processedSets].sort((a, b) => b.perfScore - a.perfScore).slice(0, setsCount);
            let score = 0;
            if (perF.aggregator === 'sum') score = topSets.reduce((s, p) => s + p.perfScore, 0);
            else if (perF.aggregator === 'max') score = Math.max(...topSets.map(p => p.perfScore), 0);
            else if (perF.aggregator === 'avg') { const sum = topSets.reduce((s, p) => s + p.perfScore, 0); score = topSets.length > 0 ? sum / topSets.length : 0; }
            if (score > perfSessionScore) { perfSessionScore = score; sessionTopSets = topSets; }
          } else {
            const topSets = [...processedSets].sort((a, b) => b.volume - a.volume).slice(0, setsCount);
            const score = topSets.reduce((s, p) => s + p.volume, 0);
            if (score > perfSessionScore) { perfSessionScore = score; sessionTopSets = topSets; }
          }
        }
      }

      sStats.push({ date: sessionDate, volume: sessionTotalVolume, reps: sessionTotalReps });

      const groupDate = volumePeriod === 'day'
        ? startOfDay(sessionDate)
        : volumePeriod === 'week'
          ? startOfWeek(sessionDate, { weekStartsOn: 1 })
          : startOfMonth(sessionDate);
      const groupKey = format(groupDate, 'yyyy-MM-dd');
      const sessionValue = volF ? sessionVolFormScore : (volumeSectionMetric === 'reps' ? sessionTotalReps : sessionTotalVolume);
      volumeGroups[groupKey] = (volumeGroups[groupKey] || 0) + sessionValue;

      if (hasPerfExercise && perfSessionScore > 0) {
        pChartData.push({ date: format(sessionDate, 'dd MMM', { locale: fr }), Score: Math.round(perfSessionScore * 10) / 10 });
        if (perfSessionScore > bestRecordScore) {
          bestRecordScore = perfSessionScore;
          bestRecordDate = format(sessionDate, 'dd MMM yyyy', { locale: fr });
          bestRecordUnit = perfSectionMetric === '1rm' || perfSectionMetric === 'charge'
            ? 'kg' : perF?.showUnit && perF.unit ? perF.unit : '';
          bestRecordSetsBreakdown = perfSectionMetric === '1rm' && sessionBest1RMSet
            ? [{ weight: sessionBest1RMSet.weight, reps: sessionBest1RMSet.reps }]
            : sessionTopSets.map(s => ({ weight: s.weight, reps: s.reps }));
        }
      }
    }

    const gVolData = Object.entries(volumeGroups)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dateStr, val]) => ({
        date: volumePeriod === 'day'
          ? format(new Date(dateStr), 'dd MMM', { locale: fr })
          : volumePeriod === 'week'
            ? `Sem. ${format(new Date(dateStr), 'dd MMM', { locale: fr })}`
            : format(new Date(dateStr), 'MMMM', { locale: fr }),
        Value: val,
      }));

    const radarData = Object.entries(statsByCategory).map(([muscle, stats]) => ({ muscle, ...stats }));

    return {
      sessionStats: sStats,
      globalVolumeData: gVolData,
      perfChartData: pChartData,
      muscleData: radarData,
      personalRecord: bestRecordScore > 0
        ? { score: Math.round(bestRecordScore * 10) / 10, date: bestRecordDate, breakdown: bestRecordSetsBreakdown, unit: bestRecordUnit }
        : null,
      volumeFormula: volF,
      radarFormula: radF,
      perfFormula: perF,
    };
  }, [allSessions, allSessionExercises, allSets, exercises, volumePeriod, volumeSectionMetric, radarSectionMetric, perfSectionMetric, exerciseId, setsCount, userWeight, weightUnit, radarPeriod, customFormulas]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-bg-alt">
        <div>
          <h2 className="text-2xl font-bold text-primary">Statistiques</h2>
          <p className="text-secondary mt-1">Votre tableau de bord de progression.</p>
        </div>
        <div className="flex items-center gap-3">
          <Weight className="text-accent" size={20} />
          <div className="flex flex-col">
            <label className="text-xs font-bold text-secondary uppercase tracking-wider">Votre Poids (BW)</label>
            <div className="flex items-center gap-1">
              <input 
                type="number" 
                value={userWeight || ''}
                onChange={handleUserWeightChange}
                className="w-16 bg-bg-alt border border-accent-light/50 rounded-lg px-2 py-1 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent font-semibold text-center"
                step="0.5"
              />
              <span className="text-sm font-bold text-secondary">kg</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-10">
        <TrainingCalendar sessionStats={sessionStats} metric={volumeSectionMetric === 'reps' ? 'reps' : 'volume'} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Bloc: Volume Global */}
          <div className="col-span-1 md:col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-accent-light/30">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                <TrendingUp size={20} className="text-accent" />
                Par séance
              </h3>
              <div className="flex gap-2">
                <select
                  value={volumeSectionMetric}
                  onChange={(e) => setVolumeSectionMetric(e.target.value)}
                  className="bg-bg-alt border border-accent-light/50 rounded-xl px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent font-semibold cursor-pointer"
                >
                  <option value="volume">Volume (kg)</option>
                  <option value="reps">Répétitions</option>
                  {volumeEfficacyFormulas.length > 0 && (
                    <optgroup label="Formules Lab">
                      {volumeEfficacyFormulas.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <select 
                  value={volumePeriod}
                  onChange={(e) => setVolumePeriod(e.target.value as 'day' | 'week' | 'month')}
                  className="bg-bg-alt border border-accent-light/50 rounded-xl px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent font-semibold cursor-pointer"
                >
                  <option value="day">Par jour</option>
                  <option value="week">Par semaine</option>
                  <option value="month">Par mois</option>
                </select>
              </div>
            </div>
            
            <div className="h-[250px] w-full">
              {globalVolumeData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-secondary">Aucune donnée.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={globalVolumeData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-bg-alt)" vertical={false} />
                    <XAxis dataKey="date" stroke="var(--theme-secondary)" tick={{ fill: 'var(--theme-secondary)', fontSize: 12, dy: 6 }} axisLine={false} tickLine={{ stroke: 'var(--theme-secondary)', strokeWidth: 1 }} />
                    <YAxis stroke="var(--theme-secondary)" tick={{ fill: 'var(--theme-secondary)', fontSize: 12 }} axisLine={{ stroke: 'var(--theme-bg-alt)', strokeWidth: 1 }} tickLine={{ stroke: 'var(--theme-bg-alt)', strokeWidth: 1 }} tickCount={6} width={56} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--theme-primary)', borderRadius: '12px', border: 'none', color: 'var(--theme-bg-alt)' }}
                      itemStyle={{ color: 'var(--theme-accent-light)', fontWeight: 'bold' }}
                      cursor={{ stroke: 'var(--theme-bg-alt)', strokeWidth: 2, strokeDasharray: '3 3' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="Value" 
                      stroke="var(--theme-accent)" 
                      strokeWidth={4}
                      dot={{ fill: 'var(--theme-accent)', strokeWidth: 2, r: 4, stroke: '#fff' }}
                      activeDot={{ r: 7, stroke: 'var(--theme-bg-alt)', strokeWidth: 2 }}
                      name={volumeFormula ? volumeFormula.name : volumeSectionMetric === 'reps' ? 'Répétitions' : 'Volume (kg)'}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Bloc: Performances et Records (Fusion) */}
          <div className="col-span-1 md:col-span-3 bg-white rounded-2xl shadow-sm border border-accent-light/30 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-accent-light/30 flex justify-between flex-wrap gap-4 items-center bg-bg-alt/20">
              <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                <Target size={20} className="text-accent" />
                Par exercice
              </h3>
              <div className="flex gap-2 flex-wrap">
                <select 
                  value={exerciseId || ''}
                  onChange={(e) => setExerciseId(Number(e.target.value))}
                  className="bg-white border border-accent-light/50 rounded-xl px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent font-semibold cursor-pointer shadow-sm"
                >
                  <option value="" disabled>Exercice</option>
                  {exercises?.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                </select>

                <select
                  value={perfSectionMetric}
                  onChange={(e) => updatePerfMetric(e.target.value)}
                  className="bg-white border border-accent-light/50 rounded-xl px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent font-semibold cursor-pointer shadow-sm"
                >
                  <option value="charge">Charge pure</option>
                  <option value="1rm">1RM estimé</option>
                  {perfEfficacyFormulas.length > 0 && (
                    <optgroup label="Formules Lab">
                      {perfEfficacyFormulas.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>

                {(perfSectionMetric === 'charge' || !!perfFormula) && (
                  <select
                    value={setsCount}
                    onChange={(e) => setSetsCount(Number(e.target.value))}
                    className="bg-white border border-accent-light/50 rounded-xl px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent font-semibold cursor-pointer shadow-sm"
                  >
                    {[1, 2, 3, 4, 5].map(n => (
                      <option key={n} value={n}>{n} meilleure{n > 1 ? 's' : ''} série{n > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 flex-1 min-h-[300px]">
              {/* Évolution Graphique (2/3) */}
              <div className="col-span-2 p-6 border-r border-accent-light/30">
                {perfChartData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-secondary text-center p-4">
                    <p>Pas assez de données pour cet exercice.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={perfChartData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-bg-alt)" vertical={false} />
                      <XAxis dataKey="date" stroke="var(--theme-secondary)" tick={{ fill: 'var(--theme-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis stroke="var(--theme-secondary)" tick={{ fill: 'var(--theme-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--theme-primary)', borderRadius: '12px', border: 'none', color: 'var(--theme-bg-alt)' }}
                        itemStyle={{ color: 'var(--theme-accent-light)', fontWeight: 'bold' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="Score" 
                        stroke="var(--theme-secondary)" 
                        strokeWidth={4}
                        dot={{ fill: 'var(--theme-secondary)', strokeWidth: 2, r: 5, stroke: '#fff' }}
                        activeDot={{ r: 7, stroke: 'var(--theme-bg-alt)', strokeWidth: 2 }}
                        name={perfSectionMetric === '1rm' ? '1RM (kg)' : perfSectionMetric === 'charge' ? 'Volume cumulé (kg)' : (perfFormula?.name || 'Score Lab')}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Records (1/3) */}
              <div className="col-span-1 bg-secondary p-6 text-white flex flex-col justify-center">
                <h3 className="text-lg font-bold text-accent-light mb-6 flex items-center justify-center gap-2">
                  <Medal size={20} /> Record Personnel
                </h3>
                {personalRecord ? (
                  <div className="flex flex-col items-center">
                    <p className="text-bg-alt text-sm mb-2 text-center">
                      {perfSectionMetric === '1rm' ? 'Meilleur 1RM' : perfSectionMetric === 'charge' ? `Score (${setsCount} meilleure${setsCount > 1 ? 's' : ''} série${setsCount > 1 ? 's' : ''})` : 'Score Lab Maximum'}
                    </p>
                    <p className="text-5xl font-bold text-center text-accent-light mb-6 drop-shadow-md">
                      {personalRecord.score} {personalRecord.unit && <span className="text-2xl">{personalRecord.unit}</span>}
                    </p>
                    <div className="w-full bg-secondary/50 p-4 rounded-xl border border-secondary">
                      <p className="text-xs text-bg-alt mb-3 font-bold uppercase tracking-wider text-center">
                        Le {personalRecord.date}
                      </p>
                      <ul className="text-sm space-y-2">
                        {personalRecord.breakdown.map((s, idx) => (
                          <li key={idx} className="flex justify-between items-center border-b border-bg-alt/10 pb-1 last:border-0 last:pb-0">
                            <span className="text-bg-alt/80">Série {idx + 1}</span>
                            <span className="font-bold text-accent-light">{s.weight} kg × {s.reps}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-bg-alt/50 text-sm text-center">
                    Aucun record trouvé.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bloc: Répartition musculaire */}
          <div className="col-span-1 md:col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-accent-light/30 flex flex-col md:flex-row items-center gap-8">
            <div className="md:w-1/3">
              <h3 className="text-lg font-bold text-primary mb-2">Répartition Musculaire</h3>
              <p className="text-secondary text-sm mb-4">Visualisez la répartition de vos efforts par groupe musculaire sur l'ensemble de vos séances.</p>
              <div className="flex flex-col gap-2">
                <select 
                  value={radarPeriod}
                  onChange={(e) => setRadarPeriod(e.target.value as 'day' | 'week' | 'month' | 'year' | 'all')}
                  className="bg-bg-alt border border-accent-light/50 rounded-xl px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent font-semibold cursor-pointer w-full"
                >
                  <option value="day">Aujourd'hui</option>
                  <option value="week">Cette semaine</option>
                  <option value="month">Ce mois-ci</option>
                  <option value="year">Cette année</option>
                  <option value="all">Tout le temps</option>
                </select>

                <select
                  value={radarSectionMetric}
                  onChange={(e) => setRadarSectionMetric(e.target.value)}
                  className="bg-bg-alt border border-accent-light/50 rounded-xl px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent font-semibold cursor-pointer w-full"
                >
                  <option value="volume">Volume soulevé (kg)</option>
                  <option value="frequency">Fréquence (Nb de séries)</option>
                  <option value="reps">Nombre de Répétitions</option>
                  {volumeEfficacyFormulas.length > 0 && (
                    <optgroup label="Formules Lab">
                      {volumeEfficacyFormulas.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            </div>
            <div className="h-[300px] w-full md:w-2/3">
              {muscleData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-secondary">Aucune donnée.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={muscleData}>
                    <PolarGrid stroke="var(--theme-accent-light)" />
                    <PolarAngleAxis dataKey="muscle" tick={{ fill: 'var(--theme-primary)', fontSize: 12, fontWeight: 'bold' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                    <Radar
                      name={radarFormula ? radarFormula.name : (radarSectionMetric === 'volume' ? 'Volume (kg)' : radarSectionMetric === 'frequency' ? 'Séries' : 'Répétitions')}
                      dataKey={radarFormula ? 'formulaScore' : radarSectionMetric}
                      stroke="var(--theme-accent)"
                      fill="var(--theme-accent)"
                      fillOpacity={0.5}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--theme-primary)', borderRadius: '12px', border: 'none', color: 'var(--theme-bg-alt)' }}
                      itemStyle={{ color: 'var(--theme-accent-light)', fontWeight: 'bold' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
