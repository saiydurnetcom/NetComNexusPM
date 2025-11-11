import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/components/AppLayout';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { Calendar, Clock, FileText, TrendingUp, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';

export default function Timesheet() {
  const navigate = useNavigate();
  const { timeEntries, fetchTimeEntries } = useTimeTracking();
  const { tasks, fetchTasks } = useTasks();
  const { projects, fetchProjects } = useProjects();
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');

  useEffect(() => {
    fetchTimeEntries();
    fetchTasks();
    fetchProjects();
  }, [fetchTimeEntries, fetchTasks, fetchProjects]);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getTaskInfo = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return { taskName: 'Unknown Task', projectName: 'Unknown Project' };
    const project = projects.find(p => p.id === task.projectId);
    return {
      taskName: task.title,
      projectName: project?.name || 'No Project',
      task,
      project,
    };
  };

  // Filter entries by period
  const filteredEntries = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return timeEntries.filter(entry => {
      const entryDate = new Date(entry.startTime);
      
      switch (selectedPeriod) {
        case 'today':
          return entryDate >= today;
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return entryDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return entryDate >= monthAgo;
        default:
          return true;
      }
    });
  }, [timeEntries, selectedPeriod]);

  // Group entries by task
  const entriesByTask = useMemo(() => {
    const grouped: Record<string, typeof filteredEntries> = {};
    
    filteredEntries.forEach(entry => {
      if (!grouped[entry.taskId]) {
        grouped[entry.taskId] = [];
      }
      grouped[entry.taskId].push(entry);
    });

    return Object.entries(grouped).map(([taskId, entries]) => {
      const totalMinutes = entries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0);
      const taskInfo = getTaskInfo(taskId);
      return {
        taskId,
        entries,
        totalMinutes,
        ...taskInfo,
      };
    });
  }, [filteredEntries, tasks, projects]);

  const totalTime = filteredEntries.reduce((sum, entry) => sum + (entry.durationMinutes || 0), 0);

  // Calculate stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEntries = timeEntries.filter(e => new Date(e.startTime) >= today);
    const todayTime = todayEntries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekEntries = timeEntries.filter(e => new Date(e.startTime) >= weekAgo);
    const weekTime = weekEntries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0);

    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const monthEntries = timeEntries.filter(e => new Date(e.startTime) >= monthAgo);
    const monthTime = monthEntries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0);

    return {
      today: todayTime,
      week: weekTime,
      month: monthTime,
    };
  }, [timeEntries]);

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Timesheet</h1>
            <p className="text-gray-600">View your time tracking reports and analytics</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
              <Clock className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(stats.today)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {timeEntries.filter(e => {
                  const d = new Date(e.startTime);
                  return d.toDateString() === new Date().toDateString();
                }).length} entries
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(stats.week)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {timeEntries.filter(e => {
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return new Date(e.startTime) >= weekAgo;
                }).length} entries
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(stats.month)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {timeEntries.filter(e => {
                  const monthAgo = new Date();
                  monthAgo.setMonth(monthAgo.getMonth() - 1);
                  return new Date(e.startTime) >= monthAgo;
                }).length} entries
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Time Entries by Period */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Time Entries</CardTitle>
                <CardDescription>
                  View time spent on tasks by period
                </CardDescription>
              </div>
              <Select value={selectedPeriod} onValueChange={(value: 'today' | 'week' | 'month') => setSelectedPeriod(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {entriesByTask.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No time entries for {selectedPeriod}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4 pb-2 border-b">
                  <span className="text-sm font-medium">Total: {formatDuration(totalTime)}</span>
                  <span className="text-sm text-muted-foreground">{entriesByTask.length} task{entriesByTask.length !== 1 ? 's' : ''}</span>
                </div>
                
                {entriesByTask.map(({ taskId, taskName, projectName, totalMinutes, entries, task }) => (
                  <Card key={taskId} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 
                              className="font-semibold text-base hover:text-blue-600 cursor-pointer"
                              onClick={() => task && navigate(`/tasks/${task.id}`)}
                            >
                              {taskName}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {projectName}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {entries.length} time entr{entries.length !== 1 ? 'ies' : 'y'}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">{formatDuration(totalMinutes)}</div>
                          {task?.estimatedHours && (
                            <p className="text-xs text-muted-foreground">
                              of {task.estimatedHours}h estimated
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2 mt-3 pt-3 border-t">
                        {entries.map((entry) => (
                          <div 
                            key={entry.id}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm hover:bg-gray-100 cursor-pointer"
                            onClick={() => task && navigate(`/tasks/${task.id}`)}
                          >
                            <div className="flex items-center gap-3">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {format(new Date(entry.startTime), 'MMM dd, yyyy h:mm a')}
                                {entry.endTime && (
                                  <> - {format(new Date(entry.endTime), 'h:mm a')}</>
                                )}
                              </span>
                              {entry.description && (
                                <span className="text-muted-foreground">• {entry.description}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {formatDuration(entry.durationMinutes || 0)}
                              </span>
                              {entry.billable && (
                                <Badge variant="outline" className="text-xs">Billable</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

