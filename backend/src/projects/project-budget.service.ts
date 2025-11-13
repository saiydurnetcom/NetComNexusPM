import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBudgetItemDto } from './dto/create-budget-item.dto';
import { UpdateBudgetItemDto } from './dto/update-budget-item.dto';

@Injectable()
export class ProjectBudgetService {
  constructor(private prisma: PrismaService) {}

  async createItem(projectId: string, userId: string, createBudgetItemDto: CreateBudgetItemDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.createdBy !== userId) {
      throw new ForbiddenException('Only the project creator can add budget items');
    }

    return this.prisma.projectBudgetItem.create({
      data: {
        ...createBudgetItemDto,
        projectId,
        createdBy: userId,
      },
    });
  }

  async findAllItems(projectId: string) {
    return this.prisma.projectBudgetItem.findMany({
      where: { projectId },
    });
  }

  async updateItem(id: string, userId: string, updateBudgetItemDto: UpdateBudgetItemDto) {
    const item = await this.prisma.projectBudgetItem.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!item) {
      throw new NotFoundException('Budget item not found');
    }

    if (item.project.createdBy !== userId) {
      throw new ForbiddenException('Only the project creator can update budget items');
    }

    return this.prisma.projectBudgetItem.update({
      where: { id },
      data: updateBudgetItemDto,
    });
  }

  async removeItem(id: string, userId: string) {
    const item = await this.prisma.projectBudgetItem.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!item) {
      throw new NotFoundException('Budget item not found');
    }

    if (item.project.createdBy !== userId) {
      throw new ForbiddenException('Only the project creator can delete budget items');
    }

    await this.prisma.projectBudgetItem.delete({
      where: { id },
    });

    return { message: 'Budget item deleted successfully' };
  }
}

