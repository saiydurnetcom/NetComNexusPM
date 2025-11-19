import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';
import { SettingsService } from '../settings/settings.service';

export interface TriggerNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedTaskId?: string;
  relatedProjectId?: string;
  relatedCommentId?: string;
}

@Injectable()
export class NotificationTriggerService {
  private readonly logger = new Logger(NotificationTriggerService.name);
  private cachedSettings: any | null = null;
  private cachedAt = 0;
  private readonly cacheTtlMs = 60_000; // 60s

  constructor(private prisma: PrismaService, private settingsService: SettingsService) {}

  private async getRuntimeSettings() {
    const now = Date.now();
    if (this.cachedSettings && now - this.cachedAt < this.cacheTtlMs) {
      return this.cachedSettings;
    }
    const full = await this.settingsService.getSettings();
    this.cachedSettings = {
      emailEnabled: !!full.emailEnabled,
      pushEnabled: !!full.pushEnabled,
      pushVapidPublicKey: full.pushVapidPublicKey,
      emailProvider: full.emailProvider,
    };
    this.cachedAt = now;
    return this.cachedSettings;
  }

  async triggerNotification(dto: TriggerNotificationDto) {
    // Check user notification preferences
    const preferences = await this.prisma.userNotificationPreferences.findUnique({
      where: { userId: dto.userId },
    });

    // Check if user wants this type of notification
    if (preferences) {
      if (dto.type === 'TASK_ASSIGNED' && !preferences.taskAssignments) {
        return; // User disabled task assignment notifications
      }
      if (dto.type === 'PROJECT_UPDATED' && !preferences.projectUpdates) {
        return; // User disabled project update notifications
      }
    }

    // Read runtime settings (email/push) with small TTL cache
    const runtime = await this.getRuntimeSettings();

    // Future: If runtime.emailEnabled -> send email via configured provider
    if (runtime.emailEnabled) {
      this.logger.debug(`Email notifications enabled via ${runtime.emailProvider || 'unknown'} (not implemented).`);
    }

    // Future: If runtime.pushEnabled -> enqueue web push using VAPID public key
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
}

