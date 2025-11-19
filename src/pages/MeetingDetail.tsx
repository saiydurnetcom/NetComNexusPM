import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/components/AppLayout';
import { useMeetings } from '@/hooks/useMeetings';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useAISuggestions } from '@/hooks/useAISuggestions';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { usersService } from '@/lib/users-service';
import { apiClient } from '@/lib/api-client';
import { Meeting, AISuggestion, Task, TaskCreateData, User } from '@/types';
import { 
  Calendar, 
  Clock, 
  ArrowLeft, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Circle,
  FolderKanban,
  AlertCircle,
  Sparkles,
  Loader2,
  Edit,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';

export default function MeetingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getMeeting, getMeetingSuggestions, isLoading, error } = useMeetings();
  const { projects, fetchProjects } = useProjects();
  const { tasks, fetchTasks } = useTasks();
  const { reprocessMeeting, approveSuggestion, rejectSuggestion, isLoading: isReprocessing } = useAISuggestions();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [tasksFromMeeting, setTasksFromMeeting] = useState<Task[]>([]);
  const [isReprocessingMeeting, setIsReprocessingMeeting] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  
  // Dialog states
  const [approvingSuggestion, setApprovingSuggestion] = useState<AISuggestion | null>(null);
  const [rejectingSuggestion, setRejectingSuggestion] = useState<AISuggestion | null>(null);
  const [editingSuggestion, setEditingSuggestion] = useState<AISuggestion | null>(null);
  
  // Form states for approval
  const [approvalForm, setApprovalForm] = useState<{
    title: string;
    description: string;
    projectId: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    assignedTo: string;
    dueDate: string;
  }>({
    title: '',
    description: '',
    projectId: '',
    priority: 'medium',
    assignedTo: '',
    dueDate: '',
  });
  
  // Rejection reason
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (id) {
      loadMeetingData();
      fetchProjects();
      fetchTasks();
      loadUsers();
    }
  }, [id]);

  const loadUsers = async () => {
    try {
      const users = await usersService.getUsers();
      setAvailableUsers(users);
    } catch (error) {
      console.error('Failed to load users:', error);
      // Fallback to current user if available
      if (currentUser) {
        setAvailableUsers([currentUser]);
      }
    }
  };

  const loadMeetingData = async () => {
    if (!id) return;
    try {
      const meetingData = await getMeeting(id);
      if (meetingData) {
        setMeeting(meetingData);
        const suggestionsData = await getMeetingSuggestions(id);
        setSuggestions(suggestionsData);
        
        // Find tasks that were created from this meeting using API
        const allTasks = await apiClient.getTasks();
        const meetingTasks = allTasks.filter((task: any) => task.meetingId === id);
        setTasksFromMeeting(meetingTasks);
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to load meeting details',
        variant: 'destructive',
      });
    }
  };

  const handleReprocessMeeting = async () => {
    if (!meeting) return;

    setIsReprocessingMeeting(true);
    try {
      const newSuggestions = await reprocessMeeting(meeting.id);
      
      // Reload suggestions to get all of them
      if (meeting.id) {
        const updatedSuggestions = await getMeetingSuggestions(meeting.id);
        setSuggestions(updatedSuggestions);
      }

      if (newSuggestions.length === 0) {
        toast({
          title: 'No new suggestions',
          description: 'All tasks from this meeting have already been suggested. No new tasks found.',
        });
      } else {
        toast({
          title: 'Success',
          description: `Found ${newSuggestions.length} new task suggestion(s) that don't duplicate existing approved tasks.`,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reprocess meeting',
        variant: 'destructive',
      });
    } finally {
      setIsReprocessingMeeting(false);
    }
  };

  const getStatusIcon = (status: AISuggestion['status']) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: AISuggestion['status']) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const handleApproveClick = (suggestion: AISuggestion) => {
    setApprovingSuggestion(suggestion);
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 7); // Default to 7 days from now
    
    // Use AI-generated description if available, otherwise fall back to originalText
    const defaultDescription = (suggestion as any).suggestedDescription || suggestion.originalText;
    
    setApprovalForm({
      title: suggestion.suggestedTask,
      description: defaultDescription,
      projectId: meeting?.projectId || '',
      priority: 'medium',
      assignedTo: currentUser?.id || '',
      dueDate: defaultDueDate.toISOString().split('T')[0],
    });
  };

  const handleRejectClick = (suggestion: AISuggestion) => {
    setRejectingSuggestion(suggestion);
    setRejectionReason('');
  };

  const handleEditClick = (suggestion: AISuggestion) => {
    setEditingSuggestion(suggestion);
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 7); // Default to 7 days from now
    
    // Use AI-generated description if available, otherwise fall back to originalText
    const defaultDescription = (suggestion as any).suggestedDescription || suggestion.originalText;
    
    setApprovalForm({
      title: suggestion.suggestedTask,
      description: defaultDescription,
      projectId: meeting?.projectId || '',
      priority: 'medium',
      assignedTo: currentUser?.id || '',
      dueDate: defaultDueDate.toISOString().split('T')[0],
    });
  };

  const confirmApprove = async () => {
    if (!approvingSuggestion) return;

    try {
      const modifications: Partial<TaskCreateData> = {
        title: approvalForm.title,
        description: approvalForm.description,
        projectId: approvalForm.projectId || undefined,
        priority: approvalForm.priority,
        assignedTo: approvalForm.assignedTo || currentUser?.id || '',
        dueDate: approvalForm.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      await approveSuggestion(approvingSuggestion.id, modifications);
      
      // Reload suggestions and tasks
      if (id) {
        const [updatedSuggestions, allTasks] = await Promise.all([
          getMeetingSuggestions(id),
          apiClient.getTasks()
        ]);
        setSuggestions(updatedSuggestions);
        // Filter tasks by meetingId
        const meetingTasks = allTasks.filter((task: any) => task.meetingId === id);
        setTasksFromMeeting(meetingTasks);
      }

      toast({
        title: 'Success',
        description: 'Suggestion approved and task created',
      });

      setApprovingSuggestion(null);
      setApprovalForm({ title: '', description: '', projectId: '', priority: 'medium', assignedTo: '', dueDate: '' });
    } catch (error) {
      console.error('Error approving suggestion:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to approve suggestion',
        variant: 'destructive',
      });
    }
  };

  const confirmReject = async () => {
    if (!rejectingSuggestion || !rejectionReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for rejection',
        variant: 'destructive',
      });
      return;
    }

    try {
      await rejectSuggestion(rejectingSuggestion.id, rejectionReason);
      
      // Reload suggestions
      if (id) {
        const updatedSuggestions = await getMeetingSuggestions(id);
        setSuggestions(updatedSuggestions);
      }

      toast({
        title: 'Success',
        description: 'Suggestion rejected',
      });

      setRejectingSuggestion(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reject suggestion',
        variant: 'destructive',
      });
    }
  };

  const confirmEditAndApprove = async () => {
    if (!editingSuggestion) return;

    try {
      const modifications: Partial<TaskCreateData> = {
        title: approvalForm.title,
        description: approvalForm.description,
        projectId: approvalForm.projectId || undefined,
        priority: approvalForm.priority,
        assignedTo: approvalForm.assignedTo || currentUser?.id || '',
        dueDate: approvalForm.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      await approveSuggestion(editingSuggestion.id, modifications);
      
      // Reload suggestions and tasks
      if (id) {
        const [updatedSuggestions, allTasks] = await Promise.all([
          getMeetingSuggestions(id),
          apiClient.getTasks()
        ]);
        setSuggestions(updatedSuggestions);
        // Filter tasks by meetingId
        const meetingTasks = allTasks.filter((task: any) => task.meetingId === id);
        setTasksFromMeeting(meetingTasks);
      }

      toast({
        title: 'Success',
        description: 'Suggestion edited and task created',
      });

      setEditingSuggestion(null);
      setApprovalForm({ title: '', description: '', projectId: '', priority: 'medium', assignedTo: '', dueDate: '' });
    } catch (error) {
      console.error('Error editing and approving suggestion:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to approve suggestion',
        variant: 'destructive',
      });
    }
  };

  const project = meeting?.projectId ? projects.find(p => p.id === meeting.projectId) : null;
  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');
  const approvedSuggestions = suggestions.filter(s => s.status === 'approved');
  const rejectedSuggestions = suggestions.filter(s => s.status === 'rejected');

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading meeting...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !meeting) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Meeting Not Found</h3>
                <p className="text-muted-foreground mb-4">The meeting you're looking for doesn't exist.</p>
                <Button onClick={() => navigate('/meetings')}>Back to Meetings</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/meetings')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Meetings
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{meeting.title}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(meeting.meetingDate), 'MMMM dd, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{format(new Date(meeting.createdAt), 'MMM dd, yyyy h:mm a')}</span>
            </div>
            {project && (
              <div className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4" />
                <Button
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  {project.name}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Meeting Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Meeting Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-muted-foreground">
                  {meeting.notes}
                </div>
              </CardContent>
            </Card>

            {/* AI Suggestions Summary */}
            <Card>
              <CardHeader>
                <CardTitle>AI Suggestions Summary</CardTitle>
                <CardDescription>
                  {suggestions.length} total suggestions from this meeting
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-400">{pendingSuggestions.length}</div>
                    <div className="text-sm text-muted-foreground">Pending</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{approvedSuggestions.length}</div>
                    <div className="text-sm text-muted-foreground">Approved</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{rejectedSuggestions.length}</div>
                    <div className="text-sm text-muted-foreground">Rejected</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tasks Created from This Meeting */}
            {tasksFromMeeting.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Tasks Created from This Meeting</CardTitle>
                  <CardDescription>
                    {tasksFromMeeting.length} task{tasksFromMeeting.length !== 1 ? 's' : ''} created from approved suggestions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {tasksFromMeeting.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border cursor-pointer hover:bg-gray-100"
                        onClick={() => navigate(`/tasks/${task.id}`)}
                      >
                        <div className="flex-1">
                          <div className="font-medium">{task.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {task.status} • {task.priority} priority
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/tasks/${task.id}`);
                        }}>
                          View Task
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* All Suggestions with Tabs */}
            {suggestions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>All Suggestions</CardTitle>
                  <CardDescription>
                    Review all task suggestions generated from this meeting
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="pending" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="pending">
                        Pending ({pendingSuggestions.length})
                      </TabsTrigger>
                      <TabsTrigger value="approved">
                        Approved ({approvedSuggestions.length})
                      </TabsTrigger>
                      <TabsTrigger value="rejected">
                        Rejected ({rejectedSuggestions.length})
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="pending" className="space-y-4 mt-4">
                      {pendingSuggestions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>No pending suggestions</p>
                            </div>
                      ) : (
                        pendingSuggestions.map((suggestion) => (
                          <SuggestionCard 
                            key={suggestion.id} 
                            suggestion={suggestion}
                            onApprove={handleApproveClick}
                            onReject={handleRejectClick}
                            onEdit={handleEditClick}
                          />
                        ))
                      )}
                    </TabsContent>
                    <TabsContent value="approved" className="space-y-4 mt-4">
                      {approvedSuggestions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>No approved suggestions</p>
                            </div>
                      ) : (
                        approvedSuggestions.map((suggestion) => (
                          <SuggestionCard 
                            key={suggestion.id} 
                            suggestion={suggestion}
                            onApprove={handleApproveClick}
                            onReject={handleRejectClick}
                            onEdit={handleEditClick}
                          />
                        ))
                      )}
                    </TabsContent>
                    <TabsContent value="rejected" className="space-y-4 mt-4">
                      {rejectedSuggestions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>No rejected suggestions</p>
                        </div>
                      ) : (
                        rejectedSuggestions.map((suggestion) => (
                          <SuggestionCard 
                            key={suggestion.id} 
                            suggestion={suggestion}
                            onApprove={handleApproveClick}
                            onReject={handleRejectClick}
                            onEdit={handleEditClick}
                          />
                        ))
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="default"
                  className="w-full justify-start bg-blue-600 hover:bg-blue-700"
                  onClick={handleReprocessMeeting}
                  disabled={isReprocessingMeeting || isReprocessing}
                >
                  {isReprocessingMeeting || isReprocessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Reprocessing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Reprocess with AI
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate('/meeting-processor')}
                >
                  Process New Meeting
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate('/meetings')}
                >
                  View All Meetings
                </Button>
                {project && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    View Project
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Meeting Info */}
            <Card>
              <CardHeader>
                <CardTitle>Meeting Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Meeting Date</div>
                  <div className="text-sm">
                    {format(new Date(meeting.meetingDate), 'MMMM dd, yyyy')}
                  </div>
                </div>
                <Separator />
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Created</div>
                  <div className="text-sm">
                    {format(new Date(meeting.createdAt), 'MMM dd, yyyy h:mm a')}
                  </div>
                </div>
                {project && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Project</div>
                      <Button
                        variant="link"
                        className="p-0 h-auto"
                        onClick={() => navigate(`/projects/${project.id}`)}
                      >
                        {project.name}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Approve Suggestion Dialog */}
        <Dialog open={!!approvingSuggestion} onOpenChange={(open) => !open && setApprovingSuggestion(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Approve Suggestion</DialogTitle>
              <DialogDescription>
                Review and customize the task details before creating it
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="approve-title">Task Title</Label>
                <Input
                  id="approve-title"
                  value={approvalForm.title}
                  onChange={(e) => setApprovalForm({ ...approvalForm, title: e.target.value })}
                  placeholder="Enter task title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="approve-description">Description</Label>
                <Textarea
                  id="approve-description"
                  value={approvalForm.description}
                  onChange={(e) => setApprovalForm({ ...approvalForm, description: e.target.value })}
                  placeholder="Enter task description"
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="approve-project">Project (Optional)</Label>
                  <Select
                    value={approvalForm.projectId || 'none'}
                    onValueChange={(value) => setApprovalForm({ ...approvalForm, projectId: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Project</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="approve-priority">Priority</Label>
                  <Select
                    value={approvalForm.priority}
                    onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => 
                      setApprovalForm({ ...approvalForm, priority: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="approve-assignee">Assignee</Label>
                  <Select
                    value={approvalForm.assignedTo || 'none'}
                    onValueChange={(value) => setApprovalForm({ ...approvalForm, assignedTo: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.length > 0 ? (
                        availableUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.firstName} {u.lastName} ({u.email})
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
                <div className="space-y-2">
                  <Label htmlFor="approve-due-date">Due Date</Label>
                  <Input
                    id="approve-due-date"
                    type="date"
                    value={approvalForm.dueDate}
                    onChange={(e) => setApprovalForm({ ...approvalForm, dueDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setApprovingSuggestion(null)}>
                Cancel
              </Button>
              <Button onClick={confirmApprove} className="bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Create Task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit and Approve Dialog */}
        <Dialog open={!!editingSuggestion} onOpenChange={(open) => !open && setEditingSuggestion(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit and Approve Suggestion</DialogTitle>
              <DialogDescription>
                Modify the suggestion before creating the task
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Task Title</Label>
                <Input
                  id="edit-title"
                  value={approvalForm.title}
                  onChange={(e) => setApprovalForm({ ...approvalForm, title: e.target.value })}
                  placeholder="Enter task title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={approvalForm.description}
                  onChange={(e) => setApprovalForm({ ...approvalForm, description: e.target.value })}
                  placeholder="Enter task description"
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-project">Project (Optional)</Label>
                  <Select
                    value={approvalForm.projectId || 'none'}
                    onValueChange={(value) => setApprovalForm({ ...approvalForm, projectId: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Project</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-priority">Priority</Label>
                  <Select
                    value={approvalForm.priority}
                    onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => 
                      setApprovalForm({ ...approvalForm, priority: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-assignee">Assignee</Label>
                  <Select
                    value={approvalForm.assignedTo || 'none'}
                    onValueChange={(value) => setApprovalForm({ ...approvalForm, assignedTo: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.length > 0 ? (
                        availableUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.firstName} {u.lastName} ({u.email})
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
                <div className="space-y-2">
                  <Label htmlFor="edit-due-date">Due Date</Label>
                  <Input
                    id="edit-due-date"
                    type="date"
                    value={approvalForm.dueDate}
                    onChange={(e) => setApprovalForm({ ...approvalForm, dueDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingSuggestion(null)}>
                Cancel
              </Button>
              <Button onClick={confirmEditAndApprove} className="bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Save & Create Task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Suggestion Dialog */}
        <Dialog open={!!rejectingSuggestion} onOpenChange={(open) => !open && setRejectingSuggestion(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Suggestion</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this suggestion
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {rejectingSuggestion && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium mb-1">Suggestion:</p>
                  <p className="text-sm text-muted-foreground">{rejectingSuggestion.suggestedTask}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="reject-reason">Rejection Reason</Label>
                <Textarea
                  id="reject-reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this suggestion is being rejected..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectingSuggestion(null)}>
                Cancel
              </Button>
              <Button 
                onClick={confirmReject} 
                variant="destructive"
                disabled={!rejectionReason.trim()}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

// Suggestion Card Component - uses handlers from parent
function SuggestionCard({ 
  suggestion, 
  onApprove, 
  onReject, 
  onEdit 
}: { 
  suggestion: AISuggestion;
  onApprove: (s: AISuggestion) => void;
  onReject: (s: AISuggestion) => void;
  onEdit: (s: AISuggestion) => void;
}) {
  const getStatusIcon = (status: AISuggestion['status']) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Circle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: AISuggestion['status']) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <Card 
      className={`border-2 transition-all hover:shadow-md ${
        suggestion.status === 'approved' 
          ? 'border-green-200 bg-green-50/30' 
          : suggestion.status === 'rejected'
          ? 'border-red-200 bg-red-50/30'
          : 'border-yellow-200 bg-yellow-50/30 cursor-pointer hover:border-yellow-300'
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusIcon(suggestion.status)}
              <h4 className="font-semibold">{suggestion.suggestedTask}</h4>
              <Badge 
                variant={getStatusColor(suggestion.status)}
                className={
                  suggestion.status === 'approved' 
                    ? 'bg-green-600 text-white'
                    : suggestion.status === 'rejected'
                    ? 'bg-red-600 text-white'
                    : 'bg-yellow-500 text-white'
                }
              >
                {suggestion.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {suggestion.suggestedDescription || suggestion.originalText}
            </p>
            {suggestion.suggestedDescription && (
              <p className="text-xs text-muted-foreground italic mt-1">
                Source: "{suggestion.originalText}"
              </p>
            )}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Confidence: {(suggestion.confidenceScore * 100).toFixed(0)}%</span>
              {suggestion.reviewedAt && (
                <span>
                  Reviewed: {format(new Date(suggestion.reviewedAt), 'MMM dd, yyyy')}
                </span>
              )}
            </div>
            {suggestion.rejectionReason && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                <strong>Rejection Reason:</strong> {suggestion.rejectionReason}
              </div>
            )}
          </div>
          {suggestion.status === 'pending' && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(suggestion)}
                title="Edit and approve"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReject(suggestion)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                title="Reject suggestion"
              >
                <XCircle className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => onApprove(suggestion)}
                className="bg-green-600 hover:bg-green-700"
                title="Approve suggestion"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Approve
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

