import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/components/AppLayout';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Clock, CheckCircle, AlertCircle, Calendar, Sparkles, TrendingUp, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projects, fetchProjects } = useProjects();
  const { tasks, fetchTasks } = useTasks();
  const { timeEntries, fetchTimeEntries } = useTimeTracking();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const completedTasks = tasks.filter(task => task.status === 'COMPLETED').length;
    const totalTime = timeEntries.reduce((total, entry) => total + (entry.durationMinutes || 0), 0);
    
    setStats({
      totalProjects: projects.length,
      totalTasks: tasks.length,
      completedTasks,
      totalTime,
    });
  }, [projects, tasks, timeEntries]);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Calculate today's time
  const today = new Date().toISOString().split('T')[0];
  const todayEntries = timeEntries.filter(entry => {
    const entryDate = new Date(entry.startTime).toISOString().split('T')[0];
    return entryDate === today;
  });
  const todayTime = todayEntries.reduce((total, entry) => total + (entry.durationMinutes || 0), 0);
  
  // Calculate yesterday's time for comparison
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const yesterdayEntries = timeEntries.filter(entry => {
    const entryDate = new Date(entry.startTime).toISOString().split('T')[0];
    return entryDate === yesterday;
  });
  const yesterdayTime = yesterdayEntries.reduce((total, entry) => total + (entry.durationMinutes || 0), 0);
  const timeDiff = todayTime - yesterdayTime;

  // Get tasks by status
  const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS');
  const todoTasks = tasks.filter(t => t.status === 'TODO');
  const tasksDueToday = tasks.filter(t => {
    if (!t.dueDate) return false;
    const dueDate = new Date(t.dueDate).toISOString().split('T')[0];
    return dueDate === today && t.status !== 'COMPLETED' && t.status !== 'IN_PROGRESS';
  });
  const upcomingTasks = todoTasks.filter(t => {
    // Exclude tasks that are in progress
    return !inProgressTasks.includes(t);
  });

  // Get projects approaching deadline (within 7 days)
  const projectsApproachingDeadline = projects.filter(p => {
    const endDate = new Date(p.endDate);
    const daysUntilDeadline = Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDeadline <= 7 && daysUntilDeadline > 0 && p.status === 'ACTIVE';
  });

  // Calculate productivity based on 40 hours/week per member
  // Productivity = (actual hours worked / available hours) * 100
  const [productivity, setProductivity] = useState(0);
  const [availableHours, setAvailableHours] = useState(40);
  const [productivityDetails, setProductivityDetails] = useState({
    actualMinutes: 0,
    availableMinutes: 0,
    weekStart: '',
    weekTimeEntries: [] as typeof timeEntries,
  });
  const [isProductivityDialogOpen, setIsProductivityDialogOpen] = useState(false);

  useEffect(() => {
    const calculateProductivity = async () => {
      try {
        // Get current week start (Monday)
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to Monday
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - diff);
        weekStart.setHours(0, 0, 0, 0);

        // Available hours for this week (default 40)
        const weekStartStr = weekStart.toISOString().split('T')[0];

        // Use default available hours (40) unless you later wire a backend endpoint
        const hours = 40;
        setAvailableHours(hours);
        const availableMinutes = hours * 60;

        // Get actual hours worked this week
        const weekTimeEntries = timeEntries.filter(entry => {
          const entryDate = new Date(entry.startTime);
          return entryDate >= weekStart;
        });
        const actualMinutes = weekTimeEntries.reduce((sum, entry) => sum + (entry.durationMinutes || 0), 0);

        // Store productivity details
        setProductivityDetails({
          actualMinutes,
          availableMinutes,
          weekStart: weekStartStr,
          weekTimeEntries,
        });

        // Calculate productivity percentage
        if (availableMinutes === 0) {
          setProductivity(0);
        } else {
          setProductivity(Math.min(100, Math.round((actualMinutes / availableMinutes) * 100)));
        }
      } catch (error) {
        console.error('Error calculating productivity:', error);
        // Fallback to simple calculation
        const fallback = tasks.length > 0 ? Math.round((stats.completedTasks / tasks.length) * 100) : 0;
        setProductivity(fallback);
      }
    };

    if (user && timeEntries.length >= 0) {
      calculateProductivity();
    }
  }, [timeEntries, tasks, user, stats.completedTasks]);
  const completedThisWeek = tasks.filter(t => {
    if (t.status !== 'COMPLETED') return false;
    // Use createdAt as fallback since updatedAt might not exist
    const completedDate = new Date(t.createdAt);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return completedDate > weekAgo;
  }).length;

  return (
    <AppLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back! Here's your overview</p>
          </div>
        </div>

        {/* Summary Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Time Today</CardTitle>
              <Clock className="h-5 w-5 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{formatTime(todayTime)}</div>
              <p className={`text-xs mt-1 ${timeDiff > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                {timeDiff > 0 ? `+${formatTime(timeDiff)}` : timeDiff < 0 ? formatTime(Math.abs(timeDiff)) : 'No change'} from yesterday
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Tasks</CardTitle>
              <CheckCircle className="h-5 w-5 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{inProgressTasks.length + upcomingTasks.length}</div>
              <p className="text-xs text-gray-500 mt-1">
                {tasksDueToday.length > 0 ? `${tasksDueToday.length} due today` : 'All caught up'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Projects</CardTitle>
              <Calendar className="h-5 w-5 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.totalProjects}</div>
              <p className="text-xs text-gray-500 mt-1">
                {projectsApproachingDeadline.length > 0 
                  ? `${projectsApproachingDeadline.length} approaching deadline` 
                  : 'All on track'}
              </p>
            </CardContent>
          </Card>

          <Card 
            className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setIsProductivityDialogOpen(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Productivity</CardTitle>
              <TrendingUp className="h-5 w-5 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{productivity}%</div>
              <p className="text-xs text-green-600 mt-1">
                {completedThisWeek > 0 ? `+${completedThisWeek} tasks this week` : 'Keep going!'}
              </p>
              <p className="text-xs text-gray-400 mt-1">Click to view details</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className={`grid grid-cols-1 ${inProgressTasks.length > 0 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6`}>
          {/* In Progress Tasks */}
          {inProgressTasks.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold">In Progress Tasks</CardTitle>
                    <CardDescription className="mt-1">Tasks you're currently working on</CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate('/tasks')}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    View All
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {inProgressTasks.slice(0, 5).map((task) => {
                    const project = projects.find(p => p.id === task.projectId);
                    return (
                      <div 
                        key={task.id}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/tasks/${task.id}`)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm text-gray-900">
                              {task.title}
                            </h4>
                            <Badge variant="default" className="bg-blue-100 text-blue-700 text-xs">
                              In Progress
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500">
                            {project?.name || 'No Project'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Time Entries */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">Recent Time Entries</CardTitle>
                  <CardDescription className="mt-1">Your latest time tracking activity</CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/timesheet')}
                  className="text-blue-600 hover:text-blue-700"
                >
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {todayEntries.length > 0 ? (
                <div className="space-y-4">
                  {todayEntries.slice(0, 5).map((entry) => {
                    const task = tasks.find(t => t.id === entry.taskId);
                    const project = task ? projects.find(p => p.id === task.projectId) : null;
                    const isActive = !entry.endTime;
                    return (
                      <div 
                        key={entry.id} 
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => task && navigate(`/tasks/${task.id}`)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm text-gray-900">
                              {task?.title || 'Unknown Task'}
                            </h4>
                            {isActive && (
                              <Badge variant="default" className="bg-blue-100 text-blue-700 text-xs">
                                active
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            {project?.name || 'No Project'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {formatTime(entry.durationMinutes || 0)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm text-gray-500">No time entries today</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => navigate('/timesheet')}
                  >
                    Start Tracking
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Tasks */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">Upcoming Tasks</CardTitle>
                  <CardDescription className="mt-1">Tasks requiring your attention</CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/tasks')}
                  className="text-blue-600 hover:text-blue-700"
                >
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {tasksDueToday.length > 0 || upcomingTasks.length > 0 ? (
                <div className="space-y-4">
                  {[...tasksDueToday, ...upcomingTasks.filter(t => !tasksDueToday.includes(t))]
                    .slice(0, 5)
                    .map((task) => {
                      let dueText = '';
                      if (task.dueDate) {
                        const dueDate = new Date(task.dueDate);
                        const isToday = dueDate.toISOString().split('T')[0] === today;
                        const isTomorrow = dueDate.toISOString().split('T')[0] === new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                        
                        if (isToday) {
                          dueText = `Today, ${format(dueDate, 'h:mm a')}`;
                        } else if (isTomorrow) {
                          dueText = 'Tomorrow';
                        } else {
                          dueText = format(dueDate, 'EEEE');
                        }
                      } else {
                        dueText = 'No due date';
                      }

                      const getPriorityColor = (priority: string) => {
                        switch (priority) {
                          case 'urgent':
                          case 'high':
                            return 'bg-red-100 text-red-700';
                          case 'medium':
                            return 'bg-orange-100 text-orange-700';
                          default:
                            return 'bg-gray-100 text-gray-700';
                        }
                      };

                      return (
                        <div 
                          key={task.id}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => navigate(`/tasks/${task.id}`)}
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-gray-900 mb-1">
                              {task.title}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {dueText}
                            </p>
                          </div>
                          <Badge className={`${getPriorityColor(task.priority)} text-xs font-medium`}>
                            {task.priority}
                          </Badge>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm text-gray-500">No upcoming tasks</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => navigate('/tasks')}
                  >
                    Create Task
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Productivity Details Dialog */}
        <Dialog open={isProductivityDialogOpen} onOpenChange={setIsProductivityDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Productivity Details</DialogTitle>
              <DialogDescription>
                Breakdown of your productivity calculation for this week
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {formatTime(productivityDetails.actualMinutes)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">Hours Worked</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {formatTime(productivityDetails.availableMinutes)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">Available Hours</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Productivity Percentage</span>
                  <span className="text-lg font-bold">{productivity}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      productivity >= 100 ? 'bg-green-600' : 
                      productivity >= 75 ? 'bg-blue-600' : 
                      productivity >= 50 ? 'bg-yellow-600' : 
                      'bg-red-600'
                    }`}
                    style={{ width: `${Math.min(100, productivity)}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Week Start Date</h4>
                <p className="text-sm text-muted-foreground">
                  {productivityDetails.weekStart 
                    ? format(new Date(productivityDetails.weekStart), 'MMMM dd, yyyy')
                    : 'Not calculated'}
                </p>
              </div>

              {productivityDetails.weekTimeEntries.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Time Entries This Week</h4>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Task</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Duration</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productivityDetails.weekTimeEntries
                          .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
                          .slice(0, 10)
                          .map((entry) => {
                            const task = tasks.find(t => t.id === entry.taskId);
                            return (
                              <TableRow key={entry.id}>
                                <TableCell className="font-medium">
                                  {task?.title || 'Unknown Task'}
                                </TableCell>
                                <TableCell>
                                  {format(new Date(entry.startTime), 'MMM dd, yyyy')}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatTime(entry.durationMinutes || 0)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </div>
                  {productivityDetails.weekTimeEntries.length > 10 && (
                    <p className="text-xs text-muted-foreground text-center">
                      Showing 10 of {productivityDetails.weekTimeEntries.length} entries
                    </p>
                  )}
                </div>
              )}

              {productivityDetails.weekTimeEntries.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No time entries this week</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}