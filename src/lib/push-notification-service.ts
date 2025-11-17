/**
 * Push Notification Service
 * 
 * Handles browser push notifications using the Web Push API.
 * 
 * Requirements:
 * 1. Service worker must be registered (already done in main.tsx)
 * 2. User must grant notification permission
 * 3. VAPID keys must be generated and configured
 * 
 * To generate VAPID keys:
 * npm install -g web-push
 * web-push generate-vapid-keys
 * 
 * Add public key to environment: VITE_VAPID_PUBLIC_KEY
 */

class PushNotificationService {
  private vapidPublicKey: string | null = null;
  private registration: ServiceWorkerRegistration | null = null;

  constructor() {
    this.vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || null;
    this.initialize();
  }

  async initialize() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('[Push Service] Push notifications are not supported in this browser');
      return;
    }

    try {
      this.registration = await navigator.serviceWorker.ready;
    } catch (error) {
      console.error('[Push Service] Service worker not ready:', error);
    }
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('This browser does not support notifications');
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return Notification.permission;
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(): Promise<PushSubscription | null> {
    if (!this.registration) {
      await this.initialize();
      if (!this.registration) {
        throw new Error('Service worker not available');
      }
    }

    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }

    try {
      // Ensure we have a VAPID key (from env or backend public settings)
      if (!this.vapidPublicKey) {
        try {
          const { apiClient } = await import('./api-client');
          const publicSettings = await apiClient.getPublicSettings();
          if (publicSettings?.pushVapidPublicKey) {
            this.vapidPublicKey = publicSettings.pushVapidPublicKey;
          }
        } catch (e) {
          console.warn('[Push Service] Failed to load public settings for VAPID key', e);
        }
      }

      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.vapidPublicKey ? this.urlBase64ToUint8Array(this.vapidPublicKey) : undefined,
      });

      return subscription;
    } catch (error) {
      console.error('[Push Service] Failed to subscribe:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        return true;
      }
      return false;
    } catch (error) {
      console.error('[Push Service] Failed to unsubscribe:', error);
      return false;
    }
  }

  /**
   * Get current subscription
   */
  async getSubscription(): Promise<PushSubscription | null> {
    if (!this.registration) {
      await this.initialize();
      if (!this.registration) {
        return null;
      }
    }

    try {
      return await this.registration.pushManager.getSubscription();
    } catch (error) {
      console.error('[Push Service] Failed to get subscription:', error);
      return null;
    }
  }

  /**
   * Send a local notification (for testing or immediate notifications)
   */
  async sendLocalNotification(title: string, options?: NotificationOptions): Promise<void> {
    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission not granted');
    }

    if (this.registration) {
      await this.registration.showNotification(title, {
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        ...options,
      });
    } else {
      // Fallback to standard Notification API
      new Notification(title, {
        icon: '/favicon.svg',
        ...options,
      });
    }
  }

  /**
   * Convert VAPID public key from base64 URL to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Check if push notifications are supported
   */
  isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  }

  /**
   * Check if user has granted permission
   */
  hasPermission(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
  }
}

export const pushNotificationService = new PushNotificationService();

