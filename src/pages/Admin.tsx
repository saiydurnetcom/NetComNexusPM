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
import { apiClient } from '@/lib/api-client';
import { 
  Users, 
  Building2, 
  UsersRound, 
  Shield, 
  Tag as TagIcon,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  RefreshCw,
  Settings
} from 'lucide-react';
import { User, Department, Team, AllowedDomain, Tag } from '@/types';
import { adminService } from '@/lib/admin-service';

export default function Admin() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('users');
  const [isRefreshingRole, setIsRefreshingRole] = useState(false);

  // Normalize role to lowercase for comparison
  const userRole = user?.role?.toLowerCase();
  const isAdminOrManager = userRole === 'admin' || userRole === 'manager';

  // Check if user is admin or manager
  useEffect(() => {
    if (user && !isAdminOrManager) {
      toast({
        title: 'Access Denied',
        description: 'You need admin or manager privileges to access this page.',
        variant: 'destructive',
      });
    }
  }, [user, isAdminOrManager, toast]);

  if (!user || !isAdminOrManager) {
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
                <strong>Detected Role:</strong> <span className={`font-bold ${userRole === 'admin' ? 'text-green-600' : userRole === 'manager' ? 'text-blue-600' : 'text-gray-600'}`}>{user.role || 'member'}</span>
                {user.role && user.role !== user.role.toLowerCase() && (
                  <span className="text-xs text-orange-600 ml-2">(Note: Role is case-sensitive in database. Make sure it's lowercase 'admin')</span>
                )}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    setIsRefreshingRole(true);
                    try {
                      // Try to get role directly from database using API
                      const roleResponse = await apiClient.getCurrentUserRole();
                      const roleData = roleResponse.role;
                      if (roleData) {
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
              {!isAdminOrManager && (
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
    password: '',
    role: 'member' as User['role'],
    isActive: true,
    teamId: '',
    departmentId: '',
  });
  const [generatePassword, setGeneratePassword] = useState(true);

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

  const generateRandomPassword = () => {
    // Generate a secure random password
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: 'Error',
        description: 'Please enter a valid email address',
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
        toast({
          title: 'Success',
          description: 'User updated',
        });
      } else {
        // Create new user
        let password = formData.password;
        if (generatePassword || !password) {
          password = generateRandomPassword();
        }

        // Validate password if manually entered
        if (!generatePassword && password.length < 6) {
          toast({
            title: 'Error',
            description: 'Password must be at least 6 characters long',
            variant: 'destructive',
          });
          return;
        }

        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: password,
          options: {
            data: {
              firstName: formData.firstName,
              lastName: formData.lastName,
              role: formData.role,
            },
            emailRedirectTo: `${window.location.origin}/login`,
          },
        });

        if (authError) {
          console.error('Supabase Auth error:', authError);
          // Check if user already exists
          if (authError.message?.includes('already registered') || authError.message?.includes('already exists') || authError.message?.includes('User already registered')) {
            throw new Error('A user with this email already exists. Please sync from auth or use a different email.');
          }
          // Check for email confirmation required
          if (authError.message?.includes('email') && authError.message?.includes('confirm')) {
            throw new Error('Email confirmation is required. Please check your Supabase Auth settings or try again.');
          }
          // Check for password requirements
          if (authError.message?.includes('password') || authError.message?.includes('Password')) {
            throw new Error(`Password requirements not met: ${authError.message}`);
          }
          // Generic error with full message
          const errorMsg = authError.message || authError.toString() || 'Unknown error';
          throw new Error(`Failed to create user in authentication: ${errorMsg}`);
        }

        // Note: If email confirmation is required, authData.user might exist but authData.session will be null
        if (!authData.user) {
          throw new Error('User creation failed - no user returned from Supabase Auth. This might be due to email confirmation requirements.');
        }

        // Create user record in users table
        // Try lowercase first (PostgreSQL lowercases unquoted identifiers)
        let userResult = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: formData.email,
            firstname: formData.firstName,
            lastname: formData.lastName,
            role: formData.role,
            isactive: formData.isActive,
            teamid: formData.teamId || null,
            departmentid: formData.departmentId || null,
            createdat: new Date().toISOString(),
            updatedat: new Date().toISOString(),
          });

        // If lowercase fails, try camelCase
        if (userResult.error && (userResult.error.code === 'PGRST204' || userResult.error.message?.includes('column'))) {
          userResult = await supabase
            .from('users')
            .insert({
              id: authData.user.id,
              email: formData.email,
              firstName: formData.firstName,
              lastName: formData.lastName,
              role: formData.role,
              isActive: formData.isActive,
              teamId: formData.teamId || null,
              departmentId: formData.departmentId || null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
        }

        if (userResult.error) {
          // If user table insert fails, log the full error
          console.error('Failed to create user record in database:', userResult.error);
          console.error('Error code:', userResult.error.code);
          console.error('Error message:', userResult.error.message);
          console.error('Error details:', userResult.error);
          
          // Provide more helpful error messages
          let errorMessage = `Failed to create user record: ${userResult.error.message || 'Unknown error'}`;
          if (userResult.error.code === 'PGRST204') {
            errorMessage = 'Column name mismatch. Please check your database schema.';
          } else if (userResult.error.code === '23505') {
            errorMessage = 'A user with this ID already exists in the database.';
          } else if (userResult.error.code === '42501' || userResult.error.message?.includes('permission denied') || userResult.error.message?.includes('RLS')) {
            errorMessage = 'Permission denied. Please check your Row Level Security (RLS) policies in Supabase.';
          } else if (userResult.error.message?.includes('does not exist')) {
            errorMessage = 'The users table does not exist. Please run the database migration.';
          }
          
          // Note: We can't easily delete the auth user without admin privileges
          // The auth user might have been created, so we should inform the admin
          throw new Error(`${errorMessage} Note: The user may have been created in authentication but not in the database.`);
        }

        // Send password reset email so user can set their own password
        // This will work even if email confirmation is required
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(formData.email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (resetError) {
          console.warn('Failed to send password reset email:', resetError);
          // Don't fail the whole operation, just warn
          toast({
            title: 'User created',
            description: `User created successfully. ${generatePassword ? `Temporary password: ${password}. ` : ''}Please share this password securely with the user, or they can use "Forgot Password" on the login page to set their own password.`,
            variant: 'default',
            duration: 10000, // Show for 10 seconds so admin can copy password
          });
        } else {
          toast({
            title: 'Success',
            description: `User created successfully. ${generatePassword ? `Temporary password: ${password}. ` : ''}A password reset email has been sent to ${formData.email} so they can set their own password.`,
            variant: 'default',
            duration: 10000, // Show for 10 seconds so admin can copy password
          });
        }
      }
      setIsDialogOpen(false);
      setEditingUser(null);
      setFormData({ email: '', firstName: '', lastName: '', password: '', role: 'member', isActive: true, teamId: '', departmentId: '' });
      setGeneratePassword(true);
      loadData();
    } catch (error) {
      console.error('Error saving user:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        error: error,
      });
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Provide user-friendly error messages
      let userMessage = errorMessage;
      if (errorMessage.includes('already exists')) {
        userMessage = 'A user with this email already exists. Please use a different email or sync from authentication.';
      } else if (errorMessage.includes('Email confirmation') || errorMessage.includes('email') && errorMessage.includes('confirm')) {
        userMessage = 'Email confirmation is required. Please check your Supabase Auth settings to disable email confirmation for admin-created users, or the user will need to confirm their email before they can log in.';
      } else if (errorMessage.includes('Password requirements')) {
        userMessage = errorMessage; // Keep the specific password error
      } else if (errorMessage.includes('RLS') || errorMessage.includes('permission denied')) {
        userMessage = 'Permission denied. Please check your Row Level Security (RLS) policies in Supabase to allow admins to create users.';
      } else if (errorMessage.includes('does not exist')) {
        userMessage = 'Database table not found. Please run the database migration in Supabase.';
      } else if (errorMessage.includes('Column name mismatch')) {
        userMessage = 'Database schema mismatch. Please check your database column names match the migration.';
      } else if (errorMessage.includes('Database error')) {
        userMessage = 'Database error occurred. Please check the browser console for details and verify your Supabase configuration.';
      }
      
      toast({
        title: 'Error',
        description: userMessage,
        variant: 'destructive',
        duration: 10000, // Show for 10 seconds so user can read it
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
            <Button onClick={() => { setEditingUser(null); setFormData({ email: '', firstName: '', lastName: '', password: '', role: 'member', isActive: true, teamId: '', departmentId: '' }); setGeneratePassword(true); setIsDialogOpen(true); }}>
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
                          try {
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
                          } catch (error) {
                            console.error('Error opening edit dialog:', error);
                            toast({
                              title: 'Error',
                              description: 'Failed to open edit dialog',
                              variant: 'destructive',
                            });
                          }
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
              {!editingUser && (
                <>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="generatePassword"
                      checked={generatePassword}
                      onCheckedChange={setGeneratePassword}
                    />
                    <Label htmlFor="generatePassword" className="cursor-pointer">
                      Auto-generate password
                    </Label>
                  </div>
                  {!generatePassword && (
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Enter password for user"
                      />
                      <p className="text-xs text-muted-foreground">
                        User will receive a password reset email to set their own password
                      </p>
                    </div>
                  )}
                </>
              )}
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
                    value={formData.teamId || 'none'}
                    onValueChange={(value) => setFormData({ ...formData, teamId: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Team</SelectItem>
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
                  value={formData.departmentId || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, departmentId: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Department</SelectItem>
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

// Teams Management Component
function TeamsManagement() {
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    departmentId: '',
    teamLeadId: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [teamsResult, departmentsResult, usersResult] = await Promise.allSettled([
        adminService.getTeams(),
        adminService.getDepartments(),
        adminService.getUsers(),
      ]);

      if (teamsResult.status === 'fulfilled') {
        setTeams(teamsResult.value);
      } else {
        console.error('Error loading teams:', teamsResult.reason);
        setTeams([]);
      }

      if (departmentsResult.status === 'fulfilled') {
        setDepartments(departmentsResult.value);
      } else {
        setDepartments([]);
      }

      if (usersResult.status === 'fulfilled') {
        setUsers(usersResult.value);
      } else {
        setUsers([]);
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

  const handleSave = async () => {
    if (!formData.name) {
      toast({
        title: 'Error',
        description: 'Please enter a team name',
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log('Saving team:', { editingTeam, formData });
      if (editingTeam) {
        const result = await adminService.updateTeam(editingTeam.id, {
          ...formData,
          departmentId: formData.departmentId || undefined,
          teamLeadId: formData.teamLeadId || undefined,
        });
        console.log('Team updated:', result);
        toast({
          title: 'Success',
          description: 'Team updated',
        });
      } else {
        const result = await adminService.createTeam({
          ...formData,
          departmentId: formData.departmentId || undefined,
          teamLeadId: formData.teamLeadId || undefined,
        });
        console.log('Team created:', result);
        toast({
          title: 'Success',
          description: 'Team created',
        });
      }
      setIsDialogOpen(false);
      setEditingTeam(null);
      setFormData({ name: '', description: '', departmentId: '', teamLeadId: '' });
      // Reload data, but don't fail if it errors (data was created successfully)
      try {
        await loadData();
      } catch (reloadError) {
        console.warn('Error reloading data after save:', reloadError);
        // Data was created successfully, so just show a message
        toast({
          title: 'Success',
          description: 'Team saved successfully. Please refresh the page to see it in the list.',
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Error saving team:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        title: 'Error',
        description: `Failed to save team: ${errorMessage}`,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return;

    try {
      await adminService.deleteTeam(id);
      toast({
        title: 'Success',
        description: 'Team deleted',
      });
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete team',
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
            <CardTitle>Teams</CardTitle>
            <CardDescription>Manage teams and team assignments</CardDescription>
          </div>
          <Button onClick={() => { setEditingTeam(null); setFormData({ name: '', description: '', departmentId: '', teamLeadId: '' }); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Team
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Team Lead</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No teams found. Click "Add Team" to create one.
                </TableCell>
              </TableRow>
            ) : (
              teams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell>{team.description || '-'}</TableCell>
                  <TableCell>
                    {team.departmentId ? departments.find(d => d.id === team.departmentId)?.name || '-' : '-'}
                  </TableCell>
                  <TableCell>
                    {team.teamLeadId ? users.find(u => u.id === team.teamLeadId)?.firstName + ' ' + users.find(u => u.id === team.teamLeadId)?.lastName || '-' : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          try {
                            setEditingTeam(team);
                            setFormData({
                              name: team.name,
                              description: team.description || '',
                              departmentId: team.departmentId || '',
                              teamLeadId: team.teamLeadId || '',
                            });
                            setIsDialogOpen(true);
                          } catch (error) {
                            console.error('Error opening edit dialog:', error);
                            toast({
                              title: 'Error',
                              description: 'Failed to open edit dialog',
                              variant: 'destructive',
                            });
                          }
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(team.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTeam ? 'Edit Team' : 'Add Team'}</DialogTitle>
              <DialogDescription>
                {editingTeam ? 'Update team information' : 'Create a new team'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="teamName">Team Name *</Label>
                <Input
                  id="teamName"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="teamDescription">Description</Label>
                <Textarea
                  id="teamDescription"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="teamDepartment">Department</Label>
                <Select
                  value={formData.departmentId || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, departmentId: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Department</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="teamLead">Team Lead</Label>
                <Select
                  value={formData.teamLeadId || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, teamLeadId: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team lead" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Team Lead</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingTeam ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// Departments Management Component
function DepartmentsManagement() {
  const { toast } = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const departments = await adminService.getDepartments();
      setDepartments(departments);
    } catch (error) {
      console.error('Error loading departments:', error);
      setDepartments([]);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load departments',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast({
        title: 'Error',
        description: 'Please enter a department name',
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log('Saving department:', { editingDepartment, formData });
      if (editingDepartment) {
        const result = await adminService.updateDepartment(editingDepartment.id, formData);
        console.log('Department updated:', result);
        toast({
          title: 'Success',
          description: 'Department updated',
        });
      } else {
        const result = await adminService.createDepartment(formData);
        console.log('Department created:', result);
        toast({
          title: 'Success',
          description: 'Department created',
        });
      }
      setIsDialogOpen(false);
      setEditingDepartment(null);
      setFormData({ name: '', description: '' });
      // Reload data, but don't fail if it errors (data was created successfully)
      try {
        await loadData();
      } catch (reloadError) {
        console.warn('Error reloading data after save:', reloadError);
        // Data was created successfully, so just show a message
        toast({
          title: 'Success',
          description: 'Department saved successfully. Please refresh the page to see it in the list.',
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Error saving department:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        title: 'Error',
        description: `Failed to save department: ${errorMessage}`,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department? This will also remove it from all teams.')) return;

    try {
      await adminService.deleteDepartment(id);
      toast({
        title: 'Success',
        description: 'Department deleted',
      });
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete department',
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
            <CardTitle>Departments</CardTitle>
            <CardDescription>Manage departments and organizational structure</CardDescription>
          </div>
          <Button onClick={() => { setEditingDepartment(null); setFormData({ name: '', description: '' }); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Department
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                  No departments found. Click "Add Department" to create one.
                </TableCell>
              </TableRow>
            ) : (
              departments.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell className="font-medium">{dept.name}</TableCell>
                  <TableCell>{dept.description || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          try {
                            setEditingDepartment(dept);
                            setFormData({
                              name: dept.name,
                              description: dept.description || '',
                            });
                            setIsDialogOpen(true);
                          } catch (error) {
                            console.error('Error opening edit dialog:', error);
                            toast({
                              title: 'Error',
                              description: 'Failed to open edit dialog',
                              variant: 'destructive',
                            });
                          }
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(dept.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingDepartment ? 'Edit Department' : 'Add Department'}</DialogTitle>
              <DialogDescription>
                {editingDepartment ? 'Update department information' : 'Create a new department'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="deptName">Department Name *</Label>
                <Input
                  id="deptName"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deptDescription">Description</Label>
                <Textarea
                  id="deptDescription"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingDepartment ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// Allowed Domains Management Component
function AllowedDomainsManagement() {
  const { toast } = useToast();
  const [domains, setDomains] = useState<AllowedDomain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDomain, setEditingDomain] = useState<AllowedDomain | null>(null);
  const [formData, setFormData] = useState({
    domain: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const domains = await adminService.getAllowedDomains();
      setDomains(domains);
    } catch (error) {
      console.error('Error loading domains:', error);
      setDomains([]);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load domains',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.domain) {
      toast({
        title: 'Error',
        description: 'Please enter a domain',
        variant: 'destructive',
      });
      return;
    }

    // Validate domain format (basic check)
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(formData.domain)) {
      toast({
        title: 'Error',
        description: 'Please enter a valid domain (e.g., example.com)',
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log('Saving domain:', { editingDomain, formData });
      if (editingDomain) {
        const result = await adminService.updateAllowedDomain(editingDomain.id, {
          domain: formData.domain,
          isActive: true,
        });
        console.log('Domain updated:', result);
        toast({
          title: 'Success',
          description: 'Domain updated',
        });
      } else {
        const result = await adminService.createAllowedDomain({
          domain: formData.domain,
          isActive: true,
        });
        console.log('Domain created:', result);
        toast({
          title: 'Success',
          description: 'Domain added',
        });
      }
      setIsDialogOpen(false);
      setEditingDomain(null);
      setFormData({ domain: '' });
      // Reload data, but don't fail if it errors (data was created successfully)
      try {
        await loadData();
      } catch (reloadError) {
        console.warn('Error reloading data after save:', reloadError);
        // Data was created successfully, so just show a message
        toast({
          title: 'Success',
          description: 'Domain saved successfully. Please refresh the page to see it in the list.',
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Error saving domain:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        title: 'Error',
        description: `Failed to save domain: ${errorMessage}`,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this allowed domain?')) return;

    try {
      await adminService.deleteAllowedDomain(id);
      toast({
        title: 'Success',
        description: 'Domain removed',
      });
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete domain',
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
            <CardTitle>Allowed Domains</CardTitle>
            <CardDescription>Configure which email domains are allowed for self signup</CardDescription>
          </div>
          <Button onClick={() => { setEditingDomain(null); setFormData({ domain: '' }); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Domain
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Domain</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {domains.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                  No allowed domains configured. Click "Add Domain" to add one.
                </TableCell>
              </TableRow>
            ) : (
              domains.map((domain) => (
                <TableRow key={domain.id}>
                  <TableCell className="font-medium">{domain.domain}</TableCell>
                  <TableCell>
                    <Badge variant={domain.isActive ? 'default' : 'secondary'}>
                      {domain.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          try {
                            setEditingDomain(domain);
                            setFormData({
                              domain: domain.domain,
                            });
                            setIsDialogOpen(true);
                          } catch (error) {
                            console.error('Error opening edit dialog:', error);
                            toast({
                              title: 'Error',
                              description: 'Failed to open edit dialog',
                              variant: 'destructive',
                            });
                          }
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(domain.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingDomain ? 'Edit Allowed Domain' : 'Add Allowed Domain'}</DialogTitle>
              <DialogDescription>
                {editingDomain ? 'Update domain settings' : 'Add a new allowed domain for self signup'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="domain">Domain *</Label>
                <Input
                  id="domain"
                  placeholder="example.com"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Enter the domain without @ (e.g., example.com). Only users with email addresses from this domain will be allowed to sign up.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingDomain ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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

  // Normalize role to lowercase for comparison (reuse from parent scope)
  const tagsUserRole = user?.role?.toLowerCase();
  const tagsIsAdminOrManager = tagsUserRole === 'admin' || tagsUserRole === 'manager';

  // Check if user is admin or manager
  if (!user || !tagsIsAdminOrManager) {
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
    emailEnabled: false as boolean,
    emailProvider: 'resend' as 'resend' | 'sendgrid' | 'ses' | 'custom',
    emailApiUrl: '',
    emailApiKey: '',
    emailFrom: '',
    pushEnabled: false as boolean,
    pushVapidPublicKey: '',
    pushVapidPrivateKey: '',
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
        emailEnabled: !!data.emailEnabled,
        emailProvider: (data.emailProvider as any) || 'resend',
        emailApiUrl: data.emailApiUrl || '',
        emailApiKey: data.emailApiKey || '',
        emailFrom: data.emailFrom || '',
        pushEnabled: !!data.pushEnabled,
        pushVapidPublicKey: data.pushVapidPublicKey || '',
        pushVapidPrivateKey: data.pushVapidPrivateKey || '',
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

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-4">Email Notifications</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  id="emailEnabled"
                  type="checkbox"
                  checked={settings.emailEnabled}
                  onChange={(e) => setSettings({ ...settings, emailEnabled: e.target.checked })}
                />
                <label htmlFor="emailEnabled" className="text-sm">Enable Email Notifications</label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emailProvider">Provider</Label>
                <Select
                  value={settings.emailProvider}
                  onValueChange={(value) => setSettings({ ...settings, emailProvider: value as any })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resend">Resend</SelectItem>
                    <SelectItem value="sendgrid">SendGrid</SelectItem>
                    <SelectItem value="ses">AWS SES</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emailApiUrl">API URL</Label>
                  <Input
                    id="emailApiUrl"
                    value={settings.emailApiUrl}
                    onChange={(e) => setSettings({ ...settings, emailApiUrl: e.target.value })}
                    placeholder="https://api.resend.com/emails"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailApiKey">API Key</Label>
                  <Input
                    id="emailApiKey"
                    type="password"
                    value={settings.emailApiKey}
                    onChange={(e) => setSettings({ ...settings, emailApiKey: e.target.value })}
                    placeholder="Provider API Key"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emailFrom">From Email</Label>
                <Input
                  id="emailFrom"
                  value={settings.emailFrom}
                  onChange={(e) => setSettings({ ...settings, emailFrom: e.target.value })}
                  placeholder="noreply@yourdomain.com"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-4">Push Notifications (Web Push)</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  id="pushEnabled"
                  type="checkbox"
                  checked={settings.pushEnabled}
                  onChange={(e) => setSettings({ ...settings, pushEnabled: e.target.checked })}
                />
                <label htmlFor="pushEnabled" className="text-sm">Enable Push Notifications</label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pushVapidPublicKey">VAPID Public Key</Label>
                  <Input
                    id="pushVapidPublicKey"
                    value={settings.pushVapidPublicKey}
                    onChange={(e) => setSettings({ ...settings, pushVapidPublicKey: e.target.value })}
                    placeholder="Base64 URL-encoded public key"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pushVapidPrivateKey">VAPID Private Key</Label>
                  <Input
                    id="pushVapidPrivateKey"
                    type="password"
                    value={settings.pushVapidPrivateKey}
                    onChange={(e) => setSettings({ ...settings, pushVapidPrivateKey: e.target.value })}
                    placeholder="Private key (kept server-side)"
                  />
                </div>
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

