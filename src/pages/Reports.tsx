/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/components/AppLayout';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import {
  BarChart3,
  TrendingUp,
  Users,
  FolderKanban,
  CheckSquare,
  Clock,
  FileText,
  Sparkles,
  Loader2,
  Download,
  Calendar,
  Share2,
  FileSpreadsheet
} from 'lucide-react';
import { format, subWeeks, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Pie, PieChart, Cell, Bar, BarChart, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, Line, LineChart } from 'recharts';
import { adminService } from '@/lib/admin-service';
import { Team, Department, User as UserType } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  exportProjectStatusReport,
  exportTaskStatisticsReport,
  exportProductivityReport,
  exportResourceAllocationReport
} from '@/lib/export-utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function Reports() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projects, fetchProjects } = useProjects();
  const { tasks, fetchTasks } = useTasks();
  const { timeEntries, fetchTimeEntries } = useTimeTracking();
  const { toast } = useToast();

  // Access control: managers and admins see all, members see only their own
  const userRole = user?.role?.toLowerCase();
  const isManagerOrAdmin = userRole === 'admin' || userRole === 'manager';

  // Teams and Departments
  const [teams, setTeams] = useState<Team[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allUsers, setAllUsers] = useState<UserType[]>([]);

  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'all'>('month');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [cxoReport, setCxoReport] = useState<string | null>(null);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [selectedProjectForReport, setSelectedProjectForReport] = useState<string>('');
  const [savedReports, setSavedReports] = useState<any[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [reportsPage, setReportsPage] = useState(1);
  const reportsPerPage = 10;

  useEffect(() => {
    fetchProjects();
    fetchTasks();
    fetchTimeEntries();
    if (isManagerOrAdmin) {
      // Load teams, departments, and users for filtering
      Promise.all([
        adminService.getTeams().catch(() => []),
        adminService.getDepartments().catch(() => []),
        adminService.getUsers().catch(() => []),
      ]).then(([teamsData, deptsData, usersData]) => {
        setTeams(teamsData);
        setDepartments(deptsData);
        setAllUsers(usersData);
      });
    }
    loadSavedReports();
  }, [fetchProjects, fetchTasks, fetchTimeEntries, isManagerOrAdmin, selectedProject]);

  const loadSavedReports = async () => {
    setIsLoadingReports(true);
    try {
      const { projectReportsService } = await import('@/lib/api-data');
      const reports = await projectReportsService.getReports(
        selectedProject !== 'all' ? selectedProject : undefined
      );
      setSavedReports(reports);
      setReportsPage(1); // Reset to first page when reports change
    } catch (error) {
      console.error('Error loading saved reports:', error);
      setSavedReports([]);
    } finally {
      setIsLoadingReports(false);
    }
  };

  // Filter data based on selections and access control
  const filteredProjects = useMemo(() => {
    let filtered = projects;

    // Access control: members see only their own projects/tasks
    if (!isManagerOrAdmin && user) {
      // Filter projects where user is assigned to tasks
      const userTaskProjectIds = new Set(
        tasks.filter(t => t.assignedTo === user.id).map(t => t.projectId)
      );
      filtered = filtered.filter(p => userTaskProjectIds.has(p.id));
    }

    if (selectedProject !== 'all') {
      filtered = filtered.filter(p => p.id === selectedProject);
    }
    return filtered;
  }, [projects, selectedProject, isManagerOrAdmin, user, tasks]);

  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    // Access control: members see only their own tasks
    if (!isManagerOrAdmin && user) {
      filtered = filtered.filter(t => t.assignedTo === user.id);
    }

    // Filter by project
    if (selectedProject !== 'all') {
      filtered = filtered.filter(t => t.projectId === selectedProject);
    }

    // Filter by team
    if (selectedTeam !== 'all' && isManagerOrAdmin) {
      const teamUserIds = allUsers
        .filter(u => u.teamId === selectedTeam)
        .map(u => u.id);
      filtered = filtered.filter(t => teamUserIds.includes(t.assignedTo));
    }

    // Filter by department
    if (selectedDepartment !== 'all' && isManagerOrAdmin) {
      const deptUserIds = allUsers
        .filter(u => u.departmentId === selectedDepartment)
        .map(u => u.id);
      filtered = filtered.filter(t => deptUserIds.includes(t.assignedTo));
    }

    return filtered;
  }, [tasks, selectedProject, selectedTeam, selectedDepartment, isManagerOrAdmin, user, allUsers]);

  const filteredTimeEntries = useMemo(() => {
    let filtered = timeEntries;

    // Access control: members see only their own time entries
    if (!isManagerOrAdmin && user) {
      filtered = filtered.filter(entry => entry.userId === user.id);
    }

    // Filter by date range
    const now = new Date();
    let startDate: Date;
    switch (dateRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0);
    }

    filtered = filtered.filter(entry => new Date(entry.startTime) >= startDate);

    // Filter by project if selected
    if (selectedProject !== 'all') {
      const projectTaskIds = filteredTasks.map(t => t.id);
      filtered = filtered.filter(entry => projectTaskIds.includes(entry.taskId));
    }

    // Filter by team
    if (selectedTeam !== 'all' && isManagerOrAdmin) {
      const teamUserIds = allUsers
        .filter(u => u.teamId === selectedTeam)
        .map(u => u.id);
      filtered = filtered.filter(entry => teamUserIds.includes(entry.userId));
    }

    // Filter by department
    if (selectedDepartment !== 'all' && isManagerOrAdmin) {
      const deptUserIds = allUsers
        .filter(u => u.departmentId === selectedDepartment)
        .map(u => u.id);
      filtered = filtered.filter(entry => deptUserIds.includes(entry.userId));
    }

    return filtered;
  }, [timeEntries, dateRange, selectedProject, selectedTeam, selectedDepartment, filteredTasks, isManagerOrAdmin, user, allUsers]);

  // Project Status Calculations
  const projectStatusData = useMemo(() => {
    return filteredProjects.map(project => {
      const projectTasks = filteredTasks.filter(t => t.projectId === project.id);
      const completedTasks = projectTasks.filter(t => t.status === 'COMPLETED').length;
      const totalTasks = projectTasks.length;
      const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      const projectTimeEntries = filteredTimeEntries.filter(entry => {
        const task = filteredTasks.find(t => t.id === entry.taskId);
        return task?.projectId === project.id;
      });

      const totalHours = projectTimeEntries.reduce((sum, entry) => sum + (entry.durationMinutes || 0), 0) / 60;
      const estimatedHours = projectTasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
      const hoursProgress = estimatedHours > 0 ? (totalHours / estimatedHours) * 100 : 0;

      const statusBreakdown = {
        todo: projectTasks.filter(t => t.status === 'TODO').length,
        in_progress: projectTasks.filter(t => t.status === 'IN_PROGRESS').length,
        review: projectTasks.filter(t => t.status === 'REVIEW').length,
        completed: completedTasks,
      };

      const priorityBreakdown = {
        urgent: projectTasks.filter(t => t.priority === 'URGENT').length,
        high: projectTasks.filter(t => t.priority === 'HIGH').length,
        medium: projectTasks.filter(t => t.priority === 'MEDIUM').length,
        low: projectTasks.filter(t => t.priority === 'LOW').length,
      };

      const startDate = new Date(project.startDate);
      const endDate = new Date(project.endDate);
      const now = new Date();
      const totalDuration = endDate.getTime() - startDate.getTime();
      const elapsed = now.getTime() - startDate.getTime();
      const timelineProgress = totalDuration > 0 ? Math.min(100, (elapsed / totalDuration) * 100) : 0;

      return {
        ...project,
        completionPercentage,
        totalTasks,
        completedTasks,
        totalHours,
        estimatedHours,
        hoursProgress,
        statusBreakdown,
        priorityBreakdown,
        timelineProgress,
        daysRemaining: Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      };
    });
  }, [filteredProjects, filteredTasks, filteredTimeEntries]);

  // Task Statistics
  const taskStatistics = useMemo(() => {
    const total = filteredTasks.length;
    const byStatus = {
      todo: filteredTasks.filter(t => t.status === 'TODO').length,
      in_progress: filteredTasks.filter(t => t.status === 'IN_PROGRESS').length,
      review: filteredTasks.filter(t => t.status === 'REVIEW').length,
      completed: filteredTasks.filter(t => t.status === 'COMPLETED').length,
    };

    const byPriority = {
      urgent: filteredTasks.filter(t => t.priority === 'URGENT').length,
      high: filteredTasks.filter(t => t.priority === 'HIGH').length,
      medium: filteredTasks.filter(t => t.priority === 'MEDIUM').length,
      low: filteredTasks.filter(t => t.priority === 'LOW').length,
    };

    const overdue = filteredTasks.filter(t => {
      if (t.status === 'COMPLETED') return false;
      const dueDate = new Date(t.dueDate);
      return dueDate < new Date();
    }).length;

    const avgEstimatedHours = total > 0
      ? filteredTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0) / total
      : 0;

    // Calculate average time to complete (for completed tasks)
    const completedTasks = filteredTasks.filter(t => t.status === 'COMPLETED' && t.createdAt && t.updatedAt);
    const avgTimeToComplete = completedTasks.length > 0
      ? completedTasks.reduce((sum, t) => {
        const created = new Date(t.createdAt);
        const updated = new Date(t.updatedAt);
        const days = (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        return sum + days;
      }, 0) / completedTasks.length
      : 0;

    return {
      total,
      byStatus,
      byPriority,
      overdue,
      avgEstimatedHours,
      avgTimeToComplete,
    };
  }, [filteredTasks]);

  // Velocity Trends (tasks completed over time)
  const velocityTrends = useMemo(() => {
    const now = new Date();
    const weeks: { week: string; completed: number; hours: number }[] = [];
    const months: { month: string; completed: number; hours: number }[] = [];

    // Weekly velocity (last 12 weeks)
    for (let i = 11; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(now, i));
      const weekEnd = endOfWeek(subWeeks(now, i));
      const weekTasks = filteredTasks.filter(t => {
        if (t.status !== 'COMPLETED' || !t.updatedAt) return false;
        const completedDate = new Date(t.updatedAt);
        return completedDate >= weekStart && completedDate <= weekEnd;
      });
      const weekHours = filteredTimeEntries
        .filter(e => {
          const entryDate = new Date(e.startTime);
          return entryDate >= weekStart && entryDate <= weekEnd;
        })
        .reduce((sum, e) => sum + (e.durationMinutes || 0), 0) / 60;

      weeks.push({
        week: format(weekStart, 'MMM dd'),
        completed: weekTasks.length,
        hours: weekHours,
      });
    }

    // Monthly velocity (last 12 months)
    for (let i = 11; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      const monthTasks = filteredTasks.filter(t => {
        if (t.status !== 'COMPLETED' || !t.updatedAt) return false;
        const completedDate = new Date(t.updatedAt);
        return completedDate >= monthStart && completedDate <= monthEnd;
      });
      const monthHours = filteredTimeEntries
        .filter(e => {
          const entryDate = new Date(e.startTime);
          return entryDate >= monthStart && entryDate <= monthEnd;
        })
        .reduce((sum, e) => sum + (e.durationMinutes || 0), 0) / 60;

      months.push({
        month: format(monthStart, 'MMM yyyy'),
        completed: monthTasks.length,
        hours: monthHours,
      });
    }

    return { weeks, months };
  }, [filteredTasks, filteredTimeEntries]);

  // Productivity Calculations
  const productivityData = useMemo(() => {
    // Project-level productivity
    const projectProductivity = projectStatusData.map(project => ({
      projectId: project.id,
      projectName: project.name,
      totalHours: project.totalHours,
      estimatedHours: project.estimatedHours,
      productivity: project.estimatedHours > 0
        ? Math.min(100, (project.totalHours / project.estimatedHours) * 100)
        : 0,
      billableHours: filteredTimeEntries
        .filter(entry => {
          const task = filteredTasks.find(t => t.id === entry.taskId);
          return task?.projectId === project.id && entry.billable;
        })
        .reduce((sum, entry) => sum + (entry.durationMinutes || 0), 0) / 60,
    }));

    // Team and Department productivity would require team/department data
    // For now, we'll calculate user-level productivity
    const userProductivity = filteredTimeEntries.reduce((acc, entry) => {
      if (!acc[entry.userId]) {
        acc[entry.userId] = {
          userId: entry.userId,
          totalHours: 0,
          billableHours: 0,
        };
      }
      const hours = (entry.durationMinutes || 0) / 60;
      acc[entry.userId].totalHours += hours;
      if (entry.billable) {
        acc[entry.userId].billableHours += hours;
      }
      return acc;
    }, {} as Record<string, { userId: string; totalHours: number; billableHours: number }>);

    return {
      project: projectProductivity,
      users: Object.values(userProductivity),
    };
  }, [projectStatusData, filteredTimeEntries, filteredTasks]);

  // Resource Allocation Calculations
  const resourceAllocationData = useMemo(() => {
    if (!isManagerOrAdmin) return [];

    const allocation: Array<{
      resourceName: string;
      projectName: string;
      hoursAllocated: number;
      hoursLogged: number;
      utilizationPercentage: number;
      workloadStatus: string;
    }> = [];

    // Calculate per user per project
    filteredTasks.forEach(task => {
      const project = filteredProjects.find(p => p.id === task.projectId);
      if (!project) return;

      const user = allUsers.find(u => u.id === task.assignedTo);
      if (!user) return;

      const taskTimeEntries = filteredTimeEntries.filter(entry => entry.taskId === task.id);
      const hoursLogged = taskTimeEntries.reduce((sum, entry) => sum + (entry.durationMinutes || 0), 0);
      const hoursAllocated = (task.estimatedHours || 0) * 60;
      const utilizationPercentage = hoursAllocated > 0 ? (hoursLogged / hoursAllocated) * 100 : 0;

      // Determine workload status
      let workloadStatus = 'Underutilized';
      if (utilizationPercentage > 120) {
        workloadStatus = 'Overloaded';
      } else if (utilizationPercentage >= 80 && utilizationPercentage <= 120) {
        workloadStatus = 'Optimal';
      }

      allocation.push({
        resourceName: `${user.firstName} ${user.lastName}`,
        projectName: project.name,
        hoursAllocated,
        hoursLogged,
        utilizationPercentage,
        workloadStatus,
      });
    });

    // Aggregate by user and project
    const aggregated = allocation.reduce((acc, item) => {
      const key = `${item.resourceName}-${item.projectName}`;
      if (!acc[key]) {
        acc[key] = {
          resourceName: item.resourceName,
          projectName: item.projectName,
          hoursAllocated: 0,
          hoursLogged: 0,
        };
      }
      acc[key].hoursAllocated += item.hoursAllocated;
      acc[key].hoursLogged += item.hoursLogged;
      return acc;
    }, {} as Record<string, { resourceName: string; projectName: string; hoursAllocated: number; hoursLogged: number }>);

    // Calculate utilization and workload status for aggregated data
    return Object.values(aggregated).map(item => {
      const utilizationPercentage = item.hoursAllocated > 0 ? (item.hoursLogged / item.hoursAllocated) * 100 : 0;
      let workloadStatus = 'Underutilized';
      if (utilizationPercentage > 120) {
        workloadStatus = 'Overloaded';
      } else if (utilizationPercentage >= 80 && utilizationPercentage <= 120) {
        workloadStatus = 'Optimal';
      }

      return {
        ...item,
        utilizationPercentage,
        workloadStatus,
      };
    }).sort((a, b) => b.hoursLogged - a.hoursLogged);
  }, [filteredTasks, filteredProjects, filteredTimeEntries, allUsers, isManagerOrAdmin]);

  const handleGenerateWeeklyReport = async () => {
    let projectId = selectedProject;

    // If "All Projects" is selected, try to use the first project
    if (!projectId || projectId === 'all') {
      if (projects.length > 0) {
        projectId = projects[0].id;
        setSelectedProject(projectId);
        toast({
          title: 'Info',
          description: `Generating report for "${projects[0].name}" (first project). Select a specific project in filters to choose a different one.`,
        });
      } else {
        toast({
          title: 'Error',
          description: 'No projects available. Please create a project first.',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsGeneratingReport(true);
    try {
      const { generateWeeklyReport, saveReport } = await import('@/lib/reports-service');
      const report = await generateWeeklyReport(projectId, {
        projects,
        tasks: filteredTasks,
        timeEntries: filteredTimeEntries,
      });
      setCxoReport(report);
      setSelectedProjectForReport(projectId);
      setIsReportDialogOpen(true);

      // Auto-save the weekly report
      try {
        const projectName = projects.find(p => p.id === projectId)?.name;
        await saveReport(projectId, report, 'summary', projectName);
        toast({
          title: 'Success',
          description: 'Weekly report generated and saved successfully',
        });
        loadSavedReports(); // Reload saved reports
      } catch (saveError) {
        console.error('Error saving report:', saveError);
        // Don't show error for save, just log it
      }
    } catch (error) {
      console.error('Error generating weekly report:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate weekly report',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleViewSavedReport = (report: any) => {
    setCxoReport(report.content);
    setSelectedProjectForReport(report.projectId);
    setIsReportDialogOpen(true);
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      const { projectReportsService } = await import('@/lib/api-data');
      await projectReportsService.deleteReport(reportId);
      toast({
        title: 'Success',
        description: 'Report deleted successfully',
      });
      loadSavedReports();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete report',
        variant: 'destructive',
      });
    }
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-600">Comprehensive insights into projects, tasks, and productivity</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleGenerateWeeklyReport}
              disabled={isGeneratingReport}
              title={selectedProject === 'all' ? 'Please select a specific project from the filters below to generate a weekly report' : 'Generate weekly report for selected project'}
            >
              {isGeneratingReport ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Weekly Report
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Saved AI Reports Section */}
        <Card>
          <CardHeader>
            <CardTitle>Saved AI Reports</CardTitle>
            <CardDescription>
              Previously generated CXO-level project reports
              {selectedProject !== 'all' && ` for ${projects.find(p => p.id === selectedProject)?.name}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingReports ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 mx-auto animate-spin text-gray-400" />
                <p className="text-sm text-gray-500 mt-2">Loading reports...</p>
              </div>
            ) : savedReports.length > 0 ? (
              <>
                <div className="space-y-2">
                  {savedReports
                    .slice((reportsPage - 1) * reportsPerPage, reportsPage * reportsPerPage)
                    .map((report) => {
                      const reportProject = projects.find(p => p.id === report.projectId);
                      return (
                        <div
                          key={report.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <FileText className="h-4 w-4 text-gray-400" />
                              <h4 className="font-medium text-sm text-gray-900 truncate">
                                {report.title}
                              </h4>
                              <Badge variant="outline" className="text-xs">
                                {report.reportType.toUpperCase()}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>{reportProject?.name || 'Unknown Project'}</span>
                              <span>•</span>
                              <span>{format(new Date(report.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewSavedReport(report)}
                            >
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteReport(report.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                </div>
                {savedReports.length > reportsPerPage && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="text-sm text-gray-500">
                      Showing {(reportsPage - 1) * reportsPerPage + 1} to {Math.min(reportsPage * reportsPerPage, savedReports.length)} of {savedReports.length} reports
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReportsPage(p => Math.max(1, p - 1))}
                        disabled={reportsPage === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-gray-500">
                        Page {reportsPage} of {Math.ceil(savedReports.length / reportsPerPage)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReportsPage(p => Math.min(Math.ceil(savedReports.length / reportsPerPage), p + 1))}
                        disabled={reportsPage >= Math.ceil(savedReports.length / reportsPerPage)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-500">
                  No saved reports yet. Generate a report and save it for future reference.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Customize your report view</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Project</label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {filteredProjects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isManagerOrAdmin && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Team</label>
                    <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Teams" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Teams</SelectItem>
                        {teams.map(team => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Department</label>
                    <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments.map(dept => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Last Week</SelectItem>
                    <SelectItem value="month">Last Month</SelectItem>
                    <SelectItem value="quarter">Last Quarter</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="project-status" className="space-y-4">
          <TabsList>
            <TabsTrigger value="project-status">
              <FolderKanban className="h-4 w-4 mr-2" />
              Project Status
            </TabsTrigger>
            <TabsTrigger value="task-stats">
              <CheckSquare className="h-4 w-4 mr-2" />
              Task Statistics
            </TabsTrigger>
            <TabsTrigger value="productivity">
              <TrendingUp className="h-4 w-4 mr-2" />
              Productivity
            </TabsTrigger>
            <TabsTrigger value="resource-allocation">
              <Users className="h-4 w-4 mr-2" />
              Resource Allocation
            </TabsTrigger>
          </TabsList>

          {/* Project Status Tab */}
          <TabsContent value="project-status" className="space-y-4">
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    try {
                      exportProjectStatusReport(projectStatusData, 'csv', 'project-status');
                      toast({ title: 'Success', description: 'Project status report exported as CSV' });
                    } catch (error) {
                      toast({ title: 'Error', description: 'Failed to export report', variant: 'destructive' });
                    }
                  }}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    try {
                      exportProjectStatusReport(projectStatusData, 'excel', 'project-status');
                      toast({ title: 'Success', description: 'Project status report exported as Excel' });
                    } catch (error) {
                      toast({ title: 'Error', description: 'Failed to export report', variant: 'destructive' });
                    }
                  }}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export as Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    try {
                      exportProjectStatusReport(projectStatusData, 'pdf', 'project-status');
                      toast({ title: 'Success', description: 'Opening PDF preview...' });
                    } catch (error) {
                      toast({ title: 'Error', description: 'Failed to export report', variant: 'destructive' });
                    }
                  }}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {projectStatusData.map(project => (
                <Card key={project.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <Badge variant={project.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {project.status}
                      </Badge>
                    </div>
                    <CardDescription>{project.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Task Completion</span>
                        <span className="text-sm text-gray-600">
                          {project.completedTasks} / {project.totalTasks}
                        </span>
                      </div>
                      <Progress value={project.completionPercentage} />
                      <p className="text-xs text-gray-500 mt-1">
                        {project.completionPercentage.toFixed(1)}% complete
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Timeline Progress</span>
                        <span className="text-sm text-gray-600">
                          {project.daysRemaining > 0 ? `${project.daysRemaining} days left` : 'Overdue'}
                        </span>
                      </div>
                      <Progress
                        value={project.timelineProgress}
                        className={project.daysRemaining < 0 ? 'bg-red-200' : ''}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                      <div>
                        <p className="text-xs text-gray-500">Hours Logged</p>
                        <p className="text-lg font-semibold">{formatHours(project.totalHours)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Estimated</p>
                        <p className="text-lg font-semibold">{formatHours(project.estimatedHours)}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t">
                      <p className="text-xs font-medium mb-2">Status Breakdown</p>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="outline">Todo: {project.statusBreakdown.todo}</Badge>
                        <Badge variant="outline" className="bg-blue-50">In Progress: {project.statusBreakdown.in_progress}</Badge>
                        <Badge variant="outline" className="bg-yellow-50">Review: {project.statusBreakdown.review}</Badge>
                        <Badge variant="outline" className="bg-green-50">Completed: {project.statusBreakdown.completed}</Badge>
                      </div>
                    </div>

                    {/* Team Members */}
                    {isManagerOrAdmin && (
                      <div className="pt-2 border-t">
                        <p className="text-xs font-medium mb-2">Team Members</p>
                        <div className="flex flex-wrap gap-1">
                          {Array.from(new Set(
                            filteredTasks
                              .filter(t => t.projectId === project.id)
                              .map(t => t.assignedTo)
                          )).slice(0, 5).map(userId => {
                            const assignedUser = allUsers.find(u => u.id === userId);
                            return assignedUser ? (
                              <Badge key={userId} variant="outline" className="text-xs">
                                {assignedUser.firstName} {assignedUser.lastName}
                              </Badge>
                            ) : null;
                          })}
                          {Array.from(new Set(
                            filteredTasks
                              .filter(t => t.projectId === project.id)
                              .map(t => t.assignedTo)
                          )).length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{Array.from(new Set(
                                  filteredTasks
                                    .filter(t => t.projectId === project.id)
                                    .map(t => t.assignedTo)
                                )).length - 5} more
                              </Badge>
                            )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Task Statistics Tab */}
          <TabsContent value="task-stats" className="space-y-4">
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    try {
                      exportTaskStatisticsReport(taskStatistics, 'csv', 'task-statistics');
                      toast({ title: 'Success', description: 'Task statistics exported as CSV' });
                    } catch (error) {
                      toast({ title: 'Error', description: 'Failed to export report', variant: 'destructive' });
                    }
                  }}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    try {
                      exportTaskStatisticsReport(taskStatistics, 'excel', 'task-statistics');
                      toast({ title: 'Success', description: 'Task statistics exported as Excel' });
                    } catch (error) {
                      toast({ title: 'Error', description: 'Failed to export report', variant: 'destructive' });
                    }
                  }}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export as Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    try {
                      exportTaskStatisticsReport(taskStatistics, 'pdf', 'task-statistics');
                      toast({ title: 'Success', description: 'Opening PDF preview...' });
                    } catch (error) {
                      toast({ title: 'Error', description: 'Failed to export report', variant: 'destructive' });
                    }
                  }}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{taskStatistics.total}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">{taskStatistics.overdue}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Estimated Hours</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{taskStatistics.avgEstimatedHours.toFixed(1)}h</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Time to Complete</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{taskStatistics.avgTimeToComplete.toFixed(1)} days</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {taskStatistics.total > 0
                      ? ((taskStatistics.byStatus.completed / taskStatistics.total) * 100).toFixed(1)
                      : 0}%
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Tasks by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-4">
                    {Object.entries(taskStatistics.byStatus).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${status === 'completed' ? 'bg-green-500' :
                            status === 'in_progress' ? 'bg-blue-500' :
                              status === 'review' ? 'bg-yellow-500' :
                                'bg-gray-500'
                            }`} />
                          <span className="text-sm capitalize">{status.replace('_', ' ')}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <Progress
                            value={taskStatistics.total > 0 ? (count / taskStatistics.total) * 100 : 0}
                            className="w-32"
                          />
                          <span className="text-sm font-medium w-12 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Pie Chart */}
                  <ChartContainer config={{
                    todo: { label: 'Todo', color: 'hsl(var(--muted))' },
                    in_progress: { label: 'In Progress', color: 'hsl(217.2, 91.2%, 59.8%)' },
                    review: { label: 'Review', color: 'hsl(47.9, 95.7%, 53.1%)' },
                    completed: { label: 'Completed', color: 'hsl(142.1, 76.2%, 36.3%)' },
                  }} className="h-[200px]">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie
                        data={Object.entries(taskStatistics.byStatus).map(([name, value]) => ({ name, value }))}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                      >
                        {Object.entries(taskStatistics.byStatus).map(([status], index) => (
                          <Cell key={`cell-${index}`} fill={
                            status === 'completed' ? 'hsl(142.1, 76.2%, 36.3%)' :
                              status === 'in_progress' ? 'hsl(217.2, 91.2%, 59.8%)' :
                                status === 'review' ? 'hsl(47.9, 95.7%, 53.1%)' :
                                  'hsl(var(--muted))'
                          } />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tasks by Priority</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-4">
                    {Object.entries(taskStatistics.byPriority).map(([priority, count]) => (
                      <div key={priority} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${priority === 'urgent' ? 'bg-red-500' :
                            priority === 'high' ? 'bg-orange-500' :
                              priority === 'medium' ? 'bg-yellow-500' :
                                'bg-gray-500'
                            }`} />
                          <span className="text-sm capitalize">{priority}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <Progress
                            value={taskStatistics.total > 0 ? (count / taskStatistics.total) * 100 : 0}
                            className="w-32"
                          />
                          <span className="text-sm font-medium w-12 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Pie Chart */}
                  <ChartContainer config={{
                    urgent: { label: 'Urgent', color: 'hsl(0, 84.2%, 60.2%)' },
                    high: { label: 'High', color: 'hsl(24.6, 95%, 53.1%)' },
                    medium: { label: 'Medium', color: 'hsl(47.9, 95.7%, 53.1%)' },
                    low: { label: 'Low', color: 'hsl(var(--muted))' },
                  }} className="h-[200px]">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie
                        data={Object.entries(taskStatistics.byPriority).map(([name, value]) => ({ name, value }))}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                      >
                        {Object.entries(taskStatistics.byPriority).map(([priority], index) => (
                          <Cell key={`cell-${index}`} fill={
                            priority === 'urgent' ? 'hsl(0, 84.2%, 60.2%)' :
                              priority === 'high' ? 'hsl(24.6, 95%, 53.1%)' :
                                priority === 'medium' ? 'hsl(47.9, 95.7%, 53.1%)' :
                                  'hsl(var(--muted))'
                          } />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Velocity Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Velocity Trends</CardTitle>
                <CardDescription>Tasks completed and hours logged over time</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="weekly">
                  <TabsList>
                    <TabsTrigger value="weekly">Weekly</TabsTrigger>
                    <TabsTrigger value="monthly">Monthly</TabsTrigger>
                  </TabsList>
                  <TabsContent value="weekly" className="mt-4">
                    <ChartContainer config={{
                      completed: { label: 'Tasks Completed', color: 'hsl(142.1, 76.2%, 36.3%)' },
                      hours: { label: 'Hours Logged', color: 'hsl(217.2, 91.2%, 59.8%)' },
                    }} className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={velocityTrends.weeks}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="week" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend />
                          <Line type="monotone" dataKey="completed" stroke="hsl(142.1, 76.2%, 36.3%)" strokeWidth={2} />
                          <Line type="monotone" dataKey="hours" stroke="hsl(217.2, 91.2%, 59.8%)" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </TabsContent>
                  <TabsContent value="monthly" className="mt-4">
                    <ChartContainer config={{
                      completed: { label: 'Tasks Completed', color: 'hsl(142.1, 76.2%, 36.3%)' },
                      hours: { label: 'Hours Logged', color: 'hsl(217.2, 91.2%, 59.8%)' },
                    }} className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={velocityTrends.months}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend />
                          <Line type="monotone" dataKey="completed" stroke="hsl(142.1, 76.2%, 36.3%)" strokeWidth={2} />
                          <Line type="monotone" dataKey="hours" stroke="hsl(217.2, 91.2%, 59.8%)" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Productivity Tab */}
          <TabsContent value="productivity" className="space-y-4">
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    try {
                      exportProductivityReport(productivityData, 'csv', 'productivity');
                      toast({ title: 'Success', description: 'Productivity report exported as CSV' });
                    } catch (error) {
                      toast({ title: 'Error', description: 'Failed to export report', variant: 'destructive' });
                    }
                  }}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    try {
                      exportProductivityReport(productivityData, 'excel', 'productivity');
                      toast({ title: 'Success', description: 'Productivity report exported as Excel' });
                    } catch (error) {
                      toast({ title: 'Error', description: 'Failed to export report', variant: 'destructive' });
                    }
                  }}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export as Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    try {
                      exportProductivityReport(productivityData, 'pdf', 'productivity');
                      toast({ title: 'Success', description: 'Opening PDF preview...' });
                    } catch (error) {
                      toast({ title: 'Error', description: 'Failed to export report', variant: 'destructive' });
                    }
                  }}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Tabs defaultValue="project" className="space-y-4">
              <TabsList>
                <TabsTrigger value="project">Project</TabsTrigger>
                {isManagerOrAdmin && (
                  <>
                    <TabsTrigger value="team">Team</TabsTrigger>
                    <TabsTrigger value="department">Department</TabsTrigger>
                  </>
                )}
              </TabsList>

              <TabsContent value="project" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Project Productivity</CardTitle>
                    <CardDescription>Hours logged vs. estimated by project</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {productivityData.project.map(item => (
                        <div key={item.projectId} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{item.projectName}</span>
                            <Badge variant={item.productivity > 100 ? 'destructive' : 'default'}>
                              {item.productivity.toFixed(1)}%
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">Logged</p>
                              <p className="font-semibold">{formatHours(item.totalHours)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Estimated</p>
                              <p className="font-semibold">{formatHours(item.estimatedHours)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Billable</p>
                              <p className="font-semibold">{formatHours(item.billableHours)}</p>
                            </div>
                          </div>
                          <Progress value={Math.min(100, item.productivity)} className="mt-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {isManagerOrAdmin && (
                <>
                  <TabsContent value="team" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Team Productivity</CardTitle>
                        <CardDescription>Hours logged by team</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Team</TableHead>
                              <TableHead>Total Hours</TableHead>
                              <TableHead>Billable Hours</TableHead>
                              <TableHead>Billable %</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {teams.map(team => {
                              const teamUserIds = allUsers.filter(u => u.teamId === team.id).map(u => u.id);
                              const teamHours = filteredTimeEntries
                                .filter(e => teamUserIds.includes(e.userId))
                                .reduce((sum, e) => sum + (e.durationMinutes || 0), 0) / 60;
                              const billableHours = filteredTimeEntries
                                .filter(e => teamUserIds.includes(e.userId) && e.billable)
                                .reduce((sum, e) => sum + (e.durationMinutes || 0), 0) / 60;
                              const billablePercent = teamHours > 0 ? (billableHours / teamHours) * 100 : 0;

                              return (
                                <TableRow key={team.id}>
                                  <TableCell>{team.name}</TableCell>
                                  <TableCell>{formatHours(teamHours)}</TableCell>
                                  <TableCell>{formatHours(billableHours)}</TableCell>
                                  <TableCell>{billablePercent.toFixed(1)}%</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="department" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Department Productivity</CardTitle>
                        <CardDescription>Hours logged by department</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Department</TableHead>
                              <TableHead>Total Hours</TableHead>
                              <TableHead>Billable Hours</TableHead>
                              <TableHead>Billable %</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {departments.map(dept => {
                              const deptUserIds = allUsers.filter(u => u.departmentId === dept.id).map(u => u.id);
                              const deptHours = filteredTimeEntries
                                .filter(e => deptUserIds.includes(e.userId))
                                .reduce((sum, e) => sum + (e.durationMinutes || 0), 0) / 60;
                              const billableHours = filteredTimeEntries
                                .filter(e => deptUserIds.includes(e.userId) && e.billable)
                                .reduce((sum, e) => sum + (e.durationMinutes || 0), 0) / 60;
                              const billablePercent = deptHours > 0 ? (billableHours / deptHours) * 100 : 0;

                              return (
                                <TableRow key={dept.id}>
                                  <TableCell>{dept.name}</TableCell>
                                  <TableCell>{formatHours(deptHours)}</TableCell>
                                  <TableCell>{formatHours(billableHours)}</TableCell>
                                  <TableCell>{billablePercent.toFixed(1)}%</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </>
              )}
            </Tabs>
          </TabsContent>
        </Tabs>

        {/* CXO Report Dialog */}
        <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>CXO-Level Project Report</DialogTitle>
              <DialogDescription>
                AI-generated executive summary for {projects.find(p => p.id === selectedProjectForReport)?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              {cxoReport ? (
                <div className="prose max-w-none whitespace-pre-wrap text-sm">
                  {cxoReport}
                </div>
              ) : (
                <p className="text-gray-500">Generating report...</p>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={async () => {
                  if (cxoReport && selectedProjectForReport) {
                    try {
                      const { saveReport } = await import('@/lib/reports-service');
                      const projectName = projects.find(p => p.id === selectedProjectForReport)?.name;
                      await saveReport(selectedProjectForReport, cxoReport, 'cxo', projectName);
                      toast({
                        title: 'Success',
                        description: 'Report saved successfully',
                      });
                      loadSavedReports();
                    } catch (error) {
                      toast({
                        title: 'Error',
                        description: error instanceof Error ? error.message : 'Failed to save report',
                        variant: 'destructive',
                      });
                    }
                  }
                }}
              >
                Save Report
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (cxoReport) {
                    // Download as text file
                    const blob = new Blob([cxoReport], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `cxo-report-${selectedProjectForReport}-${format(new Date(), 'yyyy-MM-dd')}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download TXT
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (cxoReport) {
                    // Generate PDF using browser print
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>CXO Report - ${projects.find(p => p.id === selectedProjectForReport)?.name}</title>
                            <style>
                              body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
                              pre { white-space: pre-wrap; font-family: Arial, sans-serif; }
                              @media print { body { padding: 20px; } }
                            </style>
                          </head>
                          <body>
                            <h1>CXO-Level Project Status Report</h1>
                            <h2>${projects.find(p => p.id === selectedProjectForReport)?.name}</h2>
                            <p>Generated: ${format(new Date(), 'MMMM dd, yyyy')}</p>
                            <hr>
                            <pre>${cxoReport}</pre>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                      setTimeout(() => {
                        printWindow.print();
                      }, 250);
                    }
                  }
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button onClick={() => setIsReportDialogOpen(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

