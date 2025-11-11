import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Play, Square, Clock, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function TimeTrackerWidget() {
  const { user } = useAuth();
  const { activeTimer, startTimer, stopTimer, fetchTimeEntries } = useTimeTracking();
  const { tasks, fetchTasks } = useTasks();
  const { toast } = useToast();
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetchTimeEntries();
    
    // Refresh active timer every second
    const interval = setInterval(() => {
      fetchTimeEntries();
    }, 1000);

    return () => clearInterval(interval);
  }, [fetchTasks, fetchTimeEntries]);

  // Update elapsed time display
  useEffect(() => {
    if (!activeTimer) {
      setElapsedTime('00:00:00');
      return;
    }

    const updateElapsed = () => {
      const start = new Date(activeTimer.startTime).getTime();
      const now = Date.now();
      const diff = now - start;
      
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
  }, [activeTimer]);

  const getTaskName = () => {
    if (!activeTimer) return 'No active timer';
    const task = tasks.find(t => t.id === activeTimer.taskId);
    return task ? task.title : 'Unknown Task';
  };

  const handleStartTimer = async (taskId: string) => {
    try {
      await startTimer(taskId);
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

  const handleStopTimer = async () => {
    if (!activeTimer) return;
    
    try {
      await stopTimer(activeTimer.id);
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

  const quickStartTasks = tasks
    .filter(t => t.status !== 'completed')
    .slice(0, 5);

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="w-64 shadow-lg border-2">
          <CardContent className="p-3">
            {activeTimer ? (
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(true)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Active Timer */}
          {activeTimer ? (
            <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  <Clock className="h-3 w-3 mr-1" />
                  Running
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Started {formatDistanceToNow(new Date(activeTimer.startTime), { addSuffix: true })}
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
          ) : (
            <div className="mb-6 p-4 bg-gray-50 border-2 border-gray-200 rounded-lg text-center">
              <Clock className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p className="text-muted-foreground">No active timer</p>
            </div>
          )}

          {/* Quick Start Tasks */}
          <div>
            <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
              Quick Start
            </h2>
            <div className="space-y-2">
              {quickStartTasks.length > 0 ? (
                quickStartTasks.map((task) => (
                  <Button
                    key={task.id}
                    variant="outline"
                    className="w-full justify-start h-auto py-3"
                    onClick={() => handleStartTimer(task.id)}
                    disabled={!!activeTimer}
                  >
                    <Play className="h-4 w-4 mr-2 text-green-600" />
                    <div className="flex-1 text-left">
                      <div className="font-medium">{task.title}</div>
                      {task.projectId && (
                        <div className="text-xs text-muted-foreground">
                          {tasks.find(t => t.id === task.projectId)?.title || 'Project'}
                        </div>
                      )}
                    </div>
                  </Button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No tasks available. Create tasks in the main app.
                </p>
              )}
            </div>
          </div>

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

