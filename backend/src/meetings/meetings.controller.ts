import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { AISuggestionsService } from '../ai-suggestions/ai-suggestions.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('meetings')
@UseGuards(JwtAuthGuard)
export class MeetingsController {
  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly aiSuggestionsService: AISuggestionsService,
  ) {}

  @Post()
  create(@CurrentUser() user: any, @Body() createMeetingDto: CreateMeetingDto) {
    return this.meetingsService.create(user.id, createMeetingDto);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.meetingsService.findAll(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.meetingsService.findOne(id, user.id);
  }

  @Post(':id/process')
  processMeeting(@CurrentUser() user: any, @Param('id') id: string) {
    return this.aiSuggestionsService.processMeeting(id, user.id);
  }

  @Post(':id/reprocess')
  reprocessMeeting(@CurrentUser() user: any, @Param('id') id: string) {
    return this.aiSuggestionsService.processMeeting(id, user.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateMeetingDto: UpdateMeetingDto,
  ) {
    return this.meetingsService.update(id, user.id, updateMeetingDto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.meetingsService.remove(id, user.id);
  }
}
