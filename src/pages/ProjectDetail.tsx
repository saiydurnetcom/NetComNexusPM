/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import AppLayout from '@/components/AppLayout';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/hooks/useAuth';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { useToast } from '@/components/ui/use-toast';
import { usersService } from '@/lib/users-service';
import { apiClient } from '@/lib/api-client';
import { adminService } from '@/lib/admin-service';
import { Task, Project, User, Tag, ProjectRisk, ProjectBudgetItem, ProjectMilestone } from '@/types';
import { TagSelector } from '@/components/TagSelector';
import { GanttChart } from '@/components/GanttChart';
import { KanbanBoard } from '@/components/KanbanBoard';
import { projectRisksService, projectBudgetService, projectMilestonesService } from '@/lib/project-features-service';
import {
  Play,
  Clock,
  Calendar,
  User as UserIcon,
  FolderKanban,
  Plus,
  Edit,
  CheckCircle2,
  Circle,
  PlayCircle,
  AlertCircle,
  Search,
  Filter,
  Tag as TagIcon,
  Users,
  Target,
  ArrowLeft,
  Square,
  Trash2,
  Sparkles,
  Loader2,
  FileText,
  AlertTriangle,
  DollarSign,
  Flag,
  BarChart3,
  Grid,
  List
} from 'lucide-react';
import { format } from 'date-fns';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tasks, isLoading: tasksLoading, createTask, updateTaskStatus, fetchTasks } = useTasks();
  const { projects, fetchProjects, updateProject } = useProjects();
  const { timeEntries, fetchTimeEntries, activeTimer, startTimer, stopTimer } = useTimeTracking();
  const { toast } = useToast();
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [projectTags, setProjectTags] = useState<Tag[]>([]);

  // Project editing
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    purpose: '',
    startDate: '',
    endDate: '',
    status: 'ACTIVE' as Project['status'],
    selectedTags: [] as string[],
  });

  // Task creation
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM' as Task['priority'],
    assignedTo: '',
    dueDate: '',
    estimatedHours: 1,
    selectedTags: [] as string[],
    dependsOnTaskId: '',
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'kanban'>('grid');
  const [isMembersSheetOpen, setIsMembersSheetOpen] = useState(false);

  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [projectMembers, setProjectMembers] = useState<Array<User & { role: string; addedBy: string; createdAt: string }>>([]);
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [memberRole, setMemberRole] = useState<'owner' | 'member' | 'viewer'>('member');

  // AI Report generation
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [cxoReport, setCxoReport] = useState<string | null>(null);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

  // Risks, Budget, Milestones
  const [risks, setRisks] = useState<ProjectRisk[]>([]);
  const [budgetItems, setBudgetItems] = useState<ProjectBudgetItem[]>([]);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [isRiskDialogOpen, setIsRiskDialogOpen] = useState(false);
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const [isMilestoneDialogOpen, setIsMilestoneDialogOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<ProjectRisk | null>(null);
  const [editingBudgetItem, setEditingBudgetItem] = useState<ProjectBudgetItem | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<ProjectMilestone | null>(null);

  const [riskForm, setRiskForm] = useState({
    title: '',
    description: '',
    riskCategory: 'technical' as ProjectRisk['riskCategory'],
    probability: 'medium' as ProjectRisk['probability'],
    impact: 'medium' as ProjectRisk['impact'],
    status: 'identified' as ProjectRisk['status'],
    mitigationStrategy: '',
    mitigationOwner: 'none',
    targetMitigationDate: '',
  });

  const [budgetForm, setBudgetForm] = useState({
    category: '',
    description: '',
    budgetedAmount: 0,
    actualAmount: 0,
    currency: 'USD',
  });

  const [milestoneForm, setMilestoneForm] = useState({
    name: '',
    description: '',
    targetDate: '',
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    try {
      await fetchProjects();
      await fetchTasks();
      await fetchTimeEntries();
      await loadUsers();
      await loadTags();
      await loadProjectTags();
      await loadProjectMembers();
      await loadRisks();
      await loadBudgetItems();
      await loadMilestones();
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadRisks = async () => {
    if (!id) return;
    try {
      const data = await projectRisksService.getRisks(id);
      setRisks(data);
    } catch (error) {
      console.error('Error loading risks:', error);
      setRisks([]);
    }
  };

  const loadBudgetItems = async () => {
    if (!id) return;
    try {
      const data = await projectBudgetService.getBudgetItems(id);
      setBudgetItems(data);
    } catch (error) {
      console.error('Error loading budget items:', error);
      setBudgetItems([]);
    }
  };

  const loadMilestones = async () => {
    if (!id) return;
    try {
      const data = await projectMilestonesService.getMilestones(id);
      setMilestones(data);
    } catch (error) {
      console.error('Error loading milestones:', error);
      setMilestones([]);
    }
  };

  const loadUsers = async () => {
    try {
      const users = await usersService.getUsers();
      setAvailableUsers(users);
    } catch (error) {
      console.error('Error loading users:', error);
      if (user) setAvailableUsers([user]);
    }
  };

  const loadTags = async () => {
    try {
      const tags = await apiClient.getTags();
      setAvailableTags(tags);
    } catch (error) {
      console.error('Error loading tags:', error);
      setAvailableTags([]);
    }
  };

  const loadProjectMembers = async () => {
    if (!id) return;
    try {
      const members = await adminService.getProjectMembers(id);
      setProjectMembers(members);
    } catch (error) {
      console.error('Error loading project members:', error);
      setProjectMembers([]);
    }
  };

  const handleAddMember = async () => {
    if (!id || !selectedUserId) return;
    try {
      await adminService.addProjectMember(id, selectedUserId, memberRole);
      await loadProjectMembers();
      setIsMemberDialogOpen(false);
      setSelectedUserId('');
      setMemberRole('member');
      toast({
        title: 'Success',
        description: 'Member added to project',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add member';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      // Don't close the dialog if it's a duplicate member error, so user can try again
      if (errorMessage.includes('already a member')) {
        // Keep dialog open
      } else {
        setIsMemberDialogOpen(false);
      }
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!id) return;
    try {
      await adminService.removeProjectMember(id, userId);
      await loadProjectMembers();
      toast({
        title: 'Success',
        description: 'Member removed from project',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to remove member',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateMemberRole = async (userId: string, newRole: 'owner' | 'member' | 'viewer') => {
    if (!id) return;
    try {
      await adminService.updateProjectMemberRole(id, userId, newRole);
      await loadProjectMembers();
      toast({
        title: 'Success',
        description: 'Member role updated',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update role',
        variant: 'destructive',
      });
    }
  };

  const loadProjectTags = async () => {
    if (!id) return;
    try {
      const projectTags = await apiClient.getProjectTags(id);
      setProjectTags(projectTags.map((pt: any) => pt.tag).filter(Boolean));
    } catch (error) {
      console.error('Error loading project tags:', error);
      setProjectTags([]);
    }
  };

  useEffect(() => {
    if (id && projects.length > 0) {
      const project = projects.find(p => p.id === id);
      setCurrentProject(project || null);
      if (project) {
        setProjectForm({
          name: project.name,
          description: project.description || '',
          purpose: (project as any).purpose || '',
          startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
          endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
          status: project.status,
          selectedTags: projectTags.map(tag => tag.id),
        });
      }
    }
  }, [id, projects, projectTags]);

  useEffect(() => {
    if (id && tasks.length > 0) {
      const filteredTasks = tasks.filter(task => task.projectId === id);
      setProjectTasks(filteredTasks);
    }
  }, [id, tasks]);

  const handleSaveProject = async () => {
    if (!currentProject || !id) return;
    try {
      await updateProject(id, {
        name: projectForm.name,
        description: projectForm.description,
        startDate: projectForm.startDate,
        endDate: projectForm.endDate,
        status: projectForm.status,
        purpose: projectForm.purpose,
      });

      // Update project tags
      if (projectForm.selectedTags) {
        try {
          await apiClient.updateProjectTags(id, projectForm.selectedTags);
        } catch (error) {
          console.error('Error updating project tags:', error);
        }
      }

      await loadProjectTags();
      setIsEditingProject(false);
      await fetchProjects();
      toast({
        title: 'Success',
        description: 'Project updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update project',
        variant: 'destructive',
      });
    }
  };

  const handleCreateTask = async () => {
    if (!taskForm.title.trim() || !id || !user) return;

    try {
      const task = await createTask({
        title: taskForm.title,
        description: taskForm.description,
        projectId: id,
        priority: taskForm.priority,
        estimatedHours: taskForm.estimatedHours,
        assignedTo: taskForm.assignedTo || user.id,
        dueDate: taskForm.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        parentTaskId: taskForm.dependsOnTaskId || undefined,
      });

      // Create dependency if specified
      if (taskForm.dependsOnTaskId) {
        try {
          const { taskDependenciesService } = await import('@/lib/api-data');
          await taskDependenciesService.createDependency({
            taskId: task.id,
            dependsOnTaskId: taskForm.dependsOnTaskId,
          });
        } catch (error) {
          console.error('Failed to create dependency:', error);
          // Don't fail the task creation if dependency fails
        }
      }

      // Add tags to task using API
      if (taskForm.selectedTags.length > 0) {
        try {
          await apiClient.updateTaskTags(task.id, taskForm.selectedTags);
        } catch (error) {
          console.error('Error updating task tags:', error);
        }
      }

      setTaskForm({
        title: '',
        description: '',
        priority: 'MEDIUM',
        assignedTo: '',
        dueDate: '',
        estimatedHours: 1,
        selectedTags: [],
        dependsOnTaskId: undefined,
      });
      setIsCreateDialogOpen(false);
      await fetchTasks();
      toast({
        title: 'Success',
        description: 'Task created successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create task',
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    try {
      await updateTaskStatus(taskId, newStatus);
      await fetchTasks();
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const handleStartTimer = async (taskId: string) => {
    try {
      if (activeTimer && activeTimer.taskId !== taskId) {
        await stopTimer(activeTimer.id);
      }
      await startTimer(taskId);
      await fetchTimeEntries();
      await fetchTasks(); // Refresh tasks to show status change
      toast({
        title: 'Success',
        description: 'Timer started',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start timer',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateCXOReport = async () => {
    if (!id) return;

    setIsGeneratingReport(true);
    try {
      const { generateCXOReport, saveReport } = await import('@/lib/reports-service');
      const report = await generateCXOReport(id, {
        projects: projects.filter(p => p.id === id),
        tasks: projectTasks,
        timeEntries: timeEntries.filter(entry => {
          const task = projectTasks.find(t => t.id === entry.taskId);
          return task !== undefined;
        }),
      });
      setCxoReport(report);
      setIsReportDialogOpen(true);

      // Auto-save the report
      try {
        await saveReport(id, report, 'cxo', currentProject?.name);
        toast({
          title: 'Success',
          description: 'Report generated and saved successfully',
        });
      } catch (saveError) {
        console.error('Error saving report:', saveError);
        // Don't show error for save, just log it
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate report',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleGenerateWeeklyReportForProject = async () => {
    if (!id) return;

    setIsGeneratingReport(true);
    try {
      const { generateWeeklyReport, saveReport } = await import('@/lib/reports-service');
      const report = await generateWeeklyReport(id, {
        projects: projects.filter(p => p.id === id),
        tasks: projectTasks,
        timeEntries: timeEntries.filter(entry => {
          const task = projectTasks.find(t => t.id === entry.taskId);
          return task !== undefined;
        }),
      });
      setCxoReport(report);
      setIsReportDialogOpen(true);

      // Auto-save the weekly report as a summary
      try {
        await saveReport(id, report, 'summary', currentProject?.name);
        toast({
          title: 'Success',
          description: 'Weekly report generated and saved successfully',
        });
      } catch (saveError) {
        console.error('Error saving weekly report:', saveError);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate weekly report',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleStopTimer = async () => {
    if (!activeTimer) return;
    try {
      await stopTimer(activeTimer.id);
      await fetchTimeEntries();
      toast({
        title: 'Success',
        description: 'Timer stopped',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to stop timer',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <PlayCircle className="h-4 w-4 text-blue-600" />;
      case 'review':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'blocked':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    let filtered = [...projectTasks];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchLower) ||
        task.description?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }

    return filtered;
  }, [projectTasks, searchTerm, statusFilter, priorityFilter]);

  if (!currentProject) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading project...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const projectStats = {
    totalTasks: projectTasks.length,
    completedTasks: projectTasks.filter(t => t.status === 'COMPLETED').length,
    inProgressTasks: projectTasks.filter(t => t.status === 'IN_PROGRESS').length,
    overdueTasks: projectTasks.filter(t => isOverdue(t.dueDate) && t.status !== 'COMPLETED').length,
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Button
              variant="ghost"
              onClick={() => navigate('/projects')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
            {isEditingProject ? (
              <div className="space-y-4">
                <Input
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                  className="text-3xl font-bold"
                />
                <div className="flex gap-2">
                  <Button onClick={handleSaveProject}>Save</Button>
                  <Button variant="outline" onClick={() => setIsEditingProject(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between w-full">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{currentProject.name}</h1>
                  <p className="text-gray-600">{currentProject.description || 'No description'}</p>
                </div>
                <div className="flex gap-2 items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateWeeklyReportForProject}
                    disabled={isGeneratingReport || !id}
                    title="Generate Weekly Report"
                  >
                    {isGeneratingReport ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateCXOReport}
                    disabled={isGeneratingReport || !id}
                    title="Generate CXO Report"
                  >
                    {isGeneratingReport ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/reports')}
                    title="View All Reports"
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsEditingProject(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Project Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid grid-cols-8 w-full">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="kanban">
                  <FolderKanban className="h-4 w-4 mr-1" />
                  Kanban
                </TabsTrigger>
                <TabsTrigger value="risks">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Risks
                </TabsTrigger>
                <TabsTrigger value="budget">
                  <DollarSign className="h-4 w-4 mr-1" />
                  Budget
                </TabsTrigger>
                <TabsTrigger value="milestones">
                  <Flag className="h-4 w-4 mr-1" />
                  Milestones
                </TabsTrigger>
                <TabsTrigger value="gantt">
                  <BarChart3 className="h-4 w-4 mr-1" />
                  Gantt
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Badge variant={currentProject.status.toLowerCase() === 'active' ? 'default' : 'secondary'} className="mt-1">
                      {currentProject.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Start Date</Label>
                    <p className="text-sm font-medium mt-1">
                      {currentProject.startDate ? format(new Date(currentProject.startDate), 'MMM dd, yyyy') : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">End Date</Label>
                    <p className="text-sm font-medium mt-1">
                      {currentProject.endDate ? format(new Date(currentProject.endDate), 'MMM dd, yyyy') : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Progress</Label>
                    <p className="text-sm font-medium mt-1">
                      {projectStats.totalTasks > 0
                        ? Math.round((projectStats.completedTasks / projectStats.totalTasks) * 100)
                        : 0}%
                    </p>
                  </div>
                </div>

                {projectTags.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Tags</Label>
                    <div className="flex flex-wrap gap-2">
                      {projectTags.map(tag => (
                        <Badge key={tag.id} variant="outline" style={{ borderColor: tag.color, color: tag.color }}>
                          <TagIcon className="h-3 w-3 mr-1" />
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {(currentProject as any).purpose && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Purpose</Label>
                    <p className="text-sm">{(currentProject as any).purpose}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="tasks" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Tasks ({filteredTasks.length})</CardTitle>
                        <CardDescription>Manage tasks for this project</CardDescription>
                      </div>
                      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            New Task
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Create New Task</DialogTitle>
                            <DialogDescription>Add a new task to this project</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="task-title">Title *</Label>
                              <Input
                                id="task-title"
                                value={taskForm.title}
                                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                                placeholder="Enter task title"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="task-description">Description</Label>
                              <Textarea
                                id="task-description"
                                value={taskForm.description}
                                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                                placeholder="Enter task description"
                                rows={4}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="task-priority">Priority</Label>
                                <Select
                                  value={taskForm.priority}
                                  onValueChange={(value: Task['priority']) => setTaskForm({ ...taskForm, priority: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="LOW">Low</SelectItem>
                                    <SelectItem value="MEDIUM">Medium</SelectItem>
                                    <SelectItem value="HIGH">High</SelectItem>
                                    <SelectItem value="URGENT">Urgent</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="task-assignee">Assignee</Label>
                                <Select
                                  value={taskForm.assignedTo}
                                  onValueChange={(value) => setTaskForm({ ...taskForm, assignedTo: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select assignee" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableUsers.map((u) => (
                                      <SelectItem key={u.id} value={u.id}>
                                        {u.firstName} {u.lastName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="task-due-date">Due Date</Label>
                                <Input
                                  id="task-due-date"
                                  type="date"
                                  value={taskForm.dueDate}
                                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="task-estimated-hours">Estimated Hours</Label>
                                <Input
                                  id="task-estimated-hours"
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={taskForm.estimatedHours}
                                  onChange={(e) => setTaskForm({ ...taskForm, estimatedHours: parseFloat(e.target.value) || 0 })}
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="task-dependency">Depends On (Optional)</Label>
                              <Select
                                value={taskForm.dependsOnTaskId ?? 'none'}
                                onValueChange={(value) => setTaskForm({ ...taskForm, dependsOnTaskId: value === 'none' ? undefined : value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a task this depends on" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  {projectTasks
                                    .filter(t => t.id !== taskForm.dependsOnTaskId)
                                    .map((t) => (
                                      <SelectItem key={t.id} value={t.id}>
                                        {t.title}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <TagSelector
                              tags={availableTags}
                              selectedTags={taskForm.selectedTags}
                              onSelectionChange={(tagIds) => setTaskForm({ ...taskForm, selectedTags: tagIds })}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleCreateTask} disabled={!taskForm.title.trim()}>
                              Create Task
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Search, Filters, and View Toggle */}
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search tasks..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="TODO">To Do</SelectItem>
                            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                            <SelectItem value="REVIEW">Review</SelectItem>
                            <SelectItem value="BLOCKED">Blocked</SelectItem>
                            <SelectItem value="COMPLETED">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Priority</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-1 border rounded-md p-1">
                          <Button
                            variant={viewMode === 'grid' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('grid')}
                            className="h-8"
                          >
                            <Grid className="h-4 w-4" />
                          </Button>
                          <Button
                            variant={viewMode === 'table' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('table')}
                            className="h-8"
                          >
                            <List className="h-4 w-4" />
                          </Button>
                          <Button
                            variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('kanban')}
                            className="h-8"
                          >
                            <FolderKanban className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Tasks Views */}
                    {tasksLoading ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                      </div>
                    ) : filteredTasks.length === 0 ? (
                      <div className="text-center py-12">
                        <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">
                          {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                            ? 'No tasks found'
                            : 'No tasks yet'}
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                            ? 'Try adjusting your filters'
                            : 'Create your first task for this project'}
                        </p>
                        {!searchTerm && statusFilter === 'all' && priorityFilter === 'all' && (
                          <Button onClick={() => setIsCreateDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Task
                          </Button>
                        )}
                      </div>
                    ) : viewMode === 'kanban' ? (
                      <div className="w-full">
                        <KanbanBoard
                          tasks={filteredTasks}
                          onTaskStatusChange={async (taskId, newStatus) => {
                            try {
                              await updateTaskStatus(taskId, newStatus);
                              await fetchTasks();
                              toast({
                                title: 'Success',
                                description: 'Task status updated',
                              });
                            } catch (error) {
                              toast({
                                title: 'Error',
                                description: 'Failed to update task status',
                                variant: 'destructive',
                              });
                              throw error;
                            }
                          }}
                          showProject={false}
                          users={availableUsers}
                        />
                      </div>
                    ) : viewMode === 'table' ? (
                      <Card>
                        <CardContent className="p-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Assignee</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Time</TableHead>
                                <TableHead>Progress</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredTasks.map((task) => {
                                const dueDate = new Date(task.dueDate);
                                const isTaskOverdue = isOverdue(task.dueDate);
                                const assignedUser = availableUsers.find(u => u.id === task.assignedTo) || user;
                                const taskTimeEntries = timeEntries.filter(entry => entry.taskId === task.id);
                                const totalTime = taskTimeEntries.reduce((total, entry) => total + (entry.durationMinutes || 0), 0);
                                const progressPercentage = task.estimatedHours > 0
                                  ? (totalTime / (task.estimatedHours * 60)) * 100
                                  : 0;
                                const isTaskTimerActive = activeTimer?.taskId === task.id;

                                return (
                                  <TableRow
                                    key={task.id}
                                    className="cursor-pointer hover:bg-gray-50"
                                    onClick={() => navigate(`/tasks/${task.id}`)}
                                  >
                                    <TableCell className="font-medium max-w-xs">
                                      <div className="truncate">{task.title}</div>
                                    </TableCell>
                                    <TableCell>
                                      <Select
                                        value={task.status}
                                        onValueChange={(value: Task['status']) => {
                                          handleStatusChange(task.id, value);
                                        }}
                                      >
                                        <SelectTrigger className="w-28 h-8 text-xs" onClick={(e) => e.stopPropagation()}>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="TODO">To Do</SelectItem>
                                          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                          <SelectItem value="REVIEW">Review</SelectItem>
                                          <SelectItem value="COMPLETED">Completed</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                                        {task.priority}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <span className="text-xs">
                                        {assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : 'Unassigned'}
                                      </span>
                                    </TableCell>
                                    <TableCell>
                                      <span className={`text-xs ${isTaskOverdue ? 'text-red-600 font-semibold' : ''}`}>
                                        {format(dueDate, 'MMM dd, yyyy')}
                                      </span>
                                    </TableCell>
                                    <TableCell>
                                      <span className="text-xs text-muted-foreground">
                                        {formatDuration(totalTime)} / {task.estimatedHours}h
                                      </span>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <div className="w-16 bg-gray-200 rounded-full h-2">
                                          <div
                                            className="bg-blue-600 h-2 rounded-full"
                                            style={{ width: `${Math.min(100, progressPercentage)}%` }}
                                          />
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                          {Math.round(progressPercentage)}%
                                        </span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                      <Button
                                        variant={isTaskTimerActive ? 'destructive' : 'outline'}
                                        size="sm"
                                        onClick={() => {
                                          if (isTaskTimerActive) {
                                            handleStopTimer();
                                          } else {
                                            handleStartTimer(task.id);
                                          }
                                        }}
                                      >
                                        {isTaskTimerActive ? (
                                          <>
                                            <Square className="h-3 w-3 mr-1" />
                                            Stop
                                          </>
                                        ) : (
                                          <>
                                            <Play className="h-3 w-3 mr-1" />
                                            Start
                                          </>
                                        )}
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredTasks.map((task) => {
                          const dueDate = new Date(task.dueDate);
                          const isTaskOverdue = isOverdue(task.dueDate);
                          const assignedUser = availableUsers.find(u => u.id === task.assignedTo) || user;
                          const taskTimeEntries = timeEntries.filter(entry => entry.taskId === task.id);
                          const totalTime = taskTimeEntries.reduce((total, entry) => total + (entry.durationMinutes || 0), 0);
                          const progressPercentage = task.estimatedHours > 0
                            ? (totalTime / (task.estimatedHours * 60)) * 100
                            : 0;
                          const hasExceededEstimate = progressPercentage > 100;
                          const hasExceeded120Percent = progressPercentage > 120;
                          const isTaskTimerActive = activeTimer?.taskId === task.id;

                          return (
                            <Card
                              key={task.id}
                              className={`hover:shadow-lg transition-all cursor-pointer ${isTaskOverdue && task.status.toLowerCase() !== 'completed' ? 'border-red-300 bg-red-50/50' : ''
                                }`}
                              onClick={() => navigate(`/tasks/${task.id}`)}
                            >
                              <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <CardTitle className="text-lg line-clamp-2 mb-2">{task.title}</CardTitle>
                                    {task.description && (
                                      <CardDescription className="line-clamp-2 text-sm">
                                        {task.description}
                                      </CardDescription>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    {getStatusIcon(task.status)}
                                    <Select
                                      value={task.status}
                                      onValueChange={(value: Task['status']) => {
                                        handleStatusChange(task.id, value);
                                      }}
                                    >
                                      <SelectTrigger className="w-28 h-8 text-xs" onClick={(e) => e.stopPropagation()}>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="TODO">To Do</SelectItem>
                                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                        <SelectItem value="REVIEW">Review</SelectItem>
                                        <SelectItem value="COMPLETED">Completed</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-1">
                                    <UserIcon className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">
                                      {assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : 'Unassigned'}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between">
                                  <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                                    {task.priority}
                                  </Badge>
                                  <div className="flex items-center gap-1">
                                    <Calendar className={`h-3 w-3 ${isTaskOverdue ? 'text-red-600' : 'text-muted-foreground'}`} />
                                    <span className={`text-xs ${isTaskOverdue ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                                      {format(dueDate, 'MMM dd, yyyy')}
                                    </span>
                                    {isTaskOverdue && task.status.toLowerCase() !== 'completed' && (
                                      <Badge variant="destructive" className="text-xs ml-1">Overdue</Badge>
                                    )}
                                  </div>
                                </div>
                                {task.estimatedHours > 0 && (
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground">Progress</span>
                                      <span className={`font-medium ${hasExceeded120Percent ? 'text-red-600' :
                                        hasExceededEstimate ? 'text-orange-600' :
                                          ''
                                        }`}>
                                        {Math.round(progressPercentage)}%
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 relative overflow-hidden">
                                      <div
                                        className={`h-2 rounded-full transition-all ${hasExceeded120Percent ? 'bg-red-600' :
                                          hasExceededEstimate ? 'bg-orange-500' :
                                            progressPercentage >= 80 ? 'bg-yellow-500' :
                                              'bg-blue-600'
                                          }`}
                                        style={{ width: `${Math.min(100, progressPercentage)}%` }}
                                      />
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                      <span>{formatDuration(totalTime)}</span>
                                      <span>{task.estimatedHours}h estimated</span>
                                    </div>
                                  </div>
                                )}
                                <Button
                                  variant={isTaskTimerActive ? 'destructive' : 'outline'}
                                  size="sm"
                                  className="w-full"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isTaskTimerActive) {
                                      handleStopTimer();
                                    } else {
                                      handleStartTimer(task.id);
                                    }
                                  }}
                                >
                                  {isTaskTimerActive ? (
                                    <>
                                      <Square className="h-3 w-3 mr-1" />
                                      Stop Timer
                                    </>
                                  ) : (
                                    <>
                                      <Play className="h-3 w-3 mr-1" />
                                      Start Timer
                                    </>
                                  )}
                                </Button>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="kanban" className="space-y-4 mt-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Kanban Board</h3>
                  <p className="text-sm text-muted-foreground mb-4">Drag and drop tasks to change their status</p>
                  <KanbanBoard
                    tasks={projectTasks}
                    onTaskStatusChange={async (taskId, newStatus) => {
                      try {
                        await updateTaskStatus(taskId, newStatus);
                        await fetchTasks();
                        toast({
                          title: 'Success',
                          description: 'Task status updated',
                        });
                      } catch (error) {
                        toast({
                          title: 'Error',
                          description: 'Failed to update task status',
                          variant: 'destructive',
                        });
                        throw error;
                      }
                    }}
                    showProject={false}
                    users={availableUsers}
                  />
                </div>
              </TabsContent>

              <TabsContent value="details" className="space-y-4 mt-4">
                {isEditingProject ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Purpose</Label>
                      <Textarea
                        value={projectForm.purpose}
                        onChange={(e) => setProjectForm({ ...projectForm, purpose: e.target.value })}
                        placeholder="What is the purpose of this project?"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input
                          type="date"
                          value={projectForm.startDate}
                          onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End Date</Label>
                        <Input
                          type="date"
                          value={projectForm.endDate}
                          onChange={(e) => setProjectForm({ ...projectForm, endDate: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={projectForm.status}
                        onValueChange={(value: Project['status']) => setProjectForm({ ...projectForm, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="COMPLETED">Completed</SelectItem>
                          <SelectItem value="ARCHIVED">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <TagSelector
                      tags={availableTags}
                      selectedTags={projectForm.selectedTags}
                      onSelectionChange={(tagIds) => setProjectForm({ ...projectForm, selectedTags: tagIds })}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Description</Label>
                      <p className="text-sm mt-1">{currentProject.description || 'No description'}</p>
                    </div>
                    {(currentProject as any).purpose && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Purpose</Label>
                        <p className="text-sm mt-1">{(currentProject as any).purpose}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Start Date</Label>
                        <p className="text-sm font-medium mt-1">
                          {currentProject.startDate ? format(new Date(currentProject.startDate), 'MMMM dd, yyyy') : 'Not set'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">End Date</Label>
                        <p className="text-sm font-medium mt-1">
                          {currentProject.endDate ? format(new Date(currentProject.endDate), 'MMMM dd, yyyy') : 'Not set'}
                        </p>
                      </div>
                    </div>
                    {projectTags.length > 0 && (
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">Tags</Label>
                        <div className="flex flex-wrap gap-2">
                          {projectTags.map(tag => (
                            <Badge key={tag.id} variant="outline" style={{ borderColor: tag.color, color: tag.color }}>
                              <TagIcon className="h-3 w-3 mr-1" />
                              {tag.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="risks" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Project Risks</h3>
                    <p className="text-sm text-muted-foreground">Identify and track potential risks to your project</p>
                  </div>
                  <Button onClick={() => {
                    setEditingRisk(null);
                    setRiskForm({
                      title: '',
                      description: '',
                      riskCategory: 'technical',
                      probability: 'medium',
                      impact: 'medium',
                      status: 'identified',
                      mitigationStrategy: '',
                      mitigationOwner: 'none',
                      targetMitigationDate: '',
                    });
                    setIsRiskDialogOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Risk
                  </Button>
                </div>
                {risks.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No risks identified</h3>
                    <p className="text-muted-foreground mb-4">Start tracking potential risks to your project</p>
                    <Button onClick={() => {
                      setEditingRisk(null);
                      setRiskForm({
                        title: '',
                        description: '',
                        riskCategory: 'technical',
                        probability: 'medium',
                        impact: 'medium',
                        status: 'identified',
                        mitigationStrategy: '',
                        mitigationOwner: 'none',
                        targetMitigationDate: '',
                      });
                      setIsRiskDialogOpen(true);
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Risk
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {risks.map((risk) => (
                      <Card key={risk.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="flex items-center gap-2">
                                {risk.title}
                                <Badge variant={risk.status === 'closed' ? 'secondary' : risk.status === 'mitigated' ? 'default' : 'destructive'}>
                                  {risk.status}
                                </Badge>
                                <Badge variant="outline">{risk.riskCategory}</Badge>
                              </CardTitle>
                              <CardDescription className="mt-2">{risk.description}</CardDescription>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingRisk(risk);
                                  setRiskForm({
                                    title: risk.title,
                                    description: risk.description || '',
                                    riskCategory: risk.riskCategory,
                                    probability: risk.probability,
                                    impact: risk.impact,
                                    status: risk.status,
                                    mitigationStrategy: risk.mitigationStrategy || '',
                                    mitigationOwner: risk.mitigationOwner || 'none',
                                    targetMitigationDate: risk.targetMitigationDate ? new Date(risk.targetMitigationDate).toISOString().split('T')[0] : '',
                                  });
                                  setIsRiskDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  if (confirm('Are you sure you want to delete this risk?')) {
                                    try {
                                      await projectRisksService.deleteRisk(risk.id);
                                      await loadRisks();
                                      toast({ title: 'Success', description: 'Risk deleted' });
                                    } catch (error) {
                                      toast({
                                        title: 'Error',
                                        description: error instanceof Error ? error.message : 'Failed to delete risk',
                                        variant: 'destructive',
                                      });
                                    }
                                  }
                                }}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <Label className="text-xs text-muted-foreground">Probability</Label>
                              <p className="font-medium">{risk.probability}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Impact</Label>
                              <p className="font-medium">{risk.impact}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Risk Score</Label>
                              <p className="font-medium">{risk.riskScore}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Category</Label>
                              <p className="font-medium">{risk.riskCategory}</p>
                            </div>
                          </div>
                          {risk.mitigationStrategy && (
                            <div className="mt-4">
                              <Label className="text-xs text-muted-foreground">Mitigation Strategy</Label>
                              <p className="text-sm mt-1">{risk.mitigationStrategy}</p>
                            </div>
                          )}
                          {risk.mitigationOwner && (
                            <div className="mt-2">
                              <Label className="text-xs text-muted-foreground">Mitigation Owner</Label>
                              <p className="text-sm mt-1">
                                {availableUsers.find(u => u.id === risk.mitigationOwner)?.firstName} {availableUsers.find(u => u.id === risk.mitigationOwner)?.lastName}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="budget" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Project Budget</h3>
                    <p className="text-sm text-muted-foreground">Track budget items and actual spending</p>
                  </div>
                  <Button onClick={() => {
                    setEditingBudgetItem(null);
                    setBudgetForm({
                      category: '',
                      description: '',
                      budgetedAmount: 0,
                      actualAmount: 0,
                      currency: 'USD',
                    });
                    setIsBudgetDialogOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Budget Item
                  </Button>
                </div>
                {budgetItems.length === 0 ? (
                  <div className="text-center py-12">
                    <DollarSign className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No budget items</h3>
                    <p className="text-muted-foreground mb-4">Start tracking your project budget</p>
                    <Button onClick={() => {
                      setEditingBudgetItem(null);
                      setBudgetForm({
                        category: '',
                        description: '',
                        budgetedAmount: 0,
                        actualAmount: 0,
                        currency: 'USD',
                      });
                      setIsBudgetDialogOpen(true);
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Budget Item
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-sm text-muted-foreground">Total Budgeted</div>
                          <div className="text-2xl font-bold">
                            {budgetItems.reduce((sum, item) => sum + Number(item.budgetedAmount || 0), 0).toLocaleString('en-US', {
                              style: 'currency',
                              currency: budgetItems[0]?.currency || 'USD',
                            })}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-sm text-muted-foreground">Total Actual</div>
                          <div className="text-2xl font-bold">
                            {budgetItems.reduce((sum, item) => sum + Number(item.actualAmount || 0), 0).toLocaleString('en-US', {
                              style: 'currency',
                              currency: budgetItems[0]?.currency || 'USD',
                            })}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-sm text-muted-foreground">Remaining</div>
                          <div className="text-2xl font-bold">
                            {(budgetItems.reduce((sum, item) => sum + Number(item.budgetedAmount || 0), 0) - budgetItems.reduce((sum, item) => sum + Number(item.actualAmount || 0), 0)).toLocaleString('en-US', {
                              style: 'currency',
                              currency: budgetItems[0]?.currency || 'USD',
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Budgeted</TableHead>
                          <TableHead className="text-right">Actual</TableHead>
                          <TableHead className="text-right">Variance</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {budgetItems.map((item) => {
                          const variance = item.budgetedAmount - item.actualAmount;
                          return (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.category}</TableCell>
                              <TableCell>{item.description || '-'}</TableCell>
                              <TableCell className="text-right">
                                {item.budgetedAmount.toLocaleString('en-US', {
                                  style: 'currency',
                                  currency: item.currency,
                                })}
                              </TableCell>
                              <TableCell className="text-right">
                                {item.actualAmount.toLocaleString('en-US', {
                                  style: 'currency',
                                  currency: item.currency,
                                })}
                              </TableCell>
                              <TableCell className={`text-right ${variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {variance.toLocaleString('en-US', {
                                  style: 'currency',
                                  currency: item.currency,
                                })}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingBudgetItem(item);
                                      setBudgetForm({
                                        category: item.category,
                                        description: item.description || '',
                                        budgetedAmount: item.budgetedAmount,
                                        actualAmount: item.actualAmount,
                                        currency: item.currency,
                                      });
                                      setIsBudgetDialogOpen(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={async () => {
                                      if (confirm('Are you sure you want to delete this budget item?')) {
                                        try {
                                          await projectBudgetService.deleteBudgetItem(item.id);
                                          await loadBudgetItems();
                                          toast({ title: 'Success', description: 'Budget item deleted' });
                                        } catch (error) {
                                          toast({
                                            title: 'Error',
                                            description: error instanceof Error ? error.message : 'Failed to delete budget item',
                                            variant: 'destructive',
                                          });
                                        }
                                      }
                                    }}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="milestones" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Project Milestones</h3>
                    <p className="text-sm text-muted-foreground">Track key project milestones and deadlines</p>
                  </div>
                  <Button onClick={() => {
                    setEditingMilestone(null);
                    setMilestoneForm({
                      name: '',
                      description: '',
                      targetDate: '',
                    });
                    setIsMilestoneDialogOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Milestone
                  </Button>
                </div>
                {milestones.length === 0 ? (
                  <div className="text-center py-12">
                    <Flag className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No milestones</h3>
                    <p className="text-muted-foreground mb-4">Define key milestones for your project</p>
                    <Button onClick={() => {
                      setEditingMilestone(null);
                      setMilestoneForm({
                        name: '',
                        description: '',
                        targetDate: '',
                      });
                      setIsMilestoneDialogOpen(true);
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Milestone
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {milestones.map((milestone) => (
                      <Card key={milestone.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="flex items-center gap-2">
                                {milestone.name}
                                <Badge variant={
                                  milestone.status === 'completed' ? 'default' :
                                    milestone.status === 'overdue' ? 'destructive' :
                                      milestone.status === 'in_progress' ? 'default' :
                                        'secondary'
                                }>
                                  {milestone.status === 'in_progress' ? 'In Progress' : milestone.status}
                                </Badge>
                              </CardTitle>
                              <CardDescription className="mt-2">{milestone.description}</CardDescription>
                            </div>
                            <div className="flex gap-2">
                              {milestone.status === 'pending' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      await projectMilestonesService.updateMilestone(milestone.id, {
                                        status: 'in_progress',
                                      });
                                      await loadMilestones();
                                      toast({ title: 'Success', description: 'Milestone marked as in progress' });
                                    } catch (error) {
                                      toast({
                                        title: 'Error',
                                        description: error instanceof Error ? error.message : 'Failed to update milestone',
                                        variant: 'destructive',
                                      });
                                    }
                                  }}
                                  className="text-blue-600 hover:text-blue-700"
                                  title="Mark as In Progress"
                                >
                                  <Play className="h-4 w-4" />
                                </Button>
                              )}
                              {milestone.status !== 'completed' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      await projectMilestonesService.updateMilestone(milestone.id, {
                                        status: 'completed',
                                        completedDate: new Date().toISOString(),
                                      });
                                      await loadMilestones();
                                      toast({ title: 'Success', description: 'Milestone marked as completed' });
                                    } catch (error) {
                                      toast({
                                        title: 'Error',
                                        description: error instanceof Error ? error.message : 'Failed to update milestone',
                                        variant: 'destructive',
                                      });
                                    }
                                  }}
                                  className="text-green-600 hover:text-green-700"
                                  title="Mark as Completed"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingMilestone(milestone);
                                  setMilestoneForm({
                                    name: milestone.name,
                                    description: milestone.description || '',
                                    targetDate: milestone.targetDate ? new Date(milestone.targetDate).toISOString().split('T')[0] : '',
                                  });
                                  setIsMilestoneDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  if (confirm('Are you sure you want to delete this milestone?')) {
                                    try {
                                      await projectMilestonesService.deleteMilestone(milestone.id);
                                      await loadMilestones();
                                      toast({ title: 'Success', description: 'Milestone deleted' });
                                    } catch (error) {
                                      toast({
                                        title: 'Error',
                                        description: error instanceof Error ? error.message : 'Failed to delete milestone',
                                        variant: 'destructive',
                                      });
                                    }
                                  }
                                }}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <Label className="text-xs text-muted-foreground">Target Date</Label>
                              <p className="font-medium">
                                {milestone.targetDate ? format(new Date(milestone.targetDate), 'MMMM dd, yyyy') : 'Not set'}
                              </p>
                            </div>
                            {milestone.completedDate && (
                              <div>
                                <Label className="text-xs text-muted-foreground">Completed Date</Label>
                                <p className="font-medium">
                                  {format(new Date(milestone.completedDate), 'MMMM dd, yyyy')}
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="gantt" className="space-y-4 mt-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Gantt Chart</h3>
                  <p className="text-sm text-muted-foreground mb-4">Visualize task timelines and dependencies</p>
                  {projectTasks.length === 0 ? (
                    <div className="text-center py-12">
                      <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">No tasks to display</h3>
                      <p className="text-muted-foreground mb-4">Create tasks with due dates to see them on the Gantt chart</p>
                    </div>
                  ) : (
                    <GanttChart
                      tasks={projectTasks}
                      milestones={milestones}
                      startDate={currentProject?.startDate ? new Date(currentProject.startDate) : undefined}
                      endDate={currentProject?.endDate ? new Date(currentProject.endDate) : undefined}
                    />
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Project Members - Sheet/Drawer */}
        <Sheet open={isMembersSheetOpen} onOpenChange={setIsMembersSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full">
              <Users className="h-4 w-4 mr-2" />
              Project Members ({projectMembers.length})
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>Project Members</SheetTitle>
              <SheetDescription>
                Manage who can view and collaborate on this project
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              {(user?.role === 'admin' || currentProject?.createdBy === user?.id) && (
                <Button
                  onClick={() => {
                    setIsMembersSheetOpen(false);
                    setIsMemberDialogOpen(true);
                  }}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              )}
              {projectMembers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No members added yet</p>
                  {(user?.role === 'admin' || currentProject?.createdBy === user?.id) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        setIsMembersSheetOpen(false);
                        setIsMemberDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Member
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {projectMembers.map((member) => (
                    <Card key={member.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{member.firstName} {member.lastName}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {(user?.role === 'admin' || currentProject?.createdBy === user?.id) ? (
                              <Select
                                value={member.role}
                                onValueChange={(value: 'owner' | 'member' | 'viewer') => handleUpdateMemberRole(member.id, value)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="owner">Owner</SelectItem>
                                  <SelectItem value="member">Member</SelectItem>
                                  <SelectItem value="viewer">Viewer</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant="outline">{member.role}</Badge>
                            )}
                            {(user?.role === 'admin' || currentProject?.createdBy === user?.id) && member.id !== user?.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveMember(member.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Add Member Dialog */}
        <Dialog open={isMemberDialogOpen} onOpenChange={setIsMemberDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Project Member</DialogTitle>
              <DialogDescription>
                Select a user to add to this project
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="member-user">User</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers
                      .filter(u => !projectMembers.find(pm => pm.id === u.id))
                      .map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.firstName} {u.lastName} ({u.email})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-role">Role</Label>
                <Select value={memberRole} onValueChange={(value: 'owner' | 'member' | 'viewer') => setMemberRole(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner - Full access</SelectItem>
                    <SelectItem value="member">Member - Can edit</SelectItem>
                    <SelectItem value="viewer">Viewer - Read only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsMemberDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddMember} disabled={!selectedUserId}>
                Add Member
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Tasks</p>
                  <p className="text-2xl font-bold">{projectStats.totalTasks}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{projectStats.completedTasks}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600">{projectStats.inProgressTasks}</p>
                </div>
                <PlayCircle className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-bold text-red-600">{projectStats.overdueTasks}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CXO Report Dialog */}
        <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>CXO-Level Project Report</DialogTitle>
              <DialogDescription>
                AI-generated executive summary for {currentProject?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              {cxoReport ? (
                <div className="prose max-w-none whitespace-pre-wrap text-sm">
                  {cxoReport}
                </div>
              ) : (
                <p className="text-gray-500">Generating report...</p>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  if (cxoReport && id) {
                    const blob = new Blob([cxoReport], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `cxo-report-${id}-${format(new Date(), 'yyyy-MM-dd')}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }
                }}
              >
                <FileText className="h-4 w-4 mr-2" />
                Download TXT
              </Button>
              <Button onClick={() => setIsReportDialogOpen(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Risk Dialog */}
        <Dialog open={isRiskDialogOpen} onOpenChange={setIsRiskDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingRisk ? 'Edit Risk' : 'Add Risk'}</DialogTitle>
              <DialogDescription>
                {editingRisk ? 'Update project risk details' : 'Identify and track a new project risk'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="risk-title">Title *</Label>
                <Input
                  id="risk-title"
                  value={riskForm.title}
                  onChange={(e) => setRiskForm({ ...riskForm, title: e.target.value })}
                  placeholder="Enter risk title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="risk-description">Description</Label>
                <Textarea
                  id="risk-description"
                  value={riskForm.description}
                  onChange={(e) => setRiskForm({ ...riskForm, description: e.target.value })}
                  placeholder="Describe the risk"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="risk-category">Category</Label>
                  <Select
                    value={riskForm.riskCategory}
                    onValueChange={(value: ProjectRisk['riskCategory']) => setRiskForm({ ...riskForm, riskCategory: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="schedule">Schedule</SelectItem>
                      <SelectItem value="budget">Budget</SelectItem>
                      <SelectItem value="resource">Resource</SelectItem>
                      <SelectItem value="scope">Scope</SelectItem>
                      <SelectItem value="quality">Quality</SelectItem>
                      <SelectItem value="external">External</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="risk-status">Status</Label>
                  <Select
                    value={riskForm.status}
                    onValueChange={(value: ProjectRisk['status']) => setRiskForm({ ...riskForm, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="identified">Identified</SelectItem>
                      <SelectItem value="monitoring">Monitoring</SelectItem>
                      <SelectItem value="mitigated">Mitigated</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="risk-probability">Probability</Label>
                  <Select
                    value={riskForm.probability}
                    onValueChange={(value: ProjectRisk['probability']) => setRiskForm({ ...riskForm, probability: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="risk-impact">Impact</Label>
                  <Select
                    value={riskForm.impact}
                    onValueChange={(value: ProjectRisk['impact']) => setRiskForm({ ...riskForm, impact: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="risk-mitigation">Mitigation Strategy</Label>
                <Textarea
                  id="risk-mitigation"
                  value={riskForm.mitigationStrategy}
                  onChange={(e) => setRiskForm({ ...riskForm, mitigationStrategy: e.target.value })}
                  placeholder="Describe how to mitigate this risk"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="risk-owner">Mitigation Owner</Label>
                  <Select
                    value={riskForm.mitigationOwner}
                    onValueChange={(value) => setRiskForm({ ...riskForm, mitigationOwner: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select owner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {availableUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.firstName} {u.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="risk-target-date">Target Mitigation Date</Label>
                  <Input
                    id="risk-target-date"
                    type="date"
                    value={riskForm.targetMitigationDate}
                    onChange={(e) => setRiskForm({ ...riskForm, targetMitigationDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsRiskDialogOpen(false);
                setEditingRisk(null);
              }}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!riskForm.title.trim() || !id) return;
                  try {
                    if (editingRisk) {
                      await projectRisksService.updateRisk(editingRisk.id, riskForm);
                      toast({ title: 'Success', description: 'Risk updated' });
                    } else {
                      await projectRisksService.createRisk({
                        projectId: id,
                        ...riskForm,
                        mitigationOwnerId: riskForm.mitigationOwner && riskForm.mitigationOwner !== 'none' ? riskForm.mitigationOwner : undefined,
                        targetMitigationDate: riskForm.targetMitigationDate || undefined,
                      });
                      toast({ title: 'Success', description: 'Risk added' });
                    }
                    await loadRisks();
                    setIsRiskDialogOpen(false);
                    setEditingRisk(null);
                    setRiskForm({
                      title: '',
                      description: '',
                      riskCategory: 'technical',
                      probability: 'medium',
                      impact: 'medium',
                      status: 'identified',
                      mitigationStrategy: '',
                      mitigationOwner: 'none',
                      targetMitigationDate: '',
                    });
                  } catch (error) {
                    toast({
                      title: 'Error',
                      description: error instanceof Error ? error.message : 'Failed to save risk',
                      variant: 'destructive',
                    });
                  }
                }}
                disabled={!riskForm.title.trim()}
              >
                {editingRisk ? 'Update' : 'Create'} Risk
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Budget Item Dialog */}
        <Dialog open={isBudgetDialogOpen} onOpenChange={setIsBudgetDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingBudgetItem ? 'Edit Budget Item' : 'Add Budget Item'}</DialogTitle>
              <DialogDescription>
                {editingBudgetItem ? 'Update budget item details' : 'Add a new budget line item'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="budget-category">Category *</Label>
                <Input
                  id="budget-category"
                  value={budgetForm.category}
                  onChange={(e) => setBudgetForm({ ...budgetForm, category: e.target.value })}
                  placeholder="e.g., Development, Marketing, Infrastructure"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget-description">Description</Label>
                <Textarea
                  id="budget-description"
                  value={budgetForm.description}
                  onChange={(e) => setBudgetForm({ ...budgetForm, description: e.target.value })}
                  placeholder="Describe this budget item"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budget-amount">Budgeted Amount *</Label>
                  <Input
                    id="budget-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={budgetForm.budgetedAmount}
                    onChange={(e) => setBudgetForm({ ...budgetForm, budgetedAmount: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget-actual">Actual Amount</Label>
                  <Input
                    id="budget-actual"
                    type="number"
                    min="0"
                    step="0.01"
                    value={budgetForm.actualAmount}
                    onChange={(e) => setBudgetForm({ ...budgetForm, actualAmount: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget-currency">Currency</Label>
                  <Select
                    value={budgetForm.currency}
                    onValueChange={(value) => setBudgetForm({ ...budgetForm, currency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="BDT">BDT (৳)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsBudgetDialogOpen(false);
                setEditingBudgetItem(null);
              }}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!budgetForm.category.trim() || !id) return;
                  try {
                    if (editingBudgetItem) {
                      await projectBudgetService.updateBudgetItem(editingBudgetItem.id, budgetForm);
                      toast({ title: 'Success', description: 'Budget item updated' });
                    } else {
                      await projectBudgetService.createBudgetItem({
                        projectId: id,
                        ...budgetForm,
                      });
                      toast({ title: 'Success', description: 'Budget item added' });
                    }
                    await loadBudgetItems();
                    setIsBudgetDialogOpen(false);
                    setEditingBudgetItem(null);
                    setBudgetForm({
                      category: '',
                      description: '',
                      budgetedAmount: 0,
                      actualAmount: 0,
                      currency: 'USD',
                    });
                  } catch (error) {
                    toast({
                      title: 'Error',
                      description: error instanceof Error ? error.message : 'Failed to save budget item',
                      variant: 'destructive',
                    });
                  }
                }}
                disabled={!budgetForm.category.trim()}
              >
                {editingBudgetItem ? 'Update' : 'Create'} Budget Item
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Milestone Dialog */}
        <Dialog open={isMilestoneDialogOpen} onOpenChange={setIsMilestoneDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingMilestone ? 'Edit Milestone' : 'Add Milestone'}</DialogTitle>
              <DialogDescription>
                {editingMilestone ? 'Update milestone details' : 'Add a new project milestone'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="milestone-name">Name *</Label>
                <Input
                  id="milestone-name"
                  value={milestoneForm.name}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, name: e.target.value })}
                  placeholder="e.g., Phase 1 Complete, Beta Release"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="milestone-description">Description</Label>
                <Textarea
                  id="milestone-description"
                  value={milestoneForm.description}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                  placeholder="Describe this milestone"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="milestone-date">Target Date *</Label>
                <Input
                  id="milestone-date"
                  type="date"
                  value={milestoneForm.targetDate}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, targetDate: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsMilestoneDialogOpen(false);
                setEditingMilestone(null);
              }}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!milestoneForm.name.trim() || !milestoneForm.targetDate || !id) return;
                  try {
                    if (editingMilestone) {
                      await projectMilestonesService.updateMilestone(editingMilestone.id, milestoneForm);
                      toast({ title: 'Success', description: 'Milestone updated' });
                    } else {
                      await projectMilestonesService.createMilestone({
                        projectId: id,
                        ...milestoneForm,
                      });
                      toast({ title: 'Success', description: 'Milestone added' });
                    }
                    await loadMilestones();
                    setIsMilestoneDialogOpen(false);
                    setEditingMilestone(null);
                    setMilestoneForm({
                      name: '',
                      description: '',
                      targetDate: '',
                    });
                  } catch (error) {
                    toast({
                      title: 'Error',
                      description: error instanceof Error ? error.message : 'Failed to save milestone',
                      variant: 'destructive',
                    });
                  }
                }}
                disabled={!milestoneForm.name.trim() || !milestoneForm.targetDate}
              >
                {editingMilestone ? 'Update' : 'Create'} Milestone
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}
