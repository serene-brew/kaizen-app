import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authService } from '../lib/appwrite';
import { Models } from 'appwrite';

interface User extends Models.User<Models.Preferences> {}

interface OTPInfo {
  userId: string;
  email: string;
  secret: string;
  expiresAt: Date;
  name?: string; // Name field for user registration
}

interface GlobalContextType {
  isLogged: boolean;
  setIsLogged: (value: boolean) => void;
  user: User | null;
  setUser: (user: User | null) => void;
  loading: boolean;
  signUp: (email: string, name: string) => Promise<OTPInfo>;
  signIn: (email: string) => Promise<OTPInfo>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  sendOTP: (email: string, name?: string) => Promise<OTPInfo>;
  verifyOTP: (code: string) => Promise<void>;
  otpInfo: OTPInfo | null;
  setOtpInfo: (info: OTPInfo | null) => void;
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
  const [otpInfo, setOtpInfo] = useState<OTPInfo | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Use improved session check that verifies both session and user
      const { isValid, user } = await authService.checkSession();
      
      if (isValid && user) {
        setUser(user);
        setIsLogged(true);
      } else {
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

  const signUp = async (email: string, name: string) => {
    setLoading(true);
    try {      
      // Send OTP first - using email token authentication as primary method
      const tokenResult = await authService.sendOTP(email);
      
      // Calculate expiration time
      const expirationTime = new Date();
      if (tokenResult.expires) {
        expirationTime.setTime(new Date(tokenResult.expires).getTime());
      } else {
        // Default to 10 minutes if no expiry provided
        expirationTime.setMinutes(expirationTime.getMinutes() + 10);
      }
      
      // Store OTP info for verification, including name for account creation
      const otpData = {
        userId: tokenResult.userId,
        secret: tokenResult.secret,
        email: email,
        expiresAt: expirationTime,
        name: name // Store name to be used during verification
      };
      
      // Set the OTP info
      setOtpInfo(otpData);
      
      return otpData;
      
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const sendOTP = async (email: string, name?: string) => {
    setLoading(true);
    try {
      // Create an email token (OTP)
      const tokenResult = await authService.sendOTP(email);
      
      // Calculate expiration time
      const expirationTime = new Date();
      if (tokenResult.expires) {
        expirationTime.setTime(new Date(tokenResult.expires).getTime());
      } else {
        // Default to 10 minutes if no expiry provided
        expirationTime.setMinutes(expirationTime.getMinutes() + 10);
      }
      
      // Store OTP info for verification
      const otpData = {
        userId: tokenResult.userId,
        secret: tokenResult.secret,
        email: email,
        expiresAt: expirationTime,
        name: name // Include name if provided
      };
      
      setOtpInfo(otpData);
      return otpData;
    } catch (error) {
      console.error('Send OTP error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (code: string) => {
    setLoading(true);
    try {
      if (!otpInfo) {
        throw new Error('Missing OTP information. Please request a new verification code.');
      }
      
      // Extract token information for verification
      const { userId, secret, name } = otpInfo;
      
      // Pass the verification code and name if available
      const { user } = await authService.verifyEmailToken(userId, secret, code, name);
      
      // Update user state after successful verification
      setUser(user);
      setIsLogged(true);
      
      // Clear OTP info now that it's been used
      setOtpInfo(null);
    } catch (error) {
      console.error('OTP verification error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string) => {
    setLoading(true);
    try {
      // Send OTP for login
      const tokenResult = await authService.sendOTP(email);
      
      // Calculate expiration time
      const expirationTime = new Date();
      if (tokenResult.expires) {
        expirationTime.setTime(new Date(tokenResult.expires).getTime());
      } else {
        // Default to 10 minutes if no expiry provided
        expirationTime.setMinutes(expirationTime.getMinutes() + 10);
      }
      
      // Store OTP info for verification
      const otpData = {
        userId: tokenResult.userId,
        secret: tokenResult.secret,
        email: email,
        expiresAt: expirationTime
      };
      
      // Set the OTP info
      setOtpInfo(otpData);
      
      return otpData;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
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
    } catch (error) {
      console.error('Google sign in error:', error);
      throw error;
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
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
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
        sendOTP,
        verifyOTP,
        otpInfo,
        setOtpInfo,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export default GlobalProvider;
