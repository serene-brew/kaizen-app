import 'dotenv/config';

export default {
  expo: {
    name: 'kaizen',
    slug: 'kaizen',
    version: '1.0.2',
    orientation: 'portrait',
    icon: './assets/images/splash-icon.png',
    scheme: 'kaizen',
    userInterfaceStyle: 'dark',
    newArchEnabled: true,
    platforms: ['ios', 'android'],
    ios: {
      supportsTablet: true,
      userInterfaceStyle: 'dark',
      bundleIdentifier: 'com.serenebrew.kaizen',
      config: {
        usesNonExemptEncryption: false
      }
    },
    android: {
      package: 'com.serenebrew.kaizen',
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#161622'
      },
      userInterfaceStyle: 'dark',
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "kaizen",
              host: "auth/callback"
            }
          ],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    splash: {
      image: './assets/images/splash-img.png',
      resizeMode: 'contain',
      backgroundColor: '#161622',
      imageWidth: 500
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-img.png',
          imageResizeMode: 'contain',
          backgroundColor: '#161622',
          imageWidth: 500
        }
      ],
      [
        'expo-notifications',
        {
          icon: './assets/images/icon.png',
          color: '#161622',
          sounds: [],
        }
      ]
    ],
    extra: {
      appwriteProjectId: process.env.APPWRITE_PROJECT_ID,
      appwriteEndpoint: process.env.APPWRITE_ENDPOINT,
      appwriteGoogleVerifyFunctionId: process.env.APPWRITE_GOOGLE_VERIFY_FUNCTION_ID,
      googleClientIdWeb: process.env.GOOGLE_CLIENT_ID_WEB,
      googleClientIdAndroid: process.env.GOOGLE_CLIENT_ID_ANDROID,
      googleClientIdIos: process.env.GOOGLE_CLIENT_ID_IOS,
      appwriteDatabaseId: process.env.APPWRITE_DATABASE_ID, // Added database ID
      appwriteWatchlistCollectionId: process.env.APPWRITE_WATCHLIST_COLLECTION_ID, // Added watchlist collection ID
      appwriteWatchHistoryCollectionId: process.env.APPWRITE_WATCHHISTORY_COLLECTION_ID, // Added watch history collection ID
      eas: {
        projectId: process.env.EAS_PROJECT_ID
      },
      // Development flag - true in dev builds, false in production
      isDevelopment: process.env.APP_ENV === 'development'
    },
    experiments: {
      typedRoutes: true
    },
    // Add development specific configuration
    development: {
      developmentClient: true
    },
    runtimeVersion: {
      policy: "sdkVersion"
    },
    updates: {
      url: "https://u.expo.dev/" + process.env.EAS_PROJECT_ID
    }
  }
};
