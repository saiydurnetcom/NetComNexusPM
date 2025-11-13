import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createTagDto: CreateTagDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN' && user?.role !== 'MANAGER') {
      throw new ForbiddenException('Only admins and managers can create tags');
    }

    return this.prisma.tag.create({
      data: {
        ...createTagDto,
        createdBy: userId,
      },
    });
  }

  async findAll() {
    return this.prisma.tag.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    return tag;
  }

  async update(id: string, userId: string, updateTagDto: UpdateTagDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN' && user?.role !== 'MANAGER') {
      throw new ForbiddenException('Only admins and managers can update tags');
    }

    return this.prisma.tag.update({
      where: { id },
      data: updateTagDto,
    });
  }

  async remove(id: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN' && user?.role !== 'MANAGER') {
      throw new ForbiddenException('Only admins and managers can delete tags');
    }

    await this.prisma.tag.delete({
      where: { id },
    });

    return { message: 'Tag deleted successfully' };
  }
}

