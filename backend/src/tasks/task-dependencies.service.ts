import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDependencyDto } from './dto/create-dependency.dto';

@Injectable()
export class TaskDependenciesService {
  constructor(private prisma: PrismaService) {}

  async create(taskId: string, createDependencyDto: CreateDependencyDto) {
    // Verify both tasks exist
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const dependsOnTask = await this.prisma.task.findUnique({
      where: { id: createDependencyDto.dependsOnTaskId },
    });

    if (!dependsOnTask) {
      throw new NotFoundException('Dependent task not found');
    }

    // Check for self-dependency
    if (taskId === createDependencyDto.dependsOnTaskId) {
      throw new BadRequestException('A task cannot depend on itself');
    }

    // Check for circular dependency (using database function)
    try {
      const dependency = await this.prisma.taskDependency.create({
        data: {
          taskId,
          dependsOnTaskId: createDependencyDto.dependsOnTaskId,
          dependencyType: createDependencyDto.dependencyType || 'FINISH_TO_START',
        },
      });

      return dependency;
    } catch (error: any) {
      if (error.message?.includes('Circular dependency')) {
        throw new BadRequestException('Circular dependency detected. Cannot create this dependency.');
      }
      if (error.code === 'P2002') {
        throw new BadRequestException('This dependency already exists');
      }
      throw error;
    }
  }

  async findAll(taskId: string) {
    return this.prisma.taskDependency.findMany({
      where: { taskId },
      include: {
        dependsOn: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    const dependency = await this.prisma.taskDependency.findUnique({
      where: { id },
    });

    if (!dependency) {
      throw new NotFoundException('Dependency not found');
    }

    await this.prisma.taskDependency.delete({
      where: { id },
    });

    return { message: 'Dependency removed successfully' };
  }

  async checkCircularDependency(taskId: string, dependsOnTaskId: string): Promise<boolean> {
    // This will be handled by the database trigger, but we can add client-side check too
    const visited = new Set<string>();
    const queue = [dependsOnTaskId];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (visited.has(current)) {
        return false; // Circular dependency detected
      }

      visited.add(current);

      if (current === taskId) {
        return false; // Circular dependency detected
      }

      const dependencies = await this.prisma.taskDependency.findMany({
        where: { taskId: current },
        select: { dependsOnTaskId: true },
      });

      queue.push(...dependencies.map(d => d.dependsOnTaskId));
    }

    return true; // No circular dependency
  }
}

