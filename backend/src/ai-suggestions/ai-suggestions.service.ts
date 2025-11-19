import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AIService } from './ai.service';
import { TasksService } from '../tasks/tasks.service';
import { ApproveSuggestionDto } from './dto/approve-suggestion.dto';
import { RejectSuggestionDto } from './dto/reject-suggestion.dto';

@Injectable()
export class AISuggestionsService {
  constructor(
    private prisma: PrismaService,
    private aiService: AIService,
    private tasksService: TasksService,
  ) {}

  async findAll(userId: string) {
    return this.prisma.aISuggestion.findMany({
      where: {
        status: 'PENDING',
        meeting: {
          createdBy: userId,
        },
      },
      include: {
        meeting: {
          select: {
            id: true,
            title: true,
            projectId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByMeeting(meetingId: string, userId: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    if (meeting.createdBy !== userId) {
      throw new ForbiddenException('You do not have access to this meeting');
    }

    return this.prisma.aISuggestion.findMany({
      where: { meetingId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async processMeeting(meetingId: string, userId: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    if (meeting.createdBy !== userId) {
      throw new ForbiddenException('You do not have access to this meeting');
    }

    // Get existing tasks for duplicate detection
    const existingTasks = await this.prisma.task.findMany({
      where: {
        projectId: meeting.projectId || undefined,
      },
      select: {
        title: true,
        description: true,
      },
    });

    // Process with AI
    const suggestions = await this.aiService.processMeetingNotes(
      meeting.notes,
      meeting.projectId || undefined,
      existingTasks,
    );

    // Save suggestions
    const savedSuggestions = await Promise.all(
      suggestions.map(suggestion =>
        this.prisma.aISuggestion.create({
          data: {
            meetingId,
            originalText: suggestion.originalText,
            suggestedTask: suggestion.suggestedTask,
            suggestedDescription: suggestion.suggestedDescription,
            confidenceScore: suggestion.confidenceScore,
            status: 'PENDING',
          },
        }),
      ),
    );

    return savedSuggestions;
  }

  async approve(suggestionId: string, userId: string, approveDto: ApproveSuggestionDto) {
    const suggestion = await this.prisma.aISuggestion.findUnique({
      where: { id: suggestionId },
      include: { meeting: true },
    });

    if (!suggestion) {
      throw new NotFoundException('Suggestion not found');
    }

    if (suggestion.meeting.createdBy !== userId) {
      throw new ForbiddenException('You do not have access to this suggestion');
    }

    // Create task from suggestion
    const task = await this.tasksService.create(userId, {
      projectId: approveDto.projectId || suggestion.meeting.projectId || undefined,
      title: approveDto.title || suggestion.suggestedTask,
      description: approveDto.description || suggestion.suggestedDescription || suggestion.originalText,
      priority: approveDto.priority || 'MEDIUM',
      estimatedHours: approveDto.estimatedHours || 1,
      assignedTo: approveDto.assignedTo || userId,
      dueDate: approveDto.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      meetingId: suggestion.meetingId,
    });

    // Update suggestion status
    await this.prisma.aISuggestion.update({
      where: { id: suggestionId },
      data: {
        status: 'APPROVED',
        reviewedBy: userId,
        reviewedAt: new Date(),
      },
    });

    return task;
  }

  async reject(suggestionId: string, userId: string, rejectDto: RejectSuggestionDto) {
    const suggestion = await this.prisma.aISuggestion.findUnique({
      where: { id: suggestionId },
      include: { meeting: true },
    });

    if (!suggestion) {
      throw new NotFoundException('Suggestion not found');
    }

    if (suggestion.meeting.createdBy !== userId) {
      throw new ForbiddenException('You do not have access to this suggestion');
    }

    await this.prisma.aISuggestion.update({
      where: { id: suggestionId },
      data: {
        status: 'REJECTED',
        reviewedBy: userId,
        reviewedAt: new Date(),
        rejectionReason: rejectDto.reason,
      },
    });

    return { message: 'Suggestion rejected successfully' };
  }
}

