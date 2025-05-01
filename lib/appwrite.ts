import { Client, Account, ID, OAuthProvider, AppwriteException, Functions } from 'react-native-appwrite';
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

// Auth service functions
export const authService = {
  // Create account with email
  async createAccount(email: string, password: string, name: string) {
    try {
      // Validate email format
      if (!email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }

      // Validate password
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      // Try to clear any existing session first
      try {
        await account.deleteSession('current');
      } catch (error) {
        // Ignore error if no session exists
      }

      // Generate a unique ID using the ID utility from appwrite
      const userId = ID.unique();
      
      // Create the user account
      const user = await account.create(
        userId,
        email,
        password,
        name
      );
      
      return { user };
    } catch (error: any) {
      console.error('Account creation error:', error);
      // Handle specific Appwrite errors
      if (error.type === 'user_already_exists') {
        throw new Error('An account with this email already exists');
      }
      if (error.code === 400) {
        throw new Error('Invalid email or password format');
      }
      throw error;
    }
  },

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

  // Login with email
  async login(email: string, password: string) {
    try {
      const session = await account.createEmailPasswordSession(email, password);
      const user = await account.get();
      return { session, user };
    } catch (error: unknown) {
      console.error('Login error:', error);
      if (typeof error === 'object' && error !== null && 'code' in error && (error as {code: number}).code === 401) {
        throw new Error('Invalid email or password');
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

  // --- COMMENT OUT the old loginWithGoogle ---
  /*
  async loginWithGoogle() {
    console.log('[Appwrite] Attempting Google OAuth...');
    try {
      const successUrl = Linking.createURL('/(tabs)/explore'); // Original deep link
      const failureUrl = Linking.createURL('/(auth)/sign-in'); // Original deep link
      
      console.log(`[Appwrite] Success URL: ${successUrl}`);
      console.log(`[Appwrite] Failure URL: ${failureUrl}`);

      await account.createOAuth2Session(
        OAuthProvider.Google, 
        successUrl, // Redirect here on success
        failureUrl, // Redirect here on failure
        undefined,  // Scopes (optional, default is fine),
        {
          browserPackage: 'com.android.chrome' 
        }
      );
      
      console.log('[Appwrite] createOAuth2Session promise resolved. Browser launch initiated (or failed silently).');
      
    } catch (error) {
      console.error('[Appwrite] Google OAuth initiation error:', error);
      if (error instanceof Error && error.message.includes('canceled')) {
        console.log('Google OAuth flow cancelled by user.');
      } else if (error instanceof Error && error.message.includes('missing scope')) {
         throw new Error('Authentication setup error. Please contact support or check server configuration (Guest scope).');
      } else {
        throw new Error('Failed to start Google authentication.');
      }
    }
  },
  */
  // --- END COMMENT OUT ---

  // --- UPDATE function to call the Appwrite Function ---
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
  // --- END UPDATE function ---

  // Get current user
  async getCurrentUser() {
    try {
      const user = await account.get();
      return user;
    } catch (error) {
      throw error;
    }
  },

  // Logout
  async logout() {
    try {
      await account.deleteSession('current');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  // Delete account
  async deleteAccount() {
    try {
      // Get current user to verify permissions and get ID
      const user = await account.get();

      // Delete the user account itself
      await account.deleteIdentity(user.$id);

      // Delete all sessions
      await account.deleteSessions();
    } catch (error) {
      console.error('Delete account error:', error);
      throw error;
    }
  },
};

export { client, account }; // Export account along with client
