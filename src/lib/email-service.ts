/**
 * Email Notification Service
 * 
 * This service handles sending email notifications.
 * 
 * For production, you'll need to:
 * 1. Set up an email service (Resend, SendGrid, AWS SES, etc.)
 * 2. Add API keys to your environment variables
 * 3. Create a Supabase Edge Function or backend API endpoint to send emails
 * 
 * For now, this is a placeholder that logs emails to console.
 * Replace the sendEmail function with actual email sending logic.
 */

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private isEnabled: boolean = false;
  private apiKey: string | null = null;
  private apiUrl: string | null = null;

  constructor() {
    // Check if email service is configured
    // In production, load from environment variables or settings
    this.apiKey = import.meta.env.VITE_EMAIL_API_KEY || null;
    this.apiUrl = import.meta.env.VITE_EMAIL_API_URL || null;
    this.isEnabled = !!this.apiKey && !!this.apiUrl;
  }

  /**
   * Send an email notification
   * 
   * Example implementation using Resend API:
   * 
   * async sendEmail(options: EmailOptions): Promise<boolean> {
   *   if (!this.isEnabled) {
   *     console.log('[Email Service] Email not sent (service not configured):', options);
   *     return false;
   *   }
   * 
   *   try {
   *     const response = await fetch(this.apiUrl!, {
   *       method: 'POST',
   *       headers: {
   *         'Authorization': `Bearer ${this.apiKey}`,
   *         'Content-Type': 'application/json',
   *       },
   *       body: JSON.stringify({
   *         from: 'noreply@yourdomain.com',
   *         to: options.to,
   *         subject: options.subject,
   *         html: options.html,
   *         text: options.text || options.html.replace(/<[^>]*>/g, ''),
   *       }),
   *     });
   * 
   *     if (!response.ok) {
   *       throw new Error(`Email API returned ${response.status}`);
   *     }
   * 
   *     return true;
   *   } catch (error) {
   *     console.error('[Email Service] Failed to send email:', error);
   *     return false;
   *   }
   * }
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    // Placeholder implementation - logs to console
    // Replace this with actual email sending logic
    console.log('[Email Service] Email would be sent:', {
      to: options.to,
      subject: options.subject,
      html: options.html.substring(0, 100) + '...',
    });

    // For development, you can use a Supabase Edge Function
    // Example: await supabase.functions.invoke('send-email', { body: options });

    return false; // Return false since email service is not configured
  }

  /**
   * Send task assignment notification
   */
  async sendTaskAssignmentEmail(userEmail: string, taskTitle: string, taskId: string, projectName?: string): Promise<boolean> {
    const subject = `New Task Assigned: ${taskTitle}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Task Assigned</h2>
        <p>You have been assigned a new task:</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px 0;">${taskTitle}</h3>
          ${projectName ? `<p style="margin: 0; color: #6b7280;">Project: ${projectName}</p>` : ''}
        </div>
        <p>
          <a href="${window.location.origin}/tasks/${taskId}" 
             style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Task
          </a>
        </p>
      </div>
    `;

    return this.sendEmail({
      to: userEmail,
      subject,
      html,
    });
  }

  /**
   * Send project update notification
   */
  async sendProjectUpdateEmail(userEmail: string, projectName: string, updateMessage: string, projectId: string): Promise<boolean> {
    const subject = `Project Update: ${projectName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Project Update</h2>
        <p><strong>${projectName}</strong></p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0;">${updateMessage}</p>
        </div>
        <p>
          <a href="${window.location.origin}/projects/${projectId}" 
             style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Project
          </a>
        </p>
      </div>
    `;

    return this.sendEmail({
      to: userEmail,
      subject,
      html,
    });
  }

  /**
   * Send comment/mention notification
   */
  async sendCommentEmail(userEmail: string, commenterName: string, taskTitle: string, comment: string, taskId: string): Promise<boolean> {
    const subject = `${commenterName} commented on: ${taskTitle}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Comment</h2>
        <p><strong>${commenterName}</strong> commented on task <strong>${taskTitle}</strong>:</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; white-space: pre-wrap;">${comment}</p>
        </div>
        <p>
          <a href="${window.location.origin}/tasks/${taskId}" 
             style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Task
          </a>
        </p>
      </div>
    `;

    return this.sendEmail({
      to: userEmail,
      subject,
      html,
    });
  }

  /**
   * Send meeting reminder
   */
  async sendMeetingReminderEmail(userEmail: string, meetingTitle: string, meetingDate: string, meetingId: string): Promise<boolean> {
    const subject = `Meeting Reminder: ${meetingTitle}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Meeting Reminder</h2>
        <p>You have a meeting coming up:</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px 0;">${meetingTitle}</h3>
          <p style="margin: 0; color: #6b7280;">Date: ${meetingDate}</p>
        </div>
        <p>
          <a href="${window.location.origin}/meetings/${meetingId}" 
             style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Meeting
          </a>
        </p>
      </div>
    `;

    return this.sendEmail({
      to: userEmail,
      subject,
      html,
    });
  }
}

export const emailService = new EmailService();

