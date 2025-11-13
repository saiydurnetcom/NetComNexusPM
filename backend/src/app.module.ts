import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { TimeTrackingModule } from './time-tracking/time-tracking.module';
import { MeetingsModule } from './meetings/meetings.module';
import { AISuggestionsModule } from './ai-suggestions/ai-suggestions.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TagsModule } from './tags/tags.module';
import { StorageModule } from './storage/storage.module';
import { SettingsModule } from './settings/settings.module';
import { AdminModule } from './admin/admin.module';
import { DepartmentsModule } from './departments/departments.module';
import { TeamsModule } from './teams/teams.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    DepartmentsModule,
    TeamsModule,
    ProjectsModule,
    TasksModule,
    TimeTrackingModule,
    MeetingsModule,
    AISuggestionsModule,
    NotificationsModule,
    TagsModule,
    StorageModule,
    SettingsModule,
    AdminModule,
  ],
})
export class AppModule {}

