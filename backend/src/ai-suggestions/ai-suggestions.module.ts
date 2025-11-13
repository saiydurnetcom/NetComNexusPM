import { Module, forwardRef } from '@nestjs/common';
import { AISuggestionsService } from './ai-suggestions.service';
import { AISuggestionsController } from './ai-suggestions.controller';
import { AIService } from './ai.service';
import { MeetingsModule } from '../meetings/meetings.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  controllers: [AISuggestionsController],
  providers: [AISuggestionsService, AIService],
  exports: [AIService, AISuggestionsService],
  imports: [forwardRef(() => MeetingsModule), TasksModule],
})
export class AISuggestionsModule {}

