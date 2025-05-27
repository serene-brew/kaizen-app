// React core hooks for state management and component lifecycle
import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";

// Appwrite authentication services and models
import { authService, account } from '../lib/appwrite'; // Import account
import { Models } from 'appwrite';

// React Native and Expo utilities for user interaction and authentication
import { Alert } from 'react-native'; // Import Alert
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri, useAuthRequest } from 'expo-auth-session';
import Constants from 'expo-constants'; // Import Constants

// Application contexts for data synchronization
import { useWatchlist } from '../contexts/WatchlistContext';
import { useWatchHistory } from '../contexts/WatchHistoryContext';

// AsyncStorage for local cache management
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * TypeScript Interfaces
 * 
 * Type definitions for user data and authentication states to ensure
 * type safety throughout the authentication system.
 */
// Extended user interface from Appwrite with preferences
interface User extends Models.User<Models.Preferences> {}

// OTP information structure for email verification workflow
interface OTPInfo {
  userId: string;     // Appwrite user ID for verification
  email: string;      // Email address where OTP was sent
  secret: string;     // Secret token for OTP verification
  expiresAt: Date;    // Expiration timestamp for security
  name?: string;      // Optional name field for user registration
}

/**
 * Global Context Interface
 * 
 * Comprehensive authentication context that provides:
 * - Authentication state management (login/logout status)
 * - User profile data and loading states
 * - Multiple authentication methods (OTP, Google OAuth)
 * - OTP workflow management for email verification
 * - Centralized auth functions accessible app-wide
 */
interface GlobalContextType {
  isLogged: boolean;                        // Current authentication status
  setIsLogged: (value: boolean) => void;    // Authentication state setter
  user: User | null;                        // Current user profile data
  setUser: (user: User | null) => void;     // User profile setter
  loading: boolean;                         // Global loading state for auth operations
  signUp: (email: string, name: string) => Promise<OTPInfo>;     // Registration with OTP
  signIn: (email: string) => Promise<OTPInfo>;                   // Login with OTP
  signInWithGoogle: () => Promise<void>;                         // Google OAuth authentication
  logout: () => Promise<void>;                                   // Logout with cache clearing
  sendOTP: (email: string, name?: string) => Promise<OTPInfo>;   // Send verification code
  verifyOTP: (code: string) => Promise<void>;                    // Verify OTP code
  otpInfo: OTPInfo | null;                                       // Current OTP session data
  setOtpInfo: (info: OTPInfo | null) => void;                    // OTP session setter
}

// Create the global authentication context
const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

/**
 * Global Context Hook
 * 
 * Custom hook to access the global authentication context with error handling.
 * Ensures the hook is only used within the GlobalProvider scope.
 * 
 * @returns GlobalContextType - The complete authentication context
 * @throws Error if used outside of GlobalProvider
 */
export const useGlobalContext = () => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error('useGlobalContext must be used within a GlobalProvider');
  }
  return context;
};

// Provider component props interface
interface GlobalProviderProps {
  children: ReactNode;
}

/**
 * GlobalProvider Component
 * 
 * The central authentication provider that manages:
 * - User authentication state across the entire application
 * - Multiple authentication methods (OTP via email, Google OAuth)
 * - Automatic session validation and restoration on app startup
 * - Data synchronization with watchlist and watch history contexts
 * - Comprehensive cache management during login/logout operations
 * - Google OAuth integration with proper token handling
 * - OTP workflow management for secure email verification
 * - Loading states and error handling for all auth operations
 * 
 * Architecture Benefits:
 * - Centralized authentication logic prevents duplication
 * - Automatic data sync ensures consistency across features
 * - Robust session management with proper cleanup
 * - Multiple auth methods provide user choice and flexibility
 * - Comprehensive error handling and user feedback
 */
