import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

@Injectable()
export class UserNotificationPreferencesService {
  constructor(private prisma: PrismaService) {}

  async getPreferences(userId: string) {
    let preferences = await this.prisma.userNotificationPreferences.findUnique({
      where: { userId },
    });

    if (!preferences) {
      // Create default preferences
      preferences = await this.prisma.userNotificationPreferences.create({
        data: {
          userId,
        },
      });
    }

    return preferences;
  }

  async updatePreferences(userId: string, updateDto: UpdateNotificationPreferencesDto) {
    return this.prisma.userNotificationPreferences.upsert({
      where: { userId },
      update: updateDto,
      create: {
        userId,
        ...updateDto,
      },
    });
  }
}

