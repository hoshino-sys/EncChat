import { LocalNotifications } from '@capacitor/local-notifications';
import { isCapacitorNative } from './apiConfig';

class NotificationService {
  private channelCreated = false;
  private isInitialized = false;

  public async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    if (isCapacitorNative()) {
      try {
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') {
          await LocalNotifications.requestPermissions();
        }
        await this.createChannelIfNeeded();
      } catch (e) {
        console.warn('LocalNotifications init error:', e);
      }
    } else if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        try {
          await Notification.requestPermission();
        } catch {}
      }
    }
  }

  private async createChannelIfNeeded() {
    if (this.channelCreated) return;
    try {
      // Channel ID encchat_headsup_v3 ensures Android registers fresh MAX priority settings
      await LocalNotifications.createChannel({
        id: 'encchat_headsup_v3',
        name: '墨隐信函横幅通知',
        description: '收到新密函时高优先级横幅悬浮浮窗与声音震动提醒',
        importance: 5, // MAX importance for heads-up banner (悬浮顶栏横幅)
        visibility: 1, // Public on lock screen
        vibration: true,
        sound: 'default',
        lights: true,
        lightColor: '#a83232',
      });
      this.channelCreated = true;
    } catch (e) {
      console.warn('Create notification channel error:', e);
    }
  }

  public async notifyNewMessage(senderName: string, isSelf: boolean) {
    if (isSelf) return;

    // Only notify if document is hidden or window is not in focus (user is in background or another app)
    const isHidden = typeof document !== 'undefined' && (document.hidden || !document.hasFocus());
    if (!isHidden) {
      return;
    }

    const title = '墨隐';
    const body = `收到来自【${senderName}】的新印函`;

    if (isCapacitorNative()) {
      try {
        await this.createChannelIfNeeded();
        const notifId = Math.floor((Date.now() + Math.random() * 1000) % 2147483647);
        await LocalNotifications.schedule({
          notifications: [
            {
              title,
              body,
              id: notifId,
              channelId: 'encchat_headsup_v3',
              smallIcon: 'ic_launcher',
              iconColor: '#a83232',
              sound: 'default',
              autoCancel: true,
            },
          ],
        });
      } catch (e) {
        console.warn('Native notification trigger failed:', e);
      }
    } else if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          new Notification(title, {
            body,
            tag: 'encchat_new_msg',
          });
        } catch {}
      }
    }
  }
}

export const notificationService = new NotificationService();
