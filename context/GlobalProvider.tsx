import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { authService, account } from '../lib/appwrite'; // Import account
import { Models } from 'appwrite';
import { Alert } from 'react-native'; // Import Alert
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri, useAuthRequest } from 'expo-auth-session';
import Constants from 'expo-constants'; // Import Constants
import { useWatchlist } from '../contexts/WatchlistContext';
import { useWatchHistory } from '../contexts/WatchHistoryContext';

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
const GlobalProvider = ({ children }: GlobalProviderProps) => {
  const [isLogged, setIsLogged] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [otpInfo, setOtpInfo] = useState<OTPInfo | null>(null);
  
  // Access contexts for data synchronization
  const watchlistContext = useWatchlist();
  const watchHistoryContext = useWatchHistory();
  
  // We don't use these hooks directly in GlobalProvider to prevent circular dependencies
  // Data sync is now handled by the SyncManager component
  // We don't use these hooks directly in GlobalProvider to prevent circular dependencies
  // Data sync is now handled by the SyncManager component

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
    // Check auth status only once on initial mount
    if (!initialAuthCheckCompleted.current) {
      checkAuth();
    }
  }, []);
  
  // Effect to sync data when authentication state changes
  useEffect(() => {
    const syncDataAfterLogin = async () => {
      if (isLogged && user && !userStateUpdateInProgress.current) {
        console.log('GlobalProvider: User is logged in, syncing watchlist and watch history');
        try {
          // Refresh watchlist data
          if (watchlistContext && watchlistContext.refreshWatchlist) {
            console.log('GlobalProvider: Refreshing watchlist...');
            await watchlistContext.refreshWatchlist();
          }
          
          // Refresh watch history data
          if (watchHistoryContext && watchHistoryContext.refreshWatchHistory) {
            console.log('GlobalProvider: Refreshing watch history...');
            await watchHistoryContext.refreshWatchHistory();
          }
          
          console.log('GlobalProvider: Data sync complete');
        } catch (error) {
          console.error('GlobalProvider: Error syncing data:', error);
        }
      }
    };
    
    syncDataAfterLogin();
  }, [isLogged, user]);

  // --- ADD useEffect to handle Google Auth Response ---
  // Track if user state update is in progress to prevent duplicate auth state changes
  const userStateUpdateInProgress = useRef(false);

  useEffect(() => {
    const handleGoogleResponse = async () => {
      if (response?.type === 'success') {
        setLoading(true);
        const { authentication } = response;
        if (authentication?.idToken) {
          console.log('Google Auth Success - Received ID Token.');
          try {
            // Prevent duplicate state updates during the authentication process
            userStateUpdateInProgress.current = true;
            
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
              // Update user first, then auth state
              setUser(appwriteUser);
              // Update auth state last to trigger dependent effects just once
              setIsLogged(true);
              console.log('GlobalProvider: setIsLogged(true) called. isLogged should now be true.');
              
              // Manually sync data after Google sign-in
              console.log('Manually syncing data after Google sign-in');
              try {
                if (watchlistContext && watchlistContext.refreshWatchlist) {
                  await watchlistContext.refreshWatchlist();
                }
                if (watchHistoryContext && watchHistoryContext.refreshWatchHistory) {
                  await watchHistoryContext.refreshWatchHistory();
                }
              } catch (syncError) {
                console.error('Error syncing data after Google sign-in:', syncError);
              }
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
            userStateUpdateInProgress.current = false;
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

  // Use a ref to track initial auth check completion
  const initialAuthCheckCompleted = useRef(false);
  
  const checkAuth = async () => {
    // Avoid duplicate auth checks
    if (initialAuthCheckCompleted.current) return;
    
    try {
      console.log('Checking authentication status...');
      // Use improved session check that verifies both session and user
      const { isValid, user } = await authService.checkSession();
      
      if (isValid && user) {
        console.log(`Authentication valid, user: ${user.$id}`);
        // Set user first, then auth state to trigger effects in the right order
        setUser(user);
        setIsLogged(true);
        console.log('GlobalProvider: Authentication complete, user is logged in');
      } else {
        console.log('Authentication invalid or no user');
        setUser(null);
        setIsLogged(false);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
      setIsLogged(false);
    } finally {
      setLoading(false);
      initialAuthCheckCompleted.current = true;
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
      
      // Mark the auth process as in progress to avoid duplicate refreshes
      userStateUpdateInProgress.current = true;
      
      // Pass the verification code and name if available
      const { user } = await authService.verifyEmailToken(userId, secret, code, name);
      
      // First update user
      setUser(user);
      
      // Then update authentication state to trigger dependent effects just once
      console.log('OTP verification successful, updating authentication state');
      setIsLogged(true);
      
      // Manually sync data after successful verification
      console.log('Manually syncing data after OTP verification');
      try {
        if (watchlistContext && watchlistContext.refreshWatchlist) {
          await watchlistContext.refreshWatchlist();
        }
        if (watchHistoryContext && watchHistoryContext.refreshWatchHistory) {
          await watchHistoryContext.refreshWatchHistory();
        }
      } catch (syncError) {
        console.error('Error syncing data after OTP verification:', syncError);
      }
      
      // Clear OTP info now that it's been used
      setOtpInfo(null);
    } catch (error) {
      console.error('OTP verification error:', error);
      throw error;
    } finally {
      setLoading(false);
      userStateUpdateInProgress.current = false;
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
      
      // Mark user state update as in progress to prevent unnecessary sync operations
      userStateUpdateInProgress.current = true;
      
      // Update user and auth state
      setUser(null);
      setIsLogged(false);
      
      // Refresh watchlist to handle offline/local data properly
      if (watchlistContext && watchlistContext.refreshWatchlist) {
        console.log('Refreshing watchlist after logout to switch to local data');
        await watchlistContext.refreshWatchlist();
      }
      
      console.log('Logout complete');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    } finally {
      setLoading(false);
      userStateUpdateInProgress.current = false;
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
