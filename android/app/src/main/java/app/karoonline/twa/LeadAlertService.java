package app.karoonline.twa;

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
    open.setData(Uri.parse("karo://app/vendor/dashboard" + (leadId != null ? "?leadId=" + leadId : "")));
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
