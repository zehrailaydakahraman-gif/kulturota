import { Filter, Library, Landmark } from 'lucide-react';
import type { FilterType } from '../types';

interface MapFilterProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  counts: { all: number; museum: number; library: number };
}

const filters: { key: FilterType; label: string; icon: typeof Filter }[] = [
  { key: 'all', label: 'Tümü', icon: Filter },
  { key: 'museum', label: 'Müzeler', icon: Landmark },
  { key: 'library', label: 'Kütüphaneler', icon: Library },
];

export default function MapFilter({ activeFilter, onFilterChange, counts }: MapFilterProps) {
  return (
    <div className="absolute top-4 left-14 z-[1000] flex gap-1.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-1.5 border border-slate-200/60 dark:border-slate-700/60 shadow-lg shadow-black/5">
      {filters.map(({ key, label, icon: Icon }) => {
        const isActive = activeFilter === key;
        const count = counts[key];
        return (
          <button
            key={key}
            onClick={() => onFilterChange(key)}
            className={`
              flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-300
              ${isActive
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 scale-[1.02]'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }
            `}
            title={`${label} (${count})`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
            <span className={`
              text-xs px-1.5 py-0.5 rounded-full min-w-[1.5rem] text-center
              ${isActive
                ? 'bg-white/20 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }
            `}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
