"use client";

import { createContext, useContext, useMemo, useState, type Dispatch, type SetStateAction } from "react";

type DisabledAppModulesContextValue = {
  disabledAppModules: string[];
  setDisabledAppModules: Dispatch<SetStateAction<string[]>>;
};

const DisabledAppModulesContext = createContext<DisabledAppModulesContextValue | null>(null);

export function DisabledAppModulesProvider({
  initial,
  children,
}: {
  initial: string[];
  children: React.ReactNode;
}) {
  const [disabledAppModules, setDisabledAppModules] = useState(() => [...initial]);
  const value = useMemo(
    () => ({ disabledAppModules, setDisabledAppModules }),
    [disabledAppModules]
  );
  return <DisabledAppModulesContext.Provider value={value}>{children}</DisabledAppModulesContext.Provider>;
}

export function useDisabledAppModules(): DisabledAppModulesContextValue | null {
  return useContext(DisabledAppModulesContext);
}
