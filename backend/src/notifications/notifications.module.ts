import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationTriggerService } from './notification-trigger.service';
import { UserNotificationPreferencesService } from './user-notification-preferences.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationTriggerService,
    UserNotificationPreferencesService,
  ],
  exports: [NotificationTriggerService],
})
export class NotificationsModule {}

