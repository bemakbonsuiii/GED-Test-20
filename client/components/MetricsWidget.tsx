import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { ChevronUp, ChevronDown, Target, CalendarIcon, Zap, Briefcase } from "lucide-react";

interface Todo {
  id: string;
  completed: boolean;
  isEOD?: boolean;
  dueDate?: number | string;
  startDate?: number;
  project?: string;
  workspace: string;
  isPriority?: boolean;
}

interface Project {
  id: string;
  name: string;
  workspace: string;
}

interface MetricsWidgetProps {
  workspace: string;
  selectedProjectPage: string | null;
  todos: Todo[];
  projects: Project[];
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
}

export function MetricsWidget({ 
  workspace, 
  selectedProjectPage, 
  todos, 
  projects, 
  isExpanded, 
  setIsExpanded 
}: MetricsWidgetProps) {
  
  const getDailyTasksMetrics = (filteredTodos: Todo[]) => {
    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const dailyTasks = filteredTodos.filter(t => {
      if (t.completed) return false;
      if (t.isPriority) return true;
      if (t.isEOD) return true;
      if (t.dueDate) {
        const dueTime = typeof t.dueDate === 'string' ? new Date(t.dueDate).getTime() : t.dueDate;
        return dueTime >= today.getTime() && dueTime <= todayEnd.getTime();
      }
      return false;
    });

    const overdueTasks = filteredTodos.filter(t => {
      if (t.completed) return false;
      if (!t.dueDate) return false;
      const dueTime = typeof t.dueDate === 'string' ? new Date(t.dueDate).getTime() : t.dueDate;
      return dueTime < today.getTime();
    });

    const completedToday = filteredTodos.filter(t => {
      if (!t.completed) return false;
      if (t.isPriority) return true;
      if (t.isEOD) return true;
      if (t.dueDate) {
        const dueTime = typeof t.dueDate === 'string' ? new Date(t.dueDate).getTime() : t.dueDate;
        return dueTime >= today.getTime() && dueTime <= todayEnd.getTime();
      }
      return false;
    });

    const completedOverdue = filteredTodos.filter(t => {
      if (!t.completed) return false;
      if (!t.dueDate) return false;
      const dueTime = typeof t.dueDate === 'string' ? new Date(t.dueDate).getTime() : t.dueDate;
      return dueTime < today.getTime();
    });

    const totalIncomplete = dailyTasks.length + overdueTasks.length;
    const totalCompleted = completedToday.length + completedOverdue.length;
    const totalTasks = totalIncomplete + totalCompleted;

    return {
      total: totalIncomplete,
      completed: totalCompleted,
      percentage: totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0
    };
  };

  const getActionableTasksMetrics = (filteredTodos: Todo[]) => {
    const now = Date.now();
    const actionableTasks = filteredTodos.filter(t => {
      if (t.completed) return false;
      return !t.startDate || t.startDate <= now;
    });

    const totalIncompleteTasks = filteredTodos.filter(t => !t.completed);

    return {
      actionable: actionableTasks.length,
      total: totalIncompleteTasks.length,
      percentage: totalIncompleteTasks.length > 0 ? Math.round((actionableTasks.length / totalIncompleteTasks.length) * 100) : 0
    };
  };

  const renderProjectPageMetrics = () => {
    if (!selectedProjectPage) return null;

    const projectTodos = todos.filter(t => t.project === selectedProjectPage);
    const dailyMetrics = getDailyTasksMetrics(projectTodos);
    const actionableMetrics = getActionableTasksMetrics(projectTodos);
    
    const totalCompleted = projectTodos.filter(t => t.completed).length;
    const overallPercentage = projectTodos.length > 0 ? Math.round((totalCompleted / projectTodos.length) * 100) : 0;

    return (
      <>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium">Project Completion</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {totalCompleted} / {projectTodos.length} tasks
            </span>
          </div>
          <div className="relative h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
              style={{ width: `${overallPercentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {overallPercentage}% of project tasks completed
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <span className="text-sm font-medium">Today's Tasks</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {dailyMetrics.completed} / {dailyMetrics.completed + dailyMetrics.total} completed
            </span>
          </div>
          <div className="relative h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-500"
              style={{ width: `${dailyMetrics.percentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Tasks due today & overdue • {dailyMetrics.percentage}% complete
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium">Actionable Tasks</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {actionableMetrics.actionable} / {actionableMetrics.total}
            </span>
          </div>
          <div className="relative h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
              style={{ width: `${actionableMetrics.percentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Tasks ready to start • {actionableMetrics.percentage}% of project tasks
          </p>
        </div>
      </>
    );
  };

  const renderWorkspaceMetrics = () => {
    const wsTodos = todos.filter(t => t.workspace === workspace);
    const wsProjects = projects.filter(p => p.workspace === workspace);
    
    const dailyMetrics = getDailyTasksMetrics(wsTodos);
    const actionableMetrics = getActionableTasksMetrics(wsTodos);

    const projectsData = wsProjects.map(project => {
      const projectTodos = wsTodos.filter(t => t.project === project.name);
      const completed = projectTodos.filter(t => t.completed).length;
      return {
        name: project.name,
        total: projectTodos.length,
        completed,
        percentage: projectTodos.length > 0 ? Math.round((completed / projectTodos.length) * 100) : 0
      };
    });

    return (
      <>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <span className="text-sm font-medium">Today's Tasks</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {dailyMetrics.completed} / {dailyMetrics.completed + dailyMetrics.total} completed
            </span>
          </div>
          <div className="relative h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-500"
              style={{ width: `${dailyMetrics.percentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Tasks due today & overdue • {dailyMetrics.percentage}% complete
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium">Actionable Tasks</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {actionableMetrics.actionable} / {actionableMetrics.total}
            </span>
          </div>
          <div className="relative h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
              style={{ width: `${actionableMetrics.percentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Tasks ready to start • {actionableMetrics.percentage}% of workspace tasks
          </p>
        </div>

        {projectsData.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium">Projects</span>
            </div>
            {projectsData.map(project => (
              <div key={project.name} className="space-y-2 p-3 bg-accent/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{project.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {project.completed} / {project.total} tasks
                  </span>
                </div>
                {project.total > 0 && (
                  <div className="relative h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-500"
                      style={{ width: `${project.percentage}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  const renderHomepageMetrics = () => {
    const dailyMetrics = getDailyTasksMetrics(todos);
    const actionableMetrics = getActionableTasksMetrics(todos);

    const workspaceTypes = ['personal', 'work', 'creative'];
    const workspaceMetrics = workspaceTypes.map(ws => {
      const wsProjects = projects.filter(p => p.workspace === ws);
      const projectsData = wsProjects.map(project => {
        const projectTodos = todos.filter(t => t.project === project.name && t.workspace === ws);
        const completed = projectTodos.filter(t => t.completed).length;
        return {
          name: project.name,
          total: projectTodos.length,
          completed,
          percentage: projectTodos.length > 0 ? Math.round((completed / projectTodos.length) * 100) : 0
        };
      });

      const totalTodos = projectsData.reduce((acc, p) => acc + p.total, 0);
      const totalCompleted = projectsData.reduce((acc, p) => acc + p.completed, 0);

      return {
        workspace: ws,
        projects: projectsData,
        overall: totalTodos > 0 ? Math.round((totalCompleted / totalTodos) * 100) : 0,
        totalTodos,
        totalCompleted
      };
    });

    return (
      <>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <span className="text-sm font-medium">Today's Tasks</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {dailyMetrics.completed} / {dailyMetrics.completed + dailyMetrics.total} completed
            </span>
          </div>
          <div className="relative h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-500"
              style={{ width: `${dailyMetrics.percentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Tasks due today, overdue, or marked as EOD • {dailyMetrics.percentage}% complete
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium">Actionable Tasks</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {actionableMetrics.actionable} / {actionableMetrics.total}
            </span>
          </div>
          <div className="relative h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
              style={{ width: `${actionableMetrics.percentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Tasks ready to start now • {actionableMetrics.percentage}% of all tasks
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-medium">Projects by Workspace</span>
          </div>
          {workspaceMetrics.map(wsMetric => (
            <div key={wsMetric.workspace} className="space-y-2 p-3 bg-accent/30 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize">{wsMetric.workspace}</span>
                <span className="text-xs text-muted-foreground">
                  {wsMetric.totalCompleted} / {wsMetric.totalTodos} tasks
                </span>
              </div>
              {wsMetric.totalTodos > 0 ? (
                <>
                  <div className="relative h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-500"
                      style={{ width: `${wsMetric.overall}%` }}
                    />
                  </div>
                  {wsMetric.projects.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {wsMetric.projects.map(project => (
                        <div key={project.name} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground truncate flex-1">{project.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{project.completed}/{project.total}</span>
                            <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-purple-500"
                                style={{ width: `${project.percentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">No projects in this workspace</p>
              )}
            </div>
          ))}
        </div>
      </>
    );
  };

  return (
    <Card className="mb-6 border border-slate-200 dark:border-slate-800">
      <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Target className="h-4 w-4" />
          Progress
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </CardTitle>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-6 pt-4">
          {selectedProjectPage 
            ? renderProjectPageMetrics()
            : workspace !== "everything"
              ? renderWorkspaceMetrics()
              : renderHomepageMetrics()
          }
        </CardContent>
      )}
    </Card>
  );
}
