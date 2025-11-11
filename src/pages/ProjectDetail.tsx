import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/components/AppLayout';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/hooks/useAuth';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { useToast } from '@/components/ui/use-toast';
import { usersService } from '@/lib/users-service';
import { Task, Project, User, Tag } from '@/types';
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
  ArrowLeft
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
    status: 'active' as Project['status'],
  });

  // Task creation
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    assignedTo: '',
    dueDate: '',
    estimatedHours: 1,
    selectedTags: [] as string[],
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);

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
    } catch (error) {
      console.error('Error loading data:', error);
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
      const { data, error } = await (await import('@/lib/supabase')).supabase
        .from('tags')
        .select('*')
        .order('name');
      if (error) throw error;
      setAvailableTags(data || []);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const loadProjectTags = async () => {
    if (!id) return;
    try {
      const { data, error } = await (await import('@/lib/supabase')).supabase
        .from('project_tags')
        .select('tagId, tags(*)')
        .eq('projectId', id);
      if (error) throw error;
      setProjectTags((data || []).map((pt: any) => pt.tags).filter(Boolean));
    } catch (error) {
      console.error('Error loading project tags:', error);
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
        });
      }
    }
  }, [id, projects]);

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
      });
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
      });

      // Add tags to task
      if (taskForm.selectedTags.length > 0) {
        const { supabase } = await import('@/lib/supabase');
        const tagInserts = taskForm.selectedTags.map(tagId => ({
          taskId: task.id,
          tagId,
        }));
        await supabase.from('task_tags').insert(tagInserts);
      }

      setTaskForm({
        title: '',
        description: '',
        priority: 'medium',
        assignedTo: '',
        dueDate: '',
        estimatedHours: 1,
        selectedTags: [],
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
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <PlayCircle className="h-4 w-4 text-blue-600" />;
      case 'review':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
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
    completedTasks: projectTasks.filter(t => t.status === 'completed').length,
    inProgressTasks: projectTasks.filter(t => t.status === 'in_progress').length,
    overdueTasks: projectTasks.filter(t => isOverdue(t.dueDate) && t.status !== 'completed').length,
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
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{currentProject.name}</h1>
                  <p className="text-gray-600">{currentProject.description || 'No description'}</p>
                </div>
                <Button variant="outline" onClick={() => setIsEditingProject(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Project
                </Button>
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
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Badge variant={currentProject.status === 'active' ? 'default' : 'secondary'} className="mt-1">
                      {currentProject.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Start Date</Label>
                    <p className="text-sm font-medium mt-1">
                      {format(new Date(currentProject.startDate), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">End Date</Label>
                    <p className="text-sm font-medium mt-1">
                      {format(new Date(currentProject.endDate), 'MMM dd, yyyy')}
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
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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
                          {format(new Date(currentProject.startDate), 'MMMM dd, yyyy')}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">End Date</Label>
                        <p className="text-sm font-medium mt-1">
                          {format(new Date(currentProject.endDate), 'MMMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
        </CardContent>
      </Card>

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

        {/* Tasks Section - Same UI as Tasks page */}
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
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
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
                      <Label>Tags</Label>
                      <div className="flex flex-wrap gap-2">
                        {availableTags.map(tag => (
                          <Button
                            key={tag.id}
                            variant={taskForm.selectedTags.includes(tag.id) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                              if (taskForm.selectedTags.includes(tag.id)) {
                                setTaskForm({
                                  ...taskForm,
                                  selectedTags: taskForm.selectedTags.filter(id => id !== tag.id),
                                });
                              } else {
                                setTaskForm({
                                  ...taskForm,
                                  selectedTags: [...taskForm.selectedTags, tag.id],
                                });
                              }
                            }}
                            style={taskForm.selectedTags.includes(tag.id) ? { backgroundColor: tag.color, borderColor: tag.color } : {}}
                          >
                            <TagIcon className="h-3 w-3 mr-1" />
                            {tag.name}
                          </Button>
                        ))}
                      </div>
                    </div>
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
            {/* Search and Filters */}
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
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
            </div>

            {/* Tasks Grid - Same as Tasks page */}
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
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredTasks.map((task) => {
                  const dueDate = new Date(task.dueDate);
                  const isTaskOverdue = isOverdue(task.dueDate);
                  const assignedUser = availableUsers.find(u => u.id === task.assignedTo) || user;
                  const taskTimeEntries = timeEntries.filter(entry => entry.taskId === task.id);
                  const totalTime = taskTimeEntries.reduce((total, entry) => total + (entry.durationMinutes || 0), 0);
                  const progressPercentage = task.estimatedHours > 0 
                    ? Math.min(100, (totalTime / (task.estimatedHours * 60)) * 100)
                    : 0;
                  const isTaskTimerActive = activeTimer?.taskId === task.id;
                  
                  return (
                    <Card
                      key={task.id}
                      className={`hover:shadow-lg transition-all cursor-pointer ${
                        isTaskOverdue && task.status !== 'completed' ? 'border-red-300 bg-red-50/50' : ''
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
                              onClick={(e) => e.stopPropagation()}
                            >
                              <SelectTrigger className="w-28 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="todo">To Do</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="review">Review</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Assignee */}
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1">
                            <UserIcon className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : 'Unassigned'}
                            </span>
                          </div>
                        </div>

                        {/* Priority & Due Date */}
                        <div className="flex items-center justify-between">
                          <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                            {task.priority}
                      </Badge>
                          <div className="flex items-center gap-1">
                            <Calendar className={`h-3 w-3 ${isTaskOverdue ? 'text-red-600' : 'text-muted-foreground'}`} />
                            <span className={`text-xs ${isTaskOverdue ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                              {format(dueDate, 'MMM dd, yyyy')}
                            </span>
                            {isTaskOverdue && task.status !== 'completed' && (
                              <Badge variant="destructive" className="text-xs ml-1">Overdue</Badge>
                            )}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        {task.estimatedHours > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-medium">{Math.round(progressPercentage)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${progressPercentage}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{formatDuration(totalTime)}</span>
                              <span>{task.estimatedHours}h estimated</span>
                            </div>
                    </div>
                        )}

                        {/* Timer Button */}
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
      </div>
    </AppLayout>
  );

  function formatDuration(minutes: number) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }
}
