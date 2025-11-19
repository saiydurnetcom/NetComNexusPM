import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { ProjectMembersService } from './project-members.service';
import { ProjectMilestonesService } from './project-milestones.service';
import { ProjectRisksService } from './project-risks.service';
import { ProjectBudgetService } from './project-budget.service';
import { ProjectReportsService } from './project-reports.service';

@Module({
  controllers: [ProjectsController],
  providers: [
    ProjectsService,
    ProjectMembersService,
    ProjectMilestonesService,
    ProjectRisksService,
    ProjectBudgetService,
    ProjectReportsService,
  ],
  exports: [
    ProjectsService,
    ProjectMembersService,
    ProjectMilestonesService,
    ProjectRisksService,
    ProjectBudgetService,
    ProjectReportsService,
  ],
})
export class ProjectsModule {}

