import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TaskCommentsService } from './task-comments.service';
import { TaskDependenciesService } from './task-dependencies.service';
import { TaskAttachmentsService } from './task-attachments.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [TasksController],
  providers: [
    TasksService,
    TaskCommentsService,
    TaskDependenciesService,
    TaskAttachmentsService,
  ],
  exports: [
    TasksService,
    TaskCommentsService,
    TaskDependenciesService,
    TaskAttachmentsService,
  ],
})
export class TasksModule {}

