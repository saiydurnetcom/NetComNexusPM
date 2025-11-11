import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import Navigation from '@/components/Navigation';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useToast } from '@/components/ui/use-toast';
import { Clock, Play, Square, Calendar, BarChart3, Plus } from 'lucide-react';

export default function TimeTracking() {
  const navigate = useNavigate();
  const { timeEntries, fetchTimeEntries, activeTimer, stopTimer, createTimeEntry, startTimer } = useTimeTracking();
  const { tasks, fetchTasks, isLoading: tasksLoading } = useTasks();
  const { projects, fetchProjects } = useProjects();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isStartTimerDialogOpen, setIsStartTimerDialogOpen] = useState(false);
  const [selectedTaskForTimer, setSelectedTaskForTimer] = useState('');
  const [timeSheetForm, setTimeSheetForm] = useState({
    taskId: '',
    startTime: new Date().toISOString().slice(0, 16),
    endTime: new Date().toISOString().slice(0, 16),
    description: '',
    billable: false,
  });

  useEffect(() => {
    fetchTimeEntries();
    fetchTasks();
    fetchProjects();
  }, [fetchTimeEntries, fetchTasks, fetchProjects]);

  const filteredEntries = timeEntries.filter(entry => {
    const entryDate = new Date(entry.startTime).toISOString().split('T')[0];
    return entryDate === selectedDate;
  });

  const getTaskName = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    return task ? task.title : 'Unknown Task';
  };

  const getProjectName = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return 'Unknown Project';
    const project = projects.find(p => p.id === task.projectId);
    return project ? project.name : 'Unknown Project';
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString();
  };

  const totalTimeToday = filteredEntries.reduce((total, entry) => total + (entry.durationMinutes || 0), 0);

  const handleStopTimer = async () => {
    if (activeTimer) {
      try {
        await stopTimer(activeTimer.id);
        await fetchTimeEntries();
        toast({
          title: 'Success',
          description: 'Timer stopped successfully',
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to stop timer',
          variant: 'destructive',
        });
      }
    }
  };

  const handleSubmitTimeSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!timeSheetForm.taskId) {
      toast({
        title: 'Error',
        description: 'Please select a task',
        variant: 'destructive',
      });
      return;
    }

    const start = new Date(timeSheetForm.startTime);
    const end = new Date(timeSheetForm.endTime);
    
    if (end <= start) {
      toast({
        title: 'Error',
        description: 'End time must be after start time',
        variant: 'destructive',
      });
      return;
    }

    const durationMinutes = Math.floor((end.getTime() - start.getTime()) / 1000 / 60);

    try {
      await createTimeEntry({
        taskId: timeSheetForm.taskId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        durationMinutes,
        description: timeSheetForm.description,
        billable: timeSheetForm.billable,
      });
      
      await fetchTimeEntries();
      setIsDialogOpen(false);
      setTimeSheetForm({
        taskId: '',
        startTime: new Date().toISOString().slice(0, 16),
        endTime: new Date().toISOString().slice(0, 16),
        description: '',
        billable: false,
      });
      
      toast({
        title: 'Success',
        description: 'Time entry added successfully',
      });
    } catch (error) {
      console.error('Error creating time entry:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create time entry',
        variant: 'destructive',
      });
    }
  };

  const handleStartTimer = async () => {
    if (!selectedTaskForTimer) {
      toast({
        title: 'Error',
        description: 'Please select a task',
        variant: 'destructive',
      });
      return;
    }

    try {
      await startTimer(selectedTaskForTimer);
      await fetchTimeEntries();
      setIsStartTimerDialogOpen(false);
      setSelectedTaskForTimer('');
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Time Tracking</h1>
          <p className="text-gray-600">Track and manage your time entries</p>
        </div>

        {/* Stats and Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Total</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(totalTimeToday)}</div>
              <p className="text-xs text-muted-foreground">Time tracked today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Timer</CardTitle>
              {activeTimer ? (
                <Play className="h-4 w-4 text-green-600" />
              ) : (
                <Square className="h-4 w-4 text-muted-foreground" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {activeTimer ? 'Running' : 'Stopped'}
              </div>
              <p className="text-xs text-muted-foreground">
                {activeTimer ? 'Timer active' : 'No active timer'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{timeEntries.length}</div>
              <p className="text-xs text-muted-foreground">All time entries</p>
            </CardContent>
          </Card>
        </div>

        {/* Date Filter and Action Buttons */}
        <div className="mb-6 flex items-end gap-4">
          <div className="flex-1">
            <Label htmlFor="date-filter" className="block text-sm font-medium mb-2">Select Date</Label>
            <Input
              id="date-filter"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <Dialog open={isStartTimerDialogOpen} onOpenChange={setIsStartTimerDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={!!activeTimer}>
                <Play className="h-4 w-4 mr-2" />
                Start Timer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start Timer</DialogTitle>
                <DialogDescription>Select a task to start tracking time</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="timer-task">Task</Label>
                  <Select value={selectedTaskForTimer} onValueChange={setSelectedTaskForTimer}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a task" />
                    </SelectTrigger>
                    <SelectContent>
                      {tasksLoading ? (
                        <SelectItem value="loading" disabled>Loading tasks...</SelectItem>
                      ) : tasks.length === 0 ? (
                        <SelectItem value="empty" disabled>No tasks available. Create a task first.</SelectItem>
                      ) : (
                        tasks.map((task) => {
                          const project = projects.find(p => p.id === task.projectId);
                          return (
                            <SelectItem key={task.id} value={task.id}>
                              {task.title} {project ? `- ${project.name}` : '(No Project)'}
                            </SelectItem>
                          );
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsStartTimerDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleStartTimer} disabled={!selectedTaskForTimer}>
                    Start Timer
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Time Sheet
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Time Sheet Entry</DialogTitle>
                <DialogDescription>Manually add a time entry for a completed task</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitTimeSheet} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="task">Task</Label>
                  <Select value={timeSheetForm.taskId} onValueChange={(value) => setTimeSheetForm({ ...timeSheetForm, taskId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a task" />
                    </SelectTrigger>
                    <SelectContent>
                      {tasksLoading ? (
                        <SelectItem value="loading" disabled>Loading tasks...</SelectItem>
                      ) : tasks.length === 0 ? (
                        <SelectItem value="empty" disabled>No tasks available. Create a task first.</SelectItem>
                      ) : (
                        tasks.map((task) => {
                          const project = projects.find(p => p.id === task.projectId);
                          return (
                            <SelectItem key={task.id} value={task.id}>
                              {task.title} {project ? `- ${project.name}` : '(No Project)'}
                            </SelectItem>
                          );
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="datetime-local"
                      value={timeSheetForm.startTime}
                      onChange={(e) => setTimeSheetForm({ ...timeSheetForm, startTime: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="datetime-local"
                      value={timeSheetForm.endTime}
                      onChange={(e) => setTimeSheetForm({ ...timeSheetForm, endTime: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="What did you work on?"
                    value={timeSheetForm.description}
                    onChange={(e) => setTimeSheetForm({ ...timeSheetForm, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="billable"
                    checked={timeSheetForm.billable}
                    onChange={(e) => setTimeSheetForm({ ...timeSheetForm, billable: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="billable" className="cursor-pointer">Billable</Label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Add Time Entry</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Time Entries List */}
        <Card>
          <CardHeader>
            <CardTitle>Time Entries for {new Date(selectedDate).toLocaleDateString()}</CardTitle>
            <CardDescription>
              {filteredEntries.length} entries totaling {formatDuration(totalTimeToday)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-semibold">{getTaskName(entry.taskId)}</h4>
                    <p className="text-sm text-muted-foreground">
                      {getProjectName(entry.taskId)} • {formatTime(entry.startTime)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-lg">
                      {formatDuration(entry.durationMinutes || 0)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {entry.description || 'No description'}
                    </p>
                  </div>
                </div>
              ))}
              {filteredEntries.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No time entries for this date</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Active Timer Controls */}
        {activeTimer && (
          <Card className="mt-6 bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">Active Timer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900">
                    Timer Active: {getTaskName(activeTimer.taskId)}
                  </h4>
                  <p className="text-sm text-blue-700">
                    {getProjectName(activeTimer.taskId)} • Started at {formatTime(activeTimer.startTime)}
                  </p>
                  <Button
                    variant="link"
                    className="p-0 h-auto text-sm text-blue-700 mt-1"
                    onClick={() => navigate(`/tasks/${activeTimer.taskId}`)}
                  >
                    View Task Details →
                  </Button>
                </div>
                <Button variant="destructive" onClick={handleStopTimer}>
                  <Square className="h-4 w-4 mr-2" />
                  Stop Timer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}