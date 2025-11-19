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
import { ProjectsService } from './projects.service';
import { ProjectMembersService } from './project-members.service';
import { ProjectMilestonesService } from './project-milestones.service';
import { ProjectRisksService } from './project-risks.service';
import { ProjectBudgetService } from './project-budget.service';
import { ProjectReportsService } from './project-reports.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { CreateRiskDto } from './dto/create-risk.dto';
import { UpdateRiskDto } from './dto/update-risk.dto';
import { CreateBudgetItemDto } from './dto/create-budget-item.dto';
import { UpdateBudgetItemDto } from './dto/update-budget-item.dto';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly projectMembersService: ProjectMembersService,
    private readonly projectMilestonesService: ProjectMilestonesService,
    private readonly projectRisksService: ProjectRisksService,
    private readonly projectBudgetService: ProjectBudgetService,
    private readonly projectReportsService: ProjectReportsService,
    private readonly prisma: PrismaService,
  ) { }

  @Post()
  create(@CurrentUser() user: any, @Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(user.id, createProjectDto);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.projectsService.findAll(user.id);
  }

  // Project Tags
  @Post(':id/tags')
  async updateTags(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('tagIds') tagIds: string[],
  ) {
    // Verify project exists and user has access
    await this.projectsService.findOne(id, user.id);

    // Delete existing tags
    await this.prisma.projectTag.deleteMany({
      where: { projectId: id },
    });

    // Add new tags
    if (tagIds && tagIds.length > 0) {
      await this.prisma.projectTag.createMany({
        data: tagIds.map(tagId => ({
          projectId: id,
          tagId,
        })),
        skipDuplicates: true,
      });
    }

    return { message: 'Tags updated successfully' };
  }

  @Get(':id/tags')
  async getTags(@Param('id') id: string) {
    return this.prisma.projectTag.findMany({
      where: { projectId: id },
      include: { tag: true },
    });
  }

  // Project Members
  @Post(':id/members')
  addMember(
    @CurrentUser() user: any,
    @Param('id') projectId: string,
    @Body() addMemberDto: AddProjectMemberDto,
  ) {
    return this.projectMembersService.addMember(projectId, user.id, addMemberDto);
  }

  @Get(':id/members')
  getMembers(@Param('id') projectId: string) {
    return this.projectMembersService.getMembers(projectId);
  }

  @Delete(':id/members/:memberId')
  removeMember(
    @CurrentUser() user: any,
    @Param('id') projectId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.projectMembersService.removeMember(projectId, memberId, user.id);
  }

  // Project Milestones
  @Post(':id/milestones')
  createMilestone(
    @CurrentUser() user: any,
    @Param('id') projectId: string,
    @Body() createMilestoneDto: CreateMilestoneDto,
  ) {
    return this.projectMilestonesService.create(projectId, user.id, createMilestoneDto);
  }

  @Get(':id/milestones')
  getMilestones(@Param('id') projectId: string) {
    return this.projectMilestonesService.findAll(projectId);
  }

  @Patch('milestones/:id')
  updateMilestone(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateMilestoneDto: UpdateMilestoneDto,
  ) {
    return this.projectMilestonesService.update(id, user.id, updateMilestoneDto);
  }

  @Delete('milestones/:id')
  removeMilestone(@CurrentUser() user: any, @Param('id') id: string) {
    return this.projectMilestonesService.remove(id, user.id);
  }

  // Project Risks
  @Post(':id/risks')
  createRisk(
    @CurrentUser() user: any,
    @Param('id') projectId: string,
    @Body() createRiskDto: CreateRiskDto,
  ) {
    return this.projectRisksService.create(projectId, user.id, createRiskDto);
  }

  @Get(':id/risks')
  getRisks(@Param('id') projectId: string) {
    return this.projectRisksService.findAll(projectId);
  }

  @Patch('risks/:id')
  updateRisk(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateRiskDto: UpdateRiskDto,
  ) {
    return this.projectRisksService.update(id, user.id, updateRiskDto);
  }

  @Delete('risks/:id')
  removeRisk(@CurrentUser() user: any, @Param('id') id: string) {
    return this.projectRisksService.remove(id, user.id);
  }

  // Project Budget
  @Post(':id/budget')
  createBudgetItem(
    @CurrentUser() user: any,
    @Param('id') projectId: string,
    @Body() createBudgetItemDto: CreateBudgetItemDto,
  ) {
    return this.projectBudgetService.createItem(projectId, user.id, createBudgetItemDto);
  }

  @Get(':id/budget')
  getBudgetItems(@Param('id') projectId: string) {
    return this.projectBudgetService.findAllItems(projectId);
  }

  @Patch('budget/:id')
  updateBudgetItem(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateBudgetItemDto: UpdateBudgetItemDto,
  ) {
    return this.projectBudgetService.updateItem(id, user.id, updateBudgetItemDto);
  }

  @Delete('budget/:id')
  removeBudgetItem(@CurrentUser() user: any, @Param('id') id: string) {
    return this.projectBudgetService.removeItem(id, user.id);
  }

  // Project Reports
  @Post(':id/reports')
  createReport(
    @CurrentUser() user: any,
    @Param('id') projectId: string,
    @Body() createReportDto: CreateReportDto,
  ) {
    return this.projectReportsService.create(projectId, user.id, createReportDto);
  }

  @Get('reports')
  findAllReports(@Query('projectId') projectId?: string) {
    return this.projectReportsService.findAll(projectId);
  }

  @Get('reports/:id')
  findOneReport(@Param('id') id: string) {
    return this.projectReportsService.findOne(id);
  }

  @Patch('reports/:id')
  updateReport(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateReportDto: UpdateReportDto,
  ) {
    return this.projectReportsService.update(id, user.id, updateReportDto);
  }

  @Delete('reports/:id')
  removeReport(@CurrentUser() user: any, @Param('id') id: string) {
    return this.projectReportsService.remove(id, user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.projectsService.findOne(id, user.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, user.id, updateProjectDto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.projectsService.remove(id, user.id);
  }
}
