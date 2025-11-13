import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createProjectDto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        ...createProjectDto,
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
    return this.prisma.project.findMany({
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
        _count: {
          select: {
            tasks: true,
            members: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({
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
        members: {
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
        },
        _count: {
          select: {
            tasks: true,
            members: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check if user has access
    if (project.createdBy !== userId) {
      const isMember = await this.prisma.projectMember.findFirst({
        where: {
          projectId: id,
          userId: userId,
        },
      });

      if (!isMember) {
        throw new ForbiddenException('You do not have access to this project');
      }
    }

    return project;
  }

  async update(id: string, userId: string, updateProjectDto: UpdateProjectDto) {
    const project = await this.findOne(id, userId);

    if (project.createdBy !== userId) {
      throw new ForbiddenException('Only the project creator can update the project');
    }

    return this.prisma.project.update({
      where: { id },
      data: updateProjectDto,
    });
  }

  async remove(id: string, userId: string) {
    const project = await this.findOne(id, userId);

    if (project.createdBy !== userId) {
      throw new ForbiddenException('Only the project creator can delete the project');
    }

    await this.prisma.project.delete({
      where: { id },
    });

    return { message: 'Project deleted successfully' };
  }
}

