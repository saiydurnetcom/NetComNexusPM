import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AISuggestionsService } from './ai-suggestions.service';
import { ApproveSuggestionDto } from './dto/approve-suggestion.dto';
import { RejectSuggestionDto } from './dto/reject-suggestion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('suggestions')
@UseGuards(JwtAuthGuard)
export class AISuggestionsController {
  constructor(private readonly aiSuggestionsService: AISuggestionsService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.aiSuggestionsService.findAll(user.id);
  }

  @Get('meetings/:meetingId')
  findByMeeting(@CurrentUser() user: any, @Param('meetingId') meetingId: string) {
    return this.aiSuggestionsService.findByMeeting(meetingId, user.id);
  }

  @Post('meetings/:meetingId/process')
  processMeeting(@CurrentUser() user: any, @Param('meetingId') meetingId: string) {
    return this.aiSuggestionsService.processMeeting(meetingId, user.id);
  }

  @Post(':id/approve')
  approve(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() approveDto: ApproveSuggestionDto,
  ) {
    return this.aiSuggestionsService.approve(id, user.id, approveDto);
  }

  @Post(':id/reject')
  reject(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() rejectDto: RejectSuggestionDto,
  ) {
    return this.aiSuggestionsService.reject(id, user.id, rejectDto);
  }
}

