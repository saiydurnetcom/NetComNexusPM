import { apiClient } from './api-client';
import { NotificationPreferences } from '../types';

export const notificationPreferencesService = {
  async getPreferences(): Promise<NotificationPreferences | null> {
    try {
      const prefs = await apiClient.getNotificationPreferences();
      if (!prefs) {
        return {
          id: 'default',
          userId: '',
          emailNotifications: true,
          taskAssignments: true,
          projectUpdates: true,
          meetingReminders: true,
          pushNotifications: false,
          pushSubscription: null as any,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      return {
        id: prefs.id || 'default',
        userId: prefs.userId || '',
        emailNotifications: !!prefs.emailNotifications,
        taskAssignments: !!prefs.taskAssignments,
        projectUpdates: !!prefs.projectUpdates,
        meetingReminders: !!prefs.meetingReminders,
        pushNotifications: !!prefs.pushNotifications,
        pushSubscription: prefs.pushSubscription || null,
        createdAt: prefs.createdAt || new Date().toISOString(),
        updatedAt: prefs.updatedAt || new Date().toISOString(),
      };
    } catch {
      // Return sensible defaults if backend not configured
      return {
        id: 'default',
        userId: '',
        emailNotifications: true,
        taskAssignments: true,
        projectUpdates: true,
        meetingReminders: true,
        pushNotifications: false,
        pushSubscription: null as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  },

  async createDefaultPreferences(): Promise<NotificationPreferences> {
    // Backend holds preferences; return local defaults if none yet
    return {
      id: 'default',
      userId: '',
      emailNotifications: true,
      taskAssignments: true,
      projectUpdates: true,
      meetingReminders: true,
      pushNotifications: false,
      pushSubscription: null as any,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const prefs = await apiClient.updateNotificationPreferences({
      emailNotifications: preferences.emailNotifications,
      taskAssignments: preferences.taskAssignments,
      projectUpdates: preferences.projectUpdates,
      meetingReminders: preferences.meetingReminders,
      pushNotifications: preferences.pushNotifications,
      pushSubscription: preferences.pushSubscription,
    });
    return {
      id: prefs.id || 'default',
      userId: prefs.userId || '',
      emailNotifications: !!prefs.emailNotifications,
      taskAssignments: !!prefs.taskAssignments,
      projectUpdates: !!prefs.projectUpdates,
      meetingReminders: !!prefs.meetingReminders,
      pushNotifications: !!prefs.pushNotifications,
      pushSubscription: prefs.pushSubscription || null,
      createdAt: prefs.createdAt || new Date().toISOString(),
      updatedAt: prefs.updatedAt || new Date().toISOString(),
    };
  },
};

