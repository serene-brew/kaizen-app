import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authService } from '../lib/appwrite';
import { Models } from 'appwrite';

interface User extends Models.User<Models.Preferences> {}

interface GlobalContextType {
  isLogged: boolean;
  setIsLogged: (value: boolean) => void;
  user: User | null;
  setUser: (user: User | null) => void;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const useGlobalContext = () => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error('useGlobalContext must be used within a GlobalProvider');
  }
  return context;
};

interface GlobalProviderProps {
  children: ReactNode;
}

const GlobalProvider = ({ children }: GlobalProviderProps) => {
  const [isLogged, setIsLogged] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      console.log('Checking authentication status...');
      // Use improved session check that verifies both session and user
      const { isValid, user } = await authService.checkSession();
      
      if (isValid && user) {
        console.log('Valid session found, user is logged in');
        setUser(user);
        setIsLogged(true);
      } else {
        console.log('No valid session found, user is logged out');
        setUser(null);
        setIsLogged(false);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
      setIsLogged(false);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      const { user } = await authService.createAccount(email, password, name);
      setUser(user);
      setIsLogged(true);
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { user } = await authService.login(email, password);
      setUser(user);
      setIsLogged(true);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      await authService.loginWithGoogle();
      const user = await authService.getCurrentUser();
      setUser(user);
      setIsLogged(true);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authService.logout();
      setUser(null);
      setIsLogged(false);
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async () => {
    setLoading(true);
    try {
      await authService.deleteAccount();
      // After successful deletion, update local state
      setUser(null);
      setIsLogged(false);
    } catch (error) {
      console.error('Delete account error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlobalContext.Provider
      value={{
        isLogged,
        setIsLogged,
        user,
        setUser,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        logout,
        deleteAccount,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export default GlobalProvider;
