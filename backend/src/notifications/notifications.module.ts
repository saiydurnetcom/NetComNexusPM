import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationTriggerService } from './notification-trigger.service';
import { UserNotificationPreferencesService } from './user-notification-preferences.service';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationTriggerService,
    UserNotificationPreferencesService,
  ],
  exports: [NotificationTriggerService],
})
export class NotificationsModule {}

