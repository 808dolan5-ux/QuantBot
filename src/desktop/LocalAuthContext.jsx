// Desktop build only (swapped in for @/lib/AuthContext): one trader on this PC, always signed in, no account needed
import React, { createContext, useContext, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext();
const noop = () => {};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => { base44.auth.me().then(setUser); }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: true,
      isLoadingAuth: !user,
      isLoadingPublicSettings: false,
      authError: null,
      appPublicSettings: null,
      authChecked: !!user,
      logout: noop,
      navigateToLogin: noop,
      checkUserAuth: noop,
      checkAppState: noop,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);