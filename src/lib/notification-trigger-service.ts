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

export interface NotificationTriggerOptions {
  userId: string;
  type: 'task_assigned' | 'task_due' | 'task_overdue' | 'comment' | 'mention' | 'milestone' | 'dependency_blocked' | 'task_status_changed' | 'project_updated';
  title: string;
  message: string;
  relatedTaskId?: string;
  relatedProjectId?: string;
  relatedCommentId?: string;
  metadata?: Record<string, any>;
}

class NotificationTriggerService {
  /**
   * Trigger a notification (in-app, email, and/or push)
   */
  async triggerNotification(options: NotificationTriggerOptions): Promise<void> {
    try {
      // Get user preferences
      const preferences = await notificationPreferencesService.getPreferences();
      if (!preferences) {
        // Create in-app notification only if preferences don't exist
        await this.createInAppNotification(options);
        return;
      }

      // Get user details for email
      let userEmail: string | null = null;
      try {
        const user = await usersService.getUser(options.userId);
        userEmail = user?.email || null;
      } catch (error) {
        console.error('[Notification Trigger] Failed to get user email:', error);
      }

      // Create in-app notification
      await this.createInAppNotification(options);

      // Check if email notification should be sent
      const shouldSendEmail = preferences.emailNotifications && userEmail;
      if (shouldSendEmail) {
        const emailEnabled = this.shouldSendEmailForType(options.type, preferences);
        if (emailEnabled) {
          await this.sendEmailNotification(userEmail, options, preferences);
        }
      }

      // Check if push notification should be sent
      if (preferences.pushNotifications && preferences.pushSubscription) {
        const pushEnabled = this.shouldSendPushForType(options.type, preferences);
        if (pushEnabled) {
          await this.sendPushNotification(options, preferences);
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
  private async createInAppNotification(options: NotificationTriggerOptions): Promise<void> {
    try {
      // No client-side creation; rely on backend to generate notifications from actions
      // Optionally, this could refresh the notifications list:
      await notificationsService.getNotifications(false).catch(() => {});
    } catch (error) {
      console.error('[Notification Trigger] Failed to create in-app notification:', error);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    userEmail: string,
    options: NotificationTriggerOptions,
    preferences: any
  ): Promise<void> {
    try {
      switch (options.type) {
        case 'task_assigned':
          if (preferences.taskAssignments) {
            await emailService.sendTaskAssignmentEmail(
              userEmail,
              options.title,
              options.relatedTaskId || '',
              options.metadata?.projectName
            );
          }
          break;
        case 'comment':
        case 'mention':
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
        case 'project_updated':
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
    options: NotificationTriggerOptions,
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
   * Check if email should be sent for this notification type
   */
  private shouldSendEmailForType(type: string, preferences: any): boolean {
    switch (type) {
      case 'task_assigned':
        return preferences.taskAssignments;
      case 'comment':
      case 'mention':
        return preferences.taskAssignments;
      case 'project_updated':
        return preferences.projectUpdates;
      case 'task_due':
      case 'task_overdue':
        return preferences.taskAssignments;
      default:
        return preferences.emailNotifications;
    }
  }

  /**
   * Check if push should be sent for this notification type
   */
  private shouldSendPushForType(type: string, preferences: any): boolean {
    // For push, we respect the same preferences as email
    return this.shouldSendEmailForType(type, preferences);
  }
}

export const notificationTriggerService = new NotificationTriggerService();

