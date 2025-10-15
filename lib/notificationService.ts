/**
 * Notification Service for Kaizen Anime App
 * 
 * Simple push notification handling using Appwrite Messaging.
 * Registers devices to receive notifications about new episodes and updates.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { messagingService } from './appwrite';
import Constants from 'expo-constants';

// Get Provider ID from environment configuration
const APPWRITE_PROVIDER_ID = Constants.expoConfig?.extra?.appwriteProviderId || '';

console.log('[NotificationService] Provider ID loaded:', APPWRITE_PROVIDER_ID ? 'CONFIGURED' : 'NOT CONFIGURED');
console.log('[NotificationService] Full provider ID:', APPWRITE_PROVIDER_ID);

if (!APPWRITE_PROVIDER_ID) {
  console.warn('Appwrite Provider ID not configured. Push notifications will not work.');
}

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,      // Show notification banner
    shouldPlaySound: true,       // Play notification sound
    shouldSetBadge: true,        // Update app badge count
  }),
});

/**
 * Notification Service
 * 
 * Manages device registration and notification handling
 */
export const notificationService = {
  // Track if device is already registered to prevent duplicates
  isRegistered: false,

  /**
   * Request Notification Permissions
   * 
   * Asks the user for permission to show notifications.
   * Required before registering the device.
   * 
   * @returns Promise<boolean> - true if permission granted
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      // If permission not already granted, request it
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.warn('Notification permission denied');
        return false;
      }
      
      console.log('Notification permission granted');
      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  },

  async getDeviceToken(): Promise<string> {
    try {
      // Use ExpoPushToken for compatibility with Expo SDK 52
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
      
      if (!projectId) {
        throw new Error('Project ID not found - required for ExpoPushToken');
      }
      
      console.log('Getting ExpoPushToken with projectId:', projectId);
      
      const expoPushToken = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });
      
      console.log('ExpoPushToken obtained:', expoPushToken.data.substring(0, 20) + '...');
      console.log('ExpoPushToken type:', expoPushToken.type);
      
      // For Appwrite (FCM), we might need the raw device token
      // Let's try to get both and see which one works
      try {
        const devicePushToken = await Notifications.getDevicePushTokenAsync();
        console.log('Raw FCM token also obtained:', devicePushToken.data.substring(0, 20) + '...');
        console.log('Raw FCM token type:', devicePushToken.type);
        
        // Return the FCM token for Appwrite compatibility
        return devicePushToken.data;
      } catch (fcmError) {
        console.log('Could not get raw FCM token, using ExpoPushToken:', fcmError);
        // Fallback to ExpoPushToken if FCM token fails
        return expoPushToken.data;
      }
      
    } catch (error) {
      console.error('Error getting device token:', error);
      throw error;
    }
  },

  /**
   * Register Device for Notifications
   * 
   * Registers the user's device to receive push notifications.
   * Should be called after successful login.
   * 
   * @param userId - User ID from Appwrite authentication
   * @returns Promise<any> - Registration details
   */
  async registerDevice(userId: string) {
    try {
      // Prevent duplicate registrations
      if (this.isRegistered) {
        console.log('[Notifications] Device already registered, skipping');
        return;
      }

      if (!APPWRITE_PROVIDER_ID) {
        console.warn('[Notifications] Provider ID not configured, skipping registration');
        return;
      }

      console.log('[Notifications] Starting device registration process...');
      console.log('[Notifications] User ID:', userId);
      console.log('[Notifications] Provider ID:', APPWRITE_PROVIDER_ID);

      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('[Notifications] Permission denied, skipping registration');
        return;
      }

      console.log('[Notifications] Permissions granted, getting device token...');

      // Get device token
      const deviceToken = await this.getDeviceToken();

      console.log('[Notifications] Device token obtained, registering with Appwrite...');

      // Register with Appwrite
      const result = await messagingService.registerDeviceTarget(
        userId,
        deviceToken,
        APPWRITE_PROVIDER_ID
      );

      this.isRegistered = true;
      console.log('[Notifications] === DEVICE REGISTRATION COMPLETE ===');
      console.log('[Notifications] Registration result:', result);
      
      // Check if it's an existing target
      if (result && typeof result === 'object' && 'status' in result && result.status === 'exists') {
        console.log('[Notifications]  Push notifications are already configured for this device');
      } else {
        console.log('[Notifications]  New push notification target created successfully');
      }
      
    } catch (error: any) {
      // Handle the "target already exists" case as a success
      if (error.type === 'user_target_already_exists') {
        console.log('[Notifications]  Push notification target already exists - notifications are working!');
        this.isRegistered = true;
        return;
      }
      
      console.error('[Notifications] Failed to register device:', error);
      console.error('[Notifications] Error details:', JSON.stringify(error, null, 2));
      // Don't throw - app should continue even if notifications fail
    }
  },

  /**
   * Setup Notification Listeners
   * 
   * Sets up listeners for notification events.
   * Call this when the app starts.
   */
  setupNotificationListeners() {
    // Notification received while app is in foreground
    Notifications.addNotificationReceivedListener(notification => {
      console.log('[Notifications] Received:', notification.request.content.title);
    });

    // User interacted with notification (tapped/clicked)
    Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[Notifications] User tapped notification:', response.notification.request.content);
      
      // Handle notification tap - navigate to relevant screen
      const data = response.notification.request.content.data;
      // TODO: Add navigation logic based on notification data
    });
  },
};
