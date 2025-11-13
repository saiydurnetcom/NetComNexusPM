import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAttachmentDto } from './dto/create-attachment.dto';

@Injectable()
export class TaskAttachmentsService {
  constructor(private prisma: PrismaService) {}

  async create(taskId: string, userId: string, createAttachmentDto: CreateAttachmentDto) {
    // Verify task exists and user has access
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check access
    if (task.createdBy !== userId && task.assignedTo !== userId && task.reviewerId !== userId) {
      if (task.project) {
        if (task.project.createdBy !== userId) {
          throw new ForbiddenException('You do not have access to this task');
        }
      } else {
        throw new ForbiddenException('You do not have access to this task');
      }
    }

    return this.prisma.taskAttachment.create({
      data: {
        taskId,
        uploadedBy: userId,
        ...createAttachmentDto,
      },
    });
  }

  async findAll(taskId: string) {
    return this.prisma.taskAttachment.findMany({
      where: { taskId },
      include: {
        uploader: {
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
    const attachment = await this.prisma.taskAttachment.findUnique({
      where: { id },
      include: {
        task: {
          include: {
            project: true,
          },
        },
      },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    // Check if user can delete
    if (attachment.uploadedBy !== userId) {
      if (attachment.task.project && attachment.task.project.createdBy !== userId) {
        throw new ForbiddenException('You can only delete your own attachments');
      }
    }

    await this.prisma.taskAttachment.delete({
      where: { id },
    });

    return { message: 'Attachment deleted successfully' };
  }
}

