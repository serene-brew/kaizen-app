import { Client, Account, ID, OAuthProvider, AppwriteException, Functions, Databases } from 'react-native-appwrite';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

const APPWRITE_PROJECT_ID = Constants.expoConfig?.extra?.appwriteProjectId;
const APPWRITE_ENDPOINT = Constants.expoConfig?.extra?.appwriteEndpoint;
const APPWRITE_GOOGLE_VERIFY_FUNCTION_ID = Constants.expoConfig?.extra?.appwriteGoogleVerifyFunctionId as string; // Read the function ID

if (!APPWRITE_PROJECT_ID || !APPWRITE_ENDPOINT || !APPWRITE_GOOGLE_VERIFY_FUNCTION_ID) { // Check if function ID is loaded
  throw new Error('Missing Appwrite configuration (Project ID, Endpoint, or Google Verify Function ID).');
}

// Initialize client
const client = new Client();

// Basic client configuration
client
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

// Initialize account
const account = new Account(client);

// Initialize Functions
const functions = new Functions(client);

// Initialize Databases
const databases = new Databases(client);

// Auth service functions
export const authService = {
  // Send verification code via email
  async sendOTP(email: string) {
    try {
      // Generate a unique user ID for this token request
      const userId = ID.unique();
      
      // Create the email verification token
      const token = await account.createEmailToken(userId, email, true);
      
      // Return the token information for verification
      return {
        userId: token.userId,
        secret: token.secret,
        expires: token.expire
      };
    } catch (error) {
      console.error('OTP sending error:', error);
      throw error;
    }
  },  
  
  // Verify OTP code
  async verifyEmailToken(userId: string, secret: string, code: string, name?: string) {
    try {
      // Create a session after successful verification
      const session = await account.createSession(userId, code);
      console.log('Session created with ID:', session.$id); // Log the session ID
      
      // If name is provided, update the user's name
      if (name) {
        await account.updateName(name);
      }

      // Get user info after verification
      const user = await account.get();
      
      return { session, user };
    } catch (error) {
      console.error('Email token verification error:', error);
      
      if (typeof error === 'object' && error !== null && 'code' in error) {
        if ((error as any).code === 401) {
          throw new Error('Invalid or expired verification code');
        }
      }
      
      throw error;
    }
  },

  // Check if there's a valid session
  async checkSession() {
    try {
      // First check if there's an active session
      const session = await account.getSession('current');
      // Then verify the user exists
      const user = await account.get();
      return { isValid: true, user };
    } catch (error) {
      return { isValid: false, user: null };
    }
  },

  // --- Function to call the Appwrite Function for Google Auth ---
  async verifyGoogleTokenAndGetSessionSecret(idToken: string): Promise<{ userId: string; secret: string }> {
    console.log('[Appwrite] Calling verifyGoogleToken function to get session secret...');
    try {
      // Use the function ID from the environment variable
      const result = await functions.createExecution(APPWRITE_GOOGLE_VERIFY_FUNCTION_ID, JSON.stringify({ idToken }), false);

      if (result.status === 'completed' && result.responseBody) {
        console.log('[Appwrite] Function execution successful.');
        const response = JSON.parse(result.responseBody);
        if (response.success && response.userId && response.secret) {
          // The function returns the userId and secret
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

  // Logout
  async logout() {
    try {
      await account.deleteSession('current');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

};

export { client, account, databases }; // Export account, databases and client
