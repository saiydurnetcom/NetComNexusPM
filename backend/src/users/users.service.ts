import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        teamId: true,
        departmentId: true,
        createdAt: true,
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        teamId: true,
        departmentId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async create(createUserDto: CreateUserDto) {
    const { email, firstName, lastName } = createUserDto;
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail || !firstName || !lastName) {
      throw new BadRequestException('email, firstName and lastName are required');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Normalize role: fallback to MEMBER
    let role: Role = Role.MEMBER;
    if (createUserDto.role) {
      role = createUserDto.role;
    }

    // Hash password (generate if not provided - though frontend typically provides one)
    const passwordToHash =
      createUserDto.password && createUserDto.password.length >= 6
        ? createUserDto.password
        : Math.random().toString(36).slice(-12);
    const hashedPassword = await bcrypt.hash(passwordToHash, 10);

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        role,
        isActive: createUserDto.isActive ?? true,
        teamId: createUserDto.teamId || null,
        departmentId: createUserDto.departmentId || null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        teamId: true,
        departmentId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        teamId: true,
        departmentId: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async getCurrentUserRole(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    return user?.role || 'MEMBER';
  }
}

