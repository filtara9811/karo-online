import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const androidDir = path.join(root, "android");
const appDir = path.join(androidDir, "app");
const manifestPath = path.join(appDir, "src/main/AndroidManifest.xml");
const buildGradlePath = path.join(appDir, "build.gradle");
const javaDir = path.join(appDir, "src/main/java/app/karoonline/twa");
const resRawDir = path.join(appDir, "src/main/res/raw");

function read(file) { return fs.readFileSync(file, "utf8"); }
function write(file, text) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); }
function ensureFile(file, text) { if (!fs.existsSync(file)) write(file, text); }
function replaceOnce(text, search, replacement) { return text.includes(search) ? text : text.replace(search, replacement); }

if (!fs.existsSync(androidDir)) {
  console.error("android/ folder missing. Run `bunx cap add android` first.");
  process.exit(1);
}

// 1) Native loud alert sound channel asset.
fs.mkdirSync(resRawDir, { recursive: true });
const srcSound = path.join(root, "public/sounds/lead-ring.mp3");
const dstSound = path.join(resRawDir, "lead_ring.mp3");
if (fs.existsSync(srcSound)) fs.copyFileSync(srcSound, dstSound);

// 2) MainActivity edge-to-edge / immersive bridge stability.
const mainActivityPath = path.join(javaDir, "MainActivity.java");
if (fs.existsSync(mainActivityPath)) {
  let main = read(mainActivityPath);
  if (!main.includes("WindowCompat.setDecorFitsSystemWindows")) {
    main = main.replace("import com.getcapacitor.BridgeActivity;", `import com.getcapacitor.BridgeActivity;
import androidx.core.view.WindowCompat;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Window;`);
    main = main.replace(/public class MainActivity extends BridgeActivity \{\s*\}/s, `public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    Window window = getWindow();
    WindowCompat.setDecorFitsSystemWindows(window, false);
    window.setStatusBarColor(Color.TRANSPARENT);
    window.setNavigationBarColor(Color.TRANSPARENT);
  }
}`);
    write(mainActivityPath, main);
  }
}

// 3) Native foreground lead alert service: rings loudly + Hindi TTS for background/killed app FCM.
ensureFile(path.join(javaDir, "LeadAlertService.java"), `package app.karoonline.twa;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import androidx.core.app.NotificationCompat;
import java.util.Locale;

public class LeadAlertService extends Service {
  public static final String CHANNEL_ID = "lead_alerts_v2";
  private MediaPlayer player;
  private TextToSpeech tts;
  private final Handler handler = new Handler(Looper.getMainLooper());

  @Override public void onCreate() { super.onCreate(); createChannel(); }
  @Override public IBinder onBind(Intent intent) { return null; }

  @Override public int onStartCommand(Intent intent, int flags, int startId) {
    if (intent != null && "STOP".equals(intent.getAction())) { stopSelf(); return START_NOT_STICKY; }
    String leadId = intent != null ? intent.getStringExtra("lead_id") : null;
    String title = intent != null && intent.getStringExtra("title") != null ? intent.getStringExtra("title") : "🔔 New Lead";
    String body = intent != null && intent.getStringExtra("body") != null ? intent.getStringExtra("body") : "Aapko ek lead receive hui hai";
    startForeground(2401, buildNotification(title, body, leadId));
    startRinging();
    speakHindi();
    handler.removeCallbacksAndMessages(null);
    handler.postDelayed(() -> stopSelf(), 30000);
    return START_NOT_STICKY;
  }

  private void startRinging() {
    try {
      stopPlayer();
      player = MediaPlayer.create(this, R.raw.lead_ring);
      if (player != null) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
          player.setAudioAttributes(new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build());
        } else {
          player.setAudioStreamType(AudioManager.STREAM_ALARM);
        }
        player.setLooping(true);
        player.setVolume(1f, 1f);
        player.start();
      }
    } catch (Exception ignored) {}
  }

  private void speakHindi() {
    try {
      tts = new TextToSpeech(this, status -> {
        if (status == TextToSpeech.SUCCESS && tts != null) {
          tts.setLanguage(new Locale("hi", "IN"));
          tts.setSpeechRate(0.95f);
          tts.speak("Aashu bhai, aapko ek lead receive hui hai. Kripya jaldi dekhein.", TextToSpeech.QUEUE_FLUSH, null, "lead-voice");
        }
      });
    } catch (Exception ignored) {}
  }

  private Notification buildNotification(String title, String body, String leadId) {
    Intent open = new Intent(this, MainActivity.class);
    open.setAction(Intent.ACTION_VIEW);
    open.setData(Uri.parse("https://karoonline.in/vendor/dashboard" + (leadId != null ? "?leadId=" + leadId : "")));
    PendingIntent openPi = PendingIntent.getActivity(this, 100, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

    PendingIntent stopPi = PendingIntent.getService(this, 101, new Intent(this, LeadAlertService.class).setAction("STOP"), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

    return new NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(getApplicationInfo().icon)
      .setContentTitle(title)
      .setContentText(body)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setAutoCancel(false)
      .setContentIntent(openPi)
      .addAction(0, "Open", openPi)
      .addAction(0, "Stop", stopPi)
      .build();
  }

  private void createChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      NotificationChannel ch = new NotificationChannel(CHANNEL_ID, "Lead Alerts", NotificationManager.IMPORTANCE_HIGH);
      ch.setDescription("Urgent Karo Online lead alerts");
      ch.enableVibration(true);
      ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
      getSystemService(NotificationManager.class).createNotificationChannel(ch);
    }
  }

  private void stopPlayer() { try { if (player != null) { player.stop(); player.release(); player = null; } } catch (Exception ignored) {} }
  @Override public void onDestroy() { handler.removeCallbacksAndMessages(null); stopPlayer(); try { if (tts != null) { tts.stop(); tts.shutdown(); } } catch (Exception ignored) {} super.onDestroy(); }
}
`);

