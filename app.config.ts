import 'dotenv/config';

export default {
  expo: {
    name: 'kaizen',
    slug: 'kaizen',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/splash-icon.png',
    scheme: 'kaizen',
    userInterfaceStyle: 'dark',
    newArchEnabled: true,
    platforms: ['ios', 'android'],
    ios: {
      supportsTablet: true,
      userInterfaceStyle: 'dark',
      bundleIdentifier: 'com.serenebrew.kaizen'
    },
    android: {
      package: 'com.serenebrew.kaizen',
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#161622'
      },
      userInterfaceStyle: 'dark'
    },
    splash: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#161622',
      imageWidth: 500,
      imageHeight: 500
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageResizeMode: 'contain',
          backgroundColor: '#161622',
          imageWidth: 500,
          imageHeight: 500
        }
      ]
    ],
    extra: {
      appwriteProjectId: process.env.APPWRITE_PROJECT_ID,
      appwriteEndpoint: process.env.APPWRITE_ENDPOINT,
    },
    experiments: {
      typedRoutes: true
    }
  }
};
