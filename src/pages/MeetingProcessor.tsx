import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAISuggestions } from '@/hooks/useAISuggestions';
import { useProjects } from '@/hooks/useProjects';
import { AISuggestion } from '@/types';

export default function MeetingProcessor() {
  const [meetingNotes, setMeetingNotes] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const { suggestions, isLoading, error, processMeeting } = useAISuggestions();
  const { projects } = useProjects();

  const handleProcessMeeting = async () => {
    if (!meetingNotes.trim()) {
      alert('Please enter meeting notes');
      return;
    }

    try {
      await processMeeting({
        notes: meetingNotes,
        projectId: selectedProjectId || undefined
      });
    } catch (err) {
      console.error('Failed to process meeting:', err);
    }
  };

  const handleApproveSuggestion = (suggestion: AISuggestion) => {
    // This would be implemented with the actual approval logic
    console.log('Approving suggestion:', suggestion);
  };

  const handleRejectSuggestion = (suggestion: AISuggestion) => {
    // This would be implemented with the actual rejection logic
    console.log('Rejecting suggestion:', suggestion);
  };

  return (
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
            <Label htmlFor="project">Project (Optional)</Label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No project</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                      <h4 className="font-semibold">{suggestion.content}</h4>
                      <p className="text-sm text-muted-foreground">
                        {suggestion.description}
                      </p>
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="capitalize">{suggestion.priority} priority</span>
                        {suggestion.estimatedHours && (
                          <span>Estimated: {suggestion.estimatedHours}h</span>
                        )}
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
  );
}