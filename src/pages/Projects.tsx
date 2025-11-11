import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import AppLayout from '@/components/AppLayout';
import { useToast } from '@/components/ui/use-toast';
import { useProjects } from '@/hooks/useProjects';
import { Plus, Search, Calendar, Users, Tag as TagIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tag } from '@/types';

export default function Projects() {
  const navigate = useNavigate();
  const { projects, fetchProjects, createProject, isLoading, error } = useProjects();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    purpose: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    selectedTags: [] as string[],
  });
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [projectTags, setProjectTags] = useState<Record<string, Tag[]>>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await fetchProjects();
    await loadTags();
    await loadProjectTags();
  };

  const loadTags = async () => {
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name');
      if (error) throw error;
      setAvailableTags(data || []);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const loadProjectTags = async () => {
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('project_tags')
        .select('projectId, tagId, tags(*)');
      if (error) throw error;
      
      const tagsByProject: Record<string, Tag[]> = {};
      (data || []).forEach((pt: any) => {
        if (!tagsByProject[pt.projectId]) {
          tagsByProject[pt.projectId] = [];
        }
        if (pt.tags) {
          tagsByProject[pt.projectId].push(pt.tags);
        }
      });
      setProjectTags(tagsByProject);
    } catch (error) {
      console.error('Error loading project tags:', error);
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const project = await createProject({
        name: newProject.name,
        description: newProject.description,
        startDate: newProject.startDate,
        endDate: newProject.endDate,
      });

      // Add purpose if provided
      if (newProject.purpose) {
        const { supabase } = await import('@/lib/supabase');
        await supabase
          .from('projects')
          .update({ purpose: newProject.purpose })
          .eq('id', project.id);
      }

      // Add tags to project
      if (newProject.selectedTags.length > 0) {
        const { supabase } = await import('@/lib/supabase');
        const tagInserts = newProject.selectedTags.map(tagId => ({
          projectId: project.id,
          tagId,
        }));
        await supabase.from('project_tags').insert(tagInserts);
        await loadProjectTags();
      }

      setNewProject({
        name: '',
        description: '',
        purpose: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        selectedTags: [],
      });
      setIsDialogOpen(false);
      // Refresh projects list
      await fetchProjects();
      toast({
        title: 'Success',
        description: 'Project created successfully',
      });
    } catch (error) {
      console.error('Failed to create project:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create project';
      
      // Check if it's a database error
      let userMessage = errorMessage;
      if (errorMessage.includes('relation') || errorMessage.includes('does not exist')) {
        userMessage = 'Database tables not found. Please run the SQL migration in Supabase. See SETUP_GUIDE.md for instructions.';
      } else if (errorMessage.includes('permission denied') || errorMessage.includes('RLS')) {
        userMessage = 'Permission denied. Please check your Row Level Security policies in Supabase.';
      }
      
      toast({
        title: 'Error',
        description: userMessage,
        variant: 'destructive',
      });
    }
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
            <p className="text-gray-600">Manage your projects and collaborate with your team</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>Enter project details to create a new project</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Project Name</label>
                  <Input
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    placeholder="Enter project name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    placeholder="Enter project description"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purpose">Purpose</Label>
                  <Textarea
                    id="purpose"
                    value={newProject.purpose}
                    onChange={(e) => setNewProject({ ...newProject, purpose: e.target.value })}
                    placeholder="What is the purpose of this project?"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    type="date"
                    value={newProject.startDate}
                    onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={newProject.endDate}
                    onChange={(e) => setNewProject({ ...newProject, endDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map(tag => (
                      <Button
                        key={tag.id}
                        type="button"
                        variant={newProject.selectedTags.includes(tag.id) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          if (newProject.selectedTags.includes(tag.id)) {
                            setNewProject({
                              ...newProject,
                              selectedTags: newProject.selectedTags.filter(id => id !== tag.id),
                            });
                          } else {
                            setNewProject({
                              ...newProject,
                              selectedTags: [...newProject.selectedTags, tag.id],
                            });
                          }
                        }}
                        style={newProject.selectedTags.includes(tag.id) ? { backgroundColor: tag.color, borderColor: tag.color } : {}}
                      >
                        <TagIcon className="h-3 w-3 mr-1" />
                        {tag.name}
                      </Button>
                    ))}
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create Project'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Projects Grid */}
        {filteredProjects.length === 0 && !isLoading ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2 text-gray-900">No projects yet</h3>
                <p className="text-gray-500 mb-4">Create your first project to get started</p>
                <Button onClick={() => setIsDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => {
              const endDate = new Date(project.endDate);
              const daysUntilDeadline = Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              const isApproachingDeadline = daysUntilDeadline <= 7 && daysUntilDeadline > 0;
              const currentProjectTags = projectTags[project.id] || [];
              
              return (
                <Card 
                  key={project.id} 
                  className={`hover:shadow-lg transition-all cursor-pointer border-0 shadow-sm ${
                    isApproachingDeadline ? 'border-orange-200 bg-orange-50/30' : ''
                  }`}
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{project.name}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {project.description || 'No description'}
                        </CardDescription>
                        {currentProjectTags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {currentProjectTags.map(tag => (
                              <Badge key={tag.id} variant="outline" className="text-xs" style={{ borderColor: tag.color, color: tag.color }}>
                                <TagIcon className="h-2 w-2 mr-1" />
                                {tag.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>Ends {new Date(project.endDate).toLocaleDateString()}</span>
                        </div>
                        {isApproachingDeadline && (
                          <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-300">
                            {daysUntilDeadline} days left
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Users className="h-4 w-4" />
                        <span>Team project</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}