import { createContext, useContext, useState, type ReactNode } from 'react';

interface InvestorModeContextType {
  investorMode: boolean;
  toggleInvestorMode: () => void;
}

const InvestorModeContext = createContext<InvestorModeContextType>({
  investorMode: false,
  toggleInvestorMode: () => {},
});

export function InvestorModeProvider({ children }: { children: ReactNode }) {
  const [investorMode, setInvestorMode] = useState(() => {
    return localStorage.getItem('listhq_investor_mode') === 'true';
  });

  const toggleInvestorMode = () => {
    setInvestorMode(prev => {
      const next = !prev;
      localStorage.setItem('listhq_investor_mode', String(next));
      return next;
    });
  };

  return (
    <InvestorModeContext.Provider value={{ investorMode, toggleInvestorMode }}>
      {children}
    </InvestorModeContext.Provider>
  );
}

export function useInvestorMode() {
  return useContext(InvestorModeContext);
}
