import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private notificationTriggerService: NotificationTriggerService,
  ) { }

  async create(userId: string, createTaskDto: CreateTaskDto) {
    // If projectId is provided, verify user has access
    if (createTaskDto.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: createTaskDto.projectId },
      });

      if (!project) {
        throw new NotFoundException('Project not found');
      }

      if (project.createdBy !== userId) {
        const isMember = await this.prisma.projectMember.findFirst({
          where: {
            projectId: createTaskDto.projectId,
            userId,
          },
        });

        if (!isMember) {
          throw new ForbiddenException('You do not have access to this project');
        }
      }
    }

    const task = await this.prisma.task.create({
      data: {
        ...createTaskDto,
        createdBy: userId,
        assignedTo: createTaskDto.assignedTo || userId,
        dueDate: (new Date(createTaskDto.dueDate)).toISOString(),
      },
      include: {
        assignee: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        creator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Trigger notification if task is assigned to someone other than creator
    if (task.assignedTo !== task.createdBy) {
      await this.notificationTriggerService.triggerNotification({
        userId: task.assignedTo,
        type: 'TASK_ASSIGNED',
        title: `New Task Assigned: ${task.title}`,
        message: `You have been assigned a new task: ${task.title}`,
        relatedTaskId: task.id,
        relatedProjectId: task.projectId || undefined,
      });
    }

    return task;
  }

  async findAll(userId: string, projectId?: string) {
    const where: any = {};

    if (projectId) {
      where.projectId = projectId;
    } else {
      // User can see tasks they created, are assigned to, or are in projects they own
      where.OR = [
        { createdBy: userId },
        { assignedTo: userId },
        {
          project: {
            OR: [
              { createdBy: userId },
              {
                members: {
                  some: {
                    userId: userId,
                  },
                },
              },
            ],
          },
        },
      ];
    }

    return this.prisma.task.findMany({
      where,
      include: {
        assignee: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        creator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        assignee: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        creator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            createdBy: true,
          },
        },
      },
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

    return task;
  }

  async update(id: string, userId: string, updateTaskDto: UpdateTaskDto) {
    const task = await this.findOne(id, userId);

    // Check if user can update
    if (task.createdBy !== userId && task.assignedTo !== userId) {
      if (task.project && task.project.createdBy !== userId) {
        throw new ForbiddenException('You do not have permission to update this task');
      }
    }

    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: updateTaskDto,
      include: {
        assignee: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Trigger notification if status changed
    if (updateTaskDto.status && updateTaskDto.status !== task.status) {
      await this.notificationTriggerService.triggerNotification({
        userId: updatedTask.assignedTo,
        type: 'TASK_STATUS_CHANGED',
        title: `Task Status Updated: ${updatedTask.title}`,
        message: `The status of "${updatedTask.title}" has been changed to ${updateTaskDto.status}`,
        relatedTaskId: updatedTask.id,
        relatedProjectId: updatedTask.projectId || undefined,
      });
    }

    return updatedTask;
  }

  async remove(id: string, userId: string) {
    const task = await this.findOne(id, userId);

    // Check if user can delete
    if (task.createdBy !== userId) {
      if (task.project && task.project.createdBy !== userId) {
        throw new ForbiddenException('You do not have permission to delete this task');
      }
    }

    await this.prisma.task.delete({
      where: { id },
    });

    return { message: 'Task deleted successfully' };
  }
}

