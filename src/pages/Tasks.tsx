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
import { tasksService } from '@/lib/supabase-data';
import { usersService } from '@/lib/users-service';
import { Task, User } from '@/types';
import { Plus, Search, Filter, Edit, Trash2, Calendar, Clock, ArrowUpDown, CheckCircle2, Circle, PlayCircle, User as UserIcon, FolderKanban } from 'lucide-react';
import { format } from 'date-fns';

export default function Tasks() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tasks, fetchTasks, createTask, updateTaskStatus, isLoading, error: tasksError } = useTasks();
  const { projects, fetchProjects } = useProjects();
  const { timeEntries, fetchTimeEntries } = useTimeTracking();
  const { toast } = useToast();
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // Form state
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    projectId: '',
    dueDate: '',
    estimatedHours: 0,
  });

  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'title' | 'dueDate' | 'priority' | 'status'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchTasks();
        await fetchProjects();
        await fetchTimeEntries();
        // Load users
        const currentUser = await usersService.getCurrentUser();
        if (currentUser) {
          setAvailableUsers([currentUser]);
        }
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
  }, [fetchTasks, fetchProjects, fetchTimeEntries, toast]);

  // Filtered and sorted tasks
  const filteredTasks = useMemo(() => {
    let filtered = tasks.filter(task => {
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
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case 'status':
          const statusOrder = { todo: 1, in_progress: 2, review: 3, completed: 4 };
          comparison = statusOrder[a.status] - statusOrder[b.status];
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [tasks, searchTerm, statusFilter, priorityFilter, projectFilter, sortBy, sortOrder]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim() || !user) return;

    try {
      await createTask({
        title: taskForm.title,
        description: taskForm.description,
        projectId: taskForm.projectId || undefined,
        priority: taskForm.priority,
        estimatedHours: taskForm.estimatedHours || 0,
        assignedTo: user.id,
        dueDate: taskForm.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      
      setTaskForm({
        title: '',
        description: '',
        priority: 'medium',
        projectId: '',
        dueDate: '',
        estimatedHours: 0,
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
      setTaskForm({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        projectId: task.projectId || '',
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
        estimatedHours: task.estimatedHours || 0,
      });
    setIsEditDialogOpen(true);
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !taskForm.title.trim()) return;

    try {
      // Update task via Supabase
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase
        .from('tasks')
        .update({
          title: taskForm.title,
          description: taskForm.description,
          priority: taskForm.priority,
          projectId: taskForm.projectId || null,
          dueDate: taskForm.dueDate || editingTask.dueDate,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', editingTask.id);

      if (error) throw error;

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
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

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
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <PlayCircle className="h-4 w-4 text-blue-600" />;
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

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'in_progress':
        return 'default';
      case 'review':
        return 'secondary';
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
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
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
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
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
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
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

        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading tasks...</p>
          </div>
        )}

        {!isLoading && !tasksError && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
                      <p className="text-sm text-muted-foreground">In Progress</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {tasks.filter(t => t.status === 'in_progress').length}
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
                        {tasks.filter(t => t.status === 'completed').length}
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
                        {tasks.filter(t => isOverdue(t.dueDate) && t.status !== 'completed').length}
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
                    ? Math.min(100, (totalTime / (task.estimatedHours * 60)) * 100)
                    : 0;
                  
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
                            {isTaskOverdue && task.status !== 'completed' && (
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
                              <span className="text-muted-foreground">
                                {progressPercentage.toFixed(0)}%
                              </span>
                            )}
                          </div>
                          {task.estimatedHours > 0 && (
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${
                                  progressPercentage >= 100 ? 'bg-red-500' :
                                  progressPercentage >= 80 ? 'bg-yellow-500' :
                                  'bg-blue-500'
                                }`}
                                style={{ width: `${Math.min(100, progressPercentage)}%` }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t">
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
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
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
