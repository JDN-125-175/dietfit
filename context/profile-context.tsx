import React, { createContext, useContext, useRef, useCallback } from "react";

type ProfileGuard = {
  hasUnsavedChanges: () => boolean;
  setChecker: (fn: () => boolean) => void;
};

const ProfileContext = createContext<ProfileGuard>({
  hasUnsavedChanges: () => false,
  setChecker: () => {},
});

export function ProfileGuardProvider({ children }: { children: React.ReactNode }) {
  const checkerRef = useRef<() => boolean>(() => false);

  const setChecker = useCallback((fn: () => boolean) => {
    checkerRef.current = fn;
  }, []);

  const hasUnsavedChanges = useCallback(() => {
    return checkerRef.current();
  }, []);

  return (
    <ProfileContext.Provider value={{ hasUnsavedChanges, setChecker }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfileGuard() {
  return useContext(ProfileContext);
}
