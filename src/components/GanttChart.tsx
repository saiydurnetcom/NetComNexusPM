import { useMemo } from 'react';
import { Task, ProjectMilestone } from '@/types';
import { format, differenceInDays, startOfDay, endOfDay, isAfter, isBefore, startOfWeek, endOfWeek, addDays, subDays } from 'date-fns';
import { Flag } from 'lucide-react';

interface GanttChartProps {
  tasks: Task[];
  milestones?: ProjectMilestone[];
  startDate?: Date;
  endDate?: Date;
  onTaskUpdate?: (taskId: string, updates: { startDate?: Date; endDate?: Date }) => void;
}

export function GanttChart({ tasks, milestones = [], startDate, endDate, onTaskUpdate }: GanttChartProps) {
  // Calculate date range - prioritize project dates, then extend based on tasks/milestones
  const dateRange = useMemo(() => {
    let rangeStart: Date;
    let rangeEnd: Date;

    // Start with project dates if provided
    if (startDate && endDate) {
      rangeStart = startOfDay(startDate);
      rangeEnd = endOfDay(endDate);
    } else {
      const today = new Date();
      rangeStart = startOfWeek(today);
      rangeEnd = endOfWeek(addDays(today, 30));
    }

    // Collect all relevant dates from tasks and milestones
    const allDates: Date[] = [];
    
    // Task due dates
    tasks
      .filter(t => t.dueDate)
      .forEach(t => {
        const taskDate = new Date(t.dueDate);
        allDates.push(taskDate);
        // Add estimated duration (assume tasks start 1 week before due date if no start date)
        const estimatedStart = subDays(taskDate, Math.max(1, Math.ceil((t.estimatedHours || 8) / 8)));
        allDates.push(estimatedStart);
      });

    // Milestone target dates
    milestones
      .filter(m => m.targetDate)
      .forEach(m => {
        allDates.push(new Date(m.targetDate));
      });

    // Milestone completed dates
    milestones
      .filter(m => m.completedDate)
      .forEach(m => {
        allDates.push(new Date(m.completedDate!));
      });

    // Extend range if tasks/milestones are outside project dates
    if (allDates.length > 0) {
      const minTaskDate = new Date(Math.min(...allDates.map(d => d.getTime())));
      const maxTaskDate = new Date(Math.max(...allDates.map(d => d.getTime())));
      
      // Add padding (2 weeks before, 4 weeks after)
      const paddingBefore = 14 * 24 * 60 * 60 * 1000;
      const paddingAfter = 28 * 24 * 60 * 60 * 1000;
      
      if (minTaskDate.getTime() < rangeStart.getTime() - paddingBefore) {
        rangeStart = startOfWeek(subDays(minTaskDate, 14));
      }
      if (maxTaskDate.getTime() > rangeEnd.getTime() - paddingAfter) {
        rangeEnd = endOfWeek(addDays(maxTaskDate, 28));
      }
    }

    return { start: rangeStart, end: rangeEnd };
  }, [tasks, milestones, startDate, endDate]);

  const totalDays = differenceInDays(dateRange.end, dateRange.start) + 1;
  
  // Group days by weeks for better visualization
  const weeks = useMemo(() => {
    const weeksArray: { start: Date; days: Date[] }[] = [];
    let currentWeekStart = startOfWeek(dateRange.start);
    
    while (currentWeekStart <= dateRange.end) {
      const weekEnd = endOfWeek(currentWeekStart);
      const weekDays: Date[] = [];
      
      for (let i = 0; i < 7; i++) {
        const day = addDays(currentWeekStart, i);
        if (day >= dateRange.start && day <= dateRange.end) {
          weekDays.push(day);
        }
      }
      
      if (weekDays.length > 0) {
        weeksArray.push({ start: currentWeekStart, days: weekDays });
      }
      
      currentWeekStart = addDays(currentWeekStart, 7);
    }
    
    return weeksArray;
  }, [dateRange.start, dateRange.end]);

  const days = useMemo(() => {
    const daysArray = [];
    for (let i = 0; i < totalDays; i++) {
      const date = new Date(dateRange.start);
      date.setDate(date.getDate() + i);
      daysArray.push(date);
    }
    return daysArray;
  }, [dateRange.start, totalDays]);

  const getTaskPosition = (task: Task) => {
    if (!task.dueDate) return { left: 0, width: 0 };
    
    const taskDate = new Date(task.dueDate);
    const daysFromStart = differenceInDays(taskDate, dateRange.start);
    const leftPercent = (daysFromStart / totalDays) * 100;
    
    // Estimate task duration (default 1 day, or use estimated hours / 8)
    const duration = Math.max(1, Math.ceil((task.estimatedHours || 8) / 8));
    const widthPercent = (duration / totalDays) * 100;
    
    return {
      left: Math.max(0, Math.min(100, leftPercent)),
      width: Math.max(2, Math.min(100, widthPercent)),
    };
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-500';
      case 'IN_PROGRESS':
        return 'bg-blue-500';
      case 'REVIEW':
        return 'bg-yellow-500';
      case 'BLOCKED':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'URGENT':
        return 'border-red-600';
      case 'HIGH':
        return 'border-orange-500';
      case 'MEDIUM':
        return 'border-yellow-500';
      default:
        return 'border-gray-300';
    }
  };

  return (
    <div className="w-full overflow-x-auto border rounded-lg">
      <div className="min-w-full">
        {/* Header with week/month labels */}
        <div className="flex border-b border-gray-200 sticky top-0 bg-white z-20">
          <div className="w-64 p-2 border-r border-gray-200 font-semibold bg-gray-50">Task / Milestone</div>
          <div className="flex-1 relative">
            {/* Week headers */}
            <div className="flex border-b border-gray-300">
              {weeks.map((week, weekIndex) => (
                <div
                  key={weekIndex}
                  className="flex-1 p-1 text-xs text-center border-r border-gray-300 bg-gray-50 font-semibold"
                  style={{ minWidth: `${(week.days.length / 7) * 100}%` }}
                >
                  {format(week.start, 'MMM d')} - {format(endOfWeek(week.start), 'MMM d, yyyy')}
                </div>
              ))}
            </div>
            {/* Day headers */}
            <div className="flex">
              {days.map((day, index) => {
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                return (
                  <div
                    key={index}
                    className={`flex-1 p-1 text-xs text-center border-r border-gray-200 ${
                      isWeekend ? 'bg-gray-50' : 'bg-white'
                    } ${isToday ? 'bg-blue-100 font-bold border-blue-300' : ''}`}
                    style={{ minWidth: '50px' }}
                  >
                    <div className="font-medium">{format(day, 'EEE')}</div>
                    <div>{format(day, 'd')}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Milestones */}
        {milestones.length > 0 && (
          <div className="divide-y divide-gray-200 border-b-2 border-gray-300">
            {milestones.map((milestone) => {
              if (!milestone.targetDate) return null;
              const milestoneDate = new Date(milestone.targetDate);
              const daysFromStart = differenceInDays(milestoneDate, dateRange.start);
              const leftPercent = Math.max(0, Math.min(100, (daysFromStart / totalDays) * 100));
              
              return (
                <div key={`milestone-${milestone.id}`} className="flex items-center min-h-[40px] hover:bg-gray-50">
                  <div className="w-64 p-2 border-r border-gray-200 flex items-center gap-2">
                    <Flag className={`h-4 w-4 ${
                      milestone.status === 'completed' ? 'text-green-600' : 
                      milestone.status === 'overdue' ? 'text-red-600' : 
                      milestone.status === 'in_progress' ? 'text-blue-600' : 
                      'text-yellow-600'
                    }`} />
                    <span className="text-sm font-semibold truncate" title={milestone.name}>
                      {milestone.name}
                    </span>
                  </div>
                  <div className="flex-1 relative h-8">
                    <div
                      className={`absolute h-6 w-1 ${
                        milestone.status === 'completed' ? 'bg-green-600' : 
                        milestone.status === 'overdue' ? 'bg-red-600' : 
                        milestone.status === 'in_progress' ? 'bg-blue-600' : 
                        'bg-yellow-600'
                      } shadow-lg`}
                      style={{
                        left: `${leftPercent}%`,
                        top: '4px',
                      }}
                      title={`${milestone.name} - ${format(milestoneDate, 'MMM d, yyyy')}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Task rows */}
        <div className="divide-y divide-gray-200">
          {tasks.filter(t => t.dueDate).map((task) => {
            const position = getTaskPosition(task);
            return (
              <div key={task.id} className="flex items-center min-h-[40px] hover:bg-gray-50">
                {/* Task name */}
                <div className="w-64 p-2 border-r border-gray-200 flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(task.status)}`} />
                  <span className="text-sm truncate" title={task.title}>
                    {task.title}
                  </span>
                </div>

                {/* Gantt bar */}
                <div className="flex-1 relative h-8">
                  {task.dueDate && position.width > 0 && (
                    <div
                      className={`absolute h-6 rounded ${getStatusColor(task.status)} ${getPriorityColor(task.priority)} border-2 opacity-80 hover:opacity-100 cursor-pointer transition-all flex items-center px-2`}
                      style={{
                        left: `${position.left}%`,
                        width: `${Math.max(2, position.width)}%`,
                        minWidth: '60px',
                        top: '4px',
                      }}
                      title={`${task.title} - Due: ${format(new Date(task.dueDate), 'MMM d, yyyy')} - ${task.estimatedHours || 0}h estimated`}
                    >
                      <div className="text-xs text-white truncate w-full">
                        {task.title}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {tasks.filter(t => t.dueDate).length === 0 && milestones.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No tasks with due dates or milestones to display
          </div>
        )}
      </div>
    </div>
  );
}

