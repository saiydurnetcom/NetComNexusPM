import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';

@Injectable()
export class ProjectMilestonesService {
  constructor(private prisma: PrismaService) {}

  async create(projectId: string, userId: string, createMilestoneDto: CreateMilestoneDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.createdBy !== userId) {
      throw new ForbiddenException('Only the project creator can create milestones');
    }

    return this.prisma.projectMilestone.create({
      data: {
        ...createMilestoneDto,
        projectId,
        createdBy: userId,
      },
    });
  }

  async findAll(projectId: string) {
    return this.prisma.projectMilestone.findMany({
      where: { projectId },
      orderBy: {
        targetDate: 'asc',
      },
    });
  }

  async update(id: string, userId: string, updateMilestoneDto: UpdateMilestoneDto) {
    const milestone = await this.prisma.projectMilestone.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    if (milestone.project.createdBy !== userId) {
      throw new ForbiddenException('Only the project creator can update milestones');
    }

    return this.prisma.projectMilestone.update({
      where: { id },
      data: updateMilestoneDto,
    });
  }

  async remove(id: string, userId: string) {
    const milestone = await this.prisma.projectMilestone.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    if (milestone.project.createdBy !== userId) {
      throw new ForbiddenException('Only the project creator can delete milestones');
    }

    await this.prisma.projectMilestone.delete({
      where: { id },
    });

    return { message: 'Milestone deleted successfully' };
  }
}