ensureFile(path.join(javaDir, "KaroFirebaseMessagingService.java"), `package app.karoonline.twa;

import android.content.Intent;
import android.os.Build;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

public class KaroFirebaseMessagingService extends FirebaseMessagingService {
  @Override public void onMessageReceived(RemoteMessage message) {
    Map<String, String> data = message.getData();
    String kind = data.get("kind");
    if ("lead_alert".equals(kind) || "new_lead".equals(kind)) {
      Intent svc = new Intent(this, LeadAlertService.class);
      svc.putExtra("lead_id", data.get("lead_id"));
      svc.putExtra("title", data.containsKey("title") ? data.get("title") : "🔔 New Lead");
      svc.putExtra("body", data.containsKey("body") ? data.get("body") : "Aapko ek lead receive hui hai");
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) startForegroundService(svc); else startService(svc);
    }
  }
}
`);

// 4) Manifest permissions + services + deep link.
if (fs.existsSync(manifestPath)) {
  let manifest = read(manifestPath);
  const perms = [
    "android.permission.INTERNET",
    "android.permission.ACCESS_NETWORK_STATE",
    "android.permission.POST_NOTIFICATIONS",
    "android.permission.VIBRATE",
    "android.permission.WAKE_LOCK",
    "android.permission.FOREGROUND_SERVICE",
    "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
    "android.permission.ACCESS_FINE_LOCATION",
    "android.permission.ACCESS_COARSE_LOCATION",
  ];
  for (const p of perms) {
    if (!manifest.includes(p)) manifest = manifest.replace("<manifest", `<manifest`).replace(/<application/, `    <uses-permission android:name="${p}" />\n\n    <application`);
  }
  if (!manifest.includes(".LeadAlertService")) {
    manifest = manifest.replace(/<\/application>/, `        <service
            android:name=".LeadAlertService"
            android:exported="false"
            android:foregroundServiceType="mediaPlayback" />

        <service
            android:name=".KaroFirebaseMessagingService"
            android:exported="false">
            <intent-filter>
                <action android:name="com.google.firebase.MESSAGING_EVENT" />
            </intent-filter>
        </service>

    </application>`);
  }
  if (!manifest.includes('android:host="karoonline.in"')) {
    manifest = manifest.replace(/<activity([\s\S]*?)>/, (m) => `${m}
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="karoonline.in" />
            </intent-filter>`);
  }
  write(manifestPath, manifest);
}

// 5) Gradle signing + release config.
if (fs.existsSync(buildGradlePath)) {
  let gradle = read(buildGradlePath);
  if (!gradle.includes("keystorePropertiesFile")) {
    gradle = gradle.replace(/android\s*\{/, `def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {`);
  }
  if (!gradle.includes("signingConfigs")) {
    gradle = gradle.replace(/android\s*\{/, `android {
    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }`);
  }
  gradle = gradle.replace(/minSdkVersion\s+\d+/g, "minSdkVersion 26");
  gradle = gradle.replace(/targetSdkVersion\s+\d+/g, "targetSdkVersion 35");
  gradle = gradle.replace(/compileSdkVersion\s+\d+/g, "compileSdkVersion 35");
  if (!gradle.includes("signingConfig signingConfigs.release")) {
    gradle = gradle.replace(/release\s*\{/, `release {
            signingConfig signingConfigs.release`);
  }
  write(buildGradlePath, gradle);
}

console.log("✅ Native Android patches applied: foreground lead service, FCM data alerts, immersive mode, signing, cache-safe release.");