// filepath: /home/risersama/projects/kaizen-app/lib/appwrite.ts

// Appwrite SDK imports for React Native authentication and database operations
import { Client, Account, ID, OAuthProvider, AppwriteException, Functions, Databases } from 'react-native-appwrite';

// React Native utilities for platform detection and cross-platform compatibility
import { Platform } from 'react-native';

// Expo utilities for environment configuration and external browser integration
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

/**
 * Environment Configuration
 * 
 * Retrieves Appwrite configuration from environment variables:
 * - APPWRITE_PROJECT_ID: Unique identifier for the Appwrite project
 * - APPWRITE_ENDPOINT: Base URL for the Appwrite backend service
 * - APPWRITE_GOOGLE_VERIFY_FUNCTION_ID: Function ID for Google OAuth verification
 * 
 * All configuration is loaded through Expo Constants from app.config.ts
 * which reads from environment variables for security and flexibility.
 */
const APPWRITE_PROJECT_ID = Constants.expoConfig?.extra?.appwriteProjectId;
const APPWRITE_ENDPOINT = Constants.expoConfig?.extra?.appwriteEndpoint;
const APPWRITE_GOOGLE_VERIFY_FUNCTION_ID = Constants.expoConfig?.extra?.appwriteGoogleVerifyFunctionId as string; // Read the function ID

// Validate that all required configuration is present - fail fast if misconfigured
if (!APPWRITE_PROJECT_ID || !APPWRITE_ENDPOINT || !APPWRITE_GOOGLE_VERIFY_FUNCTION_ID) { // Check if function ID is loaded
  throw new Error('Missing Appwrite configuration (Project ID, Endpoint, or Google Verify Function ID).');
}

/**
 * Appwrite Client Initialization
 * 
 * Creates and configures the main Appwrite client with:
 * - Backend endpoint URL for API communication
 * - Project ID for resource scoping and security
 * - Cross-platform compatibility for iOS, Android, and web
 */
// Initialize client
const client = new Client();

// Basic client configuration
client
  .setEndpoint(APPWRITE_ENDPOINT)    // Set the backend URL
  .setProject(APPWRITE_PROJECT_ID);  // Set the project identifier

/**
 * Service Initialization
 * 
 * Creates service instances for different Appwrite functionalities:
 * - Account: User authentication and profile management
 * - Functions: Server-side function execution for complex operations
 * - Databases: Document database operations for app data storage
 */
// Initialize account service for authentication operations
const account = new Account(client);

// Initialize Functions service for server-side operations
const functions = new Functions(client);

// Initialize Databases service for data storage operations
const databases = new Databases(client);

/**
 * Authentication Service
 * 
 * Comprehensive authentication service providing multiple authentication methods:
 * 
 * **OTP Authentication:**
 * - Email-based verification with secure token generation
 * - Session creation after successful code verification
 * - User profile management with name updates
 * 
 * **Google OAuth:**
 * - Token verification through Appwrite Functions
 * - Server-side security validation
 * - Session creation with provider credentials
 * 
 * **Session Management:**
 * - Session validation and restoration
 * - Comprehensive logout with cleanup
 * - Multi-session management for security
 * 
 * **Error Handling:**
 * - Detailed error logging for debugging
 * - User-friendly error messages
 * - Graceful fallback for failed operations
 */