// Ensure the browser closes after auth
const GlobalProvider = ({ children }: GlobalProviderProps) => {
  // Core authentication state management
  const [isLogged, setIsLogged] = useState(false);        // Authentication status
  const [user, setUser] = useState<User | null>(null);    // User profile data
  const [loading, setLoading] = useState(true);           // Global loading state
  const [otpInfo, setOtpInfo] = useState<OTPInfo | null>(null); // OTP session data
  
  // Access contexts for data synchronization after authentication
  const watchlistContext = useWatchlist();
  const watchHistoryContext = useWatchHistory();
  
  // Note: Data sync is handled through manual calls to prevent circular dependencies
  // between authentication and feature contexts

  /**
   * Google OAuth Configuration
   * 
   * Sets up Google authentication with proper client IDs for each platform.
   * Reads configuration from environment variables through Expo Constants.
   * Validates configuration and sets up redirect URI for OAuth flow.
   */
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

  /**
   * Initial Authentication Check Effect
   * 
   * Performs one-time authentication validation on app startup.
   * Checks for existing valid sessions and restores user state.
   * Uses ref to prevent duplicate checks during component lifecycle.
   */
  useEffect(() => {
    // Check auth status only once on initial mount
    if (!initialAuthCheckCompleted.current) {
      checkAuth();
    }
  }, []);
  
  /**
   * Data Synchronization Effect
   * 
   * Monitors authentication state changes and triggers data refresh.
   * Syncs watchlist and watch history when user successfully logs in.
   * Prevents duplicate sync operations during auth state transitions.
   */
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

  /**
   * Google OAuth Response Handler Effect
   * 
   * Processes Google authentication responses and handles different scenarios:
   * - Success: Verifies token with backend and creates Appwrite session
   * - Error: Displays appropriate error messages to user
   * - Cancel: Handles user cancellation gracefully without errors
   * 
   * Includes comprehensive error handling and user feedback.
   */
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
  
  /**
   * Authentication Status Check Function
   * 
   * Validates existing user sessions and restores authentication state.
   * Uses improved session verification that checks both session validity and user data.
   * Prevents duplicate checks during the app lifecycle.
   */
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

  /**
   * User Registration Function
   * 
   * Initiates the sign-up process using email-based OTP verification.
   * Sends verification code to user's email and stores session data.
   * Includes name parameter for account creation during verification.
   * 
   * @param email - User's email address for account creation
   * @param name - User's display name for the account
   * @returns Promise<OTPInfo> - OTP session data for verification
   */
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

  /**
   * OTP Sending Function
   * 
   * Sends one-time password to specified email address.
   * Can be used for both sign-up and sign-in workflows.
   * Stores OTP session data for subsequent verification.
   * 
   * @param email - Email address to send OTP to
   * @param name - Optional name for registration context
   * @returns Promise<OTPInfo> - OTP session data
   */
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

  /**
   * OTP Verification Function
   * 
   * Verifies the user-provided OTP code and completes authentication.
   * Handles both sign-up (with account creation) and sign-in scenarios.
   * Triggers data synchronization after successful verification.
   * Includes comprehensive error handling and state management.
   * 
   * @param code - User-provided verification code
   */
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

  /**
   * User Sign-In Function
   * 
   * Initiates the login process for existing users using email-based OTP.
   * Sends verification code to user's email for secure authentication.
   * Similar to signUp but without account creation context.
   * 
   * @param email - User's registered email address
   * @returns Promise<OTPInfo> - OTP session data for verification
   */
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

  /**
   * Google OAuth Sign-In Function
   * 
   * Initiates Google OAuth authentication flow.
   * Uses Expo's authentication session to handle the OAuth dance.
   * The actual response processing is handled by the useEffect hook.
   * 
   * @returns Promise<void> - Resolves when prompt is initiated
   */
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

  /**
   * User Logout Function
   * 
   * Comprehensive logout process that includes:
   * - Immediate UI state updates for better perceived performance
   * - Parallel execution of cache clearing and Appwrite logout
   * - Data context cleanup to ensure fresh state on next login
   * - Robust error handling to ensure logout completion even on failures
   * - Complete app cache clearing for security and privacy
   */
  const logout = async () => {
    setLoading(true);
    try {
      console.log('Starting logout process...');
      // Mark user state update as in progress to prevent redundant operations
      userStateUpdateInProgress.current = true;
      
      // 1. First, update UI state immediately for better perceived performance
      setUser(null);
      setIsLogged(false);
      
      // 2. Start cache clearing immediately, in parallel with Appwrite logout
      const cacheClearPromise = clearAppCache();
      
      // 3. Perform Appwrite logout
      console.log('Calling Appwrite logout...');
      const logoutPromise = authService.logout();
      
      // 4. Wait for both operations to complete
      await Promise.all([cacheClearPromise, logoutPromise]);
      
      // 5. Final cleanup: ensure watchlist and watch history are refreshed after logout
      if (watchlistContext && watchlistContext.refreshWatchlist) {
        console.log('Refreshing watchlist after logout to ensure clean state');
        await watchlistContext.refreshWatchlist();
      }
      
      if (watchHistoryContext && watchHistoryContext.refreshWatchHistory) {
        console.log('Refreshing watch history after logout to ensure clean state');
        await watchHistoryContext.refreshWatchHistory();
      }
      
      console.log('Logout process complete');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, we still want to log the user out locally
      // This ensures the UI updates appropriately
      setUser(null);
      setIsLogged(false);
    } finally {
      setLoading(false);
      userStateUpdateInProgress.current = false;
    }
  };
  
  /**
   * App Cache Clearing Function
   * 
   * Comprehensive cache management for logout and privacy:
   * - Clears all search-related cached data
   * - Removes anime data caches (details, trending, top lists)
   * - Cleans user-specific preferences and settings
   * - Preserves download files for offline viewing
   * - Handles AsyncStorage errors gracefully with fallback clearing
   * - Coordinates with data contexts for complete cleanup
   */
  // Function to clear app cache when logged out
  const clearAppCache = async () => {
    console.log('Clearing app cache data...');
    try {
      // First, ensure watchlist and watch history are cleared through their contexts
      // This handles both local state and cloud data synchronization

      // Clear watch history (if context is available)
      if (watchHistoryContext && watchHistoryContext.refreshWatchHistory) {
        console.log('Clearing watch history cache...');
        await watchHistoryContext.refreshWatchHistory();
      }
      
      // Clear watchlist (if context is available)
      if (watchlistContext && watchlistContext.refreshWatchlist) {
        console.log('Clearing watchlist cache...');
        await watchlistContext.refreshWatchlist();
      }
      
      // Clear search-related caches from AsyncStorage
      const searchCacheKeys = [
        'search_results_cache',     // Search results from API
        'search_params_cache',      // Search parameters (query, genres)
        'recent_searches'           // User's recent search terms
      ];
      
      // Clear anime data-related caches
      const animeDataCacheKeys = [
        'anime_details_cache',      // Detailed anime information
        'trending_anime_cache',     // Trending anime listings
        'top_anime_cache',          // Top anime listings
        'seasonal_anime_cache',     // Seasonal anime if implemented
        'carousel_anime_cache',     // Featured/carousel anime
        'related_anime_cache'       // Related anime recommendations
      ];
      
      // Clear user-specific data
      const userDataCacheKeys = [
        'user_preferences',         // User preferences/settings
        'last_view_position',       // Saved view positions outside of watch history
        'playback_settings',        // Video player settings if stored separately
        'filter_preferences',       // User's filter preferences for search/browse
        'last_selected_tabs'        // Remember last selected tabs if implemented
      ];
      
      // Get all storage keys for thorough cleaning
      // Note: We exclude the downloads storage key to preserve downloaded files
      try {
        const allStorageKeys = await AsyncStorage.getAllKeys();
        const additionalKeys = allStorageKeys.filter(key => 
          // Keep the downloads key (preserve downloaded files)
          key !== '@kaizen_downloads' && 
          // Filter out keys already in our lists
          !searchCacheKeys.includes(key) && 
          !animeDataCacheKeys.includes(key) && 
          !userDataCacheKeys.includes(key) &&
          // Additional exclusions you might want to add
          !key.includes('download') && // Skip anything download related
          // Add more exclusions if needed
          true
        );
        
        // Combine all cache keys for removal
        const allCacheKeys = [
          ...searchCacheKeys, 
          ...animeDataCacheKeys, 
          ...userDataCacheKeys,
          ...additionalKeys
        ];
        
        console.log(`Clearing ${allCacheKeys.length} app cache items...`);
        await Promise.all(allCacheKeys.map(key => AsyncStorage.removeItem(key)));
        
        console.log('App cache cleared successfully');
      } catch (storageError) {
        console.error('Error accessing all storage keys:', storageError);
        // Fall back to clearing just our known keys
        const fallbackKeys = [...searchCacheKeys, ...animeDataCacheKeys, ...userDataCacheKeys];
        console.log(`Falling back to clearing ${fallbackKeys.length} known cache keys...`);
        await Promise.all(fallbackKeys.map(key => AsyncStorage.removeItem(key)));
      }
    } catch (error) {
      console.error('Error clearing app cache:', error);
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
