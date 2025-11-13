import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/components/AppLayout';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { 
  Play, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Circle,
  ArrowRight,
  Calendar,
  TrendingUp,
  Zap
} from 'lucide-react';
import { format, isToday, isPast, parseISO } from 'date-fns';
import { Task } from '@/types';

export default function Today() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tasks, fetchTasks } = useTasks();

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter tasks based on user
  const userTasks = useMemo(() => {
    if (!user) return [];
    // If user is admin or manager, show all tasks; otherwise show only assigned tasks
    const userRole = user.role?.toLowerCase();
    const isAdminOrManager = userRole === 'admin' || userRole === 'manager';
    
    if (isAdminOrManager) {
      return tasks;
    }
    return tasks.filter(task => task.assignedTo === user.id);
  }, [tasks, user]);

  // Priority order: urgent > high > medium > low
  const priorityOrder: Record<Task['priority'], number> = {
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  // Continue Working - Tasks in Progress, sorted by priority
  const continueWorkingTasks = useMemo(() => {
    return userTasks
      .filter(task => task.status === 'in_progress')
      .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  }, [userTasks, priorityOrder]);

  // Due Today - Tasks with today's due date that are pending (not completed, not in progress)
  const dueTodayTasks = useMemo(() => {
    return userTasks
      .filter(task => {
        if (!task.dueDate) return false;
        const dueDate = parseISO(task.dueDate);
        return isToday(dueDate) && 
               task.status !== 'completed' && 
               task.status !== 'in_progress';
      })
      .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  }, [userTasks, priorityOrder]);

  // Overdue - Tasks that are past due date and not completed
  const overdueTasks = useMemo(() => {
    return userTasks
      .filter(task => {
        if (!task.dueDate) return false;
        const dueDate = parseISO(task.dueDate);
        return isPast(dueDate) && 
               !isToday(dueDate) && 
               task.status !== 'completed';
      })
      .sort((a, b) => {
        // Sort by how overdue (most overdue first), then by priority
        const aOverdue = new Date().getTime() - parseISO(a.dueDate).getTime();
        const bOverdue = new Date().getTime() - parseISO(b.dueDate).getTime();
        if (bOverdue !== aOverdue) {
          return bOverdue - aOverdue;
        }
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
  }, [userTasks, priorityOrder]);

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'in_progress':
        return <Play className="h-4 w-4 text-blue-600" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'blocked':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'review':
        return <Circle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const handleTaskClick = (taskId: string) => {
    navigate(`/tasks/${taskId}`);
  };

  const TaskCard = ({ task }: { task: Task }) => (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => handleTaskClick(task.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon(task.status)}
              <h3 className="font-semibold text-sm truncate">{task.title}</h3>
            </div>
            {task.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {task.description}
              </p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={getPriorityColor(task.priority)}>
                {task.priority}
              </Badge>
              {task.dueDate && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {format(parseISO(task.dueDate), 'MMM d, yyyy')}
                </div>
              )}
              {task.estimatedHours && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {task.estimatedHours}h
                </div>
              )}
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Today's ToDos</h1>
          <p className="text-muted-foreground">
            Your focus for {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        <div className="grid gap-6">
          {/* Continue Working Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold">Continue Working</h2>
              <Badge variant="secondary" className="ml-2">
                {continueWorkingTasks.length}
              </Badge>
            </div>
            {continueWorkingTasks.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Play className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No tasks in progress</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Start a task to see it here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {continueWorkingTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            )}
          </div>

          {/* Due Today Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-yellow-600" />
              <h2 className="text-xl font-semibold">Due Today</h2>
              <Badge variant="secondary" className="ml-2">
                {dueTodayTasks.length}
              </Badge>
            </div>
            {dueTodayTasks.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No tasks due today</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    You're all caught up!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {dueTodayTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            )}
          </div>

          {/* Overdue Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <h2 className="text-xl font-semibold">I Think You Missed These</h2>
              <Badge variant="destructive" className="ml-2">
                {overdueTasks.length}
              </Badge>
            </div>
            {overdueTasks.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-600" />
                  <p className="text-muted-foreground">No overdue tasks</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Great job staying on top of your deadlines!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {overdueTasks.map((task) => {
                  const daysOverdue = Math.floor(
                    (new Date().getTime() - parseISO(task.dueDate).getTime()) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <Card 
                      key={task.id}
                      className="hover:shadow-md transition-shadow cursor-pointer border-red-200 bg-red-50/50"
                      onClick={() => handleTaskClick(task.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              {getStatusIcon(task.status)}
                              <h3 className="font-semibold text-sm truncate">{task.title}</h3>
                            </div>
                            {task.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                {task.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="destructive">
                                {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'} overdue
                              </Badge>
                              <Badge variant="outline" className={getPriorityColor(task.priority)}>
                                {task.priority}
                              </Badge>
                              {task.dueDate && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  {format(parseISO(task.dueDate), 'MMM d, yyyy')}
                                </div>
                              )}
                            </div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-red-600 flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

