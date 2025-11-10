import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { Task, TaskStatus, Project } from '@/types';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { tasks, isLoading: tasksLoading, createTask, updateTaskStatus } = useTasks();
  const { projects } = useProjects();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

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
    if (!newTaskTitle.trim() || !id) return;

    try {
      await createTask({
        title: newTaskTitle,
        description: newTaskDescription,
        projectId: id,
        status: 'todo'
      });
      setNewTaskTitle('');
      setNewTaskDescription('');
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await updateTaskStatus(taskId, newStatus);
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const getStatusBadgeVariant = (status: TaskStatus) => {
    switch (status) {
      case 'todo':
        return 'secondary';
      case 'in_progress':
        return 'default';
      case 'done':
        return 'success';
      default:
        return 'secondary';
    }
  };

  if (!currentProject) {
    return <div>Loading project...</div>;
  }

  return (
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
                      <h4 className="font-semibold">{task.title}</h4>
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
                        onClick={() => handleStatusChange(task.id, 'done')}
                        disabled={task.status === 'done'}
                      >
                        Done
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
  );
}