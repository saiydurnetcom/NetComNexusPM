import { Injectable, Logger } from '@nestjs/common';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { TriggerNotificationDto } from './dto/trigger-notification.dto';
import { EmailContentBuilder } from './classes/email-content-builder';

@Injectable()
export class NotificationTriggerService {
  private readonly logger = new Logger(NotificationTriggerService.name);
  private cachedSettings: RuntimeNotificationSettings | null = null;
  private cachedAt = 0;
  private readonly cacheTtlMs = 60_000; // 60s

  constructor(private prisma: PrismaService, private settingsService: SettingsService) { }

  private async getRuntimeSettings(): Promise<RuntimeNotificationSettings> {
    const now = Date.now();
    if (this.cachedSettings && now - this.cachedAt < this.cacheTtlMs) {
      return this.cachedSettings;
    }
    const full = await this.settingsService.getSettings();
    this.cachedSettings = {
      emailEnabled: !!full.emailEnabled,
      emailApiUrl: full.emailApiUrl,
      emailApiKey: full.emailApiKey,
      emailFrom: full.emailFrom,
      pushEnabled: !!full.pushEnabled,
      pushVapidPublicKey: full.pushVapidPublicKey,
      emailProvider: full.emailProvider,
    };
    this.cachedAt = now;
    return this.cachedSettings;
  }

