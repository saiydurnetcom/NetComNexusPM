import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { Clock, Play, Square, Calendar, BarChart3 } from 'lucide-react';

export default function TimeTracking() {
  const { timeEntries, fetchTimeEntries, activeTimer, startTimer, stopTimer } = useTimeTracking();
  const { tasks } = useTasks();
  const { projects } = useProjects();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchTimeEntries();
  }, [fetchTimeEntries]);

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

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString();
  };

  const totalTimeToday = filteredEntries.reduce((total, entry) => total + (entry.duration || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
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

        {/* Date Filter */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Select Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full p-2 border rounded-md"
          />
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
                      {formatDuration(entry.duration || 0)}
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
                <div>
                  <h4 className="font-semibold text-blue-900">
                    {getTaskName(activeTimer.taskId)}
                  </h4>
                  <p className="text-sm text-blue-700">
                    {getProjectName(activeTimer.taskId)} • Started at {formatTime(activeTimer.startTime)}
                  </p>
                </div>
                <Button variant="destructive" onClick={stopTimer}>
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