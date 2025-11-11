import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/components/AppLayout';
import { useMeetings } from '@/hooks/useMeetings';
import { useProjects } from '@/hooks/useProjects';
import { useToast } from '@/components/ui/use-toast';
import { Meeting } from '@/types';
import { Calendar, Search, FileText, Clock, FolderKanban } from 'lucide-react';
import { format } from 'date-fns';

export default function Meetings() {
  const navigate = useNavigate();
  const { meetings, fetchMeetings, isLoading, error } = useMeetings();
  const { projects, fetchProjects } = useProjects();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchMeetings();
        await fetchProjects();
      } catch (err) {
        console.error('Error loading data:', err);
      }
    };
    loadData();
  }, [fetchMeetings, fetchProjects]);

  const filteredMeetings = meetings.filter(meeting => {
    const searchLower = searchTerm.toLowerCase();
    return (
      meeting.title.toLowerCase().includes(searchLower) ||
      meeting.notes.toLowerCase().includes(searchLower)
    );
  });

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return null;
    const project = projects.find(p => p.id === projectId);
    return project?.name || null;
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Meeting History</h1>
              <p className="text-gray-600">View past meetings and their generated tasks</p>
            </div>
            <Button onClick={() => navigate('/meeting-processor')}>
              Process New Meeting
            </Button>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search meetings by title or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <div className="text-destructive text-sm">{error}</div>
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading meetings...</p>
          </div>
        )}

        {!isLoading && !error && (
          <>
            {filteredMeetings.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">
                      {searchTerm ? 'No meetings found' : 'No meetings yet'}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm
                        ? 'Try adjusting your search terms'
                        : 'Process your first meeting to get started'}
                    </p>
                    {!searchTerm && (
                      <Button onClick={() => navigate('/meeting-processor')}>
                        Process New Meeting
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMeetings.map((meeting) => {
                  const projectName = getProjectName(meeting.projectId);
                  return (
                    <Card
                      key={meeting.id}
                      className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => navigate(`/meetings/${meeting.id}`)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg line-clamp-2">{meeting.title}</CardTitle>
                        </div>
                        <CardDescription>
                          <div className="flex items-center gap-2 mt-2">
                            <Calendar className="h-4 w-4" />
                            <span>{format(new Date(meeting.meetingDate), 'MMM dd, yyyy')}</span>
                          </div>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {projectName && (
                            <div className="flex items-center gap-2">
                              <FolderKanban className="h-4 w-4 text-muted-foreground" />
                              <Badge variant="outline">{projectName}</Badge>
                            </div>
                          )}
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {meeting.notes}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>
                              {format(new Date(meeting.createdAt), 'MMM dd, yyyy h:mm a')}
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/meetings/${meeting.id}`);
                            }}
                          >
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

