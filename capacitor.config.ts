import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.karoonline.twa",
  appName: "Karo Online",
  webDir: "capacitor-shell",
  // Bundle assets; for live-reload during dev, set CAP_SERVER_URL env and run cap sync.
  server: process.env.CAP_SERVER_URL
    ? { url: process.env.CAP_SERVER_URL, cleartext: true, androidScheme: "https" }
    : {
        androidScheme: "https",
        hostname: "karoonline.in",
        allowNavigation: ["karoonline.in", "www.karoonline.in"],
      },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    appendUserAgent: " KaroOnlineNativeApp",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      backgroundColor: "#0a0606",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#000000",
      overlaysWebView: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
