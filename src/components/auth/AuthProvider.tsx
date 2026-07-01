import { type ReactNode } from 'react';
import { AuthContext, useAuthProviderState } from '../../hooks/useAuth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useAuthProviderState();

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}