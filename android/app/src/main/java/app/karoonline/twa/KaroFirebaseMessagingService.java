package app.karoonline.twa;

import android.content.Intent;
import android.os.Build;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

public class KaroFirebaseMessagingService extends FirebaseMessagingService {
  @Override public void onMessageReceived(RemoteMessage message) {
    Map<String, String> data = message.getData();
    String kind = data.get("kind");
    if ("lead_alert".equals(kind) || "new_lead".equals(kind) || "direct_test".equals(kind)) {
      Intent svc = new Intent(this, LeadAlertService.class);
      svc.putExtra("lead_id", data.get("lead_id"));
      svc.putExtra("title", data.containsKey("title") ? data.get("title") : "🔔 New Lead");
      svc.putExtra("body", data.containsKey("body") ? data.get("body") : "Aapko ek lead receive hui hai");
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) startForegroundService(svc); else startService(svc);
    }
  }
}
