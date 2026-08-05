package app.karoonline.twa;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

public class KaroFirebaseMessagingService extends FirebaseMessagingService {
  private static final String CHANNEL_ID = "karo_general_v1";

  @Override public void onMessageReceived(RemoteMessage message) {
    Map<String, String> data = message.getData();
    String kind = data.get("kind");
    if ("lead_alert".equals(kind) || "new_lead".equals(kind) || "direct_test".equals(kind)) {
      Intent svc = new Intent(this, LeadAlertService.class);
      svc.putExtra("lead_id", data.get("lead_id"));
      svc.putExtra("title", data.containsKey("title") ? data.get("title") : "🔔 New Lead");
      svc.putExtra("body", data.containsKey("body") ? data.get("body") : "Aapko ek lead receive hui hai");
      svc.putExtra("deep_link", resolveDeepLink(data));
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) startForegroundService(svc); else startService(svc);
      return;
    }
    showDeepLinkNotification(
      data.containsKey("title") ? data.get("title") : "Karo Online",
      data.containsKey("body") ? data.get("body") : "",
      resolveDeepLink(data)
    );
  }

  /** data.deep_link → data.url/action_url → data.path → app home. */
  private String resolveDeepLink(Map<String, String> data) {
    String[] keys = new String[] { "deep_link", "url", "action_url", "path", "route" };
    for (String k : keys) {
      String v = data.get(k);
      if (v == null || v.length() == 0) continue;
      if (v.startsWith("http://") || v.startsWith("https://") || v.startsWith("karo://")) return v;
      return "https://karoonline.in" + (v.startsWith("/") ? v : "/" + v);
    }
    String leadId = data.get("lead_id");
    if (leadId != null) return "https://karoonline.in/vendor/lead/" + leadId;
    return "https://karoonline.in/";
  }

  private void showDeepLinkNotification(String title, String body, String link) {
    NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && nm != null) {
      NotificationChannel ch = new NotificationChannel(CHANNEL_ID, "Karo Updates", NotificationManager.IMPORTANCE_HIGH);
      nm.createNotificationChannel(ch);
    }
    Intent open = new Intent(this, MainActivity.class);
    open.setAction(Intent.ACTION_VIEW);
    open.setData(Uri.parse(link));
    open.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    int flags = PendingIntent.FLAG_UPDATE_CURRENT;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
    PendingIntent pi = PendingIntent.getActivity(this, link.hashCode(), open, flags);
    NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_dialog_info)
      .setContentTitle(title)
      .setContentText(body)
      .setAutoCancel(true)
      .setContentIntent(pi);
    if (nm != null) nm.notify((int) (System.currentTimeMillis() % 100000), b.build());
  }
}