  async triggerNotification(dto: TriggerNotificationDto) {
    const preferences = await this.prisma.userNotificationPreferences.findUnique({
      where: { userId: dto.userId },
    });

    if (preferences) {
      if (dto.type === 'TASK_ASSIGNED' && !preferences.taskAssignments) {
        return; // User disabled task assignment notifications
      }
      if (dto.type === 'PROJECT_UPDATED' && !preferences.projectUpdates) {
        return; // User disabled project update notifications
      }
    }

    const runtime = await this.getRuntimeSettings();

    const recipient = runtime.emailEnabled
      ? await this.prisma.user.findUnique({
        where: { id: dto.userId },
        select: { email: true, firstName: true, lastName: true },
      })
      : null;

    if (runtime.emailEnabled) {
      if (!recipient?.email) {
        this.logger.warn(
          `Email notifications enabled but recipient email not found for user ${dto.userId}`,
        );
      } else if (preferences && preferences.emailNotifications === false) {
        this.logger.debug(`User ${dto.userId} globally disabled email notifications.`);
      } else {
        try {
          const recipientName = [recipient.firstName, recipient.lastName]
            .filter(Boolean)
            .join(' ')
            .trim() || undefined;
          const sent = await this.sendEmailThroughProvider(
            {
              email: recipient.email,
              name: recipientName,
            },
            dto,
            runtime,
          );
          if (sent) {
            this.logger.debug(
              `Notification email dispatched via ${runtime.emailProvider || 'custom'} to ${recipient.email}`,
            );
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Failed to send notification email via ${runtime.emailProvider || 'unknown'}: ${message}`,
          );
        }
      }
    }

    if (runtime.pushEnabled) {
      this.logger.debug(`Push notifications enabled (public key present: ${!!runtime.pushVapidPublicKey}).`);
    }

    return this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        relatedTaskId: dto.relatedTaskId,
        relatedProjectId: dto.relatedProjectId,
        relatedCommentId: dto.relatedCommentId,
      },
    });
  }

  private async sendEmailThroughProvider(
    recipient: EmailRecipient,
    dto: TriggerNotificationDto,
    runtime: RuntimeNotificationSettings,
  ): Promise<boolean> {
    const provider = (runtime.emailProvider || 'custom').toLowerCase();
    const meta = dto.metadata as Record<string, any> | undefined;
    const cc = this.normalizeEmailList(meta?.cc ?? meta?.ccEmails);
    const bcc = this.normalizeEmailList(meta?.bcc ?? meta?.bccEmails);
    const replyTo = this.asString(meta?.replyTo ?? meta?.reply_to);
    const fromName = this.asString(meta?.fromName ?? meta?.from_name) || 'NexusPM';
    const fromEmail = runtime.emailFrom || 'noreply@nexuspm.local';
    const content = this.buildEmailContent(dto, recipient.name, meta);

    switch (provider) {
      case 'sendgrid':
        if (!runtime.emailApiKey) {
          this.logger.warn('SendGrid selected but emailApiKey is missing.');
          return false;
        }
        await this.sendWithSendGrid({
          apiKey: runtime.emailApiKey,
          apiUrl: runtime.emailApiUrl,
          fromEmail,
          fromName,
          recipient,
          cc,
          bcc,
          replyTo,
          content,
        });
        return true;
      case 'resend':
        if (!runtime.emailApiKey) {
          this.logger.warn('Resend selected but emailApiKey is missing.');
          return false;
        }
        await this.sendWithResend({
          apiKey: runtime.emailApiKey,
          apiUrl: runtime.emailApiUrl,
          fromEmail,
          fromName,
          recipient,
          cc,
          bcc,
          replyTo,
          content,
        });
        return true;
      case 'ses':
        this.logger.warn('SES provider selected but not yet implemented.');
        return false;
      case 'custom':
      default:
        if (!runtime.emailApiUrl) {
          this.logger.warn('Custom email provider selected but emailApiUrl is missing.');
          return false;
        }
        await this.sendWithCustom({
          apiKey: runtime.emailApiKey,
          apiUrl: runtime.emailApiUrl,
          fromEmail,
          fromName,
          recipient,
          cc,
          bcc,
          replyTo,
          content,
          metadata: meta,
        });
        return true;
    }
  }

  private async sendWithSendGrid(params: {
    apiKey: string;
    apiUrl?: string | null;
    fromEmail: string;
    fromName: string;
    recipient: EmailRecipient;
    cc: string[];
    bcc: string[];
    replyTo?: string;
    content: EmailContent;
  }): Promise<void> {
    const {
      apiKey,
      apiUrl,
      fromEmail,
      fromName,
      recipient,
      cc,
      bcc,
      replyTo,
      content,
    } = params;
    const url = apiUrl || 'https://api.sendgrid.com/v3/mail/send';
    const personalization: Record<string, any> = {
      to: [{ email: recipient.email, name: recipient.name }],
    };
    if (cc.length) {
      personalization.cc = cc.map(email => ({ email }));
    }
    if (bcc.length) {
      personalization.bcc = bcc.map(email => ({ email }));
    }

    const payload: Record<string, any> = {
      personalizations: [personalization],
      from: {
        email: fromEmail,
        name: fromName,
      },
      subject: content.subject,
      content: [
        { type: 'text/plain', value: content.text },
        { type: 'text/html', value: content.html },
      ],
    };

    if (replyTo) {
      payload.reply_to = { email: replyTo };
    }

    await this.postJson(url, payload, {
      Authorization: `Bearer ${apiKey}`,
    });
  }

  private async sendWithResend(params: {
    apiKey: string;
    apiUrl?: string | null;
    fromEmail: string;
    fromName: string;
    recipient: EmailRecipient;
    cc: string[];
    bcc: string[];
    replyTo?: string;
    content: EmailContent;
  }): Promise<void> {
    const {
      apiKey,
      apiUrl,
      fromEmail,
      fromName,
      recipient,
      cc,
      bcc,
      replyTo,
      content,
    } = params;
    const url = apiUrl || 'https://api.resend.com/emails';
    const payload: Record<string, any> = {
      from: `${fromName} <${fromEmail}>`,
      to: [recipient.email],
      subject: content.subject,
      html: content.html,
      text: content.text,
    };

    if (cc.length) {
      payload.cc = cc.length === 1 ? cc[0] : cc;
    }
    if (bcc.length) {
      payload.bcc = bcc.length === 1 ? bcc[0] : bcc;
    }
    if (replyTo) {
      payload.reply_to = replyTo;
    }

    await this.postJson(url, payload, {
      Authorization: `Bearer ${apiKey}`,
    });
  }

  private async sendWithCustom(params: {
    apiKey?: string | null;
    apiUrl: string;
    fromEmail: string;
    fromName: string;
    recipient: EmailRecipient;
    cc: string[];
    bcc: string[];
    replyTo?: string;
    content: EmailContent;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const {
      apiKey,
      apiUrl,
      fromEmail,
      fromName,
      recipient,
      cc,
      bcc,
      replyTo,
      content,
      metadata,
    } = params;

    const payload = {
      from: {
        email: fromEmail,
        name: fromName,
      },
      to: {
        email: recipient.email,
        name: recipient.name,
      },
      cc,
      bcc,
      replyTo,
      subject: content.subject,
      html: content.html,
      text: content.text,
      metadata,
    };

    const headers: Record<string, string> = {};
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    await this.postJson(apiUrl, payload, headers);
  }

  private async postJson(
    urlString: string,
    payload: Record<string, any>,
    headers: Record<string, string> = {},
  ): Promise<void> {
    const body = JSON.stringify(payload);
    const target = new URL(urlString);
    const isHttps = target.protocol === 'https:';
    const options = {
      method: 'POST',
      hostname: target.hostname,
      port: target.port ? Number(target.port) : isHttps ? 443 : 80,
      path: `${target.pathname}${target.search}`,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...headers,
      },
    };

    await new Promise<void>((resolve, reject) => {
      const request = (isHttps ? https : http).request(options, response => {
        const chunks: Buffer[] = [];
        response.on('data', chunk => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        response.on('end', () => {
          const statusCode = response.statusCode ?? 0;
          const responseBody = Buffer.concat(chunks).toString('utf-8');
          if (statusCode >= 400) {
            reject(new Error(`Email provider responded with ${statusCode}: ${responseBody || response.statusMessage}`));
            return;
          }
          resolve();
        });
      });

      request.on('error', error => reject(error));
      request.write(body);
      request.end();
    });
  }

  private normalizeEmailList(value: unknown): string[] {
    if (!value) {
      return [];
    }
    if (typeof value === 'string') {
      return value
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0);
    }
    if (Array.isArray(value)) {
      return value
        .map(item => (typeof item === 'string' ? item.trim() : ''))
        .filter(item => item.length > 0);
    }
    return [];
  }

  private asString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
  }

  private buildEmailContent(
    dto: TriggerNotificationDto,
    recipientName?: string,
    metadata?: Record<string, any>,
  ): EmailContent {
    return new EmailContentBuilder(dto)
      .withRecipientName(recipientName)
      .withMetadata(metadata)
      .build();
  }
}

