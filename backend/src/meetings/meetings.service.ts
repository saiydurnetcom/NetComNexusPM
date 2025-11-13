import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';

@Injectable()
export class MeetingsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createMeetingDto: CreateMeetingDto) {
    // If projectId is provided, verify user has access
    if (createMeetingDto.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: createMeetingDto.projectId },
      });

      if (!project) {
        throw new NotFoundException('Project not found');
      }

      if (project.createdBy !== userId) {
        throw new ForbiddenException('You do not have access to this project');
      }
    }

    return this.prisma.meeting.create({
      data: {
        ...createMeetingDto,
        createdBy: userId,
      },
      include: {
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
  }

  async findAll(userId: string) {
    return this.prisma.meeting.findMany({
      where: {
        createdBy: userId,
      },
      include: {
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
        meetingDate: 'desc',
      },
    });
  }

  async findOne(id: string, userId: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id },
      include: {
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

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    // Check access
    if (meeting.createdBy !== userId) {
      if (meeting.project && meeting.project.createdBy !== userId) {
        throw new ForbiddenException('You do not have access to this meeting');
      }
    }

    return meeting;
  }

  async update(id: string, userId: string, updateMeetingDto: UpdateMeetingDto) {
    const meeting = await this.findOne(id, userId);

    if (meeting.createdBy !== userId) {
      throw new ForbiddenException('You can only update your own meetings');
    }

    return this.prisma.meeting.update({
      where: { id },
      data: updateMeetingDto,
    });
  }

  async remove(id: string, userId: string) {
    const meeting = await this.findOne(id, userId);

    if (meeting.createdBy !== userId) {
      throw new ForbiddenException('You can only delete your own meetings');
    }

    await this.prisma.meeting.delete({
      where: { id },
    });

    return { message: 'Meeting deleted successfully' };
  }
}

