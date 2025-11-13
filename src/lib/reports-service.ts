import { deepseekService } from './deepseek';
import { Project, Task, TimeEntry } from '../types';
import { format, subWeeks, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { projectReportsService } from './api-data';

interface ReportData {
  projects: Project[];
  tasks: Task[];
  timeEntries: TimeEntry[];
}

export async function generateWeeklyReport(
  projectId: string,
  data: ReportData
): Promise<string> {
  const project = data.projects.find(p => p.id === projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  // Filter data for this project
  const projectTasks = data.tasks.filter(t => t.projectId === projectId);
  const projectTimeEntries = data.timeEntries.filter(entry => {
    const task = data.tasks.find(t => t.id === entry.taskId);
    return task?.projectId === projectId;
  });

  // Calculate metrics for the last week
  const now = new Date();
  const lastWeekStart = startOfWeek(subWeeks(now, 1));
  const lastWeekEnd = endOfWeek(subWeeks(now, 1));
  const currentWeekStart = startOfWeek(now);
  const currentWeekEnd = endOfWeek(now);

  // Last week metrics
  const lastWeekTasks = projectTasks.filter(t => {
    if (t.status !== 'completed' || !t.updatedAt) return false;
    const completedDate = new Date(t.updatedAt);
    return completedDate >= lastWeekStart && completedDate <= lastWeekEnd;
  });
  const lastWeekHours = projectTimeEntries
    .filter(e => {
      const entryDate = new Date(e.startTime);
      return entryDate >= lastWeekStart && entryDate <= lastWeekEnd;
    })
    .reduce((sum, e) => sum + (e.durationMinutes || 0), 0) / 60;

  // Current week metrics
  const currentWeekTasks = projectTasks.filter(t => {
    if (t.status !== 'completed' || !t.updatedAt) return false;
    const completedDate = new Date(t.updatedAt);
    return completedDate >= currentWeekStart && completedDate <= currentWeekEnd;
  });
  const currentWeekHours = projectTimeEntries
    .filter(e => {
      const entryDate = new Date(e.startTime);
      return entryDate >= currentWeekStart && entryDate <= currentWeekEnd;
    })
    .reduce((sum, e) => sum + (e.durationMinutes || 0), 0) / 60;

  // Overall metrics
  const totalTasks = projectTasks.length;
  const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
  const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  const totalHours = projectTimeEntries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0) / 60;
  const estimatedHours = projectTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
  const hoursProgress = estimatedHours > 0 ? (totalHours / estimatedHours) * 100 : 0;

  // Risks and blockers
  const overdueTasks = projectTasks.filter(t => {
    if (t.status === 'completed') return false;
    return new Date(t.dueDate) < now;
  });
  const highPriorityPending = projectTasks.filter(t => 
    (t.priority === 'urgent' || t.priority === 'high') && t.status !== 'completed'
  );
  const blockedTasks = projectTasks.filter(t => t.status === 'review');

  // Status breakdown
  const statusBreakdown = {
    todo: projectTasks.filter(t => t.status === 'todo').length,
    in_progress: projectTasks.filter(t => t.status === 'in_progress').length,
    review: projectTasks.filter(t => t.status === 'review').length,
    completed: completedTasks,
  };

  // Timeline
  const startDate = new Date(project.startDate);
  const endDate = new Date(project.endDate);
  const totalDuration = endDate.getTime() - startDate.getTime();
  const elapsed = now.getTime() - startDate.getTime();
  const timelineProgress = totalDuration > 0 ? Math.min(100, (elapsed / totalDuration) * 100) : 0;
  const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Prepare data for AI
  const reportContext = {
    projectName: project.name,
    projectDescription: project.description,
    projectStatus: project.status,
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
    overallProgress: {
      completionPercentage: completionPercentage.toFixed(1),
      totalTasks,
      completedTasks,
      totalHours: totalHours.toFixed(1),
      estimatedHours: estimatedHours.toFixed(1),
      hoursProgress: hoursProgress.toFixed(1),
    },
    lastWeek: {
      tasksCompleted: lastWeekTasks.length,
      hoursLogged: lastWeekHours.toFixed(1),
    },
    currentWeek: {
      tasksCompleted: currentWeekTasks.length,
      hoursLogged: currentWeekHours.toFixed(1),
    },
    risks: {
      overdueTasks: overdueTasks.length,
      highPriorityPending: highPriorityPending.length,
      blockedTasks: blockedTasks.length,
    },
    statusBreakdown,
    timeline: {
      progress: timelineProgress.toFixed(1),
      daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
      isOverdue: daysRemaining < 0,
    },
  };

  // Generate AI report
  const systemPrompt = `You are an executive assistant preparing a weekly project status report. 
Your report should be professional, concise, and focused on the past week's activities and current status.
Focus on:
1. Executive Summary (1-2 paragraphs highlighting key achievements and status)
2. This Week's Progress (tasks completed, hours logged, key milestones)
3. Last Week Comparison (how this week compares to last week)
4. Risks & Blockers (issues that need immediate attention)
5. Next Week Priorities (actionable items for the upcoming week)

Format the report in clear sections with headers. Be specific with numbers and percentages.
Use business language appropriate for weekly status updates.`;

  const userPrompt = `Generate a weekly project status report for "${reportContext.projectName}".

Project Details:
- Description: ${reportContext.projectDescription}
- Status: ${reportContext.projectStatus}
- Timeline: ${reportContext.startDate} to ${reportContext.endDate}

Overall Progress:
- Task Completion: ${reportContext.overallProgress.completedTasks}/${reportContext.overallProgress.totalTasks} tasks (${reportContext.overallProgress.completionPercentage}%)
- Hours: ${reportContext.overallProgress.totalHours}h logged / ${reportContext.overallProgress.estimatedHours}h estimated (${reportContext.overallProgress.hoursProgress}%)
- Timeline: ${reportContext.timeline.progress}% elapsed${reportContext.timeline.isOverdue ? ' (OVERDUE)' : `, ${reportContext.timeline.daysRemaining} days remaining`}

This Week (Current Week):
- Tasks Completed: ${reportContext.currentWeek.tasksCompleted}
- Hours Logged: ${reportContext.currentWeek.hoursLogged}h

Last Week:
- Tasks Completed: ${reportContext.lastWeek.tasksCompleted}
- Hours Logged: ${reportContext.lastWeek.hoursLogged}h

Current Status Breakdown:
- Todo: ${reportContext.statusBreakdown.todo}
- In Progress: ${reportContext.statusBreakdown.in_progress}
- In Review: ${reportContext.statusBreakdown.review}
- Completed: ${reportContext.statusBreakdown.completed}

Risks & Blockers:
- Overdue Tasks: ${reportContext.risks.overdueTasks}
- High Priority Pending: ${reportContext.risks.highPriorityPending}
- Blocked in Review: ${reportContext.risks.blockedTasks}

Generate a comprehensive weekly report with all sections mentioned in the system prompt.`;

  try {
    const response = await deepseekService.generateReport(userPrompt, systemPrompt);
    return response;
  } catch (error) {
    // Fallback to template-based report if AI fails
    return generateWeeklyTemplateReport(reportContext);
  }
}

export async function generateCXOReport(
  projectId: string,
  data: ReportData
): Promise<string> {
  const project = data.projects.find(p => p.id === projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  // Filter data for this project
  const projectTasks = data.tasks.filter(t => t.projectId === projectId);
  const projectTimeEntries = data.timeEntries.filter(entry => {
    const task = data.tasks.find(t => t.id === entry.taskId);
    return task?.projectId === projectId;
  });

  // Calculate metrics
  const now = new Date();
  const lastWeekStart = startOfWeek(subWeeks(now, 1));
  const lastWeekEnd = endOfWeek(subWeeks(now, 1));
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  // Overall metrics
  const totalTasks = projectTasks.length;
  const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
  const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  const totalHours = projectTimeEntries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0) / 60;
  const estimatedHours = projectTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
  const hoursProgress = estimatedHours > 0 ? (totalHours / estimatedHours) * 100 : 0;

  // Last week metrics
  const lastWeekTasks = projectTasks.filter(t => {
    const completedDate = t.status === 'completed' && t.updatedAt 
      ? new Date(t.updatedAt) 
      : null;
    return completedDate && completedDate >= lastWeekStart && completedDate <= lastWeekEnd;
  });
  const lastWeekHours = projectTimeEntries
    .filter(e => {
      const entryDate = new Date(e.startTime);
      return entryDate >= lastWeekStart && entryDate <= lastWeekEnd;
    })
    .reduce((sum, e) => sum + (e.durationMinutes || 0), 0) / 60;

  // Last month metrics
  const lastMonthTasks = projectTasks.filter(t => {
    const completedDate = t.status === 'completed' && t.updatedAt 
      ? new Date(t.updatedAt) 
      : null;
    return completedDate && completedDate >= lastMonthStart && completedDate <= lastMonthEnd;
  });
  const lastMonthHours = projectTimeEntries
    .filter(e => {
      const entryDate = new Date(e.startTime);
      return entryDate >= lastMonthStart && entryDate <= lastMonthEnd;
    })
    .reduce((sum, e) => sum + (e.durationMinutes || 0), 0) / 60;

  // Risks and blockers
  const overdueTasks = projectTasks.filter(t => {
    if (t.status === 'completed') return false;
    return new Date(t.dueDate) < now;
  });
  const highPriorityPending = projectTasks.filter(t => 
    (t.priority === 'urgent' || t.priority === 'high') && t.status !== 'completed'
  );
  const blockedTasks = projectTasks.filter(t => t.status === 'review');

  // Status breakdown
  const statusBreakdown = {
    todo: projectTasks.filter(t => t.status === 'todo').length,
    in_progress: projectTasks.filter(t => t.status === 'in_progress').length,
    review: projectTasks.filter(t => t.status === 'review').length,
    completed: completedTasks,
  };

  // Timeline
  const startDate = new Date(project.startDate);
  const endDate = new Date(project.endDate);
  const totalDuration = endDate.getTime() - startDate.getTime();
  const elapsed = now.getTime() - startDate.getTime();
  const timelineProgress = totalDuration > 0 ? Math.min(100, (elapsed / totalDuration) * 100) : 0;
  const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Prepare data for AI
  const reportContext = {
    projectName: project.name,
    projectDescription: project.description,
    projectStatus: project.status,
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
    overallProgress: {
      completionPercentage: completionPercentage.toFixed(1),
      totalTasks,
      completedTasks,
      totalHours: totalHours.toFixed(1),
      estimatedHours: estimatedHours.toFixed(1),
      hoursProgress: hoursProgress.toFixed(1),
    },
    lastWeek: {
      tasksCompleted: lastWeekTasks.length,
      hoursLogged: lastWeekHours.toFixed(1),
    },
    lastMonth: {
      tasksCompleted: lastMonthTasks.length,
      hoursLogged: lastMonthHours.toFixed(1),
    },
    risks: {
      overdueTasks: overdueTasks.length,
      highPriorityPending: highPriorityPending.length,
      blockedTasks: blockedTasks.length,
    },
    statusBreakdown,
    timeline: {
      progress: timelineProgress.toFixed(1),
      daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
      isOverdue: daysRemaining < 0,
    },
  };

  // Generate AI report
  const systemPrompt = `You are an executive assistant preparing a CXO-level project status report. 
Your report should be professional, concise, and actionable. Focus on:
1. Executive Summary (2-3 paragraphs)
2. Overall Progress (key metrics and achievements)
3. Recent Activity (last week and last month highlights)
4. Risks & Blockers (identify issues that need attention)
5. Recommendations (actionable next steps)

Format the report in clear sections with headers. Be specific with numbers and percentages.
Use business language appropriate for C-level executives.`;

  const userPrompt = `Generate a comprehensive CXO-level project status report for "${reportContext.projectName}".

Project Details:
- Description: ${reportContext.projectDescription}
- Status: ${reportContext.projectStatus}
- Timeline: ${reportContext.startDate} to ${reportContext.endDate}

Overall Progress:
- Task Completion: ${reportContext.overallProgress.completedTasks}/${reportContext.overallProgress.totalTasks} tasks (${reportContext.overallProgress.completionPercentage}%)
- Hours: ${reportContext.overallProgress.totalHours}h logged / ${reportContext.overallProgress.estimatedHours}h estimated (${reportContext.overallProgress.hoursProgress}%)
- Timeline: ${reportContext.timeline.progress}% elapsed${reportContext.timeline.isOverdue ? ' (OVERDUE)' : `, ${reportContext.timeline.daysRemaining} days remaining`}

Last Week Activity:
- Tasks Completed: ${reportContext.lastWeek.tasksCompleted}
- Hours Logged: ${reportContext.lastWeek.hoursLogged}h

Last Month Activity:
- Tasks Completed: ${reportContext.lastMonth.tasksCompleted}
- Hours Logged: ${reportContext.lastMonth.hoursLogged}h

Current Status Breakdown:
- Todo: ${reportContext.statusBreakdown.todo}
- In Progress: ${reportContext.statusBreakdown.in_progress}
- In Review: ${reportContext.statusBreakdown.review}
- Completed: ${reportContext.statusBreakdown.completed}

Risks & Blockers:
- Overdue Tasks: ${reportContext.risks.overdueTasks}
- High Priority Pending: ${reportContext.risks.highPriorityPending}
- Blocked in Review: ${reportContext.risks.blockedTasks}

Generate a comprehensive executive report with all sections mentioned in the system prompt.`;

  try {
    const response = await deepseekService.generateReport(userPrompt, systemPrompt);
    return response;
  } catch (error) {
    // Fallback to template-based report if AI fails
    return generateTemplateReport(reportContext);
  }
}

export async function saveReport(
  projectId: string,
  reportContent: string,
  reportType: 'cxo' | 'summary' | 'detailed' = 'cxo',
  projectName?: string
): Promise<void> {
  const reportTitle = projectName 
    ? `CXO Report - ${projectName} - ${format(new Date(), 'MMM dd, yyyy')}`
    : `CXO Report - ${format(new Date(), 'MMM dd, yyyy')}`;
  
  await projectReportsService.createReport({
    projectId,
    title: reportTitle,
    content: reportContent,
    reportType,
  });
}

function generateWeeklyTemplateReport(context: any): string {
  return `WEEKLY PROJECT STATUS REPORT
${'='.repeat(60)}

PROJECT: ${context.projectName}
STATUS: ${context.projectStatus.toUpperCase()}
REPORT DATE: ${format(new Date(), 'MMMM dd, yyyy')}
WEEK: ${format(new Date(), 'Week of MMMM dd')}

${'='.repeat(60)}

EXECUTIVE SUMMARY
${'-'.repeat(60)}

The ${context.projectName} project is currently ${context.projectStatus} with ${context.overallProgress.completionPercentage}% of tasks completed. 
This week, ${context.currentWeek.tasksCompleted} tasks were completed with ${context.currentWeek.hoursLogged} hours logged.

${context.currentWeek.tasksCompleted > context.lastWeek.tasksCompleted 
  ? `Productivity increased this week compared to last week (${context.lastWeek.tasksCompleted} tasks completed).`
  : context.currentWeek.tasksCompleted < context.lastWeek.tasksCompleted
  ? `Productivity decreased this week compared to last week (${context.lastWeek.tasksCompleted} tasks completed).`
  : 'Productivity remained consistent with last week.'}

${'='.repeat(60)}

THIS WEEK'S PROGRESS
${'-'.repeat(60)}

Tasks Completed: ${context.currentWeek.tasksCompleted}
Hours Logged: ${context.currentWeek.hoursLogged}h

${'='.repeat(60)}

LAST WEEK COMPARISON
${'-'.repeat(60)}

Last Week:
  • Tasks Completed: ${context.lastWeek.tasksCompleted}
  • Hours Logged: ${context.lastWeek.hoursLogged}h

This Week:
  • Tasks Completed: ${context.currentWeek.tasksCompleted}
  • Hours Logged: ${context.currentWeek.hoursLogged}h

${'='.repeat(60)}

RISKS & BLOCKERS
${'-'.repeat(60)}

Critical Issues Requiring Attention:
  • Overdue Tasks: ${context.risks.overdueTasks}
  • High Priority Pending: ${context.risks.highPriorityPending}
  • Tasks Blocked in Review: ${context.risks.blockedTasks}

${context.risks.overdueTasks > 0 || context.risks.highPriorityPending > 0 
  ? '⚠️  Immediate action required to address overdue and high-priority tasks.'
  : '✓ No critical blockers identified at this time.'}

${'='.repeat(60)}

NEXT WEEK PRIORITIES
${'-'.repeat(60)}

1. ${context.risks.overdueTasks > 0 
  ? `Address ${context.risks.overdueTasks} overdue task(s) immediately.`
  : 'Continue steady progress toward project completion.'}

2. ${context.risks.highPriorityPending > 0 
  ? `Prioritize completion of ${context.risks.highPriorityPending} high-priority pending task(s).`
  : 'Maintain focus on high-priority items.'}

3. ${context.risks.blockedTasks > 0 
  ? `Expedite review process for ${context.risks.blockedTasks} task(s) currently in review.`
  : 'Maintain efficient review processes.'}

${'='.repeat(60)}

END OF REPORT
`;
}

function generateTemplateReport(context: any): string {
  return `CXO-LEVEL PROJECT STATUS REPORT
${'='.repeat(60)}

PROJECT: ${context.projectName}
STATUS: ${context.projectStatus.toUpperCase()}
REPORT DATE: ${format(new Date(), 'MMMM dd, yyyy')}

${'='.repeat(60)}

EXECUTIVE SUMMARY
${'-'.repeat(60)}

The ${context.projectName} project is currently ${context.projectStatus} with ${context.overallProgress.completionPercentage}% of tasks completed. 
${context.overallProgress.totalHours} hours have been logged against an estimated ${context.overallProgress.estimatedHours} hours, 
representing ${context.overallProgress.hoursProgress}% progress on time allocation.

The project timeline shows ${context.timeline.progress}% elapsed${context.timeline.isOverdue 
  ? ' and the project is OVERDUE' 
  : ` with ${context.timeline.daysRemaining} days remaining`}.

${'='.repeat(60)}

OVERALL PROGRESS
${'-'.repeat(60)}

Task Completion:
  • Total Tasks: ${context.overallProgress.totalTasks}
  • Completed: ${context.overallProgress.completedTasks}
  • Completion Rate: ${context.overallProgress.completionPercentage}%

Time Allocation:
  • Hours Logged: ${context.overallProgress.totalHours}h
  • Hours Estimated: ${context.overallProgress.estimatedHours}h
  • Progress: ${context.overallProgress.hoursProgress}%

Status Distribution:
  • Todo: ${context.statusBreakdown.todo} tasks
  • In Progress: ${context.statusBreakdown.in_progress} tasks
  • In Review: ${context.statusBreakdown.review} tasks
  • Completed: ${context.statusBreakdown.completed} tasks

${'='.repeat(60)}

RECENT ACTIVITY
${'-'.repeat(60)}

Last Week:
  • Tasks Completed: ${context.lastWeek.tasksCompleted}
  • Hours Logged: ${context.lastWeek.hoursLogged}h

Last Month:
  • Tasks Completed: ${context.lastMonth.tasksCompleted}
  • Hours Logged: ${context.lastMonth.hoursLogged}h

${'='.repeat(60)}

RISKS & BLOCKERS
${'-'.repeat(60)}

Critical Issues Requiring Attention:
  • Overdue Tasks: ${context.risks.overdueTasks}
  • High Priority Pending: ${context.risks.highPriorityPending}
  • Tasks Blocked in Review: ${context.risks.blockedTasks}

${context.risks.overdueTasks > 0 || context.risks.highPriorityPending > 0 
  ? '⚠️  Immediate action required to address overdue and high-priority tasks.'
  : '✓ No critical blockers identified at this time.'}

${'='.repeat(60)}

RECOMMENDATIONS
${'-'.repeat(60)}

1. ${context.risks.overdueTasks > 0 
  ? `Address ${context.risks.overdueTasks} overdue task(s) immediately to prevent further delays.`
  : 'Maintain current pace to meet project deadlines.'}

2. ${context.risks.highPriorityPending > 0 
  ? `Prioritize completion of ${context.risks.highPriorityPending} high-priority pending task(s).`
  : 'Continue focusing on high-priority items.'}

3. ${context.risks.blockedTasks > 0 
  ? `Expedite review process for ${context.risks.blockedTasks} task(s) currently in review.`
  : 'Maintain efficient review processes.'}

4. ${context.timeline.isOverdue 
  ? 'Develop recovery plan to bring project back on schedule.'
  : context.timeline.daysRemaining < 7
  ? 'Finalize remaining tasks to meet upcoming deadline.'
  : 'Continue steady progress toward project completion.'}

${'='.repeat(60)}

END OF REPORT
`;
}

// Extend deepseekService with report generation
if (typeof (deepseekService as any).generateReport === 'undefined') {
  (deepseekService as any).generateReport = async (userPrompt: string, systemPrompt: string): Promise<string> => {
    const AI_API_KEY = (import.meta as any).env.VITE_AI_API_KEY;
    const AI_API_URL = (import.meta as any).env.VITE_AI_API_URL || 'https://api.deepseek.com/v1/chat/completions';
    const DEFAULT_MODEL = (import.meta as any).env.VITE_AI_MODEL || 'deepseek-reasoner';

    if (!AI_API_KEY || !AI_API_URL) {
      throw new Error('AI API not configured');
    }

    try {
      const response = await fetch(AI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_API_KEY}`,
        },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'Failed to generate report';
    } catch (error) {
      console.error('Error generating AI report:', error);
      throw error;
    }
  };
}

