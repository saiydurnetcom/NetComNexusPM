import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';

@Injectable()
export class TaskCommentsService {
  constructor(
    private prisma: PrismaService,
    private notificationTriggerService: NotificationTriggerService,
  ) {}

  async create(taskId: string, userId: string, createCommentDto: CreateCommentDto) {
    // Verify task exists and user has access
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check access
    if (task.createdBy !== userId && task.assignedTo !== userId) {
      if (task.project) {
        if (task.project.createdBy !== userId) {
          const isMember = await this.prisma.projectMember.findFirst({
            where: {
              projectId: task.projectId,
              userId,
            },
          });

          if (!isMember) {
            throw new ForbiddenException('You do not have access to this task');
          }
        }
      } else {
        throw new ForbiddenException('You do not have access to this task');
      }
    }

    const comment = await this.prisma.taskComment.create({
      data: {
        taskId,
        userId,
        content: createCommentDto.content,
        mentionedUserIds: createCommentDto.mentionedUserIds || [],
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Trigger notifications for mentioned users
    if (createCommentDto.mentionedUserIds && createCommentDto.mentionedUserIds.length > 0) {
      const commenterName = `${comment.user.firstName} ${comment.user.lastName}`;
      for (const mentionedUserId of createCommentDto.mentionedUserIds) {
        if (mentionedUserId !== userId) {
          await this.notificationTriggerService.triggerNotification({
            userId: mentionedUserId,
            type: 'MENTION',
            title: `${commenterName} mentioned you`,
            message: `${commenterName} mentioned you in a comment on ${task.title}`,
            relatedTaskId: taskId,
            relatedCommentId: comment.id,
          });
        }
      }
    }

    return comment;
  }

  async findAll(taskId: string) {
    return this.prisma.taskComment.findMany({
      where: { taskId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async update(id: string, userId: string, updateCommentDto: UpdateCommentDto) {
    const comment = await this.prisma.taskComment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only update your own comments');
    }

    return this.prisma.taskComment.update({
      where: { id },
      data: updateCommentDto,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async remove(id: string, userId: string) {
    const comment = await this.prisma.taskComment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      // Check if user is admin or manager
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (user?.role !== 'ADMIN' && user?.role !== 'MANAGER') {
        throw new ForbiddenException('You can only delete your own comments');
      }
    }

    await this.prisma.taskComment.delete({
      where: { id },
    });

    return { message: 'Comment deleted successfully' };
  }
}

