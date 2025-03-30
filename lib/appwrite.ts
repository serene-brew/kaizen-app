import { Client, Account } from 'react-native-appwrite';
import Constants from 'expo-constants';

// Access environment variables from expo-constants
const APPWRITE_PROJECT_ID = Constants.expoConfig?.extra?.appwriteProjectId;
const APPWRITE_ENDPOINT = Constants.expoConfig?.extra?.appwriteEndpoint;

if (!APPWRITE_PROJECT_ID || !APPWRITE_ENDPOINT) {
  throw new Error('Missing Appwrite configuration. Please check your environment variables.');
}

const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

export const account = new Account(client);
export { client };
