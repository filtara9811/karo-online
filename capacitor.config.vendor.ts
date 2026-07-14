import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.karoonline.vendor",
  appName: "Karo Vendor",
  webDir: "capacitor-shell",
  server: process.env.CAP_SERVER_URL
    ? { url: process.env.CAP_SERVER_URL, cleartext: true, androidScheme: "https" }
    : {
        url: "https://karoonline.in/vendor/dashboard?app=vendor",
        cleartext: false,
        androidScheme: "https",
        allowNavigation: ["karoonline.in", "www.karoonline.in"],
      },
  android: { allowMixedContent: false, captureInput: true, webContentsDebuggingEnabled: false, appendUserAgent: " KaroOnlineVendorApp" },
  plugins: {
    SplashScreen: { launchShowDuration: 0, backgroundColor: "#0a0a0a", androidSplashResourceName: "splash", androidScaleType: "CENTER_CROP", showSpinner: false, splashFullScreen: true, splashImmersive: true },
    StatusBar: { style: "DARK", backgroundColor: "#0a0a0a", overlaysWebView: true },
    PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
  },
};

export default config;
