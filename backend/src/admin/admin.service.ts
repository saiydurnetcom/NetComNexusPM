import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [users, projects, tasks, timeEntries] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.project.count(),
      this.prisma.task.count(),
      this.prisma.timeEntry.count(),
    ]);

    return {
      users,
      projects,
      tasks,
      timeEntries,
    };
  }
}

