import { supabase } from './supabase';
import { NotificationPreferences } from '../types';

export const notificationPreferencesService = {
  async getPreferences(): Promise<NotificationPreferences | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Try camelCase first
    let result = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('userId', user.id)
      .maybeSingle();

    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column') ||
      result.error.message?.includes('userid')
    )) {
      result = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('userid', user.id)
        .maybeSingle();
    }

    if (result.error && result.error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw result.error;
    }

    if (!result.data) {
      // Create default preferences if none exist
      return await this.createDefaultPreferences();
    }

    const prefs = result.data;
    return {
      id: prefs.id,
      userId: prefs.userId || prefs.userid || prefs.user_id,
      emailNotifications: prefs.emailNotifications ?? prefs.emailnotifications ?? prefs.email_notifications ?? true,
      taskAssignments: prefs.taskAssignments ?? prefs.taskassignments ?? prefs.task_assignments ?? true,
      projectUpdates: prefs.projectUpdates ?? prefs.projectupdates ?? prefs.project_updates ?? true,
      meetingReminders: prefs.meetingReminders ?? prefs.meetingreminders ?? prefs.meeting_reminders ?? true,
      pushNotifications: prefs.pushNotifications ?? prefs.pushnotifications ?? prefs.push_notifications ?? false,
      pushSubscription: prefs.pushSubscription || prefs.pushsubscription || prefs.push_subscription,
      createdAt: prefs.createdAt || prefs.createdat || prefs.created_at,
      updatedAt: prefs.updatedAt || prefs.updatedat || prefs.updated_at,
    };
  },

  async createDefaultPreferences(): Promise<NotificationPreferences> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const defaultPrefs = {
      userId: user.id,
      emailNotifications: true,
      taskAssignments: true,
      projectUpdates: true,
      meetingReminders: true,
      pushNotifications: false,
    };

    // Try camelCase first
    let result = await supabase
      .from('user_notification_preferences')
      .insert({
        userId: user.id,
        emailNotifications: defaultPrefs.emailNotifications,
        taskAssignments: defaultPrefs.taskAssignments,
        projectUpdates: defaultPrefs.projectUpdates,
        meetingReminders: defaultPrefs.meetingReminders,
        pushNotifications: defaultPrefs.pushNotifications,
      })
      .select('*')
      .single();

    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column')
    )) {
      result = await supabase
        .from('user_notification_preferences')
        .insert({
          userid: user.id,
          emailnotifications: defaultPrefs.emailNotifications,
          taskassignments: defaultPrefs.taskAssignments,
          projectupdates: defaultPrefs.projectUpdates,
          meetingreminders: defaultPrefs.meetingReminders,
          pushnotifications: defaultPrefs.pushNotifications,
        })
        .select('*')
        .single();
    }

    if (result.error) throw result.error;

    const prefs = result.data;
    return {
      id: prefs.id,
      userId: prefs.userId || prefs.userid || prefs.user_id,
      emailNotifications: prefs.emailNotifications ?? prefs.emailnotifications ?? true,
      taskAssignments: prefs.taskAssignments ?? prefs.taskassignments ?? true,
      projectUpdates: prefs.projectUpdates ?? prefs.projectupdates ?? true,
      meetingReminders: prefs.meetingReminders ?? prefs.meetingreminders ?? true,
      pushNotifications: prefs.pushNotifications ?? prefs.pushnotifications ?? false,
      pushSubscription: prefs.pushSubscription || prefs.pushsubscription,
      createdAt: prefs.createdAt || prefs.createdat || prefs.created_at,
      updatedAt: prefs.updatedAt || prefs.updatedat || prefs.updated_at,
    };
  },

  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Try camelCase first
    let result = await supabase
      .from('user_notification_preferences')
      .update({
        emailNotifications: preferences.emailNotifications,
        taskAssignments: preferences.taskAssignments,
        projectUpdates: preferences.projectUpdates,
        meetingReminders: preferences.meetingReminders,
        pushNotifications: preferences.pushNotifications,
        pushSubscription: preferences.pushSubscription,
        updatedAt: new Date().toISOString(),
      })
      .eq('userId', user.id)
      .select('*')
      .single();

    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column')
    )) {
      result = await supabase
        .from('user_notification_preferences')
        .update({
          emailnotifications: preferences.emailNotifications,
          taskassignments: preferences.taskAssignments,
          projectupdates: preferences.projectUpdates,
          meetingreminders: preferences.meetingReminders,
          pushnotifications: preferences.pushNotifications,
          pushsubscription: preferences.pushSubscription,
          updatedat: new Date().toISOString(),
        })
        .eq('userid', user.id)
        .select('*')
        .single();
    }

    if (result.error) throw result.error;

    const prefs = result.data;
    return {
      id: prefs.id,
      userId: prefs.userId || prefs.userid || prefs.user_id,
      emailNotifications: prefs.emailNotifications ?? prefs.emailnotifications ?? true,
      taskAssignments: prefs.taskAssignments ?? prefs.taskassignments ?? true,
      projectUpdates: prefs.projectUpdates ?? prefs.projectupdates ?? true,
      meetingReminders: prefs.meetingReminders ?? prefs.meetingreminders ?? true,
      pushNotifications: prefs.pushNotifications ?? prefs.pushnotifications ?? false,
      pushSubscription: prefs.pushSubscription || prefs.pushsubscription,
      createdAt: prefs.createdAt || prefs.createdat || prefs.created_at,
      updatedAt: prefs.updatedAt || prefs.updatedat || prefs.updated_at,
    };
  },
};

