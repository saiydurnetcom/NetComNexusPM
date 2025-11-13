import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  FolderKanban, 
  CheckSquare, 
  Clock, 
  Sparkles,
  LogOut,
  Settings,
  Menu,
  X,
  Shield,
  Timer,
  BarChart3,
  Calendar
} from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export default function Sidebar() {
  const location = useLocation();
  const { logout, user } = useAuth();

  // Normalize role to lowercase for comparison
  const userRole = user?.role?.toLowerCase();
  const isAdminOrManager = userRole === 'admin' || userRole === 'manager';

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/today', label: "Today's ToDos", icon: Calendar },
    { path: '/projects', label: 'Projects', icon: FolderKanban },
    { path: '/tasks', label: 'Tasks', icon: CheckSquare },
    { path: '/timesheet', label: 'Timesheet', icon: Clock },
    { path: '/meetings', label: 'Meetings', icon: Sparkles },
    { path: '/reports', label: 'Reports', icon: BarChart3 },
    ...(isAdminOrManager ? [{ path: '/admin', label: 'Admin', icon: Shield }] : []),
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-gray-900 text-white border-r border-gray-800 fixed left-0 top-0 h-screen z-40">
        {/* Logo */}
        <div className="flex items-center justify-between gap-3 px-6 py-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-600">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold">NexusPM</span>
          </div>
          <NotificationBell />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link key={item.path} to={item.path}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 h-11 text-gray-300 hover:text-white hover:bg-gray-800",
                    active && "bg-gray-800 text-white border-l-4 border-blue-500"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="px-4 py-4 border-t border-gray-800 space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-11 text-gray-300 hover:text-white hover:bg-gray-800"
            onClick={() => {
              const width = 420;
              const height = 600;
              const left = screen.width - width - 20;
              const top = 20;
              window.open(
                '/time-tracker-widget',
                'TimeTrackerWidget',
                `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no,toolbar=no,menubar=no,location=no`
              );
            }}
          >
            <Timer className="h-5 w-5" />
            Time Tracker Widget
          </Button>
          <Link to="/meeting-processor">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-11 text-gray-300 hover:text-white hover:bg-gray-800"
            >
              <Sparkles className="h-5 w-5" />
              Process Meeting
            </Button>
          </Link>
          <Link to="/settings">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-11 text-gray-300 hover:text-white hover:bg-gray-800"
            >
              <Settings className="h-5 w-5" />
              Settings
            </Button>
          </Link>
          <div className="pt-2 border-t border-gray-800">
            <div className="px-3 py-2 text-sm text-gray-400">
              {user?.firstName} {user?.lastName}
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-11 text-gray-300 hover:text-white hover:bg-gray-800"
              onClick={logout}
            >
              <LogOut className="h-5 w-5" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="fixed top-4 left-4 z-50 lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 bg-gray-900 text-white p-0">
            <div className="flex flex-col h-full">
              {/* Logo */}
              <div className="flex items-center justify-between gap-3 px-6 py-5 border-b border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-600">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xl font-bold">NexusPM</span>
                </div>
                <NotificationBell />
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link key={item.path} to={item.path}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start gap-3 h-11 text-gray-300 hover:text-white hover:bg-gray-800",
                          active && "bg-gray-800 text-white"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        {item.label}
                      </Button>
                    </Link>
                  );
                })}
              </nav>

              {/* Bottom Section */}
              <div className="px-4 py-4 border-t border-gray-800 space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-11 text-gray-300 hover:text-white hover:bg-gray-800"
                  onClick={() => {
                    const width = 420;
                    const height = 600;
                    const left = screen.width - width - 20;
                    const top = 20;
                    window.open(
                      '/time-tracker-widget',
                      'TimeTrackerWidget',
                      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no,toolbar=no,menubar=no,location=no`
                    );
                  }}
                >
                  <Timer className="h-5 w-5" />
                  Time Tracker Widget
                </Button>
                <Link to="/meeting-processor">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-11 text-gray-300 hover:text-white hover:bg-gray-800"
                  >
                    <Sparkles className="h-5 w-5" />
                    Process Meeting
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-11 text-gray-300 hover:text-white hover:bg-gray-800"
                >
                  <Settings className="h-5 w-5" />
                  Settings
                </Button>
                <div className="pt-2 border-t border-gray-800">
                  <div className="px-3 py-2 text-sm text-gray-400">
                    {user?.firstName} {user?.lastName}
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-11 text-gray-300 hover:text-white hover:bg-gray-800"
                    onClick={logout}
                  >
                    <LogOut className="h-5 w-5" />
                    Logout
                  </Button>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

