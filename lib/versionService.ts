// React Native utilities for platform detection and external browser integration
import { Platform, Alert, Linking } from 'react-native';

// Expo constants for accessing app configuration and version information
import Constants from 'expo-constants';

/**
 * Version Service
 * 
 * Comprehensive version management service that provides:
 * - Automatic version checking against GitHub repository
 * - Semantic version comparison for update detection
 * - User-friendly update notifications with direct links
 * - Cross-platform browser launching for update downloads
 * - Error handling for network and API failures
 */

/**
 * GitHub API Configuration
 * 
 * Repository details for fetching the latest version information:
 * - REPO_OWNER: GitHub username/organization
 * - REPO_NAME: Repository name
 * - VERSION_API_URL: GitHub API endpoint for VERSION file content
 */
const REPO_OWNER = 'serene-brew';
const REPO_NAME = 'kaizen-app';
const VERSION_API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/VERSION?ref=main`;

/**
 * Version Comparison Utility
 * 
 * Compares two semantic version strings to determine if an update is available.
 * Supports version formats like "1.0.2", "1.10.5", etc.
 * 
 * Algorithm:
 * 1. Split versions into major.minor.patch components
 * 2. Compare each component numerically from left to right
 * 3. Return comparison result (-1: older, 0: same, 1: newer)
 * 
 * @param current - Current app version (e.g., "1.0.2")
 * @param latest - Latest available version (e.g., "1.0.3")
 * @returns boolean - true if latest > current, false otherwise
 */
function compareVersions(current: string, latest: string): boolean {
  // Clean and split versions into components
  const currentParts = current.trim().split('.').map(Number);
  const latestParts = latest.trim().split('.').map(Number);
  
  // Ensure both versions have the same number of components (pad with zeros)
  const maxLength = Math.max(currentParts.length, latestParts.length);
  
  // Pad shorter version with zeros
  while (currentParts.length < maxLength) currentParts.push(0);
  while (latestParts.length < maxLength) latestParts.push(0);
  
  // Compare each component from left to right
  for (let i = 0; i < maxLength; i++) {
    if (latestParts[i] > currentParts[i]) {
      return true; // Latest version is newer
    } else if (latestParts[i] < currentParts[i]) {
      return false; // Current version is newer (shouldn't happen in normal cases)
    }
    // Continue to next component if they're equal
  }
  
  // Versions are identical
  return false;
}

/**
 * GitHub API Response Interface
 * 
 * TypeScript interface for GitHub API content response structure.
 * Used for type safety when parsing the VERSION file response.
 */
interface GitHubContentResponse {
  content: string;      // Base64 encoded file content
  encoding: string;     // Content encoding type (should be "base64")
  name: string;         // File name ("VERSION")
  path: string;         // File path in repository
  sha: string;          // Git SHA hash of the file
  size: number;         // File size in bytes
  type: string;         // Content type ("file")
}

/**
 * Latest Version Fetcher
 * 
 * Fetches the latest version from GitHub repository's VERSION file.
 * Handles API errors and base64 decoding automatically.
 * 
 * Process:
 * 1. Fetch VERSION file content from GitHub API
 * 2. Decode base64 content to plain text
 * 3. Clean and return version string
 * 4. Handle network errors and API failures
 * 
 * @returns Promise<string | null> - Latest version string or null on error
 */
async function fetchLatestVersion(): Promise<string | null> {
  try {
    console.log('Fetching latest version from GitHub...');
    
    const response = await fetch(VERSION_API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Kaizen-App-Version-Checker'
      }
    });
    
    if (!response.ok) {
      console.error('GitHub API response not OK:', response.status, response.statusText);
      return null;
    }
    
    const data: GitHubContentResponse = await response.json();
    
    // Verify the response structure
    if (!data.content || data.encoding !== 'base64') {
      console.error('Invalid GitHub API response structure:', data);
      return null;
    }
    
    // Decode base64 content to get version string
    // React Native compatible base64 decoding
    let versionContent: string;
    try {
      // Try using built-in atob if available (React Native 0.64+)
      versionContent = atob(data.content);
    } catch (e) {
      // Fallback for older React Native versions
      try {
        // Try using Buffer if available (with react-native-buffer polyfill)
        const Buffer = require('buffer').Buffer;
        versionContent = Buffer.from(data.content, 'base64').toString('utf-8');
      } catch (bufferError) {
        // Manual base64 decoding as last resort
        console.error('Buffer not available, using manual base64 decode');
        const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        let result = '';
        let bits = 0;
        let bitsLength = 0;
        
        for (let i = 0; i < data.content.length; i++) {
          const char = data.content[i];
          if (char === '=') break;
          
          const charIndex = base64Chars.indexOf(char);
          if (charIndex === -1) continue;
          
          bits = (bits << 6) | charIndex;
          bitsLength += 6;
          
          if (bitsLength >= 8) {
            bitsLength -= 8;
            result += String.fromCharCode((bits >> bitsLength) & 0xFF);
          }
        }
        versionContent = result;
      }
    }
    
    const latestVersion = versionContent.trim();
    
    console.log('Latest version from GitHub:', latestVersion);
    return latestVersion;
    
  } catch (error) {
    console.error('Error fetching latest version:', error);
    return null;
  }
}

/**
 * Current Version Cache
 * 
 * Cache the current version to avoid repeated lookups and console logs
 */
let cachedCurrentVersion: string | null = null;

/**
 * Update Check State
 * 
 * Prevent multiple simultaneous update checks
 */
let isCheckingForUpdates: boolean = false;

/**
 * Current Version Getter
 * 
 * Retrieves the current app version from Expo configuration.
 * Falls back to package.json version if Expo config is unavailable.
 * Uses caching to prevent repeated console logs and lookups.
 * 
 * @returns string - Current app version
 */
function getCurrentVersion(): string {
  if (cachedCurrentVersion === null) {
    // Get version from Expo config (app.config.ts) only once
    cachedCurrentVersion = Constants.expoConfig?.version || '1.0.0';
    console.log('Current app version:', cachedCurrentVersion);
  }
  return cachedCurrentVersion;
}

/**
 * Update Alert Display
 * 
 * Shows a user-friendly alert when a new version is available.
 * Provides options to install now or dismiss the notification.
 * 
 * Features:
 * - Clear messaging about update availability
 * - Direct link to GitHub releases page
 * - Graceful handling of browser launch failures
 * - Non-blocking user experience (dismissible)
 * 
 * @param latestVersion - The newest available version string
 * @param currentVersion - The current app version string
 */
function showUpdateAlert(latestVersion: string, currentVersion: string): void {
  const releaseUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/tag/v${latestVersion}`;
  
  Alert.alert(
    '🎉 Good News!', // Title with emoji for visual appeal
    `A new update is available!\n\nNew Version: v${latestVersion}\nCurrent: v${currentVersion}\n\nWould you like to install the update now?`,
    [
      {
        text: 'Later',
        style: 'cancel',
        onPress: () => console.log('User dismissed update alert')
      },
      {
        text: 'Install',
        style: 'default',
        onPress: async () => {
          try {
            const canOpen = await Linking.canOpenURL(releaseUrl);
            if (canOpen) {
              await Linking.openURL(releaseUrl);
              console.log('Opened release URL:', releaseUrl);
            } else {
              // Fallback alert if can't open URL
              Alert.alert(
                'Update Available',
                `Please visit: ${releaseUrl}`,
                [{ text: 'OK', style: 'default' }]
              );
            }
          } catch (error) {
            console.error('Error opening release URL:', error);
            Alert.alert(
              'Update Available',
              `Please visit: ${releaseUrl}`,
              [{ text: 'OK', style: 'default' }]
            );
          }
        }
      }
    ],
    { 
      cancelable: true, // Allow dismissing by tapping outside
      onDismiss: () => console.log('Update alert dismissed')
    }
  );
}

