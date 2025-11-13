import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRiskDto } from './dto/create-risk.dto';
import { UpdateRiskDto } from './dto/update-risk.dto';

@Injectable()
export class ProjectRisksService {
  constructor(private prisma: PrismaService) {}

  async create(projectId: string, userId: string, createRiskDto: CreateRiskDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.createdBy !== userId) {
      throw new ForbiddenException('Only the project creator can create risks');
    }

    return this.prisma.projectRisk.create({
      data: {
        ...createRiskDto,
        projectId,
        createdBy: userId,
      },
    });
  }

  async findAll(projectId: string) {
    return this.prisma.projectRisk.findMany({
      where: { projectId },
      orderBy: {
        riskScore: 'desc',
      },
    });
  }

  async update(id: string, userId: string, updateRiskDto: UpdateRiskDto) {
    const risk = await this.prisma.projectRisk.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!risk) {
      throw new NotFoundException('Risk not found');
    }

    if (risk.project.createdBy !== userId) {
      throw new ForbiddenException('Only the project creator can update risks');
    }

    return this.prisma.projectRisk.update({
      where: { id },
      data: updateRiskDto,
    });
  }

  async remove(id: string, userId: string) {
    const risk = await this.prisma.projectRisk.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!risk) {
      throw new NotFoundException('Risk not found');
    }

    if (risk.project.createdBy !== userId) {
      throw new ForbiddenException('Only the project creator can delete risks');
    }

    await this.prisma.projectRisk.delete({
      where: { id },
    });

    return { message: 'Risk deleted successfully' };
  }
}

