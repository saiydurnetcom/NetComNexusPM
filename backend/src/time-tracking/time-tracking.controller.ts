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
import { TimeTrackingService } from './time-tracking.service';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { UpdateTimeEntryDto } from './dto/update-time-entry.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('time')
@UseGuards(JwtAuthGuard)
export class TimeTrackingController {
  constructor(private readonly timeTrackingService: TimeTrackingService) {}

  @Get('entries')
  findAll(@CurrentUser() user: any) {
    return this.timeTrackingService.findAll(user.id);
  }

  @Get('active')
  getActiveTimer(@CurrentUser() user: any) {
    return this.timeTrackingService.getActiveTimer(user.id);
  }

  @Post('start')
  startTimer(@CurrentUser() user: any, @Body('taskId') taskId: string) {
    return this.timeTrackingService.startTimer(user.id, taskId);
  }

  @Post(':id/stop')
  stopTimer(@CurrentUser() user: any, @Param('id') id: string) {
    return this.timeTrackingService.stopTimer(user.id, id);
  }

  @Post('entries')
  create(@CurrentUser() user: any, @Body() createTimeEntryDto: CreateTimeEntryDto) {
    return this.timeTrackingService.create(user.id, createTimeEntryDto);
  }

  @Patch('entries/:id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateTimeEntryDto: UpdateTimeEntryDto,
  ) {
    return this.timeTrackingService.update(user.id, id, updateTimeEntryDto);
  }

  @Delete('entries/:id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.timeTrackingService.remove(user.id, id);
  }
}

