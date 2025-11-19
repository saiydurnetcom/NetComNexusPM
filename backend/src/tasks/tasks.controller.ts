import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TaskCommentsService } from './task-comments.service';
import { TaskDependenciesService } from './task-dependencies.service';
import { TaskAttachmentsService } from './task-attachments.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CreateDependencyDto } from './dto/create-dependency.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly taskCommentsService: TaskCommentsService,
    private readonly taskDependenciesService: TaskDependenciesService,
    private readonly taskAttachmentsService: TaskAttachmentsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  create(@CurrentUser() user: any, @Body() createTaskDto: CreateTaskDto) {
    return this.tasksService.create(user.id, createTaskDto);
  }

  @Get()
  findAll(@CurrentUser() user: any, @Query('projectId') projectId?: string) {
    return this.tasksService.findAll(user.id, projectId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.tasksService.findOne(id, user.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.tasksService.update(id, user.id, updateTaskDto);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.tasksService.update(id, user.id, { status: status as any });
  }

  @Post(':id/tags')
  async updateTags(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('tagIds') tagIds: string[],
  ) {
    // Verify task exists and user has access
    await this.tasksService.findOne(id, user.id);
    
    // Delete existing tags
    await this.prisma.taskTag.deleteMany({
      where: { taskId: id },
    });
    
    // Add new tags
    if (tagIds && tagIds.length > 0) {
      await this.prisma.taskTag.createMany({
        data: tagIds.map(tagId => ({
          taskId: id,
          tagId,
        })),
        skipDuplicates: true,
      });
    }
    
    return { message: 'Tags updated successfully' };
  }

  @Get(':id/tags')
  async getTags(@Param('id') id: string) {
    return this.prisma.taskTag.findMany({
      where: { taskId: id },
      include: { tag: true },
    });
  }

  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.tasksService.remove(id, user.id);
  }

  // Task Comments
  @Post(':id/comments')
  createComment(
    @CurrentUser() user: any,
    @Param('id') taskId: string,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    return this.taskCommentsService.create(taskId, user.id, createCommentDto);
  }

  @Get(':id/comments')
  getComments(@Param('id') taskId: string) {
    return this.taskCommentsService.findAll(taskId);
  }

  @Patch('comments/:id')
  updateComment(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateCommentDto: UpdateCommentDto,
  ) {
    return this.taskCommentsService.update(id, user.id, updateCommentDto);
  }

  @Delete('comments/:id')
  removeComment(@CurrentUser() user: any, @Param('id') id: string) {
    return this.taskCommentsService.remove(id, user.id);
  }

  // Task Dependencies
  @Post(':id/dependencies')
  createDependency(
    @CurrentUser() user: any,
    @Param('id') taskId: string,
    @Body() createDependencyDto: CreateDependencyDto,
  ) {
    return this.taskDependenciesService.create(taskId, createDependencyDto);
  }

  @Get(':id/dependencies')
  getDependencies(@Param('id') taskId: string) {
    return this.taskDependenciesService.findAll(taskId);
  }

  @Delete('dependencies/:id')
  removeDependency(@Param('id') id: string) {
    return this.taskDependenciesService.remove(id);
  }

  // Task Attachments
  @Get(':id/attachments')
  getAttachments(@Param('id') taskId: string) {
    return this.taskAttachmentsService.findAll(taskId);
  }

  @Delete('attachments/:id')
  removeAttachment(@CurrentUser() user: any, @Param('id') id: string) {
    return this.taskAttachmentsService.remove(id, user.id);
  }
}
