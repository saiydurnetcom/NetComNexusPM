import { useState } from 'react';
import { Task } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  CheckCircle2,
  Circle,
  PlayCircle,
  AlertCircle,
  Clock,
  User as UserIcon,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface KanbanBoardProps {
  tasks: Task[];
  onTaskStatusChange?: (taskId: string, newStatus: Task['status']) => Promise<void>;
  showProject?: boolean;
  users?: Array<{ id: string; firstName: string; lastName: string; email: string }>;
}

const statusConfig: Record<Task['status'], { label: string; color: string; bgColor: string }> = {
  todo: { label: 'To Do', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  in_progress: { label: 'In Progress', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  review: { label: 'Review', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  blocked: { label: 'Blocked', color: 'text-red-700', bgColor: 'bg-red-100' },
  completed: { label: 'Completed', color: 'text-green-700', bgColor: 'bg-green-100' },
};

const statusOrder: Task['status'][] = ['todo', 'in_progress', 'review', 'blocked', 'completed'];

export function KanbanBoard({ tasks, onTaskStatusChange, showProject = false, users = [] }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const getTasksByStatus = (status: Task['status']) => {
    return tasks.filter(task => task.status === status);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setIsDragging(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setIsDragging(false);
    setActiveId(null);

    if (!over || !onTaskStatusChange) return;

    const taskId = active.id as string;
    const newStatus = over.id as Task['status'];

    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;

    try {
      await onTaskStatusChange(taskId, newStatus);
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <PlayCircle className="h-4 w-4 text-blue-600" />;
      case 'review':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'blocked':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getUserInitials = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return '?';
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || '?';
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return 'Unknown';
    return `${user.firstName} ${user.lastName}`;
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '600px' }}>
        {statusOrder.map((status) => {
          const statusTasks = getTasksByStatus(status);
          const config = statusConfig[status];

          return (
            <div
              key={status}
              className="flex-shrink-0 w-80"
            >
              <div className={`${config.bgColor} rounded-t-lg p-3 border-b-2 border-gray-300`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(status)}
                    <h3 className={`font-semibold ${config.color}`}>
                      {config.label}
                    </h3>
                  </div>
                  <Badge variant="secondary" className="bg-white/50">
                    {statusTasks.length}
                  </Badge>
                </div>
              </div>

              <SortableContext
                items={statusTasks.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div
                  id={status}
                  className="bg-gray-50 rounded-b-lg p-2 min-h-[500px] space-y-2"
                  style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}
                >
                  {statusTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      showProject={showProject}
                      getUserInitials={getUserInitials}
                      getUserName={getUserName}
                      getPriorityColor={getPriorityColor}
                    />
                  ))}
                  {statusTasks.length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      No tasks
                    </div>
                  )}
                </div>
              </SortableContext>
            </div>
          );
        })}
      </div>

      <DragOverlay>
        {activeTask && (
          <TaskCard
            task={activeTask}
            showProject={showProject}
            getUserInitials={getUserInitials}
            getUserName={getUserName}
            getPriorityColor={getPriorityColor}
            isDragging
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}

interface TaskCardProps {
  task: Task;
  showProject: boolean;
  getUserInitials: (userId: string) => string;
  getUserName: (userId: string) => string;
  getPriorityColor: (priority: Task['priority']) => string;
  isDragging?: boolean;
}

function TaskCard({ task, showProject, getUserInitials, getUserName, getPriorityColor, isDragging = false }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow',
        isDragging && 'shadow-lg rotate-2'
      )}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm flex-1 line-clamp-2">{task.title}</h4>
          <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)} flex-shrink-0 mt-1`} />
        </div>

        {task.description && (
          <p className="text-xs text-gray-600 line-clamp-2">{task.description}</p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {task.dueDate && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(task.dueDate), 'MMM d')}</span>
            </div>
          )}

          {task.estimatedHours > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              <span>{task.estimatedHours}h</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                {getUserInitials(task.assignedTo)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-gray-600 truncate max-w-[120px]">
              {getUserName(task.assignedTo)}
            </span>
          </div>

          {showProject && task.projectId && (
            <Badge variant="outline" className="text-xs">
              Project
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

