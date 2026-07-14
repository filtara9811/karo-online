import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.karoonline.staff",
  appName: "Karo Staff",
  webDir: "capacitor-shell",
  server: process.env.CAP_SERVER_URL
    ? { url: process.env.CAP_SERVER_URL, cleartext: true, androidScheme: "https" }
    : {
        url: "https://karoonline.in/staff?app=staff",
        cleartext: false,
        androidScheme: "https",
        allowNavigation: ["karoonline.in", "www.karoonline.in"],
      },
  android: { allowMixedContent: false, captureInput: true, webContentsDebuggingEnabled: false, appendUserAgent: " KaroOnlineStaffApp" },
  plugins: {
    SplashScreen: { launchShowDuration: 0, backgroundColor: "#fff8dc", androidSplashResourceName: "splash", androidScaleType: "CENTER_CROP", showSpinner: false, splashFullScreen: true, splashImmersive: true },
    StatusBar: { style: "LIGHT", backgroundColor: "#fff8dc", overlaysWebView: true },
    PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
  },
};

export default config;
