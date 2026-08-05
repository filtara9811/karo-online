import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.karoonline.shop",
  appName: "Karo Digital Shop",
  webDir: "capacitor-shell",
  server: process.env.CAP_SERVER_URL
    ? { url: process.env.CAP_SERVER_URL, cleartext: true, androidScheme: "https" }
    : {
        url: "https://karoonline.in/vendor/shop?app=shop",
        cleartext: false,
        androidScheme: "https",
        allowNavigation: ["karoonline.in", "www.karoonline.in"],
      },
  android: { allowMixedContent: false, captureInput: true, webContentsDebuggingEnabled: false, appendUserAgent: " KaroOnlineShopApp" },
  plugins: {
    SplashScreen: { launchShowDuration: 0, backgroundColor: "#e8e0d0", androidSplashResourceName: "splash", androidScaleType: "CENTER_CROP", showSpinner: false, splashFullScreen: true, splashImmersive: true },
    StatusBar: { style: "DARK", backgroundColor: "#e8e0d0", overlaysWebView: true },
    PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
  },
};

export default config;
