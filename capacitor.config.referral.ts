import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.karoonline.referral",
  appName: "Karo Referral",
  webDir: "capacitor-shell",
  server: process.env.CAP_SERVER_URL
    ? { url: process.env.CAP_SERVER_URL, cleartext: true, androidScheme: "https" }
    : {
        url: "https://karoonline.in/referral?app=referral",
        cleartext: false,
        androidScheme: "https",
        allowNavigation: ["karoonline.in", "www.karoonline.in"],
      },
  android: { allowMixedContent: false, captureInput: true, webContentsDebuggingEnabled: false, appendUserAgent: " KaroOnlineReferralApp" },
  plugins: {
    SplashScreen: { launchShowDuration: 0, backgroundColor: "#f97316", androidSplashResourceName: "splash", androidScaleType: "CENTER_CROP", showSpinner: false, splashFullScreen: true, splashImmersive: true },
    StatusBar: { style: "DARK", backgroundColor: "#f97316", overlaysWebView: true },
    PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
  },
};

export default config;
