import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { 
  Users, 
  Building2, 
  UsersRound, 
  Shield, 
  Tag as TagIcon,
  Plus,
  Edit,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { User, Department, Team, AllowedDomain, Tag } from '@/types';
import { adminService } from '@/lib/admin-service';
import { RefreshCw, Settings, AlertCircle } from 'lucide-react';

export default function Admin() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('users');
  const [isRefreshingRole, setIsRefreshingRole] = useState(false);

  // Check if user is admin or manager
  useEffect(() => {
    if (user && user.role !== 'admin' && user.role !== 'manager') {
      toast({
        title: 'Access Denied',
        description: 'You need admin or manager privileges to access this page.',
        variant: 'destructive',
      });
    }
  }, [user, toast]);

  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
                <p className="text-muted-foreground">You need admin privileges to access this page.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-600">Manage users, teams, departments, and system settings</p>
          {user && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm">
                <strong>Current User:</strong> {user.firstName} {user.lastName} ({user.email})
              </p>
              <p className="text-sm">
                <strong>Detected Role:</strong> <span className={`font-bold ${user.role === 'admin' ? 'text-green-600' : user.role === 'manager' ? 'text-blue-600' : 'text-gray-600'}`}>{user.role || 'member'}</span>
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    setIsRefreshingRole(true);
                    try {
                      // Try to get role directly from database using RPC
                      const { data: roleData, error: rpcError } = await supabase.rpc('get_current_user_role');
                      if (!rpcError && roleData) {
                        await refreshUser();
                        toast({
                          title: 'Success',
                          description: `Role refreshed: ${roleData}. Refreshing page...`,
                        });
                        setTimeout(() => window.location.reload(), 1000);
                      } else {
                        await refreshUser();
                        toast({
                          title: 'Info',
                          description: 'Role refreshed. If you recently became an admin, refresh the page.',
                        });
                      }
                    } catch (error) {
                      console.error('Error refreshing role:', error);
                      await refreshUser();
                      toast({
                        title: 'Warning',
                        description: 'Could not refresh role via RPC. Trying fallback method...',
                        variant: 'default',
                      });
                    } finally {
                      setIsRefreshingRole(false);
                    }
                  }}
                  disabled={isRefreshingRole}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshingRole ? 'animate-spin' : ''}`} />
                  Refresh Role
                </Button>
              </div>
              {user.role !== 'admin' && user.role !== 'manager' && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-xs text-yellow-800">
                    <strong>⚠️ Access Issue:</strong> Your role is "{user.role}". To access User Management, you need to be an "admin" or "manager".
                    <br />
                    <br />
                    <strong>To fix this:</strong>
                    <br />
                    1. Make sure your role in the `users` table is exactly 'admin' (lowercase, no quotes in SQL)
                    <br />
                    2. Click the "Refresh Role" button above
                    <br />
                    3. If that doesn't work, go to Settings → Security → Click "Refresh Role from Database"
                    <br />
                    4. Refresh the page (F5 or Ctrl+R)
                    <br />
                    <br />
                    <strong>SQL to check your role:</strong>
                    <br />
                    <code className="text-xs bg-gray-100 p-1 rounded">SELECT id, email, role FROM users WHERE email = 'your-email@example.com';</code>
                    <br />
                    <br />
                    <strong>SQL to set yourself as admin:</strong>
                    <br />
                    <code className="text-xs bg-gray-100 p-1 rounded">UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';</code>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="users" className="font-semibold">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="teams">
              <UsersRound className="h-4 w-4 mr-2" />
              Teams
            </TabsTrigger>
            <TabsTrigger value="departments">
              <Building2 className="h-4 w-4 mr-2" />
              Departments
            </TabsTrigger>
            <TabsTrigger value="domains">
              <Shield className="h-4 w-4 mr-2" />
              Allowed Domains
            </TabsTrigger>
            <TabsTrigger value="tags">
              <TagIcon className="h-4 w-4 mr-2" />
              Tags
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <UsersManagement />
          </TabsContent>

          <TabsContent value="teams" className="space-y-4">
            <TeamsManagement />
          </TabsContent>

          <TabsContent value="departments" className="space-y-4">
            <DepartmentsManagement />
          </TabsContent>

          <TabsContent value="domains" className="space-y-4">
            <AllowedDomainsManagement />
          </TabsContent>

          <TabsContent value="tags" className="space-y-4">
            <TagsManagement />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <SettingsManagement />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

// Users Management Component
function UsersManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'member' as User['role'],
    isActive: true,
    teamId: '',
    departmentId: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Use Promise.allSettled to prevent one failure from blocking others
      const [usersResult, teamsResult, departmentsResult] = await Promise.allSettled([
        adminService.getUsers(),
        adminService.getTeams(),
        adminService.getDepartments(),
      ]);

      if (usersResult.status === 'fulfilled') {
        setUsers(usersResult.value);
        if (usersResult.value.length === 0) {
          toast({
            title: 'Info',
            description: 'No users found. Click "Sync from Auth" to sync users from authentication.',
            variant: 'default',
          });
        }
      } else {
        console.error('Error loading users:', usersResult.reason);
        setUsers([]);
        const errorMsg = usersResult.reason instanceof Error ? usersResult.reason.message : String(usersResult.reason);
        if (errorMsg.includes('does not exist') || errorMsg.includes('42P01') || errorMsg.includes('PGRST202') || errorMsg.includes('NOT_FOUND')) {
          toast({
            title: 'Migration Required',
            description: 'Users table does not exist. Please run the database migrations first.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Warning',
            description: 'Could not load users. You may need to sync from authentication first.',
            variant: 'default',
          });
        }
      }

      if (teamsResult.status === 'fulfilled') {
        setTeams(teamsResult.value);
      } else {
        console.error('Error loading teams:', teamsResult.reason);
        setTeams([]);
      }

      if (departmentsResult.status === 'fulfilled') {
        setDepartments(departmentsResult.value);
      } else {
        console.error('Error loading departments:', departmentsResult.reason);
        setDepartments([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncUsers = async () => {
    try {
      await adminService.syncUsersFromAuth();
      await loadData();
      toast({
        title: 'Success',
        description: 'Users synced from authentication',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to sync users',
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingUser) {
        await adminService.updateUser(editingUser.id, {
          ...formData,
          teamId: formData.teamId || null,
          departmentId: formData.departmentId || null,
        });
      } else {
        // For new users, we need to create them in auth first
        // This is a simplified version - in production, you'd want proper user creation
        toast({
          title: 'Info',
          description: 'User creation requires authentication setup. Please use the registration page or sync existing users.',
          variant: 'default',
        });
        return;
      }
      toast({
        title: 'Success',
        description: editingUser ? 'User updated' : 'User created',
      });
      setIsDialogOpen(false);
      setEditingUser(null);
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save user',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Users</CardTitle>
            <CardDescription>Manage system users and their permissions</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSyncUsers}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync from Auth
            </Button>
            <Button onClick={() => { setEditingUser(null); setFormData({ email: '', firstName: '', lastName: '', role: 'member', isActive: true, teamId: '', departmentId: '' }); setIsDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  <div className="space-y-2">
                    <p>No users found in the users table.</p>
                    <p className="text-sm">Click "Sync from Auth" to sync users from authentication.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.firstName} {user.lastName}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>
                      {user.role || 'member'}
                    </Badge>
                  </TableCell>
                  <TableCell>{(user as any).teamId ? teams.find(t => t.id === (user as any).teamId)?.name || '-' : '-'}</TableCell>
                  <TableCell>{(user as any).departmentId ? departments.find(d => d.id === (user as any).departmentId)?.name || '-' : '-'}</TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'default' : 'secondary'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingUser(user);
                          setFormData({
                            email: user.email,
                            firstName: user.firstName,
                            lastName: user.lastName,
                            role: user.role || 'member',
                            isActive: user.isActive ?? true,
                            teamId: (user as any).teamId || '',
                            departmentId: (user as any).departmentId || '',
                          });
                          setIsDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingUser ? 'Edit User' : 'Add User'}</DialogTitle>
              <DialogDescription>
                {editingUser ? 'Update user information' : 'Create a new user account'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: User['role']) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="team">Team</Label>
                  <Select
                    value={formData.teamId}
                    onValueChange={(value) => setFormData({ ...formData, teamId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Team</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select
                  value={formData.departmentId}
                  onValueChange={(value) => setFormData({ ...formData, departmentId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Department</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// Teams Management Component (placeholder)
function TeamsManagement() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Teams</CardTitle>
        <CardDescription>Manage teams and team assignments</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Teams management coming soon...</p>
      </CardContent>
    </Card>
  );
}

// Departments Management Component (placeholder)
function DepartmentsManagement() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Departments</CardTitle>
        <CardDescription>Manage departments and organizational structure</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Departments management coming soon...</p>
      </CardContent>
    </Card>
  );
}

// Allowed Domains Management Component (placeholder)
function AllowedDomainsManagement() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Allowed Domains</CardTitle>
        <CardDescription>Configure which email domains are allowed for self signup</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Allowed domains management coming soon...</p>
      </CardContent>
    </Card>
  );
}

// Tags Management Component
function TagsManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#3b82f6',
    category: '',
    description: '',
  });

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getTags();
      setTags(data);
    } catch (error) {
      console.error('Error loading tags:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load tags',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Tag name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingTag) {
        await adminService.updateTag(editingTag.id, formData);
        toast({
          title: 'Success',
          description: 'Tag updated successfully',
        });
      } else {
        await adminService.createTag(formData);
        toast({
          title: 'Success',
          description: 'Tag created successfully',
        });
      }
      setIsDialogOpen(false);
      setEditingTag(null);
      setFormData({ name: '', color: '#3b82f6', category: '', description: '' });
      await loadTags();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save tag',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (tagId: string) => {
    if (!confirm('Are you sure you want to delete this tag? This will remove it from all tasks and projects.')) {
      return;
    }

    try {
      await adminService.deleteTag(tagId);
      toast({
        title: 'Success',
        description: 'Tag deleted successfully',
      });
      await loadTags();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete tag',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      color: tag.color || '#3b82f6',
      category: tag.category || '',
      description: tag.description || '',
    });
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setEditingTag(null);
    setFormData({ name: '', color: '#3b82f6', category: '', description: '' });
    setIsDialogOpen(true);
  };

  // Check if user is admin or manager
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground">You need manager or admin privileges to manage tags.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tags</CardTitle>
              <CardDescription>Manage tags for categorizing tasks and projects</CardDescription>
            </div>
            <Button onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              New Tag
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tags.length === 0 ? (
            <div className="text-center py-12">
              <TagIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No tags yet</h3>
              <p className="text-muted-foreground mb-4">Create your first tag to start categorizing tasks and projects</p>
              <Button onClick={handleNew}>
                <Plus className="h-4 w-4 mr-2" />
                Create Tag
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tags.map((tag) => (
                  <TableRow key={tag.id}>
                    <TableCell className="font-medium">{tag.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded border"
                          style={{ backgroundColor: tag.color || '#3b82f6' }}
                        />
                        <span className="text-sm text-muted-foreground">{tag.color || '#3b82f6'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{tag.category || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate">{tag.description || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(tag)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(tag.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Tag Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTag ? 'Edit Tag' : 'Create Tag'}</DialogTitle>
            <DialogDescription>
              {editingTag ? 'Update tag details' : 'Create a new tag for categorizing tasks and projects'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tag-name">Name *</Label>
              <Input
                id="tag-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Operations, Vendor Management"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tag-color">Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="tag-color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tag-category">Category</Label>
              <Input
                id="tag-category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., operations, vendor, internal_bu"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tag-description">Description</Label>
              <Textarea
                id="tag-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description for this tag"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingTag ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Settings Management Component
function SettingsManagement() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    aiApiKey: '',
    aiApiUrl: '',
    aiModel: 'deepseek-reasoner',
    supabaseUrl: '',
    supabaseAnonKey: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getSettings();
      setSettings({
        aiApiKey: data.aiApiKey || '',
        aiApiUrl: data.aiApiUrl || '',
        aiModel: data.aiModel || 'deepseek-reasoner',
        supabaseUrl: data.supabaseUrl || '',
        supabaseAnonKey: data.supabaseAnonKey || '',
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      // Settings might not exist yet, that's okay
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await adminService.updateSettings(settings);
      toast({
        title: 'Success',
        description: 'Settings saved successfully. Note: You may need to update environment variables in Vercel for these to take effect in production.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading settings...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Settings</CardTitle>
        <CardDescription>Manage API keys, models, and system configuration</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-4">AI Configuration</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="aiApiKey">AI API Key</Label>
                <Input
                  id="aiApiKey"
                  type="password"
                  value={settings.aiApiKey}
                  onChange={(e) => setSettings({ ...settings, aiApiKey: e.target.value })}
                  placeholder="Enter your AI API key"
                />
                <p className="text-xs text-muted-foreground">
                  Your DeepSeek or other AI provider API key
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="aiApiUrl">AI API URL</Label>
                <Input
                  id="aiApiUrl"
                  value={settings.aiApiUrl}
                  onChange={(e) => setSettings({ ...settings, aiApiUrl: e.target.value })}
                  placeholder="https://api.deepseek.com/v1/chat/completions"
                />
                <p className="text-xs text-muted-foreground">
                  The API endpoint URL for your AI provider
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="aiModel">AI Model</Label>
                <Select
                  value={settings.aiModel}
                  onValueChange={(value) => setSettings({ ...settings, aiModel: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deepseek-reasoner">DeepSeek Reasoner</SelectItem>
                    <SelectItem value="deepseek-chat">DeepSeek Chat</SelectItem>
                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  The AI model to use for processing
                </p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-4">Supabase Configuration</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="supabaseUrl">Supabase URL</Label>
                <Input
                  id="supabaseUrl"
                  value={settings.supabaseUrl}
                  onChange={(e) => setSettings({ ...settings, supabaseUrl: e.target.value })}
                  placeholder="https://your-project.supabase.co"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supabaseAnonKey">Supabase Anon Key</Label>
                <Input
                  id="supabaseAnonKey"
                  type="password"
                  value={settings.supabaseAnonKey}
                  onChange={(e) => setSettings({ ...settings, supabaseAnonKey: e.target.value })}
                  placeholder="Enter your Supabase anon key"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

