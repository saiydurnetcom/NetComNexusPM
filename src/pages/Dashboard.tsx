import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Clock, CheckCircle, AlertCircle, Calendar } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const { projects, fetchProjects } = useProjects();
  const { tasks, fetchTasks } = useTasks();
  const { timeEntries, fetchTimeEntries, activeTimer } = useTimeTracking();
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    totalTime: 0,
  });

  useEffect(() => {
    fetchProjects();
    fetchTasks();
    fetchTimeEntries();
  }, [fetchProjects, fetchTasks, fetchTimeEntries]);

  useEffect(() => {
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    const totalTime = timeEntries.reduce((total, entry) => total + (entry.duration || 0), 0);
    
    setStats({
      totalProjects: projects.length,
      totalTasks: tasks.length,
      completedTasks,
      totalTime,
    });
  }, [projects, tasks, timeEntries]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.firstName}!</h1>
          <p className="text-gray-600">Here's what's happening with your projects today.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProjects}</div>
              <p className="text-xs text-muted-foreground">Active projects</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTasks}</div>
              <p className="text-xs text-muted-foreground">
                {stats.completedTasks} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Time Tracked</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatTime(stats.totalTime)}</div>
              <p className="text-xs text-muted-foreground">Total time spent</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Timer</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {activeTimer ? 'Running' : 'None'}
              </div>
              <p className="text-xs text-muted-foreground">
                {activeTimer ? 'Timer active' : 'No active timer'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Projects */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Projects</CardTitle>
              <CardDescription>Your most recent projects</CardDescription>
            </CardHeader>
            <CardContent>
              {projects.slice(0, 5).map((project) => (
                <div key={project.id} className="flex items-center justify-between py-3 border-b last:border-b-0">
                  <div>
                    <h4 className="font-medium">{project.name}</h4>
                    <p className="text-sm text-muted-foreground">{project.description}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </div>
              ))}
              {projects.length === 0 && (
                <p className="text-muted-foreground text-center py-4">No projects yet</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Tasks */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Tasks</CardTitle>
              <CardDescription>Tasks that need attention</CardDescription>
            </CardHeader>
            <CardContent>
              {tasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center justify-between py-3 border-b last:border-b-0">
                  <div>
                    <h4 className="font-medium">{task.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {task.status} • {task.priority}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Start
                  </Button>
                </div>
              ))}
              {tasks.length === 0 && (
                <p className="text-muted-foreground text-center py-4">No tasks yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Get started quickly</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  New Task
                </Button>
                <Button variant="outline">
                  <Clock className="h-4 w-4 mr-2" />
                  View Time Entries
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}