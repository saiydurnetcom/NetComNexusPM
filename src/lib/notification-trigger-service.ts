/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Notification Trigger Service
 * 
 * This service triggers email and push notifications when events occur.
 * It checks user preferences before sending notifications.
 */

import { notificationPreferencesService } from './notification-preferences-service';
import { emailService } from './email-service';
import { pushNotificationService } from './push-notification-service';
import { notificationsService } from './api-data';
import { usersService } from './users-service';

type NotificationTriggerType =
  | 'TASK_ASSIGNED'
  | 'TASK_DUE'
  | 'TASK_OVERDUE'
  | 'COMMENT'
  | 'MENTION'
  | 'MILESTONE'
  | 'DEPENDENCY_BLOCKED'
  | 'TASK_STATUS_CHANGED'
  | 'PROJECT_UPDATED';

type LegacyNotificationTriggerType = Lowercase<NotificationTriggerType>;

export interface NotificationTriggerOptions {
  userId: string;
  type: NotificationTriggerType | LegacyNotificationTriggerType;
  title: string;
  message: string;
  relatedTaskId?: string;
  relatedProjectId?: string;
  relatedCommentId?: string;
  metadata?: Record<string, any>;
}

type NormalizedNotificationTriggerOptions = Omit<NotificationTriggerOptions, 'type'> & {
  type: NotificationTriggerType;
};

const VALID_NOTIFICATION_TYPES: NotificationTriggerType[] = [
  'TASK_ASSIGNED',
  'TASK_DUE',
  'TASK_OVERDUE',
  'COMMENT',
  'MENTION',
  'MILESTONE',
  'DEPENDENCY_BLOCKED',
  'TASK_STATUS_CHANGED',
  'PROJECT_UPDATED',
];

const VALID_NOTIFICATION_TYPE_SET = new Set<NotificationTriggerType>(VALID_NOTIFICATION_TYPES);

class NotificationTriggerService {
  /**
   * Trigger a notification (in-app, email, and/or push)
   */
  async triggerNotification(options: NotificationTriggerOptions): Promise<void> {
    try {
      const normalizedOptions: NormalizedNotificationTriggerOptions = {
        ...options,
        type: this.normalizeType(options.type),
      };

      // Get user preferences
      const preferences = await notificationPreferencesService.getPreferences();
      if (!preferences) {
        // Create in-app notification only if preferences don't exist
        await this.createInAppNotification(normalizedOptions);
        return;
      }

      // Get user details for email
      let userEmail: string | null = null;
      try {
        const user = await usersService.getUser(normalizedOptions.userId);
        userEmail = user?.email || null;
      } catch (error) {
        console.error('[Notification Trigger] Failed to get user email:', error);
      }

      // Create in-app notification
      await this.createInAppNotification(normalizedOptions);

      // Check if email notification should be sent
      const shouldSendEmail = preferences.emailNotifications && userEmail;
      if (shouldSendEmail) {
        const emailEnabled = this.shouldSendEmailForType(normalizedOptions.type, preferences);
        if (emailEnabled) {
          await this.sendEmailNotification(userEmail, normalizedOptions, preferences);
        }
      }

      // Check if push notification should be sent
      if (preferences.pushNotifications && preferences.pushSubscription) {
        const pushEnabled = this.shouldSendPushForType(normalizedOptions.type, preferences);
        if (pushEnabled) {
          await this.sendPushNotification(normalizedOptions, preferences);
        }
      }
    } catch (error) {
      console.error('[Notification Trigger] Failed to trigger notification:', error);
      // Don't throw - we still want in-app notifications to work even if email/push fails
    }
  }