/**
 * Main Version Check Function
 * 
 * Orchestrates the complete version checking process:
 * 1. Fetches latest version from GitHub
 * 2. Compares with current app version
 * 3. Shows update alert if newer version available
 * 4. Handles all errors gracefully without disrupting app flow
 * 
 * This function should be called during app initialization,
 * preferably in the main layout or welcome screen.
 * 
 * @param showNoUpdateMessage - Optional flag to show message when no update available
 */
export async function checkForUpdates(showNoUpdateMessage: boolean = false): Promise<void> {
  // Prevent multiple simultaneous checks
  if (isCheckingForUpdates) {
    console.log('Update check already in progress, skipping...');
    return;
  }

  try {
    isCheckingForUpdates = true;
    console.log('Starting version check process...');
    
    // Get current and latest versions
    const currentVersion = getCurrentVersion();
    const latestVersion = await fetchLatestVersion();
    
    // Handle fetch failure
    if (!latestVersion) {
      console.log('Could not fetch latest version, skipping update check');
      return;
    }
    
    // Compare versions
    const updateAvailable = compareVersions(currentVersion, latestVersion);
    
    if (updateAvailable) {
      console.log(`Update available: ${currentVersion} -> ${latestVersion}`);
      showUpdateAlert(latestVersion, currentVersion);
    } else {
      console.log('App is up to date');
      
      // Optionally show "no update" message (useful for manual checks)
      if (showNoUpdateMessage) {
        Alert.alert(
          'No Updates',
          'You are using the latest version of Kaizen!',
          [{ text: 'OK', style: 'default' }]
        );
      }
    }
    
  } catch (error) {
    console.error('Error in version check process:', error);
    // Silently fail to avoid disrupting app startup
  } finally {
    isCheckingForUpdates = false;
  }
}

/**
 * Manual Update Check
 * 
 * Provides a way for users to manually check for updates.
 * Shows feedback regardless of whether updates are available.
 * Can be triggered from settings or menu options.
 */
export async function checkForUpdatesManually(): Promise<void> {
  await checkForUpdates(true); // Show message even if no update available
}

/**
 * Version Service Export
 * 
 * Main exports for the version management system:
 * - checkForUpdates: Automatic update checking (for app startup)
 * - checkForUpdatesManually: Manual update checking (for user-triggered checks)
 * - getCurrentVersion: Utility to get current app version
 */
export const versionService = {
  checkForUpdates,
  checkForUpdatesManually,
  getCurrentVersion
};
