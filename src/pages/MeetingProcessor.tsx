import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Navigation from '@/components/Navigation';
import { useToast } from '@/components/ui/use-toast';
import { useAISuggestions } from '@/hooks/useAISuggestions';
import { useProjects } from '@/hooks/useProjects';
import { AISuggestion } from '@/types';

export default function MeetingProcessor() {
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const { suggestions, isLoading, error, processMeeting, fetchSuggestions, approveSuggestion, rejectSuggestion } = useAISuggestions();
  const { projects, fetchProjects } = useProjects();
  const { toast } = useToast();

  useEffect(() => {
    fetchProjects();
    fetchSuggestions();
  }, [fetchProjects, fetchSuggestions]);

  const handleProcessMeeting = async () => {
    if (!meetingNotes.trim() || !meetingTitle.trim() || !selectedProjectId) {
      alert('Please enter meeting title, select a project, and enter meeting notes');
      return;
    }

    try {
      await processMeeting({
        title: meetingTitle,
        notes: meetingNotes,
        projectId: selectedProjectId,
        meetingDate: meetingDate,
      });
    } catch (err) {
      console.error('Failed to process meeting:', err);
    }
  };

  const handleApproveSuggestion = async (suggestion: AISuggestion) => {
    try {
      await approveSuggestion(suggestion.id);
      toast({
        title: 'Success',
        description: 'Suggestion approved and task created',
      });
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
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto p-6 space-y-6">
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
            <input
              id="title"
              type="text"
              placeholder="Enter meeting title"
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              className="w-full p-2 border rounded-md"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project">Project</Label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Meeting Date</Label>
            <input
              id="date"
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              className="w-full p-2 border rounded-md"
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

          <Button onClick={handleProcessMeeting} disabled={isLoading}>
            {isLoading ? 'Processing...' : 'Process Meeting Notes'}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-destructive text-sm">{error}</div>
          </CardContent>
        </Card>
      )}

      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>AI Suggestions</CardTitle>
            <CardDescription>
              Review and approve the generated tasks and actions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {suggestions.map((suggestion) => (
              <Card key={suggestion.id} className="border">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <h4 className="font-semibold">{suggestion.suggestedTask}</h4>
                      <p className="text-sm text-muted-foreground">
                        {suggestion.originalText}
                      </p>
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
      </div>
    </div>
  );
}