import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

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
  constructor(private prisma: PrismaService) {}

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

