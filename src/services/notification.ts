import { LocalNotifications } from '@capacitor/local-notifications';
import { isCapacitorNative } from './apiConfig';

export interface NotificationStatus {
  isNative: boolean;
  enabled: boolean;
  canHeadsUp: boolean;
  importance?: number;
}

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

  public async createChannelIfNeeded() {
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
              foreground: true,
              isExactNotification: false,
            } as any,
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
              foreground: true,
              isExactNotification: false,
            } as any,
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

  /**
   * Checks full notification authorization and heads-up banner capability
   */
  public async checkStatus(): Promise<NotificationStatus> {
    if (isCapacitorNative()) {
      try {
        const capacitor = (window as any).Capacitor;
        if (capacitor?.Plugins?.NotificationHelper) {
          const res = await capacitor.Plugins.NotificationHelper.checkNotificationStatus();
          return {
            isNative: true,
            enabled: Boolean(res.enabled),
            canHeadsUp: Boolean(res.canHeadsUp),
            importance: res.importance,
          };
        }
        // Fallback via LocalNotifications.checkPermissions()
        const perm = await LocalNotifications.checkPermissions();
        return {
          isNative: true,
          enabled: perm.display === 'granted',
          canHeadsUp: perm.display === 'granted',
        };
      } catch (e) {
        console.warn('Failed to check native notification status:', e);
        return { isNative: true, enabled: false, canHeadsUp: false };
      }
    }

    // Web browser
    const enabled = typeof Notification !== 'undefined' && Notification.permission === 'granted';
    return {
      isNative: false,
      enabled,
      canHeadsUp: enabled,
    };
  }

  /**
   * Direct 1-tap jump to system app notification management page
   */
  public async openSettings(): Promise<void> {
    if (isCapacitorNative()) {
      try {
        const capacitor = (window as any).Capacitor;
        if (capacitor?.Plugins?.NotificationHelper) {
          await capacitor.Plugins.NotificationHelper.openNotificationSettings();
          return;
        }
      } catch (e) {
        console.warn('Failed to open native notification settings:', e);
      }
    }

    // Web fallback: request permission directly if not yet granted
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {}
    }
  }

  /**
   * Triggers an immediate test notification with max priority, vibration and heads-up
   */
  public async triggerTestNotification(): Promise<boolean> {
    // Vibrate immediately
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([150, 80, 150]);
      } catch {}
    }

    if (isCapacitorNative()) {
      try {
        const capacitor = (window as any).Capacitor;
        if (capacitor?.Plugins?.NotificationHelper) {
          await capacitor.Plugins.NotificationHelper.sendTestNotification();
          return true;
        }
      } catch (e) {
        console.warn('Native NotificationHelper sendTestNotification failed, falling back:', e);
      }

      // Fallback to LocalNotifications
      try {
        await this.createChannelIfNeeded();
        await LocalNotifications.schedule({
          notifications: [
            {
              title: '墨隐 · 测试通知',
              body: '悬浮顶栏横幅与通知提醒功能测试正常！',
              id: 777777,
              channelId: 'encchat_headsup_v4',
              smallIcon: 'ic_stat_notify',
              iconColor: '#a83232',
              autoCancel: true,
              foreground: true,
              isExactNotification: false,
            } as any,
          ],
        });
        return true;
      } catch (err) {
        console.warn('LocalNotifications test trigger failed:', err);
        return false;
      }
    }

    // Web browser test notification
    if (typeof Notification !== 'undefined') {
      if (Notification.permission === 'default') {
        const res = await Notification.requestPermission();
        if (res !== 'granted') return false;
      }
      if (Notification.permission === 'granted') {
        new Notification('墨隐 · 测试通知', {
          body: '浏览器桌面横幅提醒功能正常！',
          tag: 'encchat_test_notification',
        });
        return true;
      }
    }
    return false;
  }
}

export const notificationService = new NotificationService();
