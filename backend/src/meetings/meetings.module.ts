import { Module, forwardRef } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { MeetingsController } from './meetings.controller';
import { AISuggestionsModule } from '../ai-suggestions/ai-suggestions.module';

@Module({
  controllers: [MeetingsController],
  providers: [MeetingsService],
  exports: [MeetingsService],
  imports: [forwardRef(() => AISuggestionsModule)],
})
export class MeetingsModule {}

