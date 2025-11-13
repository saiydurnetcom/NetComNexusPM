import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { UpdateTimeEntryDto } from './dto/update-time-entry.dto';

@Injectable()
export class TimeTrackingService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.timeEntry.findMany({
      where: { userId },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            projectId: true,
          },
        },
      },
      orderBy: {
        startTime: 'desc',
      },
    });
  }

  async startTimer(userId: string, taskId: string) {
    // Check if there's already an active timer for this task
    const existingTimer = await this.prisma.timeEntry.findFirst({
      where: {
        userId,
        taskId,
        endTime: null,
      },
    });

    if (existingTimer) {
      throw new BadRequestException('A timer is already running for this task. Please stop the existing timer first.');
    }

    // Check if there's an active timer for a different task
    const otherActiveTimer = await this.prisma.timeEntry.findFirst({
      where: {
        userId,
        endTime: null,
      },
    });

    if (otherActiveTimer) {
      // Stop the other timer
      await this.stopTimer(userId, otherActiveTimer.id);
    }

    // Automatically set task status to "in_progress" when timer starts
    await this.prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'IN_PROGRESS',
      },
    }).catch(() => {
      // Don't fail if task update fails
    });

    return this.prisma.timeEntry.create({
      data: {
        userId,
        taskId,
        startTime: new Date(),
        durationMinutes: 0,
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  async stopTimer(userId: string, timeEntryId: string) {
    const timeEntry = await this.prisma.timeEntry.findUnique({
      where: { id: timeEntryId },
    });

    if (!timeEntry) {
      throw new NotFoundException('Time entry not found');
    }

    if (timeEntry.userId !== userId) {
      throw new ForbiddenException('You can only stop your own timers');
    }

    if (timeEntry.endTime) {
      throw new BadRequestException('Timer is already stopped');
    }

    const startTime = timeEntry.startTime;
    const endTime = new Date();
    const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / 1000 / 60);

    return this.prisma.timeEntry.update({
      where: { id: timeEntryId },
      data: {
        endTime,
        durationMinutes,
      },
    });
  }

  async create(userId: string, createTimeEntryDto: CreateTimeEntryDto) {
    return this.prisma.timeEntry.create({
      data: {
        ...createTimeEntryDto,
        userId,
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  async update(userId: string, id: string, updateTimeEntryDto: UpdateTimeEntryDto) {
    const timeEntry = await this.prisma.timeEntry.findUnique({
      where: { id },
    });

    if (!timeEntry) {
      throw new NotFoundException('Time entry not found');
    }

    if (timeEntry.userId !== userId) {
      throw new ForbiddenException('You can only update your own time entries');
    }

    // Recalculate duration if start/end times are updated
    let finalDuration = updateTimeEntryDto.durationMinutes;
    if (updateTimeEntryDto.startTime || updateTimeEntryDto.endTime) {
      const startTime = new Date(updateTimeEntryDto.startTime || timeEntry.startTime);
      const endTime = new Date(updateTimeEntryDto.endTime || timeEntry.endTime || new Date());
      finalDuration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

      if (finalDuration <= 0) {
        throw new BadRequestException('End time must be after start time');
      }
    }

    return this.prisma.timeEntry.update({
      where: { id },
      data: {
        ...updateTimeEntryDto,
        durationMinutes: finalDuration,
      },
    });
  }

  async remove(userId: string, id: string) {
    const timeEntry = await this.prisma.timeEntry.findUnique({
      where: { id },
    });

    if (!timeEntry) {
      throw new NotFoundException('Time entry not found');
    }

    if (timeEntry.userId !== userId) {
      throw new ForbiddenException('You can only delete your own time entries');
    }

    // Don't allow deleting active timers
    if (!timeEntry.endTime) {
      throw new BadRequestException('Cannot delete an active timer. Please stop it first.');
    }

    await this.prisma.timeEntry.delete({
      where: { id },
    });

    return { message: 'Time entry deleted successfully' };
  }

  async getActiveTimer(userId: string) {
    return this.prisma.timeEntry.findFirst({
      where: {
        userId,
        endTime: null,
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        startTime: 'desc',
      },
    });
  }
}

