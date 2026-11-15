import React from 'react';

export const TableSkeleton = ({ rows = 5, cols = 6 }) => {
  return (
    <div className="w-full animate-pulse space-y-3">
      {/* Header skeleton */}
      <div className="h-10 bg-slate-100 rounded-xl" />
      {/* Rows skeleton */}
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="h-14 bg-slate-50 rounded-xl flex items-center px-4 gap-4 border border-slate-100">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <div
              key={cIdx}
              className="h-4 bg-slate-200 rounded"
              style={{ width: `${Math.max(40, 100 / cols)}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton = () => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse space-y-3 shadow-xs">
      <div className="flex justify-between items-center">
        <div className="h-3 w-24 bg-slate-200 rounded" />
        <div className="h-8 w-8 bg-slate-100 rounded-lg" />
      </div>
      <div className="h-8 w-16 bg-slate-200 rounded" />
      <div className="h-3 w-32 bg-slate-100 rounded" />
    </div>
  );
};