// Auth service functions
export const authService = {
  /**
   * Send OTP Function
   * 
   * Initiates email-based authentication by sending a verification code:
   * - Generates unique user ID for the authentication session
   * - Creates email token with specified validity period
   * - Returns session data for subsequent verification
   * - Handles rate limiting and email delivery errors
   * 
   * @param email - User's email address for verification
   * @returns Promise<{userId: string, secret: string, expires: string}> - Token data for verification
   * @throws Error on email sending failures or rate limiting
   */
  // Send verification code via email
  async sendOTP(email: string) {
    try {
      // Generate a unique user ID for this token request
      const userId = ID.unique();
      
      // Create the email verification token with phone fallback enabled
      const token = await account.createEmailToken(userId, email, true);
      
      // Return the token information for verification
      return {
        userId: token.userId,    // User ID for session creation
        secret: token.secret,    // Secret token for verification
        expires: token.expire    // Expiration timestamp for security
      };
    } catch (error) {
      console.error('OTP sending error:', error);
      throw error;
    }
  },  
  
  /**
   * Verify Email Token Function
   * 
   * Completes email-based authentication by verifying the user's code:
   * - Creates authenticated session using the verification code
   * - Updates user profile with provided name (for registration)
   * - Retrieves complete user data after successful verification
   * - Provides specific error messages for common failure scenarios
   * 
   * @param userId - User ID from the OTP generation
   * @param secret - Secret token from the OTP generation
   * @param code - User-provided verification code
   * @param name - Optional name for new user accounts
   * @returns Promise<{session: Models.Session, user: Models.User}> - Session and user data
   * @throws Error with specific messages for invalid/expired codes
   */
  // Verify OTP code
  async verifyEmailToken(userId: string, secret: string, code: string, name?: string) {
    try {
      // Create a session after successful verification
      const session = await account.createSession(userId, code);
      console.log('Session created with ID:', session.$id); // Log the session ID
      
      // If name is provided, update the user's name (for new registrations)
      if (name) {
        await account.updateName(name);
      }

      // Get user info after verification to return complete user data
      const user = await account.get();
      
      return { session, user };
    } catch (error) {
      console.error('Email token verification error:', error);
      
      // Provide specific error messages for common scenarios
      if (typeof error === 'object' && error !== null && 'code' in error) {
        if ((error as any).code === 401) {
          throw new Error('Invalid or expired verification code');
        }
      }
      
      throw error;
    }
  },

  /**
   * Session Validation Function
   * 
   * Checks for existing valid authentication sessions:
   * - Validates current session with Appwrite backend
   * - Retrieves user data if session is valid
   * - Returns validation status and user data
   * - Handles expired or invalid sessions gracefully
   * 
   * Used for:
   * - App startup authentication restoration
   * - Session persistence across app restarts
   * - Authentication state validation
   * 
   * @returns Promise<{isValid: boolean, user: Models.User | null}> - Session status and user data
   */
  // Check if there's a valid session
  async checkSession() {
    try {
      // First check if there's an active session
      const session = await account.getSession('current');
      // Then verify the user exists and data is accessible
      const user = await account.get();
      return { isValid: true, user };
    } catch (error) {
      // Return false for any session validation errors (expired, invalid, etc.)
      return { isValid: false, user: null };
    }
  },

  /**
   * Google OAuth Verification Function
   * 
   * Processes Google OAuth tokens through Appwrite Functions for secure verification:
   * - Sends ID token to server-side function for validation
   * - Verifies token authenticity with Google's servers
   * - Creates user account or links existing account
   * - Returns session credentials for client-side session creation
   * 
   * Architecture Benefits:
   * - Server-side token validation prevents client-side token manipulation
   * - Secure handling of sensitive OAuth credentials
   * - Centralized OAuth logic for consistency and security
   * - Proper error handling for OAuth-specific failures
   * 
   * @param idToken - Google ID token from OAuth flow
   * @returns Promise<{userId: string, secret: string}> - Session creation credentials
   * @throws Error on token validation failures or function execution errors
   */
  // --- Function to call the Appwrite Function for Google Auth ---
  async verifyGoogleTokenAndGetSessionSecret(idToken: string): Promise<{ userId: string; secret: string }> {
    console.log('[Appwrite] Calling verifyGoogleToken function to get session secret...');
    try {
      // Execute the Appwrite Function with the Google ID token
      // Function performs server-side validation and user account management
      const result = await functions.createExecution(APPWRITE_GOOGLE_VERIFY_FUNCTION_ID, JSON.stringify({ idToken }), false);

      if (result.status === 'completed' && result.responseBody) {
        console.log('[Appwrite] Function execution successful.');
        const response = JSON.parse(result.responseBody);
        if (response.success && response.userId && response.secret) {
          // The function returns the userId and secret for client session creation
          return { userId: response.userId, secret: response.secret };
        } else {
          throw new Error(response.error || 'Appwrite function failed to return userId and secret.');
        }
      } else {
        console.error('[Appwrite] Function execution failed:', result);
        const errorDetails = result.responseBody ? `: ${result.responseBody}` : '';
        throw new Error(`Appwrite function execution failed with status: ${result.status}${errorDetails}`);
      }
    } catch (error) {
      console.error('[Appwrite] Error calling verifyGoogleToken function:', error);
      if (error instanceof AppwriteException) {
         throw new Error(`Appwrite function error: ${error.message} (Code: ${error.code})`);
      }
      throw error;
    }
  },
  // --- END Function ---

  /**
   * Logout Function
   * 
   * Comprehensive logout process with thorough session cleanup:
   * - Immediately deletes current session for instant logout
   * - Attempts to delete all user sessions for complete security
   * - Handles partial failures gracefully without blocking logout
   * - Provides detailed logging for debugging authentication issues
   * 
   * Security Benefits:
   * - Prevents session reuse after logout
   * - Clears all device sessions for complete security
   * - Immediate logout even if comprehensive cleanup fails
   * - Protects against session hijacking scenarios
   * 
   * @throws Error on critical logout failures (current session deletion)
   */
  // Logout
  async logout() {
    try {
      // Delete current session first for immediate logout
      await account.deleteSession('current');
      
      try {
        // For a more thorough cleanup, attempt to delete all sessions
        // This prevents stale sessions from existing on the server
        // Wrapped in try-catch to avoid blocking logout if this fails
        await account.deleteSessions();
      } catch (sessionsError) {
        console.log('Could not delete all sessions, but logout proceeded:', sessionsError);
      }
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

};

// Export configured services for use throughout the application
export { client, account, databases }; // Export account, databases and client
