import { Client, Account, ID, OAuthProvider } from 'react-native-appwrite';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const APPWRITE_PROJECT_ID = Constants.expoConfig?.extra?.appwriteProjectId;
const APPWRITE_ENDPOINT = Constants.expoConfig?.extra?.appwriteEndpoint;

if (!APPWRITE_PROJECT_ID || !APPWRITE_ENDPOINT) {
  throw new Error('Missing Appwrite configuration.');
}

// Log configuration for debugging
console.log('Appwrite Config:', {
  endpoint: APPWRITE_ENDPOINT,
  projectId: APPWRITE_PROJECT_ID,
  env: __DEV__ ? 'development' : 'production',
});

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
      console.log('Creating account for:', email);
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
        console.log('No existing session to clear');
      }

      const user = await account.create(
        ID.unique(),
        email,
        password,
        name
      );
      
      console.log('Account created successfully');
      
      // Create new session
      const session = await account.createEmailPasswordSession(email, password);
      console.log('Session created for new account');
      
      return { user, session };
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

  // Login with email
  async login(email: string, password: string) {
    try {
      console.log('Logging in user:', email);
      const session = await account.createEmailPasswordSession(email, password);
      const user = await account.get();
      console.log('Login successful');
      return { session, user };
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 401) {
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
      console.log('Session check failed:', error);
      return { isValid: false, user: null };
    }
  },

  // OAuth2 login with Google
  async loginWithGoogle() {
    try {
      console.log('Initiating Google OAuth login');
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
      console.log('No active session found');
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

  // Updated delete account method
  async deleteAccount() {
    try {
      console.log('Deleting account...');
      
      // Get current user to verify permissions
      const user = await account.get();
      console.log('Current user:', user.$id);

      // Delete all sessions
      await account.deleteSessions();
      console.log('All sessions deleted');

      // Clean up local state
      console.log('Account sessions cleared');
    } catch (error) {
      console.error('Delete account error:', error);
      throw error;
    }
  },
};

export { client };
