"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";

type ActiveMathField = HTMLElement | null;

type MathContextType = {
  activeMathField: ActiveMathField;
  setActiveMathField: (field: ActiveMathField) => void;
};

const MathContext = createContext<MathContextType | null>(null);

export function MathProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [activeMathField, setActiveMathField] =
    useState<ActiveMathField>(null);

  const value = useMemo(
    () => ({
      activeMathField,
      setActiveMathField,
    }),
    [activeMathField]
  );

  return (
    <MathContext.Provider value={value}>
      {children}
    </MathContext.Provider>
  );
}

export function useMathContext() {
  const context = useContext(MathContext);

  if (!context) {
    throw new Error(
      "useMathContext must be used inside MathProvider"
    );
  }

  return context;
}