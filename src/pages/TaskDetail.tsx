import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import AppLayout from '@/components/AppLayout';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { useTaskDependencies } from '@/hooks/useTaskDependencies';
import { useTaskComments } from '@/hooks/useTaskComments';
import { usersService } from '@/lib/users-service';
import { apiClient } from '@/lib/api-client';
import { Task, User, TaskAttachment, TimeEntry, Tag } from '@/types';
import { TagSelector } from '@/components/TagSelector';
import { Tag as TagIcon } from 'lucide-react';
import { 
  Calendar, 
  Clock, 
  User as UserIcon, 
  Play, 
  Square, 
  Edit, 
  Save,
  X,
  AlertCircle,
  CheckCircle2,
  Circle,
  PlayCircle,
  Plus,
  Paperclip,
  Upload,
  File,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { tasks, fetchTasks, updateTaskStatus } = useTasks();
  const { projects, fetchProjects } = useProjects();
  const { activeTimer, startTimer, stopTimer, timeEntries, fetchTimeEntries, createTimeEntry, updateTimeEntry, deleteTimeEntry } = useTimeTracking();
  const { toast } = useToast();

  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [taskTags, setTaskTags] = useState<Tag[]>([]);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM' as Task['priority'],
    assignedTo: '',
    dueDate: '',
    estimatedHours: 0,
    selectedTags: [] as string[],
  });
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [manualEntry, setManualEntry] = useState({
    startTime: new Date().toISOString().slice(0, 16),
    endTime: new Date().toISOString().slice(0, 16),
    description: '',
    billable: false,
  });
  const [isReviewerDialogOpen, setIsReviewerDialogOpen] = useState(false);
  const [selectedReviewer, setSelectedReviewer] = useState<string>('');
  const [pendingStatusChange, setPendingStatusChange] = useState<Task['status'] | null>(null);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [editingTimeEntry, setEditingTimeEntry] = useState<TimeEntry | null>(null);
  const [editTimeEntryForm, setEditTimeEntryForm] = useState({
    startTime: '',
    endTime: '',
    description: '',
    billable: false,
  });
  
  // Dependencies, Sub-tasks, and Comments
  const { dependencies, fetchDependencies, createDependency, deleteDependency } = useTaskDependencies();
  const { comments, fetchComments, createComment, updateComment, deleteComment } = useTaskComments();
  const [isDependencyDialogOpen, setIsDependencyDialogOpen] = useState(false);
  const [selectedDependencyTask, setSelectedDependencyTask] = useState('');
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');

  useEffect(() => {
    if (id) {
      loadTask();
      fetchProjects();
      fetchTasks();
      fetchTimeEntries();
      loadUsers();
      loadTags();
      loadAttachments();
      fetchDependencies(id);
      fetchComments(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadTask = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const taskData = await apiClient.getTask(id);
      
      const normalizedTask: Task = {
        id: taskData.id,
        projectId: taskData.projectId || null,
        title: taskData.title,
        description: taskData.description,
        status: taskData.status,
        priority: taskData.priority,
        estimatedHours: taskData.estimatedHours || 0,
        assignedTo: taskData.assignedTo,
        createdBy: taskData.createdBy,
        dueDate: taskData.dueDate,
        createdAt: taskData.createdAt,
        updatedAt: taskData.updatedAt,
        meetingId: taskData.meetingId || null,
        reviewerId: taskData.reviewerId || null,
        parentTaskId: taskData.parentTaskId || null,
      };
      
      if (normalizedTask) {
        setTask(normalizedTask as Task);
        setEditForm({
          title: normalizedTask.title,
          description: normalizedTask.description || '',
          priority: normalizedTask.priority,
          assignedTo: normalizedTask.assignedTo,
          dueDate: normalizedTask.dueDate ? new Date(normalizedTask.dueDate).toISOString().split('T')[0] : '',
          estimatedHours: normalizedTask.estimatedHours || 0,
          selectedTags: [],
        });
        await loadTaskTags();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load task',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      // Get current user first
      const current = await usersService.getCurrentUser();
      if (current) {
        setAvailableUsers([current]);
      }
      
      // Try to get other users - for now we'll just use current user
      // In a real app, you'd have a users table or team management
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadTags = async () => {
    try {
      const tags = await apiClient.getTags();
      setAvailableTags(tags);
    } catch (error) {
      console.error('Error loading tags:', error);
      setAvailableTags([]);
    }
  };

  const loadTaskTags = async () => {
    if (!id) return;
    try {
      const taskTagsData = await apiClient.getTaskTags(id);
      const tags = taskTagsData.map((tt: { tag: Tag }) => tt.tag).filter(Boolean) as Tag[];
      setTaskTags(tags);
      if (isEditing) {
        setEditForm(prev => ({ ...prev, selectedTags: tags.map(t => t.id) }));
      }
    } catch (error) {
      console.error('Error loading task tags:', error);
      setTaskTags([]);
    }
  };

  const handleSave = async () => {
    if (!task) return;

    try {
      await apiClient.updateTask(task.id, {
        title: editForm.title,
        description: editForm.description,
        priority: editForm.priority,
        assignedTo: editForm.assignedTo,
        dueDate: editForm.dueDate,
        estimatedHours: editForm.estimatedHours,
      });

      // Update task tags
      if (editForm.selectedTags !== undefined) {
        try {
          await apiClient.updateTaskTags(task.id, editForm.selectedTags);
        } catch (error) {
          console.error('Error updating task tags:', error);
        }
      }

      await loadTask();
      await loadTaskTags();
      await fetchTasks();
      setIsEditing(false);

      toast({
        title: 'Success',
        description: 'Task updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update task',
        variant: 'destructive',
      });
    }
  };

  const loadAttachments = async () => {
    if (!id) return;
    try {
      const attachmentsData = await apiClient.getTaskAttachments(id);
      
      // Get signed URLs for each attachment
      const attachmentsWithUrls = await Promise.all(
        attachmentsData.map(async (attachment: any) => {
          try {
            const url = await apiClient.getAttachmentUrl(attachment.id);
            return {
              id: attachment.id,
              taskId: attachment.taskId,
              fileName: attachment.fileName,
              fileSize: attachment.fileSize,
              fileType: attachment.mimeType || attachment.fileType,
              filePath: url,
              uploadedBy: attachment.uploadedBy || attachment.uploader?.id,
              createdAt: attachment.createdAt,
            };
          } catch (error) {
            console.error(`Failed to get URL for attachment ${attachment.id}:`, error);
            return {
              id: attachment.id,
              taskId: attachment.taskId,
              fileName: attachment.fileName,
              fileSize: attachment.fileSize,
              fileType: attachment.mimeType || attachment.fileType,
              filePath: attachment.fileUrl || '',
              uploadedBy: attachment.uploadedBy || attachment.uploader?.id,
              createdAt: attachment.createdAt,
            };
          }
        })
      );
      
      setAttachments(attachmentsWithUrls);
    } catch (error) {
      console.error('Failed to load attachments:', error);
    }
  };

  const handleStatusChange = async (newStatus: Task['status']) => {
    if (!task) return;

    // If changing to review, show reviewer selection dialog
    if (newStatus === 'REVIEW') {
      setPendingStatusChange(newStatus);
      setIsReviewerDialogOpen(true);
      return;
    }

    // For other status changes, proceed directly
    try {
      await updateTaskStatus(task.id, newStatus);
      await loadTask();
      toast({
        title: 'Success',
        description: 'Task status updated',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const confirmReviewStatusChange = async () => {
    if (!task || !selectedReviewer || !pendingStatusChange) return;

    try {
      await apiClient.updateTask(task.id, {
        status: pendingStatusChange,
        reviewerId: selectedReviewer,
      });

      await loadTask();
      setIsReviewerDialogOpen(false);
      setSelectedReviewer('');
      setPendingStatusChange(null);
      
      toast({
        title: 'Success',
        description: 'Task marked for review and reviewer assigned',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!task || !event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (file.size > maxSize) {
      toast({
        title: 'Error',
        description: 'File size must be less than 10MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      // Upload file using API client
      const attachment = await apiClient.uploadTaskAttachment(task.id, file);

      await loadAttachments();
      toast({
        title: 'Success',
        description: 'File uploaded successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to upload file',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!task) return;

    try {
      // Delete attachment using API client (handles both storage and database)
      await apiClient.deleteTaskAttachment(attachmentId);

      await loadAttachments();
      toast({
        title: 'Success',
        description: 'Attachment deleted',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete attachment',
        variant: 'destructive',
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleTimerToggle = async () => {
    if (!task) return;

    if (activeTimer && activeTimer.taskId === task.id) {
      // Stop current timer
      try {
        await stopTimer(activeTimer.id);
        await fetchTimeEntries();
        toast({
          title: 'Success',
          description: 'Timer stopped',
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to stop timer',
          variant: 'destructive',
        });
      }
    } else {
      // Start new timer
      try {
        await startTimer(task.id);
        await fetchTimeEntries();
        // Reload task to show status change
        if (id) {
          await loadTask();
        }
        toast({
          title: 'Success',
          description: 'Timer started',
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to start timer';
        // Check if it's a duplicate timer error
        if (errorMessage.includes('already running')) {
          // Refresh the timer state to show the active timer
          await fetchTimeEntries();
          if (id) {
            await loadTask();
          }
        }
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    }
  };

  const handleManualEntry = async () => {
    if (!task) return;

    const start = new Date(manualEntry.startTime);
    const end = new Date(manualEntry.endTime);
    const durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

    if (durationMinutes <= 0) {
      toast({
        title: 'Error',
        description: 'End time must be after start time',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createTimeEntry({
        taskId: task.id,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        durationMinutes,
        description: manualEntry.description,
        billable: manualEntry.billable,
      });
      await fetchTimeEntries();
      setIsManualEntryOpen(false);
      setManualEntry({
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
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add time entry',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'IN_PROGRESS':
        return <PlayCircle className="h-5 w-5 text-blue-600" />;
      case 'REVIEW':
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      case 'BLOCKED':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'URGENT':
        return 'destructive';
      case 'HIGH':
        return 'default';
      case 'MEDIUM':
        return 'secondary';
      case 'LOW':
        return 'outline';
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'COMPLETED':
        return 'default';
      case 'IN_PROGRESS':
        return 'default';
      case 'REVIEW':
        return 'secondary';
      case 'BLOCKED':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const taskTimeEntries = timeEntries.filter(entry => entry.taskId === task?.id);
  const totalTimeSpent = taskTimeEntries.reduce((total, entry) => total + (entry.durationMinutes || 0), 0);
  const isTaskTimerActive = activeTimer?.taskId === task?.id;
  const project = projects.find(p => p.id === task?.projectId);
  const assignedUser = availableUsers.find(u => u.id === task?.assignedTo) || currentUser;
  const reviewerUser = task?.reviewerId ? availableUsers.find(u => u.id === task.reviewerId) : null;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading task...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!task) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Task Not Found</h3>
                <p className="text-muted-foreground mb-4">The task you're looking for doesn't exist.</p>
                <Button onClick={() => navigate('/tasks')}>Back to Tasks</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED';

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              {isEditing ? (
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="text-3xl font-bold mb-2"
                />
              ) : (
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{task.title}</h1>
              )}
              {project && (
                <Button
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  {project.name}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => {
                  setIsEditing(true);
                  loadTaskTags();
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>

          {/* Status and Priority Badges */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              {getStatusIcon(task.status)}
              <Select
                value={task.status}
                onValueChange={(value: Task['status']) => handleStatusChange(value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODO">To Do</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="REVIEW">Review</SelectItem>
                  <SelectItem value="BLOCKED">Blocked</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isEditing ? (
              <Select
                value={editForm.priority}
                onValueChange={(value: Task['priority']) => setEditForm({ ...editForm, priority: value })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge variant={getPriorityColor(task.priority)}>{task.priority}</Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={6}
                    placeholder="Add a description..."
                  />
                ) : (
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {task.description || 'No description provided'}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <TagSelector
                    tags={availableTags}
                    selectedTags={editForm.selectedTags}
                    onSelectionChange={(tagIds) => setEditForm({ ...editForm, selectedTags: tagIds })}
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {taskTags.length > 0 ? (
                      taskTags.map(tag => (
                        <Badge key={tag.id} variant="outline" style={{ borderColor: tag.color, color: tag.color }}>
                          <TagIcon className="h-3 w-3 mr-1" />
                          {tag.name}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No tags assigned</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attachments */}
            <Card>
              <CardHeader>
                <CardTitle>Attachments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {attachments.length} file{attachments.length !== 1 ? 's' : ''} attached
                  </p>
                  <label>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      disabled={isUploading}
                    >
                      <span>
                        {isUploading ? (
                          <>
                            <Upload className="h-3 w-3 mr-1 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-3 w-3 mr-1" />
                            Upload File
                          </>
                        )}
                      </span>
                    </Button>
                  </label>
                </div>
                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <a
                              href={attachment.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium hover:underline truncate block"
                            >
                              {attachment.fileName}
                            </a>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(attachment.fileSize)} • {format(new Date(attachment.createdAt), 'MMM dd, yyyy')}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAttachment(attachment.id)}
                          className="flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Time Tracking */}
            <Card>
              <CardHeader>
                <CardTitle>Time Tracking</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      {Math.floor(totalTimeSpent / 60)}h {totalTimeSpent % 60}m
                    </div>
                    <p className="text-sm text-muted-foreground">Total time spent</p>
                  </div>
                  <Button
                    onClick={handleTimerToggle}
                    variant={isTaskTimerActive ? 'destructive' : 'default'}
                    size="lg"
                  >
                    {isTaskTimerActive ? (
                      <>
                        <Square className="h-4 w-4 mr-2" />
                        Stop Timer
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Start Timer
                      </>
                    )}
                  </Button>
                </div>
                {isTaskTimerActive && activeTimer && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-900">Timer Running</p>
                        <p className="text-xs text-blue-700">
                          Started at {format(new Date(activeTimer.startTime), 'h:mm a')}
                        </p>
                      </div>
                      <Clock className="h-5 w-5 text-blue-600 animate-pulse" />
                    </div>
                  </div>
                )}
                <Separator />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Time Entries ({taskTimeEntries.length})</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsManualEntryOpen(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Entry
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {taskTimeEntries.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No time entries yet</p>
                    ) : (
                      taskTimeEntries.map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between p-2 bg-gray-50 rounded group">
                          <div className="flex-1">
                            <p className="text-sm">
                              {entry.startTime && format(new Date(entry.startTime), 'MMM dd, h:mm a')}
                              {entry.endTime && ` - ${format(new Date(entry.endTime), 'h:mm a')}`}
                            </p>
                            {entry.description && (
                              <p className="text-xs text-muted-foreground">{entry.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                          <div className="text-sm font-medium">
                            {Math.floor((entry.durationMinutes || 0) / 60)}h {(entry.durationMinutes || 0) % 60}m
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingTimeEntry(entry);
                                  setEditTimeEntryForm({
                                    startTime: entry.startTime ? new Date(entry.startTime).toISOString().slice(0, 16) : '',
                                    endTime: entry.endTime ? new Date(entry.endTime).toISOString().slice(0, 16) : '',
                                    description: entry.description || '',
                                    billable: entry.billable || false,
                                  });
                                }}
                                className="h-7 w-7 p-0"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  if (confirm('Are you sure you want to delete this time entry?')) {
                                    try {
                                      await deleteTimeEntry(entry.id);
                                      await fetchTimeEntries();
                                      toast({
                                        title: 'Success',
                                        description: 'Time entry deleted',
                                      });
                                    } catch (error) {
                                      toast({
                                        title: 'Error',
                                        description: error instanceof Error ? error.message : 'Failed to delete time entry',
                                        variant: 'destructive',
                                      });
                                    }
                                  }
                                }}
                                className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Task Details */}
            <Card>
              <CardHeader>
                <CardTitle>Task Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Assigned To</Label>
                  {isEditing ? (
                    <Select
                      value={editForm.assignedTo}
                      onValueChange={(value) => setEditForm({ ...editForm, assignedTo: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.firstName} {user.lastName} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : 'Unassigned'}
                      </span>
                    </div>
                  )}
                </div>
                {task.status === 'REVIEW' && task.reviewerId && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Reviewer</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      <span className="text-orange-600 font-medium">
                        {reviewerUser ? `${reviewerUser.firstName} ${reviewerUser.lastName}` : 'Reviewer assigned'}
                      </span>
                    </div>
                  </div>
                )}

                <Separator />

                <div>
                  <Label className="text-xs text-muted-foreground">Due Date</Label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editForm.dueDate}
                      onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                        {format(new Date(task.dueDate), 'MMM dd, yyyy')}
                      </span>
                      {isOverdue && (
                        <Badge variant="destructive" className="text-xs">Overdue</Badge>
                      )}
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <Label className="text-xs text-muted-foreground">Estimated Hours</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={editForm.estimatedHours}
                      onChange={(e) => setEditForm({ ...editForm, estimatedHours: parseFloat(e.target.value) || 0 })}
                      className="mt-1"
                    />
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{task.estimatedHours || 0} hours</span>
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <Label className="text-xs text-muted-foreground">Created</Label>
                  <p className="text-sm mt-1">
                    {format(new Date(task.createdAt), 'MMM dd, yyyy')}
                  </p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Last Updated</Label>
                  <p className="text-sm mt-1">
                    {format(new Date(task.updatedAt), 'MMM dd, yyyy')}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleStatusChange('TODO')}
                  disabled={task.status === 'TODO'}
                >
                  <Circle className="h-4 w-4 mr-2" />
                  Mark as To Do
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleStatusChange('IN_PROGRESS')}
                  disabled={task.status === 'IN_PROGRESS'}
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Mark as In Progress
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleStatusChange('REVIEW')}
                  disabled={task.status === 'REVIEW'}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Mark for Review
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleStatusChange('BLOCKED')}
                  disabled={task.status === 'BLOCKED'}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Mark as Blocked
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleStatusChange('COMPLETED')}
                  disabled={task.status === 'COMPLETED'}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark as Completed
                </Button>
              </CardContent>
            </Card>

            {/* Dependencies */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-lg">Dependencies</CardTitle>
                  <div className="w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsDependencyDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Add Dependency</span>
                      <span className="sm:hidden">Add</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {dependencies.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No dependencies</p>
                ) : (
                  <div className="space-y-2">
                    {dependencies.map((dep) => {
                      const depTask = tasks.find(t => t.id === dep.dependsOnTaskId);
                      return (
                        <div key={dep.id} className="flex items-center justify-between p-2 border rounded-lg">
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {depTask ? depTask.title : `Task ${dep.dependsOnTaskId.substring(0, 8)}...`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {dep.dependencyType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              try {
                                await deleteDependency(dep.id);
                                toast({
                                  title: 'Success',
                                  description: 'Dependency removed',
                                });
                              } catch (error) {
                                toast({
                                  title: 'Error',
                                  description: 'Failed to remove dependency',
                                  variant: 'destructive',
                                });
                              }
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Comments */}
            <Card>
              <CardHeader>
                <CardTitle>Comments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                  />
                  <Button
                    size="sm"
                    onClick={async () => {
                      if (!newComment.trim() || !id) return;
                      try {
                        await createComment({
                          taskId: id,
                          content: newComment,
                        });
                        setNewComment('');
                        toast({
                          title: 'Success',
                          description: 'Comment added',
                        });
                      } catch (error) {
                        toast({
                          title: 'Error',
                          description: error instanceof Error ? error.message : 'Failed to add comment',
                          variant: 'destructive',
                        });
                      }
                    }}
                    disabled={!newComment.trim()}
                  >
                    Post Comment
                  </Button>
                </div>
                <Separator />
                <div className="space-y-4">
                  {comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No comments yet</p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <UserIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                {comment.user ? `${comment.user.firstName} ${comment.user.lastName}` : 'Unknown User'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(comment.createdAt), 'MMM dd, yyyy h:mm a')}
                              </span>
                            </div>
                            {editingCommentId === comment.id ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={editCommentContent}
                                  onChange={(e) => setEditCommentContent(e.target.value)}
                                  rows={2}
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={async () => {
                                      try {
                                        await updateComment(comment.id, editCommentContent);
                                        setEditingCommentId(null);
                                        setEditCommentContent('');
                                        toast({
                                          title: 'Success',
                                          description: 'Comment updated',
                                        });
                                      } catch (error) {
                                        toast({
                                          title: 'Error',
                                          description: 'Failed to update comment',
                                          variant: 'destructive',
                                        });
                                      }
                                    }}
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingCommentId(null);
                                      setEditCommentContent('');
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                            )}
                          </div>
                          {comment.userId === currentUser?.id && editingCommentId !== comment.id && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingCommentId(comment.id);
                                  setEditCommentContent(comment.content);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    await deleteComment(comment.id);
                                    toast({
                                      title: 'Success',
                                      description: 'Comment deleted',
                                    });
                                  } catch (error) {
                                    toast({
                                      title: 'Error',
                                      description: 'Failed to delete comment',
                                      variant: 'destructive',
                                    });
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          )}
                        </div>
                        {comment.id !== comments[comments.length - 1]?.id && <Separator />}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Add Dependency Dialog */}
      <Dialog open={isDependencyDialogOpen} onOpenChange={setIsDependencyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Dependency</DialogTitle>
            <DialogDescription>
              Select a task that this task depends on
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Dependent Task</Label>
              <Select value={selectedDependencyTask} onValueChange={setSelectedDependencyTask}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a task" />
                </SelectTrigger>
                <SelectContent>
                  {tasks
                    .filter(t => t.id !== task.id && !dependencies.some(d => d.dependsOnTaskId === t.id))
                    .map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDependencyDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!selectedDependencyTask || !id) return;
                  try {
                    await createDependency({
                      taskId: id,
                      dependsOnTaskId: selectedDependencyTask,
                    });
                    setSelectedDependencyTask('');
                    setIsDependencyDialogOpen(false);
                    toast({
                      title: 'Success',
                      description: 'Dependency added',
                    });
                  } catch (error) {
                    toast({
                      title: 'Error',
                      description: error instanceof Error ? error.message : 'Failed to add dependency',
                      variant: 'destructive',
                    });
                  }
                }}
                disabled={!selectedDependencyTask}
              >
                Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Time Entry Dialog */}
      <Dialog open={isManualEntryOpen} onOpenChange={setIsManualEntryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Time Entry</DialogTitle>
            <DialogDescription>
              Manually add a time entry for this task
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time</Label>
              <Input
                id="start-time"
                type="datetime-local"
                value={manualEntry.startTime}
                onChange={(e) => setManualEntry({ ...manualEntry, startTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">End Time</Label>
              <Input
                id="end-time"
                type="datetime-local"
                value={manualEntry.endTime}
                onChange={(e) => setManualEntry({ ...manualEntry, endTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={manualEntry.description}
                onChange={(e) => setManualEntry({ ...manualEntry, description: e.target.value })}
                placeholder="What did you work on?"
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="billable"
                checked={manualEntry.billable}
                onChange={(e) => setManualEntry({ ...manualEntry, billable: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="billable" className="cursor-pointer">Billable</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsManualEntryOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleManualEntry}>
                Add Time Entry
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Time Entry Dialog */}
      <Dialog open={!!editingTimeEntry} onOpenChange={(open) => !open && setEditingTimeEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Time Entry</DialogTitle>
            <DialogDescription>
              Update the start time, end time, and other details for this time entry
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-start-time">Start Time</Label>
              <Input
                id="edit-start-time"
                type="datetime-local"
                value={editTimeEntryForm.startTime}
                onChange={(e) => setEditTimeEntryForm({ ...editTimeEntryForm, startTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-end-time">End Time</Label>
              <Input
                id="edit-end-time"
                type="datetime-local"
                value={editTimeEntryForm.endTime}
                onChange={(e) => setEditTimeEntryForm({ ...editTimeEntryForm, endTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editTimeEntryForm.description}
                onChange={(e) => setEditTimeEntryForm({ ...editTimeEntryForm, description: e.target.value })}
                placeholder="What did you work on?"
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-billable"
                checked={editTimeEntryForm.billable}
                onChange={(e) => setEditTimeEntryForm({ ...editTimeEntryForm, billable: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="edit-billable" className="cursor-pointer">Billable</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingTimeEntry(null)}>
                Cancel
              </Button>
              <Button onClick={async () => {
                if (!editingTimeEntry) return;
                
                const start = new Date(editTimeEntryForm.startTime);
                const end = new Date(editTimeEntryForm.endTime);
                const durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

                if (durationMinutes <= 0) {
                  toast({
                    title: 'Error',
                    description: 'End time must be after start time',
                    variant: 'destructive',
                  });
                  return;
                }

                try {
                  await updateTimeEntry(editingTimeEntry.id, {
                    startTime: start.toISOString(),
                    endTime: end.toISOString(),
                    durationMinutes,
                    description: editTimeEntryForm.description,
                    billable: editTimeEntryForm.billable,
                  });
                  await fetchTimeEntries();
                  setEditingTimeEntry(null);
                  toast({
                    title: 'Success',
                    description: 'Time entry updated',
                  });
                } catch (error) {
                  toast({
                    title: 'Error',
                    description: error instanceof Error ? error.message : 'Failed to update time entry',
                    variant: 'destructive',
                  });
                }
              }}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reviewer Selection Dialog */}
      <Dialog open={isReviewerDialogOpen} onOpenChange={setIsReviewerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Reviewer</DialogTitle>
            <DialogDescription>
              Choose who should review this task. The task will be assigned to the reviewer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reviewer">Reviewer</Label>
              <Select
                value={selectedReviewer}
                onValueChange={setSelectedReviewer}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a reviewer" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.length > 0 ? (
                    availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} ({user.email})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value={currentUser?.id || ''}>
                      {currentUser?.firstName} {currentUser?.lastName} (You)
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            {task && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium mb-1">Task:</p>
                <p className="text-sm text-muted-foreground">{task.title}</p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setIsReviewerDialogOpen(false);
              setSelectedReviewer('');
              setPendingStatusChange(null);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={confirmReviewStatusChange}
              disabled={!selectedReviewer}
            >
              Assign Reviewer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

