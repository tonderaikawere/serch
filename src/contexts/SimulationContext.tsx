import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface SimulationState {
  seoScore: number;
  aeoScore: number;
  completedLessons: string[];
  currentScenario: string | null;
  totalTraffic: number;
  indexedPages: number;
  crawledPages: number;
}

interface SimulationContextType extends SimulationState {
  updateSeoScore: (score: number) => void;
  updateAeoScore: (score: number) => void;
  completeLesson: (lessonId: string) => void;
  setScenario: (scenario: string) => void;
  updateTraffic: (traffic: number) => void;
  updateIndexedPages: (count: number) => void;
  resetSimulation: () => void;
}

const defaultState: SimulationState = {
  seoScore: 0,
  aeoScore: 0,
  completedLessons: [],
  currentScenario: null,
  totalTraffic: 0,
  indexedPages: 0,
  crawledPages: 0,
};

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SimulationState>(() => {
    const saved = localStorage.getItem("simulation-state");
    return saved ? JSON.parse(saved) : defaultState;
  });

  useEffect(() => {
    localStorage.setItem("simulation-state", JSON.stringify(state));
  }, [state]);

  const updateSeoScore = (score: number) => {
    setState(prev => ({ ...prev, seoScore: Math.min(100, Math.max(0, score)) }));
  };

  const updateAeoScore = (score: number) => {
    setState(prev => ({ ...prev, aeoScore: Math.min(100, Math.max(0, score)) }));
  };

  const completeLesson = (lessonId: string) => {
    setState(prev => {
      if (prev.completedLessons.includes(lessonId)) return prev;
      return { ...prev, completedLessons: [...prev.completedLessons, lessonId] };
    });
  };

  const setScenario = (scenario: string) => {
    setState(prev => ({ ...prev, currentScenario: scenario }));
  };

  const updateTraffic = (traffic: number) => {
    setState(prev => ({ ...prev, totalTraffic: traffic }));
  };

  const updateIndexedPages = (count: number) => {
    setState(prev => ({ ...prev, indexedPages: count }));
  };

  const resetSimulation = () => {
    setState(defaultState);
    localStorage.removeItem("simulation-state");
  };

  return (
    <SimulationContext.Provider value={{
      ...state,
      updateSeoScore,
      updateAeoScore,
      completeLesson,
      setScenario,
      updateTraffic,
      updateIndexedPages,
      resetSimulation,
    }}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const context = useContext(SimulationContext);
  if (context === undefined) {
    throw new Error("useSimulation must be used within a SimulationProvider");
  }
  return context;
}
