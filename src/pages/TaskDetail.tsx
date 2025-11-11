import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import AppLayout from '@/components/AppLayout';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { usersService } from '@/lib/users-service';
import { supabase } from '@/lib/supabase';
import { Task, User } from '@/types';
import { 
  Calendar, 
  Clock, 
  User as UserIcon, 
  Play, 
  Square, 
  Edit, 
  Save,
  X,
  AlertCircle,
  CheckCircle2,
  Circle,
  PlayCircle
} from 'lucide-react';
import { format } from 'date-fns';

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { tasks, fetchTasks, updateTaskStatus } = useTasks();
  const { projects, fetchProjects } = useProjects();
  const { activeTimer, startTimer, stopTimer, timeEntries, fetchTimeEntries } = useTimeTracking();
  const { toast } = useToast();

  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    assignedTo: '',
    dueDate: '',
    estimatedHours: 0,
  });

  useEffect(() => {
    if (id) {
      loadTask();
      fetchProjects();
      fetchTimeEntries();
      loadUsers();
    }
  }, [id]);

  const loadTask = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setTask(data);
        setEditForm({
          title: data.title,
          description: data.description || '',
          priority: data.priority,
          assignedTo: data.assignedTo,
          dueDate: data.dueDate ? new Date(data.dueDate).toISOString().split('T')[0] : '',
          estimatedHours: data.estimatedHours || 0,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load task',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      // Get current user first
      const current = await usersService.getCurrentUser();
      if (current) {
        setAvailableUsers([current]);
      }
      
      // Try to get other users - for now we'll just use current user
      // In a real app, you'd have a users table or team management
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleSave = async () => {
    if (!task) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: editForm.title,
          description: editForm.description,
          priority: editForm.priority,
          assignedTo: editForm.assignedTo,
          dueDate: editForm.dueDate,
          estimatedHours: editForm.estimatedHours,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', task.id);

      if (error) throw error;

      await loadTask();
      await fetchTasks();
      setIsEditing(false);

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

  const handleStatusChange = async (newStatus: Task['status']) => {
    if (!task) return;

    try {
      await updateTaskStatus(task.id, newStatus);
      await loadTask();
      toast({
        title: 'Success',
        description: 'Task status updated',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const handleTimerToggle = async () => {
    if (!task) return;

    if (activeTimer && activeTimer.taskId === task.id) {
      // Stop current timer
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
      // Start new timer
      try {
        await startTimer(task.id);
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
    }
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'in_progress':
        return <PlayCircle className="h-5 w-5 text-blue-600" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
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

  const taskTimeEntries = timeEntries.filter(entry => entry.taskId === task?.id);
  const totalTimeSpent = taskTimeEntries.reduce((total, entry) => total + (entry.durationMinutes || 0), 0);
  const isTaskTimerActive = activeTimer?.taskId === task?.id;
  const project = projects.find(p => p.id === task?.projectId);
  const assignedUser = availableUsers.find(u => u.id === task?.assignedTo) || currentUser;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading task...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Task Not Found</h3>
                <p className="text-muted-foreground mb-4">The task you're looking for doesn't exist.</p>
                <Button onClick={() => navigate('/tasks')}>Back to Tasks</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'completed';

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              {isEditing ? (
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="text-3xl font-bold mb-2"
                />
              ) : (
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{task.title}</h1>
              )}
              {project && (
                <Button
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  {project.name}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>

          {/* Status and Priority Badges */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              {getStatusIcon(task.status)}
              <Select
                value={task.status}
                onValueChange={(value: Task['status']) => handleStatusChange(value)}
              >
                <SelectTrigger className="w-40">
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
            {isEditing ? (
              <Select
                value={editForm.priority}
                onValueChange={(value: Task['priority']) => setEditForm({ ...editForm, priority: value })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge variant={getPriorityColor(task.priority)}>{task.priority}</Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={6}
                    placeholder="Add a description..."
                  />
                ) : (
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {task.description || 'No description provided'}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Time Tracking */}
            <Card>
              <CardHeader>
                <CardTitle>Time Tracking</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      {Math.floor(totalTimeSpent / 60)}h {totalTimeSpent % 60}m
                    </div>
                    <p className="text-sm text-muted-foreground">Total time spent</p>
                  </div>
                  <Button
                    onClick={handleTimerToggle}
                    variant={isTaskTimerActive ? 'destructive' : 'default'}
                    size="lg"
                  >
                    {isTaskTimerActive ? (
                      <>
                        <Square className="h-4 w-4 mr-2" />
                        Stop Timer
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Start Timer
                      </>
                    )}
                  </Button>
                </div>
                {isTaskTimerActive && activeTimer && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-900">Timer Running</p>
                        <p className="text-xs text-blue-700">
                          Started at {format(new Date(activeTimer.startTime), 'h:mm a')}
                        </p>
                      </div>
                      <Clock className="h-5 w-5 text-blue-600 animate-pulse" />
                    </div>
                  </div>
                )}
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">Time Entries ({taskTimeEntries.length})</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {taskTimeEntries.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No time entries yet</p>
                    ) : (
                      taskTimeEntries.map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <p className="text-sm">
                              {entry.startTime && format(new Date(entry.startTime), 'MMM dd, h:mm a')}
                            </p>
                            {entry.description && (
                              <p className="text-xs text-muted-foreground">{entry.description}</p>
                            )}
                          </div>
                          <div className="text-sm font-medium">
                            {Math.floor((entry.durationMinutes || 0) / 60)}h {(entry.durationMinutes || 0) % 60}m
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Task Details */}
            <Card>
              <CardHeader>
                <CardTitle>Task Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Assigned To</Label>
                  {isEditing ? (
                    <Select
                      value={editForm.assignedTo}
                      onValueChange={(value) => setEditForm({ ...editForm, assignedTo: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.firstName} {user.lastName} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : 'Unassigned'}
                      </span>
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <Label className="text-xs text-muted-foreground">Due Date</Label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editForm.dueDate}
                      onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                        {format(new Date(task.dueDate), 'MMM dd, yyyy')}
                      </span>
                      {isOverdue && (
                        <Badge variant="destructive" className="text-xs">Overdue</Badge>
                      )}
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <Label className="text-xs text-muted-foreground">Estimated Hours</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={editForm.estimatedHours}
                      onChange={(e) => setEditForm({ ...editForm, estimatedHours: parseFloat(e.target.value) || 0 })}
                      className="mt-1"
                    />
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{task.estimatedHours || 0} hours</span>
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <Label className="text-xs text-muted-foreground">Created</Label>
                  <p className="text-sm mt-1">
                    {format(new Date(task.createdAt), 'MMM dd, yyyy')}
                  </p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Last Updated</Label>
                  <p className="text-sm mt-1">
                    {format(new Date(task.updatedAt), 'MMM dd, yyyy')}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleStatusChange('todo')}
                  disabled={task.status === 'todo'}
                >
                  <Circle className="h-4 w-4 mr-2" />
                  Mark as To Do
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleStatusChange('in_progress')}
                  disabled={task.status === 'in_progress'}
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Mark as In Progress
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleStatusChange('review')}
                  disabled={task.status === 'review'}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Mark for Review
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleStatusChange('completed')}
                  disabled={task.status === 'completed'}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark as Completed
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