  /**
   * Create in-app notification
   */
  private async createInAppNotification(options: NormalizedNotificationTriggerOptions): Promise<void> {
    try {
      await notificationsService.triggerNotification({
        userId: options.userId,
        type: options.type,
        title: options.title,
        message: options.message,
        relatedTaskId: options.relatedTaskId,
        relatedProjectId: options.relatedProjectId,
        relatedCommentId: options.relatedCommentId,
        metadata: options.metadata,
      });

      // Optionally refresh cached notifications after backend confirmation
      await notificationsService.getNotifications(false).catch(() => { });
    } catch (error) {
      console.error('[Notification Trigger] Failed to create in-app notification:', error);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    userEmail: string,
    options: NormalizedNotificationTriggerOptions,
    preferences: any
  ): Promise<void> {
    try {
      switch (options.type) {
        case 'TASK_ASSIGNED':
          if (preferences.taskAssignments) {
            await emailService.sendTaskAssignmentEmail(
              userEmail,
              options.title,
              options.relatedTaskId || '',
              options.metadata?.projectName
            );
          }
          break;
        case 'COMMENT':
        case 'MENTION':
          if (preferences.taskAssignments) {
            await emailService.sendCommentEmail(
              userEmail,
              options.metadata?.commenterName || 'Someone',
              options.metadata?.taskTitle || options.title,
              options.message,
              options.relatedTaskId || ''
            );
          }
          break;
        case 'PROJECT_UPDATED':
          if (preferences.projectUpdates) {
            await emailService.sendProjectUpdateEmail(
              userEmail,
              options.metadata?.projectName || options.title,
              options.message,
              options.relatedProjectId || ''
            );
          }
          break;
        default:
          // Generic email for other types
          await emailService.sendEmail({
            to: userEmail,
            subject: options.title,
            html: `<p>${options.message}</p>`,
          });
      }
    } catch (error) {
      console.error('[Notification Trigger] Failed to send email:', error);
    }
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(
    options: NormalizedNotificationTriggerOptions,
    preferences: any
  ): Promise<void> {
    try {
      if (!preferences.pushSubscription) {
        return;
      }

      // For now, send a local notification
      // In production, you'd send the push notification to a backend service
      // which then sends it to the push service (FCM, etc.)
      if (pushNotificationService.hasPermission()) {
        await pushNotificationService.sendLocalNotification(options.title, {
          body: options.message,
          data: {
            taskId: options.relatedTaskId,
            projectId: options.relatedProjectId,
            meetingId: options.metadata?.meetingId,
            type: options.type,
          },
          tag: options.type,
        });
      }
    } catch (error) {
      console.error('[Notification Trigger] Failed to send push notification:', error);
    }
  }

  /**
   * Normalize incoming notification type values to the backend enum format
   */
  private normalizeType(type: NotificationTriggerOptions['type']): NotificationTriggerType {
    const candidate = typeof type === 'string' ? type.toUpperCase() : '';
    if (VALID_NOTIFICATION_TYPE_SET.has(candidate as NotificationTriggerType)) {
      return candidate as NotificationTriggerType;
    }

    console.warn('[Notification Trigger] Unknown notification type received, defaulting to PROJECT_UPDATED:', type);
    return 'PROJECT_UPDATED';
  }

  /**
   * Check if email should be sent for this notification type
   */
  private shouldSendEmailForType(type: NotificationTriggerType, preferences: any): boolean {
    switch (type) {
      case 'TASK_ASSIGNED':
        return preferences.taskAssignments;
      case 'COMMENT':
      case 'MENTION':
        return preferences.taskAssignments;
      case 'PROJECT_UPDATED':
        return preferences.projectUpdates;
      case 'TASK_DUE':
      case 'TASK_OVERDUE':
        return preferences.taskAssignments;
      default:
        return preferences.emailNotifications;
    }
  }

  /**
   * Check if push should be sent for this notification type
   */
  private shouldSendPushForType(type: NotificationTriggerType, preferences: any): boolean {
    // For push, we respect the same preferences as email
    return this.shouldSendEmailForType(type, preferences);
  }
}

export const notificationTriggerService = new NotificationTriggerService();

