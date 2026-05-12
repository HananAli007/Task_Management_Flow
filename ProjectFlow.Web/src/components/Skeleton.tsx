import React from 'react';

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={`skeleton ${className}`} />
);

export const SkeletonBoard = () => (
  <div className="flex gap-6 overflow-x-auto pb-4 h-full">
    {[1, 2, 3, 4].map((col) => (
      <div key={col} className="w-80 flex-shrink-0 flex flex-col space-y-4">
        <div className="flex items-center justify-between px-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((card) => (
            <div key={card} className="glass-card p-4 space-y-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex justify-between items-center pt-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonTable = () => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <Skeleton className="h-10 w-64 rounded-xl" />
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24 rounded-xl" />
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
    </div>
    <div className="glass-card overflow-hidden">
      <div className="border-b border-white/5 p-4 bg-white/[0.02]">
        <div className="grid grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-4 w-20" />)}
        </div>
      </div>
      {[1, 2, 3, 4, 5].map((row) => (
        <div key={row} className="p-4 border-b border-white/5 grid grid-cols-5 gap-4 items-center">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonDashboard = () => (
  <div className="space-y-8 animate-in fade-in">
    <div className="space-y-2">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map(i => (
        <Skeleton key={i} className="h-32 rounded-2xl" />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <Skeleton className="lg:col-span-2 h-[400px] rounded-2xl" />
      <Skeleton className="h-[400px] rounded-2xl" />
    </div>
  </div>
);

export const SkeletonLogs = () => (
  <div className="space-y-8 animate-in fade-in duration-700">
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="flex gap-3 w-full md:w-auto">
        <Skeleton className="h-11 w-64 rounded-xl" />
        <Skeleton className="h-11 w-11 rounded-xl" />
      </div>
    </div>
    
    <div className="flex gap-2 overflow-x-auto pb-2">
      {[1, 2, 3, 4, 5].map(i => (
        <Skeleton key={i} className="h-10 w-28 rounded-xl flex-shrink-0" />
      ))}
    </div>

    <div className="glass-card overflow-hidden">
      <div className="border-b border-white/5 p-4 bg-white/[0.02]">
        <div className="grid grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-4 w-20" />)}
        </div>
      </div>
      {[1, 2, 3, 4, 5, 6, 7, 8].map(row => (
        <div key={row} className="p-4 border-b border-white/5 grid grid-cols-6 gap-4 items-center">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-24" />
          <div className="flex justify-end">
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  </div>
);
