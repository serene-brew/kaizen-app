import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authService, account } from '../lib/appwrite'; // Import account
import { Models } from 'appwrite';
import { Alert } from 'react-native'; // Import Alert
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri, useAuthRequest } from 'expo-auth-session';
import Constants from 'expo-constants'; // Import Constants

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
  signInWithGoogle: () => Promise<void>; // Changed return type
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

// Ensure the browser closes after auth
WebBrowser.maybeCompleteAuthSession();

const GlobalProvider = ({ children }: GlobalProviderProps) => {
  const [isLogged, setIsLogged] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [otpInfo, setOtpInfo] = useState<OTPInfo | null>(null);

  // --- ADD Google Auth Request Hook ---
  // Read Google Client IDs from app config (loaded from .env)
  const googleClientIdWeb = Constants.expoConfig?.extra?.googleClientIdWeb as string;
  const googleClientIdAndroid = Constants.expoConfig?.extra?.googleClientIdAndroid as string;
  const googleClientIdIos = Constants.expoConfig?.extra?.googleClientIdIos as string;

  // Check if Client IDs are loaded
  if (!googleClientIdWeb || !googleClientIdAndroid || !googleClientIdIos) {
    console.error("Missing Google Client ID configuration in app.config.ts or .env");
    // Optionally, throw an error or handle this case appropriately
    // For now, we log an error. The useAuthRequest might fail later.
  }

  // Generate the redirect URI based on your app's scheme
  const redirectUri = makeRedirectUri({
    scheme: 'kaizen', // Your app's scheme from app.config.ts
    path: 'auth/callback', // <-- CHANGE THIS LINE to match app.config.ts
  });
  console.log("Using Redirect URI:", redirectUri); // Log the URI to add it in Google Console

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: googleClientIdWeb,
    androidClientId: googleClientIdAndroid,
    iosClientId: googleClientIdIos,
    scopes: ['profile', 'email'], // Request basic profile info and email
//     // redirectUri: redirectUri, // <-- RE-ADD this line
  });
  // --- END Google Auth Request Hook ---

  useEffect(() => {
    checkAuth();
  }, []);

  // --- ADD useEffect to handle Google Auth Response ---
  useEffect(() => {
    const handleGoogleResponse = async () => {
      if (response?.type === 'success') {
        setLoading(true);
        const { authentication } = response;
        if (authentication?.idToken) {
          console.log('Google Auth Success - Received ID Token.');
          try {
            // Call the Appwrite service function that triggers the backend function
            // This function now returns { userId, secret }
            const { userId, secret } = await authService.verifyGoogleTokenAndGetSessionSecret(authentication.idToken);

            // Use the userId and secret to create a session on the client
            console.log('[Appwrite] Creating session with token...');
            const session = await account.createSession(userId, secret); // Use createSession instead
            console.log('[Appwrite] Session created successfully with token.');

            // Fetch user data after session creation
            const appwriteUser = await account.get();

            if (appwriteUser) {
              console.log('Appwrite session verified/created successfully. User:', appwriteUser.$id);
              setUser(appwriteUser);
              setIsLogged(true);
              console.log('GlobalProvider: setIsLogged(true) called. isLogged should now be true.'); // <-- Added log
            } else {
               throw new Error('Appwrite session created, but failed to get user data.');
            }
          } catch (error) {
            console.error('Error verifying token/creating session with Appwrite:', error);
            Alert.alert('Authentication Failed', error instanceof Error ? error.message : 'Could not link Google account to Appwrite.');
            setUser(null);
            setIsLogged(false);
          } finally {
            setLoading(false);
          }
        } else {
          console.warn('Google Auth Success but no ID Token received.');
          Alert.alert('Authentication Failed', 'Could not retrieve necessary information from Google.');
          setLoading(false);
        }
      } else if (response?.type === 'error') {
        console.error('Google Auth Error:', response.error);
        Alert.alert('Authentication Failed', response.error?.message || 'Google authentication failed.');
        setLoading(false);
      } else if (response?.type === 'cancel') {
         console.log('Google Auth Cancelled by user.');
         // No need to show an error, user intentionally cancelled
         setLoading(false);
      }
    };

    handleGoogleResponse();
  }, [response]); // Re-run when the auth response changes
  // --- END useEffect for Google Auth Response ---

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

  const signInWithGoogle = async (): Promise<void> => { // Changed return type
    setLoading(true); // Set loading true when starting the process
    try {
      // promptAsync initiates the browser flow
      await promptAsync();
      // The result is handled by the useEffect hook monitoring 'response'
      // We set loading false within that hook after processing
    } catch (error) {
      console.error('Error initiating Google prompt:', error);
      Alert.alert('Error', 'Could not start Google sign-in process.');
      setLoading(false); // Ensure loading is false if prompt fails immediately
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
        signInWithGoogle, // Pass the updated function
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
