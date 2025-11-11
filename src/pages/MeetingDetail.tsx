import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/components/AppLayout';
import { useMeetings } from '@/hooks/useMeetings';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useToast } from '@/components/ui/use-toast';
import { Meeting, AISuggestion, Task } from '@/types';
import { 
  Calendar, 
  Clock, 
  ArrowLeft, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Circle,
  FolderKanban,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

export default function MeetingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getMeeting, getMeetingSuggestions, isLoading, error } = useMeetings();
  const { projects, fetchProjects } = useProjects();
  const { tasks, fetchTasks } = useTasks();
  const { toast } = useToast();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [tasksFromMeeting, setTasksFromMeeting] = useState<Task[]>([]);

  useEffect(() => {
    if (id) {
      loadMeetingData();
      fetchProjects();
      fetchTasks();
    }
  }, [id]);

  const loadMeetingData = async () => {
    if (!id) return;
    try {
      const meetingData = await getMeeting(id);
      if (meetingData) {
        setMeeting(meetingData);
        const suggestionsData = await getMeetingSuggestions(id);
        setSuggestions(suggestionsData);
        
        // Find tasks that were created from approved suggestions
        const approvedSuggestionIds = suggestionsData
          .filter(s => s.status === 'approved')
          .map(s => s.id);
        
        // Note: We'd need to track which tasks came from which suggestions
        // For now, we'll show all tasks that might be related
        // In a real implementation, you'd have a taskSuggestionId field
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to load meeting details',
        variant: 'destructive',
      });
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

            {/* All Suggestions */}
            {suggestions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>All Suggestions</CardTitle>
                  <CardDescription>
                    Review all task suggestions generated from this meeting
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {suggestions.map((suggestion) => (
                    <Card key={suggestion.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(suggestion.status)}
                              <h4 className="font-semibold">{suggestion.suggestedTask}</h4>
                              <Badge variant={getStatusColor(suggestion.status)}>
                                {suggestion.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {suggestion.originalText}
                            </p>
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
                        </div>
                      </CardContent>
                    </Card>
                  ))}
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
      </div>
    </AppLayout>
  );
}

