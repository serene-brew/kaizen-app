import 'dotenv/config';

export default {
  expo: {
    name: 'kaizen',
    slug: 'kaizen',
    version: '2.0.0',
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
      statusBar: {
        barStyle: 'light-content'
      },
      config: {
        usesNonExemptEncryption: false
      }
    },
    android: {
      package: 'com.serenebrew.kaizen',
      googleServicesFile: './google-services.json',
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#161622'
      },
      userInterfaceStyle: 'dark',
      navigationBar: {
        backgroundColor: '#161622',
        barStyle: 'light-content',
        visible: true
      },
      statusBar: {
        backgroundColor: '#161622',
        barStyle: 'light-content'
      },
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
      './plugins/withGoogleServices',
      [
        'expo-system-ui',
        {
          userInterfaceStyle: 'dark',
          backgroundColor: '#161622'
        }
      ],
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
          android: {
            useNextNotificationsApi: true,
            googleServicesFile: './google-services.json',
          }
        }
      ]
    ],
    extra: {
      appwriteProjectId: process.env.APPWRITE_PROJECT_ID,
      appwriteEndpoint: process.env.APPWRITE_ENDPOINT,
      appwriteGoogleVerifyFunctionId: process.env.APPWRITE_GOOGLE_VERIFY_FUNCTION_ID,
      appwriteProviderId: process.env.APPWRITE_PROVIDER_ID,
      googleClientIdWeb: process.env.GOOGLE_CLIENT_ID_WEB,
      googleClientIdAndroid: process.env.GOOGLE_CLIENT_ID_ANDROID,
      googleClientIdIos: process.env.GOOGLE_CLIENT_ID_IOS,
      appwriteDatabaseId: process.env.APPWRITE_DATABASE_ID,
      appwriteWatchlistCollectionId: process.env.APPWRITE_WATCHLIST_COLLECTION_ID,
      appwriteWatchHistoryCollectionId: process.env.APPWRITE_WATCHHISTORY_COLLECTION_ID,
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
