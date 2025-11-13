import { supabase } from './supabase';
import { User, Team, Department, AllowedDomain, Tag } from '../types';

export const adminService = {
  // Users
  async getUsers(): Promise<User[]> {
    // Try lowercase first (PostgreSQL lowercases unquoted identifiers)
    let result = await supabase
      .from('users')
      .select('id, email, firstname, lastname, role, isactive, teamid, departmentid, createdat, updatedat')
      .order('createdat', { ascending: false });
    
    // If lowercase fails, try camelCase
    if (result.error && (result.error.code === 'PGRST204' || result.error.message?.includes('column') || result.error.message?.includes('createdat'))) {
      result = await supabase
        .from('users')
        .select('id, email, firstName, lastName, role, isActive, teamId, departmentId, createdAt, updatedAt')
        .order('createdAt', { ascending: false });
    }
    
    // If that also fails, try select('*') as last resort
    if (result.error && (result.error.code === 'PGRST204' || result.error.message?.includes('column'))) {
      result = await supabase
        .from('users')
        .select('*')
        .order('createdat', { ascending: false });
    }
    
    if (result.error) {
      // If table doesn't exist, return empty array instead of throwing
      if (result.error.code === '42P01' || result.error.code === 'PGRST202' || result.error.message?.includes('does not exist')) {
        console.warn('Users table does not exist. Please run the migration.');
        return [];
      }
      console.error('Error loading users:', result.error);
      // Return empty array instead of throwing to prevent UI crash
      return [];
    }
    
    // Normalize column names (handle both camelCase and lowercase)
    return (result.data || []).map((user: any) => ({
      ...user,
      firstName: user.firstName || user.firstname || user.first_name || '',
      lastName: user.lastName || user.lastname || user.last_name || '',
      isActive: user.isActive !== undefined ? user.isActive : (user.isactive !== undefined ? user.isactive : (user.is_active !== undefined ? user.is_active : true)),
      teamId: user.teamId || user.teamid || user.team_id || null,
      departmentId: user.departmentId || user.departmentid || user.department_id || null,
      createdAt: user.createdAt || user.createdat || user.created_at,
      updatedAt: user.updatedAt || user.updatedat || user.updated_at,
    }));
  },

  async getUserById(id: string): Promise<User | null> {
    // Try lowercase first (PostgreSQL lowercases unquoted identifiers)
    let result = await supabase
      .from('users')
      .select('id, email, firstname, lastname, role, isactive, teamid, departmentid, createdat, updatedat')
      .eq('id', id)
      .single();
    
    // If lowercase fails, try camelCase
    if (result.error && (result.error.code === 'PGRST204' || result.error.message?.includes('column'))) {
      result = await supabase
        .from('users')
        .select('id, email, firstName, lastName, role, isActive, teamId, departmentId, createdAt, updatedAt')
        .eq('id', id)
        .single();
    }
    
    // If that also fails, try select('*')
    if (result.error && (result.error.code === 'PGRST204' || result.error.message?.includes('column'))) {
      result = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
    }
    
    if (result.error) {
      if (result.error.code === 'PGRST116') return null; // No rows returned
      throw result.error;
    }
    
    // Normalize the returned data
    const user = result.data;
    return {
      ...user,
      firstName: user.firstName || user.firstname || user.first_name || '',
      lastName: user.lastName || user.lastname || user.last_name || '',
      isActive: user.isActive !== undefined ? user.isActive : (user.isactive !== undefined ? user.isactive : (user.is_active !== undefined ? user.is_active : true)),
      teamId: user.teamId || user.teamid || user.team_id || null,
      departmentId: user.departmentId || user.departmentid || user.department_id || null,
      createdAt: user.createdAt || user.createdat || user.created_at,
      updatedAt: user.updatedAt || user.updatedat || user.updated_at,
    };
  },

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    // Build update object with lowercase column names first
    const updateDataLower: any = {};
    const updateDataCamel: any = {};
    
    if (updates.email !== undefined) {
      updateDataLower.email = updates.email;
      updateDataCamel.email = updates.email;
    }
    if (updates.firstName !== undefined) {
      updateDataLower.firstname = updates.firstName;
      updateDataCamel.firstName = updates.firstName;
    }
    if (updates.lastName !== undefined) {
      updateDataLower.lastname = updates.lastName;
      updateDataCamel.lastName = updates.lastName;
    }
    if (updates.role !== undefined) {
      updateDataLower.role = updates.role;
      updateDataCamel.role = updates.role;
    }
    if (updates.isActive !== undefined) {
      updateDataLower.isactive = updates.isActive;
      updateDataCamel.isActive = updates.isActive;
    }
    if (updates.teamId !== undefined) {
      updateDataLower.teamid = updates.teamId;
      updateDataCamel.teamId = updates.teamId;
    }
    if (updates.departmentId !== undefined) {
      updateDataLower.departmentid = updates.departmentId;
      updateDataCamel.departmentId = updates.departmentId;
    }
    updateDataLower.updatedat = new Date().toISOString();
    updateDataCamel.updatedAt = new Date().toISOString();

    // Try lowercase first (PostgreSQL lowercases unquoted identifiers)
    // Use specific column names in SELECT to avoid schema cache issues
    let result = await supabase
      .from('users')
      .update(updateDataLower)
      .eq('id', id)
      .select('id, email, firstname, lastname, role, isactive, teamid, departmentid, createdat, updatedat')
      .single();
    
    // If lowercase fails, try camelCase
    if (result.error && (result.error.code === 'PGRST204' || result.error.message?.includes('column'))) {
      result = await supabase
        .from('users')
        .update(updateDataCamel)
        .eq('id', id)
        .select('id, email, firstName, lastName, role, isActive, teamId, departmentId, createdAt, updatedAt')
        .single();
    }
    
    // If that also fails, try select('*')
    if (result.error && (result.error.code === 'PGRST204' || result.error.message?.includes('column'))) {
      result = await supabase
        .from('users')
        .update(updateDataLower)
        .eq('id', id)
        .select('*')
        .single();
    }
    
    if (result.error) throw result.error;
    
    // Normalize the returned data
    const user = result.data;
    return {
      ...user,
      firstName: user.firstName || user.firstname || user.first_name || '',
      lastName: user.lastName || user.lastname || user.last_name || '',
      isActive: user.isActive !== undefined ? user.isActive : (user.isactive !== undefined ? user.isactive : (user.is_active !== undefined ? user.is_active : true)),
      teamId: user.teamId || user.teamid || user.team_id || null,
      departmentId: user.departmentId || user.departmentid || user.department_id || null,
      createdAt: user.createdAt || user.createdat || user.created_at,
      updatedAt: user.updatedAt || user.updatedat || user.updated_at,
    };
  },

  async syncUsersFromAuth(): Promise<void> {
    // Note: This requires service role access or a database function
    // For now, we'll use a SQL function approach
    // The migration should have created a sync function
    const { error } = await supabase.rpc('sync_users_from_auth');
    if (error) {
      // If RPC function doesn't exist, try manual sync
      if (error.code === '42883' || error.code === 'PGRST202' || error.message?.includes('does not exist') || error.message?.includes('function')) {
        console.warn('sync_users_from_auth function does not exist. Attempting manual sync...');
        // Fallback: Try to get current user and sync manually
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Try lowercase first (PostgreSQL lowercases unquoted identifiers)
          let result = await supabase
            .from('users')
            .upsert({
              id: user.id,
              email: user.email || '',
              firstname: user.user_metadata?.firstName || '',
              lastname: user.user_metadata?.lastName || '',
              role: user.user_metadata?.role || 'member',
              isactive: true,
              createdat: user.created_at,
              updatedat: new Date().toISOString(),
            }, {
              onConflict: 'id',
            });
          
          // If lowercase fails, try camelCase
          if (result.error && (result.error.code === 'PGRST204' || result.error.message?.includes('column'))) {
            result = await supabase
              .from('users')
              .upsert({
                id: user.id,
                email: user.email || '',
                firstName: user.user_metadata?.firstName || '',
                lastName: user.user_metadata?.lastName || '',
                role: user.user_metadata?.role || 'member',
                isActive: true,
                createdAt: user.created_at,
                updatedAt: new Date().toISOString(),
              }, {
                onConflict: 'id',
              });
          }
          
          if (result.error) {
            throw new Error(`Failed to sync user: ${result.error.message}. Please ensure the users table exists and run the migration.`);
          }
          return; // Successfully synced current user
        }
        throw new Error('No authenticated user found. Please log in first.');
      }
      // Other errors
      throw new Error(`Failed to sync users: ${error.message}. Please run the sync_users_from_auth function migration.`);
    }
  },

  // Teams
  async getTeams(): Promise<Team[]> {
    // Try lowercase first (PostgreSQL lowercases unquoted identifiers)
    let result = await supabase
      .from('teams')
      .select('id, name, description, departmentid, teamleadid, createdby, createdat, updatedat')
      .order('name');
    
    // If lowercase fails, try camelCase
    if (result.error && (result.error.code === 'PGRST204' || result.error.message?.includes('column'))) {
      result = await supabase
        .from('teams')
        .select('id, name, description, departmentId, teamLeadId, createdBy, createdAt, updatedAt')
        .order('name');
    }
    
    // If that also fails, try select('*') as last resort
    if (result.error && (result.error.code === 'PGRST204' || result.error.message?.includes('column'))) {
      result = await supabase
        .from('teams')
        .select('*')
        .order('name');
    }
    
    if (result.error) {
      if (result.error.code === '42P01' || result.error.code === 'PGRST202' || result.error.message?.includes('does not exist')) {
        console.warn('Teams table does not exist. Please run the migration.');
        return [];
      }
      console.error('Error loading teams:', result.error);
      // Return empty array instead of throwing to prevent UI crash
      return [];
    }
    
    // Normalize column names (handle both camelCase and lowercase)
    return (result.data || []).map((team: any) => ({
      ...team,
      departmentId: team.departmentId || team.departmentid || null,
      teamLeadId: team.teamLeadId || team.teamleadid || null,
      createdAt: team.createdAt || team.createdat || team.created_at,
      updatedAt: team.updatedAt || team.updatedat || team.updated_at,
    }));
  },

  async createTeam(data: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>): Promise<Team> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Try lowercase first (PostgreSQL lowercases unquoted identifiers)
    let result = await supabase
      .from('teams')
      .insert({
        name: data.name,
        description: data.description,
        departmentid: data.departmentId || null,
        teamleadid: data.teamLeadId || null,
        createdby: user.id,
        createdat: new Date().toISOString(),
        updatedat: new Date().toISOString(),
      })
      .select('id, name, description, departmentid, teamleadid, createdby, createdat, updatedat')
      .single();
    
    // If lowercase fails, try camelCase
    if (result.error && (result.error.code === 'PGRST204' || result.error.message?.includes('column') || result.error.message?.includes('createdat'))) {
      result = await supabase
        .from('teams')
        .insert({
          name: data.name,
          description: data.description,
          departmentId: data.departmentId || null,
          teamLeadId: data.teamLeadId || null,
          createdBy: user.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select('id, name, description, departmentId, teamLeadId, createdBy, createdAt, updatedAt')
        .single();
    }
    
    if (result.error) throw result.error;
    
    // Normalize the returned data
    const team = result.data;
    return {
      ...team,
      departmentId: team.departmentId || team.departmentid || null,
      teamLeadId: team.teamLeadId || team.teamleadid || null,
      createdAt: team.createdAt || team.createdat || team.created_at,
      updatedAt: team.updatedAt || team.updatedat || team.updated_at,
    };
  },

  async updateTeam(id: string, updates: Partial<Team>): Promise<Team> {
    // Try camelCase first, fallback to lowercase
    const updateDataCamel: any = {};
    const updateDataLower: any = {};
    
    if (updates.name !== undefined) {
      updateDataCamel.name = updates.name;
      updateDataLower.name = updates.name;
    }
    if (updates.description !== undefined) {
      updateDataCamel.description = updates.description;
      updateDataLower.description = updates.description;
    }
    if (updates.departmentId !== undefined) {
      updateDataCamel.departmentId = updates.departmentId;
      updateDataLower.departmentid = updates.departmentId;
    }
    if (updates.teamLeadId !== undefined) {
      updateDataCamel.teamLeadId = updates.teamLeadId;
      updateDataLower.teamleadid = updates.teamLeadId;
    }
    updateDataCamel.updatedAt = new Date().toISOString();
    updateDataLower.updatedat = new Date().toISOString();

    // Try lowercase first (PostgreSQL lowercases unquoted identifiers)
    let result = await supabase
      .from('teams')
      .update(updateDataLower)
      .eq('id', id)
      .select('id, name, description, departmentid, teamleadid, createdby, createdat, updatedat')
      .single();
    
    // If lowercase fails, try camelCase
    if (result.error && (result.error.code === 'PGRST204' || result.error.message?.includes('column'))) {
      result = await supabase
        .from('teams')
        .update(updateDataCamel)
        .eq('id', id)
        .select('id, name, description, departmentId, teamLeadId, createdBy, createdAt, updatedAt')
        .single();
    }
    
    // If that also fails, try select('*')
    if (result.error && (result.error.code === 'PGRST204' || result.error.message?.includes('column'))) {
      result = await supabase
        .from('teams')
        .update(updateDataLower)
        .eq('id', id)
        .select('*')
        .single();
    }
    
    if (result.error) throw result.error;
    
    // Normalize the returned data
    const team = result.data;
    return {
      ...team,
      departmentId: team.departmentId || team.departmentid || null,
      teamLeadId: team.teamLeadId || team.teamleadid || null,
      createdAt: team.createdAt || team.createdat || team.created_at,
      updatedAt: team.updatedAt || team.updatedat || team.updated_at,
    };
  },

  async deleteTeam(id: string): Promise<void> {
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // Departments
  async getDepartments(): Promise<Department[]> {
    // Try lowercase first (PostgreSQL lowercases unquoted identifiers)
    let result = await supabase
      .from('departments')
      .select('id, name, description, createdby, createdat, updatedat')
      .order('name');
    
    // If lowercase fails, try camelCase
    if (result.error && (result.error.code === 'PGRST204' || result.error.message?.includes('column'))) {
      result = await supabase
        .from('departments')
        .select('id, name, description, createdBy, createdAt, updatedAt')
        .order('name');
    }
    
    // If that also fails, try select('*') as last resort
    if (result.error && (result.error.code === 'PGRST204' || result.error.message?.includes('column'))) {
      result = await supabase
        .from('departments')
        .select('*')
        .order('name');
    }
    
    if (result.error) {
      if (result.error.code === '42P01' || result.error.code === 'PGRST202' || result.error.message?.includes('does not exist')) {
        console.warn('Departments table does not exist. Please run the migration.');
        return [];
      }
      console.error('Error loading departments:', result.error);
      // Return empty array instead of throwing to prevent UI crash
      return [];
    }
    
    // Normalize column names (handle both camelCase and lowercase)
    return (result.data || []).map((dept: any) => ({
      ...dept,
      createdAt: dept.createdAt || dept.createdat || dept.created_at,
      updatedAt: dept.updatedAt || dept.updatedat || dept.updated_at,
    }));
  },

  async createDepartment(data: Omit<Department, 'id' | 'createdAt' | 'updatedAt'>): Promise<Department> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Try lowercase first (PostgreSQL lowercases unquoted identifiers)
    let result = await supabase
      .from('departments')
      .insert({
        name: data.name,
        description: data.description,
        createdby: user.id,
        createdat: new Date().toISOString(),
        updatedat: new Date().toISOString(),
      })
      .select('id, name, description, createdby, createdat, updatedat')
      .single();
    
    // If lowercase fails, try camelCase
    if (result.error && (result.error.code === 'PGRST204' || result.error.message?.includes('column') || result.error.message?.includes('createdat'))) {
      result = await supabase
        .from('departments')
        .insert({
          name: data.name,
          description: data.description,
          createdBy: user.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select('id, name, description, createdBy, createdAt, updatedAt')
        .single();
    }
    
    if (result.error) throw result.error;
    
    // Normalize the returned data
    const dept = result.data;
    return {
      ...dept,
      createdAt: dept.createdAt || dept.createdat || dept.created_at,
      updatedAt: dept.updatedAt || dept.updatedat || dept.updated_at,
    };
  },

  async updateDepartment(id: string, updates: Partial<Department>): Promise<Department> {
    // Try camelCase first, fallback to lowercase
    const updateDataCamel: any = {};
    const updateDataLower: any = {};
    
    if (updates.name !== undefined) {
      updateDataCamel.name = updates.name;
      updateDataLower.name = updates.name;
    }
    if (updates.description !== undefined) {
      updateDataCamel.description = updates.description;
      updateDataLower.description = updates.description;
    }
    updateDataCamel.updatedAt = new Date().toISOString();
    updateDataLower.updatedat = new Date().toISOString();

    // Try lowercase first (PostgreSQL lowercases unquoted identifiers)
    let result = await supabase
      .from('departments')
      .update(updateDataLower)
      .eq('id', id)
      .select('id, name, description, createdby, createdat, updatedat')
      .single();
    
    // If lowercase fails, try camelCase
    if (result.error && (result.error.code === 'PGRST204' || result.error.message?.includes('column'))) {
      result = await supabase
        .from('departments')
        .update(updateDataCamel)
        .eq('id', id)
        .select('id, name, description, createdBy, createdAt, updatedAt')
        .single();
    }
    
    // If that also fails, try select('*')
    if (result.error && (result.error.code === 'PGRST204' || result.error.message?.includes('column'))) {
      result = await supabase
        .from('departments')
        .update(updateDataLower)
        .eq('id', id)
        .select('*')
        .single();
    }
    
    if (result.error) throw result.error;
    
    // Normalize the returned data
    const dept = result.data;
    return {
      ...dept,
      createdAt: dept.createdAt || dept.createdat || dept.created_at,
      updatedAt: dept.updatedAt || dept.updatedat || dept.updated_at,
    };
  },

  async deleteDepartment(id: string): Promise<void> {
    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // Allowed Domains
  async getAllowedDomains(): Promise<AllowedDomain[]> {
    // Try lowercase first (PostgreSQL lowercases unquoted identifiers)
    let result = await supabase
      .from('allowed_domains')
      .select('id, domain, isactive, autoassignteamid, autoassigndepartmentid, createdby, createdat, updatedat')
      .order('domain');
    
    // If lowercase fails, try camelCase
    if (result.error && (result.error.code === 'PGRST204' || result.error.message?.includes('column'))) {
      result = await supabase
        .from('allowed_domains')
        .select('id, domain, isActive, autoAssignTeamId, autoAssignDepartmentId, createdBy, createdAt, updatedAt')
        .order('domain');
    }
    
    // If that also fails, try select('*') as last resort
    if (result.error && (result.error.code === 'PGRST204' || result.error.message?.includes('column'))) {
      result = await supabase
        .from('allowed_domains')
        .select('*')
        .order('domain');
    }
    
    if (result.error) {
      if (result.error.code === '42P01' || result.error.code === 'PGRST202' || result.error.message?.includes('does not exist')) {
        console.warn('Allowed domains table does not exist. Please run the migration.');
        return [];
      }
      console.error('Error loading allowed domains:', result.error);
      // Return empty array instead of throwing to prevent UI crash
      return [];
    }
    
    // Normalize column names (handle both camelCase and lowercase)
    return (result.data || []).map((domain: any) => ({
      ...domain,
      isActive: domain.isActive !== undefined ? domain.isActive : (domain.isactive !== undefined ? domain.isactive : (domain.is_active !== undefined ? domain.is_active : true)),
      autoAssignTeamId: domain.autoAssignTeamId || domain.autoassignteamid || domain.auto_assign_team_id || null,
      autoAssignDepartmentId: domain.autoAssignDepartmentId || domain.autoassigndepartmentid || domain.auto_assign_department_id || null,
      createdAt: domain.createdAt || domain.createdat || domain.created_at,
      updatedAt: domain.updatedAt || domain.updatedat || domain.updated_at,
    }));
  },

  async createAllowedDomain(data: Omit<AllowedDomain, 'id' | 'createdAt' | 'updatedAt'>): Promise<AllowedDomain> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Try lowercase first (PostgreSQL lowercases unquoted identifiers)
    let result = await supabase
      .from('allowed_domains')
      .insert({
        domain: data.domain,
        isactive: data.isActive !== undefined ? data.isActive : true,
        createdby: user.id,
        createdat: new Date().toISOString(),
        updatedat: new Date().toISOString(),
      })
      .select('id, domain, isactive, autoassignteamid, autoassigndepartmentid, createdby, createdat, updatedat')
      .single();
    
    // If lowercase fails, try camelCase
    if (result.error && (result.error.code === 'PGRST204' || result.error.message?.includes('column') || result.error.message?.includes('createdat'))) {
      result = await supabase
        .from('allowed_domains')
        .insert({
          domain: data.domain,
          isActive: data.isActive !== undefined ? data.isActive : true,
          createdBy: user.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select('id, domain, isActive, autoAssignTeamId, autoAssignDepartmentId, createdBy, createdAt, updatedAt')
        .single();
    }
    
    if (result.error) throw result.error;
    
    // Normalize the returned data
    const domain = result.data;
    return {
      ...domain,
      isActive: domain.isActive !== undefined ? domain.isActive : (domain.isactive !== undefined ? domain.isactive : (domain.is_active !== undefined ? domain.is_active : true)),
      autoAssignTeamId: domain.autoAssignTeamId || domain.autoassignteamid || domain.auto_assign_team_id || null,
      autoAssignDepartmentId: domain.autoAssignDepartmentId || domain.autoassigndepartmentid || domain.auto_assign_department_id || null,
      createdAt: domain.createdAt || domain.createdat || domain.created_at,
      updatedAt: domain.updatedAt || domain.updatedat || domain.updated_at,
    };
  },

  async updateAllowedDomain(id: string, updates: Partial<AllowedDomain>): Promise<AllowedDomain> {
    // Try camelCase first, fallback to lowercase
    const updateDataCamel: any = {};
    const updateDataLower: any = {};
    
    if (updates.domain !== undefined) {
      updateDataCamel.domain = updates.domain;
      updateDataLower.domain = updates.domain;
    }
    if (updates.isActive !== undefined) {
      updateDataCamel.isActive = updates.isActive;
      updateDataLower.isactive = updates.isActive;
    }
    updateDataCamel.updatedAt = new Date().toISOString();
    updateDataLower.updatedat = new Date().toISOString();

    // Try lowercase first (PostgreSQL lowercases unquoted identifiers)
    let result = await supabase
      .from('allowed_domains')
      .update(updateDataLower)
      .eq('id', id)
      .select('id, domain, isactive, autoassignteamid, autoassigndepartmentid, createdby, createdat, updatedat')
      .single();
    
    // If lowercase fails, try camelCase
    if (result.error && (result.error.code === 'PGRST204' || result.error.message?.includes('column'))) {
      result = await supabase
        .from('allowed_domains')
        .update(updateDataCamel)
        .eq('id', id)
        .select('id, domain, isActive, autoAssignTeamId, autoAssignDepartmentId, createdBy, createdAt, updatedAt')
        .single();
    }
    
    // If that also fails, try select('*')
    if (result.error && (result.error.code === 'PGRST204' || result.error.message?.includes('column'))) {
      result = await supabase
        .from('allowed_domains')
        .update(updateDataLower)
        .eq('id', id)
        .select('*')
        .single();
    }
    
    if (result.error) throw result.error;
    
    // Normalize the returned data
    const domain = result.data;
    return {
      ...domain,
      isActive: domain.isActive !== undefined ? domain.isActive : (domain.isactive !== undefined ? domain.isactive : (domain.is_active !== undefined ? domain.is_active : true)),
      autoAssignTeamId: domain.autoAssignTeamId || domain.autoassignteamid || domain.auto_assign_team_id || null,
      autoAssignDepartmentId: domain.autoAssignDepartmentId || domain.autoassigndepartmentid || domain.auto_assign_department_id || null,
      createdAt: domain.createdAt || domain.createdat || domain.created_at,
      updatedAt: domain.updatedAt || domain.updatedat || domain.updated_at,
    };
  },

  async deleteAllowedDomain(id: string): Promise<void> {
    const { error } = await supabase
      .from('allowed_domains')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // Tags
  async getTags(): Promise<Tag[]> {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name');
    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST202' || error.message?.includes('does not exist')) {
        console.warn('Tags table does not exist. Please run the migration.');
        return [];
      }
      throw error;
    }
    return data || [];
  },

  async createTag(data: Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tag> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: tag, error } = await supabase
      .from('tags')
      .insert({
        ...data,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return tag;
  },

  async updateTag(id: string, updates: Partial<Tag>): Promise<Tag> {
    const { data, error } = await supabase
      .from('tags')
      .update({
        ...updates,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteTag(id: string): Promise<void> {
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // Settings (API Keys, Models)
  async getSettings(): Promise<Record<string, any>> {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .single();
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return data || {};
  },

  async updateSettings(settings: Record<string, any>): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('settings')
      .upsert({
        id: 'default',
        ...settings,
        updatedBy: user.id,
        updatedAt: new Date().toISOString(),
      }, {
        onConflict: 'id',
      });
    if (error) throw error;
  },

  // Project Members
  async getProjectMembers(projectId: string): Promise<Array<User & { role: string; addedBy: string; createdAt: string }>> {
    try {
      // Try camelCase first
      let { data, error } = await supabase
        .from('project_members')
        .select('*, users!project_members_userId_fkey(id, email, firstName, lastName, role, isActive)')
        .eq('projectId', projectId)
        .order('createdAt', { ascending: false });
      
      if (error && (
        error.code === 'PGRST200' || 
        error.code === '42703' ||
        error.status === 400 ||
        error.message?.includes('relationship') ||
        error.message?.includes('userId')
      )) {
        // Try with lowercase
        const result = await supabase
          .from('project_members')
          .select('*, users!project_members_userid_fkey(id, email, firstname, lastname, role, isactive)')
          .eq('projectid', projectId)
          .order('createdat', { ascending: false });
        
        if (result.error && (
          result.error.code === 'PGRST200' || 
          result.error.code === '42703' ||
          result.error.status === 400 ||
          result.error.message?.includes('relationship')
        )) {
          // Fallback: Get project members and users separately
          // Try camelCase first
          let membersResult = await supabase
            .from('project_members')
            .select('*')
            .eq('projectId', projectId)
            .order('createdAt', { ascending: false });
          
          // If camelCase fails, try lowercase
          if (membersResult.error && (
            membersResult.error.code === 'PGRST204' || 
            membersResult.error.code === '42703' ||
            membersResult.error.status === 400 ||
            membersResult.error.message?.includes('column')
          )) {
            membersResult = await supabase
              .from('project_members')
              .select('*')
              .eq('projectid', projectId)
              .order('createdat', { ascending: false });
          }
          
          if (membersResult.error) {
            if (membersResult.error.code === '42P01' || membersResult.error.code === 'PGRST202' || membersResult.error.message?.includes('does not exist')) {
              console.warn('Project members table does not exist. Please run the migration.');
              return [];
            }
            console.error('Error fetching project members:', membersResult.error);
            return [];
          }
          
          // Get user details separately
          const userIds = (membersResult.data || []).map((pm: any) => pm.userId || pm.userid || pm.user_id).filter(Boolean);
          if (userIds.length === 0) return [];
          
          // Try camelCase first for users query
          let usersResult = await supabase
            .from('users')
            .select('id, email, firstName, lastName, role, isActive')
            .in('id', userIds);
          
          // If camelCase fails, try lowercase
          if (usersResult.error && (
            usersResult.error.code === 'PGRST204' || 
            usersResult.error.code === '42703' ||
            usersResult.error.status === 400 ||
            usersResult.error.message?.includes('column')
          )) {
            usersResult = await supabase
              .from('users')
              .select('id, email, firstname, lastname, role, isactive')
              .in('id', userIds);
          }
          
          if (usersResult.error) {
            console.error('Error fetching users:', usersResult.error);
            return [];
          }
          
          const usersMap = new Map((usersResult.data || []).map((u: any) => [
            u.id,
            {
              id: u.id,
              email: u.email,
              firstName: u.firstName || u.firstname,
              lastName: u.lastName || u.lastname,
              role: u.role,
              isActive: u.isActive || u.isactive,
            }
          ]));
          
          return (membersResult.data || []).map((pm: any) => {
            const userId = pm.userId || pm.userid || pm.user_id;
            const user = usersMap.get(userId);
            return {
              ...user,
              role: pm.role,
              addedBy: pm.addedBy || pm.addedby || pm.added_by,
              createdAt: pm.createdAt || pm.createdat || pm.created_at,
            };
          }).filter(u => u.id); // Filter out entries without user data
        } else {
          data = result.data;
          error = result.error;
        }
      }
      
      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST202' || error.message?.includes('does not exist')) {
          console.warn('Project members table does not exist. Please run the migration.');
          return [];
        }
        throw error;
      }
      
      // Transform the data to flatten the user object
      return (data || []).map((pm: any) => {
        const user = pm.users || pm.user;
        return {
          ...(user || {}),
          id: user?.id || pm.userid || pm.userId || pm.user_id,
          email: user?.email || pm.email,
          firstName: user?.firstName || user?.firstname || pm.firstname || pm.firstName,
          lastName: user?.lastName || user?.lastname || pm.lastname || pm.lastName,
          role: pm.role,
          isActive: user?.isActive || user?.isactive || pm.isactive || pm.isActive,
          addedBy: pm.addedBy || pm.addedby || pm.added_by,
          createdAt: pm.createdAt || pm.createdat || pm.created_at,
        };
      }).filter((u: any) => u.id); // Filter out entries without user data
    } catch (error) {
      console.error('Error fetching project members:', error);
      return [];
    }
  },

  async addProjectMember(projectId: string, userId: string, role: 'owner' | 'member' | 'viewer' = 'member'): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Try camelCase first (migrations use quoted identifiers)
    let result = await supabase
      .from('project_members')
      .insert({
        projectId,
        userId,
        role,
        addedBy: user.id,
      });
    
    // If camelCase fails, try lowercase
    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column')
    )) {
      result = await supabase
        .from('project_members')
        .insert({
          projectid: projectId,
          userid: userId,
          role,
          addedby: user.id,
        });
    }
    
    if (result.error) {
      if (result.error.code === '23505') { // Unique constraint violation
        throw new Error('User is already a member of this project');
      }
      throw result.error;
    }
  },

  async removeProjectMember(projectId: string, userId: string): Promise<void> {
    // Try camelCase first
    let result = await supabase
      .from('project_members')
      .delete()
      .eq('projectId', projectId)
      .eq('userId', userId);
    
    // If camelCase fails, try lowercase
    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column')
    )) {
      result = await supabase
        .from('project_members')
        .delete()
        .eq('projectid', projectId)
        .eq('userid', userId);
    }
    
    if (result.error) throw result.error;
  },

  async updateProjectMemberRole(projectId: string, userId: string, role: 'owner' | 'member' | 'viewer'): Promise<void> {
    // Try camelCase first
    let result = await supabase
      .from('project_members')
      .update({ role })
      .eq('projectId', projectId)
      .eq('userId', userId);
    
    // If camelCase fails, try lowercase
    if (result.error && (
      result.error.code === 'PGRST204' || 
      result.error.code === '42703' ||
      result.error.status === 400 ||
      result.error.message?.includes('column')
    )) {
      result = await supabase
        .from('project_members')
        .update({ role })
        .eq('projectid', projectId)
        .eq('userid', userId);
    }
    
    if (result.error) throw result.error;
  },
};

