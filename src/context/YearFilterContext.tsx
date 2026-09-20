import React, { createContext, useContext, useState } from 'react';

interface YearFilterState {
  year: number;
  setYear: (year: number) => void;
}

const YearFilterContext = createContext<YearFilterState | undefined>(undefined);

export function YearFilterProvider({ children }: { children: React.ReactNode }) {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  return (
    <YearFilterContext.Provider value={{ year, setYear }}>
      {children}
    </YearFilterContext.Provider>
  );
}

export function useYearFilter(): YearFilterState {
  const ctx = useContext(YearFilterContext);
  if (!ctx) throw new Error('useYearFilter must be used within YearFilterProvider');
  return ctx;
}
