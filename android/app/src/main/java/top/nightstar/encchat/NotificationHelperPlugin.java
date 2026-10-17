package top.nightstar.encchat;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NotificationHelper")
public class NotificationHelperPlugin extends Plugin {

    @PluginMethod
    public void checkNotificationStatus(PluginCall call) {
        try {
            Context context = getContext();
            boolean areEnabled = NotificationManagerCompat.from(context).areNotificationsEnabled();
            boolean canHeadsUp = areEnabled;
            int importance = 3; // default

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null) {
                    NotificationChannel channel = nm.getNotificationChannel("encchat_headsup_v4");
                    if (channel != null) {
                        importance = channel.getImportance();
                        canHeadsUp = areEnabled && (importance >= NotificationManager.IMPORTANCE_HIGH);
                    }
                }
            }

            JSObject ret = new JSObject();
            ret.put("enabled", areEnabled);
            ret.put("canHeadsUp", canHeadsUp);
            ret.put("importance", importance);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to check notification status: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        try {
            Context context = getContext();
            Intent intent = new Intent();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                intent.setAction(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                intent.putExtra(Settings.EXTRA_APP_PACKAGE, context.getPackageName());
            } else {
                intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.fromParts("package", context.getPackageName(), null));
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to open notification settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void sendTestNotification(PluginCall call) {
        try {
            Context context = getContext();
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) {
                call.reject("NotificationManager unavailable");
                return;
            }

            String channelId = "encchat_headsup_v4";
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = nm.getNotificationChannel(channelId);
                if (channel == null) {
                    channel = new NotificationChannel(channelId, "墨隐信函横幅通知", NotificationManager.IMPORTANCE_HIGH);
                    channel.setDescription("收到新消息时高优先级横幅悬浮浮窗与声音震动提醒");
                    channel.enableVibration(true);
                    channel.enableLights(true);
                    nm.createNotificationChannel(channel);
                }
            }

            Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
            PendingIntent pendingIntent = null;
            if (launchIntent != null) {
                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    flags |= PendingIntent.FLAG_IMMUTABLE;
                }
                pendingIntent = PendingIntent.getActivity(context, 7777, launchIntent, flags);
            }

            int iconResId = context.getResources().getIdentifier("ic_stat_notify", "drawable", context.getPackageName());
            if (iconResId == 0) {
                iconResId = context.getApplicationInfo().icon;
            }

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
                .setSmallIcon(iconResId)
                .setContentTitle("墨隐 · 测试通知")
                .setContentText("悬浮顶栏横幅与通知提醒功能测试正常！")
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent);

            nm.notify(777777, builder.build());

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to send test notification: " + e.getMessage());
        }
    }
}
