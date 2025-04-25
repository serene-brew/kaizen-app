import { Client, Account, ID, OAuthProvider } from 'react-native-appwrite';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const APPWRITE_PROJECT_ID = Constants.expoConfig?.extra?.appwriteProjectId;
const APPWRITE_ENDPOINT = Constants.expoConfig?.extra?.appwriteEndpoint;

if (!APPWRITE_PROJECT_ID || !APPWRITE_ENDPOINT) {
  throw new Error('Missing Appwrite configuration.');
}

// Initialize client
const client = new Client();

// Basic client configuration
client
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

// Initialize account
const account = new Account(client);

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

  // OAuth2 login with Google
  async loginWithGoogle() {
    try {
      return account.createOAuth2Session(
        OAuthProvider.Google,
        'kaizen://callback',
        'kaizen://failure',
        ['profile', 'email']
      );
    } catch (error: any) {
      console.error('Google OAuth error:', error);
      if (error.type === 'user_invalid_credentials') {
        throw new Error('Google authentication failed');
      }
      throw new Error('Failed to authenticate with Google');
    }
  },

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

export { client };
