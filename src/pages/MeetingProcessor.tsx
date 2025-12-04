import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/components/AppLayout';
import { useToast } from '@/components/ui/use-toast';
import { useAISuggestions } from '@/hooks/useAISuggestions';
import { useProjects } from '@/hooks/useProjects';
import { useMeetings } from '@/hooks/useMeetings';
import { AISuggestion, Meeting } from '@/types';

export default function MeetingProcessor() {
  const navigate = useNavigate();
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [approvingSuggestionId, setApprovingSuggestionId] = useState<string | null>(null);
  const [selectedProjectForApproval, setSelectedProjectForApproval] = useState<string>('');
  const [currentMeetingId, setCurrentMeetingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { suggestions, isLoading, error, processMeeting, approveSuggestion, rejectSuggestion } = useAISuggestions();
  const { projects, fetchProjects } = useProjects();
  const { createMeeting } = useMeetings();
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchProjects();
        // Don't fetch all suggestions on mount - only show suggestions for the meeting being processed
      } catch (err) {
        console.error('Error loading data:', err);
        // Don't show error toast here as it might be a database connection issue
        // The component should still render
      }
    };
    loadData();
  }, [fetchProjects]);

  const handleSaveMeeting = async () => {
    if (!meetingNotes.trim() || !meetingTitle.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter meeting title and meeting notes',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const meeting = await createMeeting({
        title: meetingTitle,
        notes: meetingNotes,
        projectId: selectedProjectId || undefined,
        meetingDate: meetingDate,
      });
      
      setCurrentMeetingId(meeting.id);
      
      toast({
        title: 'Meeting Saved',
        description: 'Your meeting notes have been saved successfully.',
      });
    } catch (err) {
      console.error('Failed to save meeting:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      toast({
        title: 'Error Saving Meeting',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleProcessMeeting = async () => {
    if (!meetingNotes.trim() || !meetingTitle.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter meeting title and meeting notes',
        variant: 'destructive',
      });
      return;
    }

    // If meeting hasn't been saved yet, save it first
    let meetingId = currentMeetingId;
    if (!meetingId) {
      try {
        const meeting = await createMeeting({
          title: meetingTitle,
          notes: meetingNotes,
          projectId: selectedProjectId || undefined,
          meetingDate: meetingDate,
        });
        meetingId = meeting.id;
        setCurrentMeetingId(meeting.id);
        
        toast({
          title: 'Meeting Saved',
          description: 'Meeting saved. Processing with AI...',
        });
      } catch (err) {
        console.error('Failed to save meeting:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        
        toast({
          title: 'Error Saving Meeting',
          description: errorMessage,
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      const newSuggestions = await processMeeting({
        title: meetingTitle,
        notes: meetingNotes,
        projectId: selectedProjectId || undefined,
        meetingDate: meetingDate,
        meetingId: meetingId, // Use existing meeting ID
      });
      
      toast({
        title: 'Success',
        description: 'Meeting processed successfully. Review the AI suggestions below.',
      });
    } catch (err) {
      console.error('Failed to process meeting:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      const detailedMessage = errorMessage.includes('API') 
        ? `${errorMessage}. Make sure VITE_AI_API_KEY and VITE_AI_API_URL are set in your environment variables.`
        : errorMessage;
      
      toast({
        title: 'Error Processing Meeting',
        description: detailedMessage,
        variant: 'destructive',
      });
    }
  };

  const handleApproveSuggestion = async (suggestion: AISuggestion) => {
    // Show project selection dialog
    setApprovingSuggestionId(suggestion.id);
    setSelectedProjectForApproval('');
  };

  const confirmApproveSuggestion = async () => {
    if (!approvingSuggestionId) return;

    try {
      await approveSuggestion(approvingSuggestionId, {
        projectId: selectedProjectForApproval || undefined,
      });
      toast({
        title: 'Success',
        description: 'Suggestion approved and task created',
      });
      setApprovingSuggestionId(null);
      setSelectedProjectForApproval('');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to approve suggestion',
        variant: 'destructive',
      });
    }
  };

  const handleRejectSuggestion = async (suggestion: AISuggestion) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      await rejectSuggestion(suggestion.id, reason);
      toast({
        title: 'Success',
        description: 'Suggestion rejected',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reject suggestion',
        variant: 'destructive',
      });
    }
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Process Meeting Notes</h1>
            <p className="text-gray-600">Generate actionable tasks from meeting notes using AI</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/meetings')}>
            View Past Meetings
          </Button>
        </div>
        <Card>
        <CardHeader>
          <CardTitle>Process Meeting Notes</CardTitle>
          <CardDescription>
            Enter your meeting notes and let AI generate actionable tasks and suggestions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Meeting Title</Label>
            <Input
              id="title"
              type="text"
              placeholder="Enter meeting title"
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project">Project (Optional)</Label>
            <Select value={selectedProjectId || "none"} onValueChange={(value) => setSelectedProjectId(value === "none" ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Project</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              You can assign tasks to projects when approving suggestions
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Meeting Date</Label>
            <Input
              id="date"
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Meeting Notes</Label>
            <Textarea
              id="notes"
              placeholder="Paste your meeting notes here..."
              value={meetingNotes}
              onChange={(e) => setMeetingNotes(e.target.value)}
              rows={8}
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleSaveMeeting} 
              disabled={isSaving || isLoading}
              variant="outline"
            >
              {isSaving ? 'Saving...' : 'Save Meeting'}
            </Button>
            <Button 
              onClick={handleProcessMeeting} 
              disabled={isLoading || isSaving}
            >
              {isLoading ? 'Processing...' : 'Process Meeting Notes'}
            </Button>
            {(meetingTitle || meetingNotes || currentMeetingId) && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setMeetingTitle('');
                  setMeetingNotes('');
                  setMeetingDate(new Date().toISOString().split('T')[0]);
                  setSelectedProjectId('');
                  setCurrentMeetingId(null);
                }}
              >
                Clear & Start New
              </Button>
            )}
          </div>
          {currentMeetingId && (
            <p className="text-xs text-muted-foreground">
              ✓ Meeting saved. You can process it with AI or edit and save again.
            </p>
          )}
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-destructive text-sm">{error}</div>
          </CardContent>
        </Card>
      )}

      {suggestions.filter(s => currentMeetingId ? s.meetingId === currentMeetingId : true).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>AI Suggestions</CardTitle>
            <CardDescription>
              Review and approve the generated tasks and actions for this meeting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {suggestions
              .filter(s => currentMeetingId ? s.meetingId === currentMeetingId : true)
              .map((suggestion) => (
              <Card key={suggestion.id} className="border">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <h4 className="font-semibold">{suggestion.suggestedTask}</h4>
                      <p className="text-sm text-muted-foreground">
                        {suggestion.suggestedDescription || suggestion.originalText}
                      </p>
                      {suggestion.suggestedDescription && (
                        <p className="text-xs text-muted-foreground italic mt-1">
                          Source: "{suggestion.originalText}"
                        </p>
                      )}
                      <div className="flex items-center space-x-4 text-sm">
                        <span>Confidence: {(suggestion.confidenceScore * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRejectSuggestion(suggestion)}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApproveSuggestion(suggestion)}
                      >
                        Approve
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Project Selection Dialog for Approval */}
      {approvingSuggestionId && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle>Assign Task to Project</CardTitle>
            <CardDescription>
              Select a project for this task, or leave empty to create without a project
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Project (Optional)</Label>
              <Select value={selectedProjectForApproval || "none"} onValueChange={(value) => setSelectedProjectForApproval(value === "none" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Project</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setApprovingSuggestionId(null);
                  setSelectedProjectForApproval('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={confirmApproveSuggestion}>
                Create Task
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </AppLayout>
  );
}