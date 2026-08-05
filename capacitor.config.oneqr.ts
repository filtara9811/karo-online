import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.karoonline.oneqr",
  appName: "Karo One QR",
  webDir: "capacitor-shell",
  server: process.env.CAP_SERVER_URL
    ? { url: process.env.CAP_SERVER_URL, cleartext: true, androidScheme: "https" }
    : {
        url: "https://karoonline.in/one-qr?app=oneqr",
        cleartext: false,
        androidScheme: "https",
        allowNavigation: ["karoonline.in", "www.karoonline.in"],
      },
  android: { allowMixedContent: false, captureInput: true, webContentsDebuggingEnabled: false, appendUserAgent: " KaroOnlineOneQrApp" },
  plugins: {
    SplashScreen: { launchShowDuration: 0, backgroundColor: "#0EA5E9", androidSplashResourceName: "splash", androidScaleType: "CENTER_CROP", showSpinner: false, splashFullScreen: true, splashImmersive: true },
    StatusBar: { style: "DARK", backgroundColor: "#0EA5E9", overlaysWebView: true },
    PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
  },
};

export default config;
