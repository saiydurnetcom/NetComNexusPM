/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiClient } from './api-client';
import { ProjectRisk, ProjectBudgetItem, ProjectMilestone } from '../types';

// Project Risks Service
export const projectRisksService = {
  async getRisks(projectId: string): Promise<ProjectRisk[]> {
    const risks = await apiClient.getProjectRisks(projectId);
    return risks as ProjectRisk[];
  },

  async createRisk(
    data: Omit<ProjectRisk, 'id' | 'riskScore' | 'createdAt' | 'updatedAt' | 'createdBy'> & { mitigationOwnerId?: string }
  ): Promise<ProjectRisk> {
    const r = await apiClient.createProjectRisk(data.projectId, {
      title: data.title,
      description: data.description,
      riskCategory: data.riskCategory,
      probability: data.probability,
      impact: data.impact,
      status: data.status || 'identified',
      mitigationStrategy: data.mitigationStrategy,
      mitigationOwnerId: (data as any).mitigationOwnerId ?? (data as any).mitigationOwner,
      targetMitigationDate: data.targetMitigationDate,
    });
    return r as ProjectRisk;
  },

  async updateRisk(id: string, updates: Partial<ProjectRisk>): Promise<ProjectRisk> {
    const r = await apiClient.updateProjectRisk(id, {
      title: updates.title,
      description: updates.description,
      riskCategory: updates.riskCategory,
      probability: updates.probability,
      impact: updates.impact,
      status: updates.status,
      mitigationStrategy: updates.mitigationStrategy,
      mitigationOwnerId: (updates as any).mitigationOwnerId ?? (updates as any).mitigationOwner,
      targetMitigationDate: updates.targetMitigationDate as any,
      actualMitigationDate: updates.actualMitigationDate as any,
    });
    return r as ProjectRisk;
  },

  async deleteRisk(id: string): Promise<void> {
    await apiClient.deleteProjectRisk(id);
  },
};

// Project Budget Service
export const projectBudgetService = {
  async getBudgetItems(projectId: string): Promise<ProjectBudgetItem[]> {
    const items = await apiClient.getProjectBudget(projectId);
    return items as ProjectBudgetItem[];
  },

  async createBudgetItem(
    data: Omit<ProjectBudgetItem, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>
  ): Promise<ProjectBudgetItem> {
    const created = await apiClient.createProjectBudgetItem(data.projectId, {
      category: data.category,
      description: data.description,
      budgetedAmount: data.budgetedAmount,
      actualAmount: data.actualAmount || 0,
      currency: data.currency || 'USD',
    });
    return created as ProjectBudgetItem;
  },

  async updateBudgetItem(id: string, updates: Partial<ProjectBudgetItem>): Promise<ProjectBudgetItem> {
    const updated = await apiClient.updateProjectBudgetItem(id, {
      category: updates.category as any,
      description: updates.description as any,
      budgetedAmount: updates.budgetedAmount as any,
      actualAmount: updates.actualAmount as any,
      currency: updates.currency as any,
    });
    return updated as ProjectBudgetItem;
  },

  async deleteBudgetItem(id: string): Promise<void> {
    await apiClient.deleteProjectBudgetItem(id);
  },
};

// Project Milestones Service
export const projectMilestonesService = {
  async getMilestones(projectId: string): Promise<ProjectMilestone[]> {
    const milestones = await apiClient.getProjectMilestones(projectId);
    return milestones as ProjectMilestone[];
  },

  async createMilestone(
    data: Omit<ProjectMilestone, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'createdBy'>
  ): Promise<ProjectMilestone> {
    const created = await apiClient.createProjectMilestone(data.projectId, {
      name: data.name,
      description: data.description,
      targetDate: data.targetDate,
    });
    return created as ProjectMilestone;
  },

  async updateMilestone(id: string, updates: Partial<ProjectMilestone>): Promise<ProjectMilestone> {
    const updated = await apiClient.updateProjectMilestone(id, {
      name: updates.name as any,
      description: updates.description as any,
      targetDate: updates.targetDate as any,
      completedDate: updates.completedDate as any,
      status: updates.status as any,
    });
    return updated as ProjectMilestone;
  },

  async deleteMilestone(id: string): Promise<void> {
    await apiClient.deleteProjectMilestone(id);
  },
};

