import React from 'react';

export const StatsCard = ({ title, value, icon: Icon, changeText, color = 'indigo' }) => {
  const colorMap = {
    indigo: {
      bg: 'bg-indigo-50 border-indigo-200 text-indigo-600',
      badge: 'text-indigo-700 bg-indigo-50',
    },
    amber: {
      bg: 'bg-amber-50 border-amber-200 text-amber-600',
      badge: 'text-amber-700 bg-amber-50',
    },
    emerald: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-600',
      badge: 'text-emerald-700 bg-emerald-50',
    },
    rose: {
      bg: 'bg-rose-50 border-rose-200 text-rose-600',
      badge: 'text-rose-700 bg-rose-50',
    },
    cyan: {
      bg: 'bg-cyan-50 border-cyan-200 text-cyan-600',
      badge: 'text-cyan-700 bg-cyan-50',
    },
    teal: {
      bg: 'bg-teal-50 border-teal-200 text-teal-600',
      badge: 'text-teal-700 bg-teal-50',
    },
  };

  const scheme = colorMap[color] || colorMap.indigo;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        <div className={`p-2 rounded-xl border ${scheme.bg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
          {value !== undefined && value !== null ? value : 0}
        </span>
      </div>
      {changeText && (
        <p className="mt-1 text-xs text-slate-500 truncate">
          {changeText}
        </p>
      )}
    </div>
  );
};
