import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Play, Square, Clock, X, Download, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Task } from '@/types';
import { apiClient } from '@/lib/api-client';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const resolveStartTimestamp = (value: unknown): number | null => {
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (typeof value === 'number') {
    return Number.isNaN(value) ? null : value;
  }
  if (value && typeof (value as Date).getTime === 'function') {
    const timestamp = (value as Date).getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
  }
  return null;
};

export default function TimeTrackerWidget() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { activeTimer, startTimer, stopTimer, fetchTimeEntries } = useTimeTracking();
  const { tasks, fetchTasks } = useTasks();
  const { projects, fetchProjects } = useProjects();
  const { toast } = useToast();
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');
  const [isMinimized, setIsMinimized] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeTaskDetail, setActiveTaskDetail] = useState<Task | null>(null);
  const [showMyTasksOnly, setShowMyTasksOnly] = useState(true);

  const activeTimerTaskId = useMemo(() => {
    if (!activeTimer) return null;
    if (typeof activeTimer.taskId === 'string' && activeTimer.taskId.length > 0) {
      return activeTimer.taskId;
    }
    const apiTask = (activeTimer as unknown as { task?: { id?: string } }).task;
    if (apiTask && typeof apiTask.id === 'string' && apiTask.id.length > 0) {
      return apiTask.id;
    }
    return null;
  }, [activeTimer]);

  const activeTimerStartTimestamp = useMemo(
    () => (activeTimer ? resolveStartTimestamp(activeTimer.startTime) : null),
    [activeTimer],
  );

  const displayActiveTimer = useMemo(() => {
    if (!activeTimer || typeof (activeTimer as { id?: string }).id !== 'string') {
      return null;
    }
    if (!activeTimerTaskId && activeTimerStartTimestamp === null) {
      return null;
    }
    return activeTimer;
  }, [activeTimer, activeTimerTaskId, activeTimerStartTimestamp]);

  useEffect(() => {
    if (isAuthLoading || !user?.id) {
      return;
    }

    fetchTasks();
    fetchProjects();
    fetchTimeEntries();

    // Refresh active timer every second
    const interval = setInterval(() => {
      fetchTimeEntries();
    }, 1000);

    return () => clearInterval(interval);
  }, [fetchTasks, fetchProjects, fetchTimeEntries, isAuthLoading, user?.id]);

  // PWA Install Prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallButton(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      toast({
        title: 'Installing...',
        description: 'The app is being installed',
      });
      setShowInstallButton(false);
    }

    setDeferredPrompt(null);
  };

  // Update elapsed time display
  useEffect(() => {
    if (!displayActiveTimer || !activeTimerStartTimestamp) {
      setElapsedTime('00:00:00');
      return;
    }

    const updateElapsed = () => {
      const diff = Date.now() - activeTimerStartTimestamp;
      if (diff < 0 || Number.isNaN(diff)) {
        setElapsedTime('00:00:00');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setElapsedTime(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [displayActiveTimer, activeTimerStartTimestamp]);

  // Resolve active task details for display (fallback fetch if not loaded in list)
  useEffect(() => {
    const resolveActiveTask = async () => {
      if (!activeTimerTaskId) {
        setActiveTaskDetail(null);
        return;
      }
      const local = tasks.find(t => t.id === activeTimerTaskId);
      if (local) {
        setActiveTaskDetail(local);
        return;
      }
      try {
        const fetched = await apiClient.getTask(activeTimerTaskId);
        if (fetched) {
          setActiveTaskDetail(fetched as Task);
        }
      } catch {
        setActiveTaskDetail(null);
      }
    };
    resolveActiveTask();
  }, [activeTimerTaskId, tasks]);

  const getTaskName = () => {
    if (!displayActiveTimer) return 'No active timer';
    const apiTask = (displayActiveTimer as unknown as { task?: { id?: string; title?: string } }).task;
    if (apiTask && typeof apiTask.title === 'string') {
      const trimmed = apiTask.title.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
    const task =
      (activeTimerTaskId ? tasks.find(t => t.id === activeTimerTaskId) : undefined) ||
      (activeTaskDetail && (!activeTimerTaskId || activeTaskDetail.id === activeTimerTaskId) ? activeTaskDetail : null);
    if (task) return task.title;
    if (activeTimerTaskId) return 'Loading task...';
    return 'Unknown Task';
  };

  const handleTaskSelect = (taskId: string) => {
    // Prevent selecting a task that already has an active timer
    if (activeTimerTaskId && activeTimerTaskId === taskId) {
      toast({
        title: 'Task Already Active',
        description: 'This task is already being tracked',
        variant: 'destructive',
      });
      return;
    }
    setSelectedTaskId(taskId);
  };

  const handleStartTimer = async () => {
    if (!selectedTaskId) return;

    // Prevent starting a new timer if one is already active
    if (displayActiveTimer) {
      toast({
        title: 'Timer Already Active',
        description: 'Please stop the current timer before starting a new one',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Optimistically set task detail so UI shows correct title immediately
      const local = tasks.find(t => t.id === selectedTaskId);
      if (local) setActiveTaskDetail(local);
      await startTimer(selectedTaskId);
      setSelectedTaskId(null);
      toast({
        title: 'Timer Started',
        description: 'Time tracking has started',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start timer',
        variant: 'destructive',
      });
    }
  };

  const handleCancelSelection = () => {
    setSelectedTaskId(null);
  };

  const handleStopTimer = async () => {
    if (!displayActiveTimer) return;

    try {
      await stopTimer(displayActiveTimer.id);
      setActiveTaskDetail(null);
      toast({
        title: 'Timer Stopped',
        description: 'Time entry saved',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to stop timer',
        variant: 'destructive',
      });
    }
  };

  const getProjectName = (task: Task) => {
    if (!task?.projectId) return null;
    const project = projects.find(p => p.id === task.projectId);
    return project?.name || null;
  };

  const availableTasks = tasks
    .filter(t => t.status !== 'COMPLETED')
    // Filter out the currently active task - don't show it in the selection list
    .filter(t => !activeTimerTaskId || t.id !== activeTimerTaskId)
    .filter(t => {
      if (!showMyTasksOnly) return true;
      // While auth is resolving, don't filter tasks down to avoid empty fallback state
      if (isAuthLoading) return true;
      // If auth finished and no user, suppress results when filtering "my tasks"
      if (!user?.id) return false;
      return t.assignedTo === user.id;
    })
    .filter(t => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(query) ||
        getProjectName(t)?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      // Sort by: in_progress first, then by title
      if (a.status === 'IN_PROGRESS' && b.status !== 'IN_PROGRESS') return -1;
      if (b.status === 'IN_PROGRESS' && a.status !== 'IN_PROGRESS') return 1;
      return a.title.localeCompare(b.title);
    });

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="w-64 shadow-lg border-2">
          <CardContent className="p-3">
            {displayActiveTimer ? (
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground truncate">{getTaskName()}</div>
                  <div className="text-lg font-bold text-green-600">{elapsedTime}</div>
                </div>
                <div className="flex gap-1 ml-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsMinimized(false)}
                    className="h-8 w-8 p-0"
                  >
                    <Clock className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleStopTimer}
                    className="h-8 w-8 p-0"
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">No active timer</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsMinimized(false)}
                  className="h-8 w-8 p-0"
                >
                  <Clock className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="max-w-md mx-auto shadow-xl">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Time Tracker</h1>
              <p className="text-sm text-muted-foreground">
                {user?.email || 'Not logged in'}
              </p>
            </div>
            <div className="flex gap-2">
              {showInstallButton && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleInstallClick}
                  className="h-8"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Install
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(true)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Active Timer - Only show when timer is running */}
          {displayActiveTimer ? (
            <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  <Clock className="h-3 w-3 mr-1" />
                  Running
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {activeTimerStartTimestamp
                    ? `Started ${formatDistanceToNow(new Date(activeTimerStartTimestamp), { addSuffix: true })}`
                    : 'Started just now'}
                </span>
              </div>
              <h3 className="font-semibold text-lg mb-2 truncate">{getTaskName()}</h3>
              <div className="text-4xl font-bold text-green-600 mb-4 font-mono">
                {elapsedTime}
              </div>
              <Button
                onClick={handleStopTimer}
                variant="destructive"
                className="w-full"
                size="lg"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop Timer
              </Button>
            </div>
          ) : selectedTaskId ? (
            /* Task Selected - Show confirmation */
            <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <div className="mb-3">
                <h3 className="font-semibold text-lg mb-1">
                  {tasks.find(t => t.id === selectedTaskId)?.title || 'Selected Task'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {getProjectName(tasks.find(t => t.id === selectedTaskId)!) || 'No Project'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleStartTimer}
                  className="flex-1"
                  size="lg"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Timer
                </Button>
                <Button
                  onClick={handleCancelSelection}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            /* Task Selection - Show when no timer is active */
            <div className="mb-6">
              <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                Select Task to Track
              </h2>

              {/* Filters */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Switch
                    id="my-tasks-only"
                    checked={showMyTasksOnly}
                    onCheckedChange={setShowMyTasksOnly}
                  />
                  <Label htmlFor="my-tasks-only" className="text-sm">My tasks only</Label>
                </div>
              </div>

              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Task List */}
              <ScrollArea className="h-[300px]">
                <div className="space-y-2 pr-4">
                  {availableTasks.length > 0 ? (
                    availableTasks.map((task) => {
                      const projectName = getProjectName(task);
                      return (
                        <Button
                          key={task.id}
                          variant="outline"
                          className="w-full justify-start h-auto py-3 px-4"
                          onClick={() => handleTaskSelect(task.id)}
                        >
                          <Play className="h-4 w-4 mr-3 text-green-600 flex-shrink-0" />
                          <div className="flex-1 text-left min-w-0">
                            <div className="font-medium truncate">{task.title}</div>
                            {projectName && (
                              <div className="text-xs text-muted-foreground truncate">
                                {projectName}
                              </div>
                            )}
                            {task.status === 'IN_PROGRESS' && (
                              <Badge variant="secondary" className="mt-1 text-xs">
                                In Progress
                              </Badge>
                            )}
                          </div>
                        </Button>
                      );
                    })
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-muted-foreground">
                        {searchQuery
                          ? 'No tasks found matching your search'
                          : 'No tasks available. Create tasks in the main app.'}
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 pt-4 border-t">
            <Button
              variant="ghost"
              className="w-full text-xs"
              onClick={() => window.open('/', '_blank')}
            >
              Open Full App →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

