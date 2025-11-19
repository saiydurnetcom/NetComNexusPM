import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import AppLayout from '@/components/AppLayout';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/hooks/useAuth';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { useToast } from '@/components/ui/use-toast';
import { tasksService } from '@/lib/api-data';
import { usersService } from '@/lib/users-service';
import { apiClient } from '@/lib/api-client';
import { Task, User, Tag } from '@/types';
import { Plus, Search, Filter, Edit, Trash2, Calendar, Clock, ArrowUpDown, CheckCircle2, Circle, PlayCircle, User as UserIcon, FolderKanban, Play, Square, Tag as TagIcon, List, Grid, LayoutGrid, AlertCircle } from 'lucide-react';
import { KanbanBoard } from '@/components/KanbanBoard';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { TagSelector } from '@/components/TagSelector';

export default function Tasks() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tasks, fetchTasks, createTask, updateTaskStatus, isLoading, error: tasksError } = useTasks();
  const { projects, fetchProjects } = useProjects();
  const { timeEntries, fetchTimeEntries, activeTimer, startTimer, stopTimer } = useTimeTracking();
  const { toast } = useToast();
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [taskTags, setTaskTags] = useState<Record<string, Tag[]>>({});
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // Form state
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM' as Task['priority'],
    projectId: '',
    dueDate: '',
    estimatedHours: 0,
    selectedTags: [] as string[],
  });

  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'title' | 'dueDate' | 'priority' | 'status'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'kanban'>('grid');

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchTasks();
        await fetchProjects();
        await fetchTimeEntries();
        await loadUsers();
        await loadTags();
        await loadTaskTags();
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load tasks. Please check your database connection.',
          variant: 'destructive',
        });
      }
    };
    loadData();
  }, []);

  const loadUsers = async () => {
    try {
      const users = await usersService.getUsers();
      setAvailableUsers(users);
    } catch (error) {
      console.error('Error loading users:', error);
      const currentUser = await usersService.getCurrentUser();
      if (currentUser) {
        setAvailableUsers([currentUser]);
      }
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

  const loadTaskTags = async () => {
    try {
      // Load tags for all tasks
      const allTasks = await tasksService.getTasks();
      const tagMap: Record<string, Tag[]> = {};
      
      await Promise.all(
        allTasks.map(async (task) => {
          try {
            const taskTags = await apiClient.getTaskTags(task.id);
            tagMap[task.id] = taskTags.map((tt: any) => tt.tag);
          } catch (error) {
            console.error(`Error loading tags for task ${task.id}:`, error);
            tagMap[task.id] = [];
          }
        })
      );
      
      setTaskTags(tagMap);
    } catch (error) {
      console.error('Error loading task tags:', error);
      setTaskTags({});
    }
  };

  // Filtered and sorted tasks
  const filteredTasks = useMemo(() => {
    const filtered = tasks.filter(task => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      
      // Priority filter
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      
      // Project filter
      const matchesProject = projectFilter === 'all' 
        || (projectFilter === 'none' && !task.projectId)
        || task.projectId === projectFilter;
      
      return matchesSearch && matchesStatus && matchesPriority && matchesProject;
    });

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'dueDate':
          comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          break;
        case 'priority': {
          const priorityOrder = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        }
        case 'status': {
          const statusOrder = { TODO: 1, IN_PROGRESS: 2, REVIEW: 3, BLOCKED: 4, COMPLETED: 5 };
          comparison = statusOrder[a.status] - statusOrder[b.status];
          break;
        }
        default: {
          comparison = 0;
          break;
        }
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return filtered;
  }, [tasks, searchTerm, statusFilter, priorityFilter, projectFilter, sortBy, sortOrder]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim() || !user) return;

    try {
      const task = await createTask({
        title: taskForm.title,
        description: taskForm.description,
        projectId: taskForm.projectId || undefined,
        priority: taskForm.priority.toUpperCase() as Task['priority'],
        estimatedHours: taskForm.estimatedHours || 0,
        assignedTo: user.id,
        dueDate: taskForm.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      // Add tags to task using API
      if (taskForm.selectedTags.length > 0) {
        try {
          await apiClient.updateTaskTags(task.id, taskForm.selectedTags);
        } catch (error) {
          console.error('Error updating task tags:', error);
        }
      }
      await loadTaskTags();
      
      setTaskForm({
        title: '',
        description: '',
        priority: 'MEDIUM' as Task['priority'],
        projectId: '',
        dueDate: '',
        estimatedHours: 0,
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

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
      const currentTags = taskTags[task.id] || [];
      setTaskForm({
        title: task.title,
        description: task.description || '',
        priority: task.priority.toUpperCase() as Task['priority'],
        projectId: task.projectId || '',
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
        estimatedHours: task.estimatedHours || 0,
        selectedTags: currentTags.map(t => t.id),
      });
    setIsEditDialogOpen(true);
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !taskForm.title.trim()) return;

    try {
      // Update task via API
      await apiClient.updateTask(editingTask.id, {
        title: taskForm.title,
        description: taskForm.description,
        priority: taskForm.priority.toUpperCase() as Task['priority'],
        projectId: taskForm.projectId || undefined,
        dueDate: taskForm.dueDate || editingTask.dueDate,
      });

      // Update tags using API
      try {
        await apiClient.updateTaskTags(editingTask.id, taskForm.selectedTags || []);
      } catch (error) {
        console.error('Error updating task tags:', error);
      }
      await loadTaskTags();

      setIsEditDialogOpen(false);
      setEditingTask(null);
      await fetchTasks();
      
      toast({
        title: 'Success',
        description: 'Task updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update task',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await apiClient.deleteTask(taskId);

      await fetchTasks();
      toast({
        title: 'Success',
        description: 'Task deleted successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete task',
        variant: 'destructive',
      });
    }
  };

  const handleTimerToggle = async (task: Task) => {
    const isTaskTimerActive = activeTimer?.taskId === task.id;
    
    if (isTaskTimerActive && activeTimer) {
      // Stop timer
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
    } else {
      // Start timer
      try {
        await startTimer(task.id);
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
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    try {
      await updateTaskStatus(taskId, newStatus);
      toast({
        title: 'Success',
        description: 'Task status updated',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update task status',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'IN_PROGRESS':
        return <PlayCircle className="h-4 w-4 text-blue-600" />;
      case 'REVIEW':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'BLOCKED':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'URGENT':
        return 'destructive';
      case 'HIGH':
        return 'default';
      case 'MEDIUM':
        return 'secondary';
      case 'LOW':
        return 'outline';
      default:
        return 'outline';
        break;
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'COMPLETED':
        return 'default';
      case 'IN_PROGRESS':
        return 'default';
      case 'REVIEW':
        return 'secondary';
      case 'BLOCKED':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
              <p className="text-gray-600">Manage all your tasks</p>
            </div>

            {/* Create Task Dialog */}
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
                  <DialogDescription>Create a task with or without a project</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateTask} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Task Title *</Label>
                    <Input
                      id="title"
                      value={taskForm.title}
                      onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                      placeholder="Enter task title"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={taskForm.description}
                      onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                      placeholder="Enter task description (optional)"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="project">Project (Optional)</Label>
                      <Select value={taskForm.projectId || "none"} onValueChange={(value) => setTaskForm({ ...taskForm, projectId: value === "none" ? "" : value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a project" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Project</SelectItem>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select value={taskForm.priority} onValueChange={(value: Task['priority']) => setTaskForm({ ...taskForm, priority: value })}>
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
                      <Label htmlFor="estimatedHours">Estimated Hours</Label>
                      <Input
                        id="estimatedHours"
                        type="number"
                        min="0"
                        step="0.5"
                        value={taskForm.estimatedHours}
                        onChange={(e) => setTaskForm({ ...taskForm, estimatedHours: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={taskForm.dueDate}
                      onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <TagSelector
                    tags={availableTags}
                    selectedTags={taskForm.selectedTags}
                    onSelectionChange={(tagIds) => setTaskForm({ ...taskForm, selectedTags: tagIds })}
                    />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? 'Creating...' : 'Create Task'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search and Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search tasks..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <Label>Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue />
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
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="URGENT">Urgent</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="LOW">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Project</Label>
                    <Select value={projectFilter} onValueChange={setProjectFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Projects</SelectItem>
                        <SelectItem value="none">No Project</SelectItem>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Sort By</Label>
                    <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dueDate">Due Date</SelectItem>
                        <SelectItem value="title">Title</SelectItem>
                        <SelectItem value="priority">Priority</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Order</Label>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    >
                      {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                      <ArrowUpDown className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Loading Tasks */}
        {tasksError && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <div className="text-destructive">
                <p className="font-semibold">Error loading tasks:</p>
                <p className="text-sm">{tasksError}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading Tasks */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading tasks...</p>
          </div>
        )}

        {!isLoading && !tasksError && (
          <>
            {/* View Mode Toggle */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="h-4 w-4 mr-2" />
                  Grid
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                >
                  <List className="h-4 w-4 mr-2" />
                  Table
                </Button>
                <Button
                  variant={viewMode === 'kanban' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('kanban')}
                >
                  <FolderKanban className="h-4 w-4 mr-2" />
                  Kanban
                </Button>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Tasks</p>
                      <p className="text-2xl font-bold">{tasks.length}</p>
                    </div>
                    <Circle className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Todo</p>
                      <p className="text-2xl font-bold text-gray-600">
                        {tasks.filter(t => t.status === 'TODO').length}
                      </p>
                    </div>
                    <Circle className="h-8 w-8 text-gray-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">In Progress</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {tasks.filter(t => t.status === 'IN_PROGRESS').length}
                      </p>
                    </div>
                    <PlayCircle className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Completed</p>
                      <p className="text-2xl font-bold text-green-600">
                        {tasks.filter(t => t.status === 'COMPLETED').length}
                      </p>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Overdue</p>
                      <p className="text-2xl font-bold text-red-600">
                        {tasks.filter(t => isOverdue(t.dueDate) && t.status !== 'COMPLETED').length}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(() => {
                          const overdueInProgress = tasks.filter(t => isOverdue(t.dueDate) && t.status === 'IN_PROGRESS').length;
                          return overdueInProgress > 0 ? `(${overdueInProgress} in progress)` : '';
                        })()}
                      </p>
                    </div>
                    <Calendar className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tasks Grid/List */}
            {filteredTasks.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">
                      {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || projectFilter !== 'all'
                        ? 'No tasks found'
                        : 'No tasks yet'}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || projectFilter !== 'all'
                        ? 'Try adjusting your filters to see more tasks.'
                        : 'Create your first task to get started!'}
                    </p>
                    {!searchTerm && statusFilter === 'all' && priorityFilter === 'all' && projectFilter === 'all' && (
                      <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Task
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
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
                  showProject={true}
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
                        <TableHead>Project</TableHead>
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
                        const project = projects.find(p => p.id === task.projectId);
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
                          <TableRow 
                            key={task.id} 
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => navigate(`/tasks/${task.id}`)}
                          >
                            <TableCell className="font-medium max-w-xs">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="truncate">{task.title}</div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{task.title}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell>
                              {project ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/projects/${project.id}`);
                                  }}
                                >
                                  {project.name}
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-xs">No Project</span>
                              )}
                            </TableCell>
                            <TableCell>
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
                              <div className="text-xs">
                                <span className="font-medium">
                                  {Math.floor(totalTime / 60)}h {totalTime % 60}m
                                </span>
                                {task.estimatedHours > 0 && (
                                  <span className="text-muted-foreground">
                                    {' '}/ {task.estimatedHours}h
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {task.estimatedHours > 0 ? (
                                <div className="flex items-center gap-2 min-w-[100px]">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full ${
                                        hasExceeded120Percent ? 'bg-red-600' :
                                        hasExceededEstimate ? 'bg-orange-500' :
                                        progressPercentage >= 80 ? 'bg-yellow-500' :
                                        'bg-blue-500'
                                      }`}
                                      style={{ width: `${Math.min(100, progressPercentage)}%` }}
                                    />
                                  </div>
                                  <span className={`text-xs font-medium ${
                                    hasExceeded120Percent ? 'text-red-600' :
                                    hasExceededEstimate ? 'text-orange-600' :
                                    ''
                                  }`}>
                                    {progressPercentage.toFixed(0)}%
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTimerToggle(task);
                                  }}
                                >
                                  {isTaskTimerActive ? (
                                    <Square className="h-3 w-3 text-red-600" />
                                  ) : (
                                    <Play className="h-3 w-3" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditClick(task);
                                  }}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick(task);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
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
                  const project = projects.find(p => p.id === task.projectId);
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
                  const currentTaskTags = taskTags[task.id] || [];
                  
                  return (
                    <Card
                      key={task.id}
                      className={`hover:shadow-lg transition-all cursor-pointer h-full flex flex-col ${
                        isTaskOverdue && task.status !== 'COMPLETED' ? 'border-red-300 bg-red-50/50' : ''
                      }`}
                      onClick={() => navigate(`/tasks/${task.id}`)}
                    >
                      <CardHeader className="pb-3 flex-shrink-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                            <CardTitle className="text-lg line-clamp-2 mb-2">{task.title}</CardTitle>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">{task.title}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            {task.description && (
                              <CardDescription 
                                className="line-clamp-2 text-sm cursor-pointer hover:text-blue-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/tasks/${task.id}`);
                                }}
                              >
                                {task.description}
                              </CardDescription>
                            )}
                            {currentTaskTags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {currentTaskTags.map(tag => (
                                  <Badge key={tag.id} variant="outline" className="text-xs" style={{ borderColor: tag.color, color: tag.color }}>
                                    <TagIcon className="h-2 w-2 mr-1" />
                                    {tag.name}
                                  </Badge>
                                ))}
                              </div>
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
                                <SelectItem value="TODO">To Do</SelectItem>
                                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                <SelectItem value="REVIEW">Review</SelectItem>
                                <SelectItem value="BLOCKED">Blocked</SelectItem>
                                <SelectItem value="COMPLETED">Completed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 flex-1 flex flex-col">
                        {/* Project & Assignee */}
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            {project ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/projects/${project.id}`);
                                }}
                              >
                                <FolderKanban className="h-3 w-3 mr-1" />
                                {project.name}
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-xs">No Project</span>
                            )}
                          </div>
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
                            {isTaskOverdue && task.status !== 'COMPLETED' && (
                              <Badge variant="destructive" className="text-xs ml-1">Overdue</Badge>
                            )}
                          </div>
                        </div>

                        {/* Time Tracking */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium">
                                {Math.floor(totalTime / 60)}h {totalTime % 60}m
                              </span>
                              {task.estimatedHours > 0 && (
                                <span className="text-muted-foreground">
                                  / {task.estimatedHours}h est.
                                </span>
                              )}
                            </div>
                            {task.estimatedHours > 0 && (
                              <span className={`font-medium ${
                                hasExceeded120Percent ? 'text-red-600' :
                                hasExceededEstimate ? 'text-orange-600' :
                                'text-muted-foreground'
                              }`}>
                                {progressPercentage.toFixed(0)}%
                              </span>
                            )}
                          </div>
                          {task.estimatedHours > 0 && (
                            <>
                              <div className="w-full bg-gray-200 rounded-full h-1.5 relative overflow-hidden">
                              <div
                                  className={`h-1.5 rounded-full transition-all ${
                                    hasExceeded120Percent ? 'bg-red-600' :
                                    hasExceededEstimate ? 'bg-orange-500' :
                                  progressPercentage >= 80 ? 'bg-yellow-500' :
                                    progressPercentage >= 50 ? 'bg-blue-500' :
                                    'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(100, progressPercentage)}%` }}
                              />
                            </div>
                              {hasExceededEstimate && (
                                <p className={`text-xs mt-1 ${
                                  hasExceeded120Percent ? 'text-red-600 font-semibold' : 'text-orange-600'
                                }`}>
                                  {hasExceeded120Percent 
                                    ? '⚠️ This task exceeded the estimate by over 120%. Planning should be refined.'
                                    : '⚠️ This task exceeded the estimate.'}
                                </p>
                              )}
                            </>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t mt-auto">
                          <Button
                            variant={isTaskTimerActive ? "default" : "ghost"}
                            size="sm"
                            className={`h-7 text-xs ${isTaskTimerActive ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTimerToggle(task);
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
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditTask(task);
                            }}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-destructive hover:text-destructive"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Task</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{task.title}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Edit Task Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
              <DialogDescription>Update task details</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateTask} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Task Title *</Label>
                <Input
                  id="edit-title"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-project">Project</Label>
                  <Select value={taskForm.projectId || "none"} onValueChange={(value) => setTaskForm({ ...taskForm, projectId: value === "none" ? "" : value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Project</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-priority">Priority</Label>
                  <Select value={taskForm.priority} onValueChange={(value: Task['priority']) => setTaskForm({ ...taskForm, priority: value })}>
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-dueDate">Due Date</Label>
                  <Input
                    id="edit-dueDate"
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-estimatedHours">Estimated Hours</Label>
                  <Input
                    id="edit-estimatedHours"
                    type="number"
                    min="0"
                    step="0.5"
                    value={taskForm.estimatedHours}
                    onChange={(e) => setTaskForm({ ...taskForm, estimatedHours: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <TagSelector
                tags={availableTags}
                selectedTags={taskForm.selectedTags}
                onSelectionChange={(tagIds) => setTaskForm({ ...taskForm, selectedTags: tagIds })}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Update Task
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
