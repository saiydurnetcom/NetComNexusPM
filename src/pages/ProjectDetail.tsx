import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import Navigation from '@/components/Navigation';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/hooks/useAuth';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { useToast } from '@/components/ui/use-toast';
import { Task, Project } from '@/types';
import { Play, Clock } from 'lucide-react';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tasks, isLoading: tasksLoading, createTask, updateTaskStatus, fetchTasks } = useTasks();
  const { projects, fetchProjects } = useProjects();
  const { startTimer, activeTimer, fetchTimeEntries } = useTimeTracking();
  const { toast } = useToast();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  useEffect(() => {
    fetchProjects();
    fetchTasks();
    fetchTimeEntries();
  }, [fetchProjects, fetchTasks, fetchTimeEntries]);

  useEffect(() => {
    if (id && projects.length > 0) {
      const project = projects.find(p => p.id === id);
      setCurrentProject(project || null);
    }
  }, [id, projects]);

  useEffect(() => {
    if (id && tasks.length > 0) {
      const filteredTasks = tasks.filter(task => task.projectId === id);
      setProjectTasks(filteredTasks);
    }
  }, [id, tasks]);

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim() || !id || !user) return;

    try {
      await createTask({
        title: newTaskTitle,
        description: newTaskDescription,
        projectId: id,
        priority: 'medium',
        estimatedHours: 1,
        assignedTo: user.id,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      setNewTaskTitle('');
      setNewTaskDescription('');
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

  const handleStartTimer = async (taskId: string) => {
    try {
      await startTimer(taskId);
      await fetchTimeEntries();
      toast({
        title: 'Success',
        description: 'Timer started successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start timer',
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    try {
      await updateTaskStatus(taskId, newStatus);
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const getStatusBadgeVariant = (status: Task['status']) => {
    switch (status) {
      case 'todo':
        return 'secondary';
      case 'in_progress':
        return 'default';
      case 'completed':
        return 'default';
      case 'review':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  if (!currentProject) {
    return <div>Loading project...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto p-6 space-y-6">
        <Card>
        <CardHeader>
          <CardTitle>{currentProject.name}</CardTitle>
          <CardDescription>{currentProject.description}</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add New Task</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Task title"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Textarea
              placeholder="Task description (optional)"
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
              rows={3}
            />
          </div>
          <Button onClick={handleCreateTask} disabled={!newTaskTitle.trim()}>
            Add Task
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tasks ({projectTasks.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tasksLoading ? (
            <div>Loading...</div>
          ) : projectTasks.length === 0 ? (
            <div className="text-muted-foreground">No tasks yet</div>
          ) : (
            projectTasks.map((task) => (
              <Card key={task.id} className="border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <Button
                        variant="link"
                        className="p-0 h-auto font-semibold text-base"
                        onClick={() => navigate(`/tasks/${task.id}`)}
                      >
                        {task.title}
                      </Button>
                      {task.description && (
                        <p className="text-sm text-muted-foreground">
                          {task.description}
                        </p>
                      )}
                      <Badge variant={getStatusBadgeVariant(task.status)}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartTimer(task.id)}
                        disabled={!!activeTimer && activeTimer.taskId !== task.id}
                        title={activeTimer && activeTimer.taskId !== task.id ? 'Stop current timer first' : 'Start timer'}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        {activeTimer?.taskId === task.id ? (
                          <>
                            <Clock className="h-3 w-3 mr-1" />
                            Running
                          </>
                        ) : (
                          'Start'
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(task.id, 'todo')}
                        disabled={task.status === 'todo'}
                      >
                        To Do
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(task.id, 'in_progress')}
                        disabled={task.status === 'in_progress'}
                      >
                        In Progress
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(task.id, 'completed')}
                        disabled={task.status === 'completed'}
                      >
                        Completed
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}