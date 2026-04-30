import { useMemo } from 'react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TrainingCalendarProps {
  sessionStats: { date: Date; volume: number; reps: number }[];
  metric: 'volume' | 'reps';
}

export default function TrainingCalendar({ sessionStats, metric }: TrainingCalendarProps) {
  const { weeks, monthLabels, maxVal, columns } = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(currentYear, 11, 31);
    
    const start = startOfWeek(startDate, { weekStartsOn: 1 });
    
    const diffTime = endDate.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const cols = Math.ceil((diffDays + 1) / 7);

    const weeksArray: { days: { date: Date; value: number; isCurrentYear: boolean }[] }[] = [];
    const labels: { month: string; colIndex: number }[] = [];

    let currentDay = start;
    let lastMonth = -1;
    let maxV = 0;

    for (let col = 0; col < cols; col++) {
      const days = [];
      for (let row = 0; row < 7; row++) {
        const isCurrentYear = currentDay.getFullYear() === currentYear;
        const dayStats = sessionStats.filter(s => isSameDay(s.date, currentDay));
        const value = dayStats.reduce((sum, s) => sum + (metric === 'volume' ? s.volume : s.reps), 0);
        
        if (value > maxV) maxV = value;
        days.push({ date: currentDay, value, isCurrentYear });
        
        if (row === 0) {
          const month = currentDay.getMonth();
          if (month !== lastMonth && isCurrentYear) {
            labels.push({ month: format(currentDay, 'MMM', { locale: fr }), colIndex: col });
            lastMonth = month;
          }
        }
        currentDay = addDays(currentDay, 1);
      }
      weeksArray.push({ days });
    }

    return { weeks: weeksArray, monthLabels: labels, maxVal: maxV || 1, columns: cols };
  }, [sessionStats, metric]);

  const getColor = (value: number, isCurrentYear: boolean) => {
    if (!isCurrentYear) return 'bg-transparent';
    if (value === 0) return 'bg-bg-alt/50 border border-accent-light/20';
    const intensity = value / maxVal;
    if (intensity < 0.25) return 'bg-accent/40';
    if (intensity < 0.5) return 'bg-accent/60';
    if (intensity < 0.75) return 'bg-accent/80';
    return 'bg-accent';
  };

  return (
    <div className="w-full mb-8 bg-transparent px-2 md:px-8">
      <div className="flex flex-col w-full">
        <div className="flex text-xs font-semibold text-secondary mb-2 relative h-4 w-full pl-8">
          {monthLabels.map((label, i) => (
            <span key={i} className="absolute capitalize" style={{ left: `calc(2rem + ${(label.colIndex / columns) * 100}%)` }}>
              {label.month}
            </span>
          ))}
        </div>
        
        <div className="flex gap-2 w-full items-stretch">
          <div className="flex flex-col text-[10px] font-bold text-secondary pr-2 justify-between shrink-0 py-1">
            <span>Lun</span>
            <span>Mer</span>
            <span>Ven</span>
          </div>
          
          <div className="grid gap-1 flex-1 w-full" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, aspectRatio: `${columns} / 7` }}>
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="grid grid-rows-7 gap-1 h-full w-full">
                {week.days.map((day, dayIdx) => (
                  <div
                    key={dayIdx}
                    title={day.isCurrentYear ? `${day.value} ${metric === 'volume' ? 'kg' : 'reps'} le ${format(day.date, 'dd MMM yyyy', { locale: fr })}` : ''}
                    className={`w-full h-full rounded-[2px] transition-all ${day.isCurrentYear ? 'hover:scale-110 hover:ring-2 hover:ring-accent-light z-10' : ''} ${getColor(day.value, day.isCurrentYear)}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
