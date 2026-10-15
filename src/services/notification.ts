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
      // Channel ID encchat_headsup_v4 ensures Android registers fresh MAX priority settings with valid drawable icon
      await LocalNotifications.createChannel({
        id: 'encchat_headsup_v4',
        name: '墨隐信函横幅通知',
        description: '收到新消息时高优先级横幅悬浮浮窗与声音震动提醒',
        importance: 5, // MAX importance for heads-up banner (悬浮顶栏横幅)
        visibility: 1, // Public on lock screen
        vibration: true,
        lights: true,
        lightColor: '#a83232',
      });
      this.channelCreated = true;
    } catch (e) {
      console.warn('Create notification channel error:', e);
    }
  }

  public async notifyNewMessage(senderName: string, isSelf: boolean, isImage: boolean = false) {
    if (isSelf) return;

    // Haptic vibration feedback
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([120, 80, 120]);
      } catch {}
    }

    const title = '墨隐';
    const body = isImage
      ? `收到来自【${senderName}】的新消息 [图片]`
      : `收到来自【${senderName}】的新消息`;

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
              channelId: 'encchat_headsup_v4',
              smallIcon: 'ic_stat_notify',
              iconColor: '#a83232',
              autoCancel: true,
            },
          ],
        });
      } catch (e) {
        console.warn('Native notification trigger failed:', e);
      }
    } else if (typeof window !== 'undefined' && 'Notification' in window) {
      // On web browser, only notify if window is not focused to avoid annoying tab switch
      const isHidden = typeof document !== 'undefined' && (document.hidden || !document.hasFocus());
      if (isHidden && Notification.permission === 'granted') {
        try {
          new Notification(title, {
            body,
            tag: 'encchat_new_msg',
          });
        } catch {}
      }
    }
  }

  public async notifyUpdateAvailable(latestVersion: string, _downloadUrl?: string) {
    const title = '墨隐 · 发现新版本';
    const body = `新版本 v${latestVersion} 已就绪，轻触立即更新`;

    if (isCapacitorNative()) {
      try {
        await this.createChannelIfNeeded();
        await LocalNotifications.schedule({
          notifications: [
            {
              title,
              body,
              id: 999999,
              channelId: 'encchat_headsup_v4',
              smallIcon: 'ic_stat_notify',
              iconColor: '#a83232',
              autoCancel: true,
            },
          ],
        });
      } catch (e) {
        console.warn('Native update notification failed:', e);
      }
    } else if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          new Notification(title, {
            body,
            tag: 'encchat_update',
          });
        } catch {}
      }
    }
  }
}

export const notificationService = new NotificationService();
