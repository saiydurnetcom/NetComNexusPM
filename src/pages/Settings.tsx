import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { RefreshCw } from 'lucide-react';
import { 
  User, 
  Bell, 
  Shield, 
  Palette,
  Save
} from 'lucide-react';

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  // Profile settings
  const [profile, setProfile] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
  });

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    taskAssignments: true,
    projectUpdates: true,
    meetingReminders: true,
  });

  useEffect(() => {
    if (user) {
      setProfile({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
      });
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          firstName: profile.firstName,
          lastName: profile.lastName,
        },
      });

      if (error) throw error;

      await refreshUser();
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={profile.firstName}
                      onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={profile.lastName}
                      onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed. Contact an administrator if you need to update it.
                  </p>
                </div>
                <Button onClick={handleSaveProfile} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Configure how you receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notifications">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={notifications.emailNotifications}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, emailNotifications: checked })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="task-assignments">Task Assignments</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify when tasks are assigned to you
                    </p>
                  </div>
                  <Switch
                    id="task-assignments"
                    checked={notifications.taskAssignments}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, taskAssignments: checked })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="project-updates">Project Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify about project status changes
                    </p>
                  </div>
                  <Switch
                    id="project-updates"
                    checked={notifications.projectUpdates}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, projectUpdates: checked })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="meeting-reminders">Meeting Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Remind you about upcoming meetings
                    </p>
                  </div>
                  <Switch
                    id="meeting-reminders"
                    checked={notifications.meetingReminders}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, meetingReminders: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>Manage your account security settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Change Password</Label>
                  <p className="text-sm text-muted-foreground">
                    To change your password, please use the "Forgot Password" option on the login page.
                  </p>
                  <Button variant="outline" onClick={() => {
                    toast({
                      title: 'Info',
                      description: 'Please use the "Forgot Password" link on the login page to reset your password.',
                    });
                  }}>
                    Reset Password
                  </Button>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Account Role</Label>
                  <p className="text-sm text-muted-foreground">
                    Your current role: <strong className="capitalize">{user?.role || 'member'}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Role changes must be made by an administrator in the Admin panel.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={async () => {
                      try {
                        // Try to get role directly from database using RPC
                        const { data: roleData, error: rpcError } = await supabase.rpc('get_current_user_role');
                        if (!rpcError && roleData) {
                          // Update user role directly
                          const { data: { session } } = await supabase.auth.getSession();
                          if (session?.user) {
                            const updatedUser = {
                              ...user!,
                              role: roleData as 'admin' | 'manager' | 'member',
                            };
                            // Force update the user state
                            await refreshUser();
                            toast({
                              title: 'Success',
                              description: `Role refreshed: ${roleData}. ${roleData === 'admin' ? 'You should now see the Admin link in navigation.' : ''}`,
                            });
                            // Force page reload to update navigation
                            setTimeout(() => window.location.reload(), 1000);
                          }
                        } else {
                          // Fallback to refreshUser
                          await refreshUser();
                          toast({
                            title: 'Info',
                            description: 'Role refreshed. If you recently became an admin, refresh the page to see Admin link.',
                          });
                        }
                      } catch (error) {
                        toast({
                          title: 'Error',
                          description: 'Failed to refresh role. Make sure you have run the RLS migration.',
                          variant: 'destructive',
                        });
                      }
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Role from Database
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

