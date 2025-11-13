import { supabase } from './supabase';
import { ProjectRisk, ProjectBudgetItem, ProjectMilestone } from '../types';

// Project Risks Service
export const projectRisksService = {
  async getRisks(projectId: string): Promise<ProjectRisk[]> {
    // Try camelCase first (migrations use quoted identifiers)
    let result = await supabase
      .from('project_risks')
      .select('*')
      .eq('projectId', projectId)
      .order('riskScore', { ascending: false });

    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column')
    )) {
      result = await supabase
        .from('project_risks')
        .select('*')
        .eq('projectid', projectId)
        .order('riskscore', { ascending: false });
    }

    // If table doesn't exist, return empty array
    if (result.error && (
      result.error.code === '42P01' || 
      result.error.code === 'PGRST202' ||
      result.error.message?.includes('does not exist')
    )) {
      return [];
    }

    if (result.error) throw result.error;

    return (result.data || []).map((r: any) => ({
      id: r.id,
      projectId: r.projectId || r.projectid || r.project_id,
      title: r.title,
      description: r.description,
      riskCategory: r.riskCategory || r.riskcategory || r.risk_category,
      probability: r.probability,
      impact: r.impact,
      riskScore: r.riskScore || r.riskscore || r.risk_score || 0,
      status: r.status,
      mitigationStrategy: r.mitigationStrategy || r.mitigationstrategy || r.mitigation_strategy,
      mitigationOwner: r.mitigationOwner || r.mitigationowner || r.mitigation_owner,
      targetMitigationDate: r.targetMitigationDate || r.targetmitigationdate || r.target_mitigation_date,
      actualMitigationDate: r.actualMitigationDate || r.actualmitigationdate || r.actual_mitigation_date,
      createdBy: r.createdBy || r.createdby || r.created_by,
      createdAt: r.createdAt || r.createdat || r.created_at,
      updatedAt: r.updatedAt || r.updatedat || r.updated_at,
    }));
  },

  async createRisk(data: Omit<ProjectRisk, 'id' | 'riskScore' | 'createdAt' | 'updatedAt'>): Promise<ProjectRisk> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Calculate risk score based on probability and impact
    const riskScoreMap: Record<string, number> = {
      'low': 1,
      'medium': 2,
      'high': 3,
      'critical': 4,
    };
    const probabilityScore = riskScoreMap[data.probability] || 2;
    const impactScore = riskScoreMap[data.impact] || 2;
    const calculatedRiskScore = probabilityScore * impactScore;

    // Try camelCase first (migrations use quoted identifiers)
    let result = await supabase
      .from('project_risks')
      .insert({
        projectId: data.projectId,
        title: data.title,
        description: data.description,
        riskCategory: data.riskCategory,
        probability: data.probability,
        impact: data.impact,
        riskScore: calculatedRiskScore,
        status: data.status || 'identified',
        mitigationStrategy: data.mitigationStrategy,
        mitigationOwner: data.mitigationOwner,
        targetMitigationDate: data.targetMitigationDate,
        createdBy: user.id,
      })
      .select('*')
      .single();

    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column')
    )) {
      result = await supabase
        .from('project_risks')
        .insert({
          projectid: data.projectId,
          title: data.title,
          description: data.description,
          riskcategory: data.riskCategory,
          probability: data.probability,
          impact: data.impact,
          riskscore: calculatedRiskScore,
          status: data.status || 'identified',
          mitigationstrategy: data.mitigationStrategy,
          mitigationowner: data.mitigationOwner,
          targetmitigationdate: data.targetMitigationDate,
          createdby: user.id,
        })
        .select('*')
        .single();
    }

    if (result.error) throw result.error;

    const r = result.data;
    
    // Calculate risk score
    const riskScoreMap: Record<string, number> = {
      'low': 1,
      'medium': 2,
      'high': 3,
      'critical': 4,
    };
    const probabilityScore = riskScoreMap[r.probability] || 2;
    const impactScore = riskScoreMap[r.impact] || 2;
    const calculatedRiskScore = probabilityScore * impactScore;
    
    return {
      id: r.id,
      projectId: r.projectId || r.projectid || r.project_id,
      title: r.title,
      description: r.description,
      riskCategory: r.riskCategory || r.riskcategory || r.risk_category,
      probability: r.probability,
      impact: r.impact,
      riskScore: r.riskScore || r.riskscore || r.risk_score || calculatedRiskScore,
      status: r.status,
      mitigationStrategy: r.mitigationStrategy || r.mitigationstrategy || r.mitigation_strategy,
      mitigationOwner: r.mitigationOwner || r.mitigationowner || r.mitigation_owner,
      targetMitigationDate: r.targetMitigationDate || r.targetmitigationdate || r.target_mitigation_date,
      actualMitigationDate: r.actualMitigationDate || r.actualmitigationdate || r.actual_mitigation_date,
      createdBy: r.createdBy || r.createdby || r.created_by,
      createdAt: r.createdAt || r.createdat || r.created_at,
      updatedAt: r.updatedAt || r.updatedat || r.updated_at,
    };
  },

  async updateRisk(id: string, updates: Partial<ProjectRisk>): Promise<ProjectRisk> {
    // Try camelCase first (migrations use quoted identifiers)
    const updateDataCamel: any = {};
    if (updates.title !== undefined) updateDataCamel.title = updates.title;
    if (updates.description !== undefined) updateDataCamel.description = updates.description;
    if (updates.riskCategory !== undefined) updateDataCamel.riskCategory = updates.riskCategory;
    if (updates.probability !== undefined) updateDataCamel.probability = updates.probability;
    if (updates.impact !== undefined) updateDataCamel.impact = updates.impact;
    if (updates.status !== undefined) updateDataCamel.status = updates.status;
    if (updates.mitigationStrategy !== undefined) updateDataCamel.mitigationStrategy = updates.mitigationStrategy;
    if (updates.mitigationOwner !== undefined) updateDataCamel.mitigationOwner = updates.mitigationOwner;
    if (updates.targetMitigationDate !== undefined) updateDataCamel.targetMitigationDate = updates.targetMitigationDate;
    if (updates.actualMitigationDate !== undefined) updateDataCamel.actualMitigationDate = updates.actualMitigationDate;
    
    // Recalculate risk score if probability or impact changed
    if (updates.probability !== undefined || updates.impact !== undefined) {
      const riskScoreMap: Record<string, number> = {
        'low': 1,
        'medium': 2,
        'high': 3,
        'critical': 4,
      };
      // Get current values or use updates
      const probability = updates.probability || 'medium';
      const impact = updates.impact || 'medium';
      const probabilityScore = riskScoreMap[probability] || 2;
      const impactScore = riskScoreMap[impact] || 2;
      updateDataCamel.riskScore = probabilityScore * impactScore;
    }

    let result = await supabase
      .from('project_risks')
      .update(updateDataCamel)
      .eq('id', id)
      .select('*')
      .single();

    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column')
    )) {
      const updateDataLower: any = {};
      if (updates.title !== undefined) updateDataLower.title = updates.title;
      if (updates.description !== undefined) updateDataLower.description = updates.description;
      if (updates.riskCategory !== undefined) updateDataLower.riskcategory = updates.riskCategory;
      if (updates.probability !== undefined) updateDataLower.probability = updates.probability;
      if (updates.impact !== undefined) updateDataLower.impact = updates.impact;
      if (updates.status !== undefined) updateDataLower.status = updates.status;
      if (updates.mitigationStrategy !== undefined) updateDataLower.mitigationstrategy = updates.mitigationStrategy;
      if (updates.mitigationOwner !== undefined) updateDataLower.mitigationowner = updates.mitigationOwner;
      if (updates.targetMitigationDate !== undefined) updateDataLower.targetmitigationdate = updates.targetMitigationDate;
      if (updates.actualMitigationDate !== undefined) updateDataLower.actualmitigationdate = updates.actualMitigationDate;
      
      // Recalculate risk score if probability or impact changed
      if (updates.probability !== undefined || updates.impact !== undefined) {
        const riskScoreMap: Record<string, number> = {
          'low': 1,
          'medium': 2,
          'high': 3,
          'critical': 4,
        };
        const probability = updates.probability || 'medium';
        const impact = updates.impact || 'medium';
        const probabilityScore = riskScoreMap[probability] || 2;
        const impactScore = riskScoreMap[impact] || 2;
        updateDataLower.riskscore = probabilityScore * impactScore;
      }

      result = await supabase
        .from('project_risks')
        .update(updateDataLower)
        .eq('id', id)
        .select('*')
        .single();
    }

    if (result.error) throw result.error;

    const r = result.data;
    
    // Calculate risk score if not present
    const riskScoreMap: Record<string, number> = {
      'low': 1,
      'medium': 2,
      'high': 3,
      'critical': 4,
    };
    const probabilityScore = riskScoreMap[r.probability] || 2;
    const impactScore = riskScoreMap[r.impact] || 2;
    const calculatedRiskScore = probabilityScore * impactScore;
    
    return {
      id: r.id,
      projectId: r.projectId || r.projectid || r.project_id,
      title: r.title,
      description: r.description,
      riskCategory: r.riskCategory || r.riskcategory || r.risk_category,
      probability: r.probability,
      impact: r.impact,
      riskScore: r.riskScore || r.riskscore || r.risk_score || calculatedRiskScore,
      status: r.status,
      mitigationStrategy: r.mitigationStrategy || r.mitigationstrategy || r.mitigation_strategy,
      mitigationOwner: r.mitigationOwner || r.mitigationowner || r.mitigation_owner,
      targetMitigationDate: r.targetMitigationDate || r.targetmitigationdate || r.target_mitigation_date,
      actualMitigationDate: r.actualMitigationDate || r.actualmitigationdate || r.actual_mitigation_date,
      createdBy: r.createdBy || r.createdby || r.created_by,
      createdAt: r.createdAt || r.createdat || r.created_at,
      updatedAt: r.updatedAt || r.updatedat || r.updated_at,
    };
  },

  async deleteRisk(id: string): Promise<void> {
    const { error } = await supabase
      .from('project_risks')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

// Project Budget Service
export const projectBudgetService = {
  async getBudgetItems(projectId: string): Promise<ProjectBudgetItem[]> {
    // Try camelCase first (migrations use quoted identifiers)
    let result = await supabase
      .from('project_budget_items')
      .select('*')
      .eq('projectId', projectId)
      .order('createdAt', { ascending: false });

    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column') ||
      result.error.message?.includes('projectid')
    )) {
      result = await supabase
        .from('project_budget_items')
        .select('*')
        .eq('projectid', projectId)
        .order('createdat', { ascending: false });
    }

    // If table doesn't exist, return empty array
    if (result.error && (
      result.error.code === '42P01' || 
      result.error.code === 'PGRST202' ||
      result.error.message?.includes('does not exist')
    )) {
      return [];
    }

    if (result.error) throw result.error;

    return (result.data || []).map((b: any) => ({
      id: b.id,
      projectId: b.projectId || b.projectid || b.project_id,
      category: b.category,
      description: b.description,
      budgetedAmount: parseFloat(b.budgetedAmount || b.budgetedamount || b.budgeted_amount || 0),
      actualAmount: parseFloat(b.actualAmount || b.actualamount || b.actual_amount || 0),
      currency: b.currency || 'USD',
      createdBy: b.createdBy || b.createdby || b.created_by,
      createdAt: b.createdAt || b.createdat || b.created_at,
      updatedAt: b.updatedAt || b.updatedat || b.updated_at,
    }));
  },

  async createBudgetItem(data: Omit<ProjectBudgetItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProjectBudgetItem> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Try camelCase first (migrations use quoted identifiers)
    let result = await supabase
      .from('project_budget_items')
      .insert({
        projectId: data.projectId,
        category: data.category,
        description: data.description,
        budgetedAmount: data.budgetedAmount,
        actualAmount: data.actualAmount || 0,
        currency: data.currency || 'USD',
        createdBy: user.id,
      })
      .select('*')
      .single();

    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column')
    )) {
      result = await supabase
        .from('project_budget_items')
        .insert({
          projectid: data.projectId,
          category: data.category,
          description: data.description,
          budgetedamount: data.budgetedAmount,
          actualamount: data.actualAmount || 0,
          currency: data.currency || 'USD',
          createdby: user.id,
        })
        .select('*')
        .single();
    }

    if (result.error) throw result.error;

    const b = result.data;
    return {
      id: b.id,
      projectId: b.projectId || b.projectid || b.project_id,
      category: b.category,
      description: b.description,
      budgetedAmount: parseFloat(b.budgetedAmount || b.budgetedamount || b.budgeted_amount || 0),
      actualAmount: parseFloat(b.actualAmount || b.actualamount || b.actual_amount || 0),
      currency: b.currency || 'USD',
      createdBy: b.createdBy || b.createdby || b.created_by,
      createdAt: b.createdAt || b.createdat || b.created_at,
      updatedAt: b.updatedAt || b.updatedat || b.updated_at,
    };
  },

  async updateBudgetItem(id: string, updates: Partial<ProjectBudgetItem>): Promise<ProjectBudgetItem> {
    // Try camelCase first (migrations use quoted identifiers)
    const updateDataCamel: any = {};
    if (updates.category !== undefined) updateDataCamel.category = updates.category;
    if (updates.description !== undefined) updateDataCamel.description = updates.description;
    if (updates.budgetedAmount !== undefined) updateDataCamel.budgetedAmount = updates.budgetedAmount;
    if (updates.actualAmount !== undefined) updateDataCamel.actualAmount = updates.actualAmount;
    if (updates.currency !== undefined) updateDataCamel.currency = updates.currency;

    let result = await supabase
      .from('project_budget_items')
      .update(updateDataCamel)
      .eq('id', id)
      .select('*')
      .single();

    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column')
    )) {
      const updateDataLower: any = {};
      if (updates.category !== undefined) updateDataLower.category = updates.category;
      if (updates.description !== undefined) updateDataLower.description = updates.description;
      if (updates.budgetedAmount !== undefined) updateDataLower.budgetedamount = updates.budgetedAmount;
      if (updates.actualAmount !== undefined) updateDataLower.actualamount = updates.actualAmount;
      if (updates.currency !== undefined) updateDataLower.currency = updates.currency;

      result = await supabase
        .from('project_budget_items')
        .update(updateDataLower)
        .eq('id', id)
        .select('*')
        .single();
    }

    if (result.error) throw result.error;

    const b = result.data;
    return {
      id: b.id,
      projectId: b.projectId || b.projectid || b.project_id,
      category: b.category,
      description: b.description,
      budgetedAmount: parseFloat(b.budgetedAmount || b.budgetedamount || b.budgeted_amount || 0),
      actualAmount: parseFloat(b.actualAmount || b.actualamount || b.actual_amount || 0),
      currency: b.currency || 'USD',
      createdBy: b.createdBy || b.createdby || b.created_by,
      createdAt: b.createdAt || b.createdat || b.created_at,
      updatedAt: b.updatedAt || b.updatedat || b.updated_at,
    };
  },

  async deleteBudgetItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('project_budget_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

// Project Milestones Service
export const projectMilestonesService = {
  async getMilestones(projectId: string): Promise<ProjectMilestone[]> {
    // Try camelCase first (migrations use quoted identifiers)
    let result = await supabase
      .from('project_milestones')
      .select('*')
      .eq('projectId', projectId)
      .order('targetDate', { ascending: true });

    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column') ||
      result.error.message?.includes('projectid')
    )) {
      result = await supabase
        .from('project_milestones')
        .select('*')
        .eq('projectid', projectId)
        .order('targetdate', { ascending: true });
    }

    // If table doesn't exist, return empty array
    if (result.error && (
      result.error.code === '42P01' || 
      result.error.code === 'PGRST202' ||
      result.error.message?.includes('does not exist')
    )) {
      return [];
    }

    if (result.error) throw result.error;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return (result.data || []).map((m: any) => {
      const targetDate = m.targetDate || m.targetdate || m.target_date;
      const completedDate = m.completedDate || m.completeddate || m.completed_date;
      let status = m.status || 'pending';
      
      // Auto-calculate status if not explicitly set
      if (!completedDate && targetDate) {
        const target = new Date(targetDate);
        target.setHours(0, 0, 0, 0);
        if (target < today) {
          status = 'overdue';
        }
      }
      
      return {
        id: m.id,
        projectId: m.projectId || m.projectid || m.project_id,
        name: m.name,
        description: m.description,
        targetDate: targetDate,
        completedDate: completedDate,
        status: status as 'pending' | 'completed' | 'overdue',
        createdBy: m.createdBy || m.createdby || m.created_by,
        createdAt: m.createdAt || m.createdat || m.created_at,
        updatedAt: m.updatedAt || m.updatedat || m.updated_at,
      };
    });
  },

  async createMilestone(data: Omit<ProjectMilestone, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<ProjectMilestone> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Try camelCase first (migrations use quoted identifiers)
    let result = await supabase
      .from('project_milestones')
      .insert({
        projectId: data.projectId,
        name: data.name,
        description: data.description,
        targetDate: data.targetDate,
        createdBy: user.id,
      })
      .select('*')
      .single();

    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column')
    )) {
      result = await supabase
        .from('project_milestones')
        .insert({
          projectid: data.projectId,
          name: data.name,
          description: data.description,
          targetdate: data.targetDate,
          createdby: user.id,
        })
        .select('*')
        .single();
    }

    if (result.error) throw result.error;

    const m = result.data;
    return {
      id: m.id,
      projectId: m.projectId || m.projectid || m.project_id,
      name: m.name,
      description: m.description,
      targetDate: m.targetDate || m.targetdate || m.target_date,
      completedDate: m.completedDate || m.completeddate || m.completed_date,
      status: m.status || 'pending',
      createdBy: m.createdBy || m.createdby || m.created_by,
      createdAt: m.createdAt || m.createdat || m.created_at,
      updatedAt: m.updatedAt || m.updatedat || m.updated_at,
    };
  },

  async updateMilestone(id: string, updates: Partial<ProjectMilestone>): Promise<ProjectMilestone> {
    // Try camelCase first (migrations use quoted identifiers)
    const updateDataCamel: any = {};
    if (updates.name !== undefined) updateDataCamel.name = updates.name;
    if (updates.description !== undefined) updateDataCamel.description = updates.description;
    if (updates.targetDate !== undefined) updateDataCamel.targetDate = updates.targetDate;
    if (updates.completedDate !== undefined) updateDataCamel.completedDate = updates.completedDate;
    if (updates.status !== undefined) updateDataCamel.status = updates.status;

    let result = await supabase
      .from('project_milestones')
      .update(updateDataCamel)
      .eq('id', id)
      .select('*')
      .single();

    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column')
    )) {
      const updateDataLower: any = {};
      if (updates.name !== undefined) updateDataLower.name = updates.name;
      if (updates.description !== undefined) updateDataLower.description = updates.description;
      if (updates.targetDate !== undefined) updateDataLower.targetdate = updates.targetDate;
      if (updates.completedDate !== undefined) updateDataLower.completeddate = updates.completedDate;
      if (updates.status !== undefined) updateDataLower.status = updates.status;

      result = await supabase
        .from('project_milestones')
        .update(updateDataLower)
        .eq('id', id)
        .select('*')
        .single();
    }

    if (result.error) throw result.error;

    const m = result.data;
    return {
      id: m.id,
      projectId: m.projectId || m.projectid || m.project_id,
      name: m.name,
      description: m.description,
      targetDate: m.targetDate || m.targetdate || m.target_date,
      completedDate: m.completedDate || m.completeddate || m.completed_date,
      status: m.status,
      createdBy: m.createdBy || m.createdby || m.created_by,
      createdAt: m.createdAt || m.createdat || m.created_at,
      updatedAt: m.updatedAt || m.updatedat || m.updated_at,
    };
  },

  async deleteMilestone(id: string): Promise<void> {
    const { error } = await supabase
      .from('project_milestones')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

