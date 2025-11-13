import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';

@Injectable()
export class ProjectReportsService {
  constructor(private prisma: PrismaService) {}

  async create(projectId: string, userId: string, createReportDto: CreateReportDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check if user has access to project
    if (project.createdBy !== userId) {
      const isMember = await this.prisma.projectMember.findFirst({
        where: {
          projectId,
          userId,
        },
      });

      if (!isMember) {
        throw new ForbiddenException('You do not have access to this project');
      }
    }

    return this.prisma.projectReport.create({
      data: {
        ...createReportDto,
        projectId,
        generatedBy: userId,
      },
    });
  }

  async findAll(projectId?: string) {
    const where = projectId ? { projectId } : {};
    return this.prisma.projectReport.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const report = await this.prisma.projectReport.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return report;
  }

  async update(id: string, userId: string, updateReportDto: UpdateReportDto) {
    const report = await this.prisma.projectReport.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.generatedBy !== userId) {
      throw new ForbiddenException('You can only update your own reports');
    }

    return this.prisma.projectReport.update({
      where: { id },
      data: updateReportDto,
    });
  }

  async remove(id: string, userId: string) {
    const report = await this.prisma.projectReport.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.generatedBy !== userId) {
      throw new ForbiddenException('You can only delete your own reports');
    }

    await this.prisma.projectReport.delete({
      where: { id },
    });

    return { message: 'Report deleted successfully' };
  }
}

