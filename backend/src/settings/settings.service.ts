import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    let settings = await this.prisma.setting.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      settings = await this.prisma.setting.create({
        data: {
          id: 'default',
        },
      });
    }

    return settings;
  }

  async getPublicSettings() {
    const settings = await this.getSettings();
    return {
      emailEnabled: !!settings.emailEnabled,
      pushEnabled: !!settings.pushEnabled,
      pushVapidPublicKey: settings.pushVapidPublicKey || null,
    };
  }

  async updateSettings(userId: string, updateSettingsDto: UpdateSettingsDto) {
    return this.prisma.setting.upsert({
      where: { id: 'default' },
      update: {
        ...updateSettingsDto,
        updatedBy: userId,
      },
      create: {
        id: 'default',
        ...updateSettingsDto,
        updatedBy: userId,
      },
    });
  }
}

