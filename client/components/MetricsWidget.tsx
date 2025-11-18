import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { ChevronUp, ChevronDown, Target, CalendarIcon, Zap, Briefcase, AlertTriangle } from "lucide-react";

interface Todo {
  id: string;
  completed: boolean;
  dueDate?: number | string;
  startDate?: number;
  project?: string;
  workspace: string;
  isPriority?: boolean;
  parentId?: string;
  type: "Task" | "Deliverable" | "Quick Win" | "Meeting" | "Blocker";
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

  const createPieChart = (segments: Array<{ value: number; color: string; label: string }>, size: number = 120) => {
    const total = segments.reduce((sum, seg) => sum + seg.value, 0);
    if (total === 0) return null;

    let currentAngle = -90; // Start at top
    const paths: JSX.Element[] = [];

    segments.forEach((segment, index) => {
      if (segment.value === 0) return;

      const percentage = segment.value / total;
      const angle = percentage * 360;
      const endAngle = currentAngle + angle;

      const startRad = (currentAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const radius = size / 2;
      const x1 = radius + radius * Math.cos(startRad);
      const y1 = radius + radius * Math.sin(startRad);
      const x2 = radius + radius * Math.cos(endRad);
      const y2 = radius + radius * Math.sin(endRad);

      const largeArcFlag = angle > 180 ? 1 : 0;

      const pathData = `M ${radius} ${radius} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

      paths.push(
        <path
          key={index}
          d={pathData}
          fill={segment.color}
          className="transition-all duration-500"
        >
          <title>{`${segment.label}: ${segment.value}`}</title>
        </path>
      );

      currentAngle = endAngle;
    });

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths}
      </svg>
    );
  };

  const getDailyTasksMetrics = (filteredTodos: Todo[]) => {
    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const dailyTasks = filteredTodos.filter(t => {
      if (t.completed) return false;
      if (t.isPriority) return true;
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
    // Actionable tasks are those that can be started now (no start date or start date has passed) AND are not blocked
    const actionableCompleted = filteredTodos.filter(t => {
      if (!t.completed) return false;
      const hasUncompletedChildren = todos.some(child => child.parentId === t.id && !child.completed);
      if (hasUncompletedChildren) return false; // Exclude blocked todos
      return !t.startDate || t.startDate <= now;
    });

    const actionableIncomplete = filteredTodos.filter(t => {
      if (t.completed) return false;
      const hasUncompletedChildren = todos.some(child => child.parentId === t.id && !child.completed);
      if (hasUncompletedChildren) return false; // Exclude blocked todos
      return !t.startDate || t.startDate <= now;
    });

    const totalActionable = actionableCompleted.length + actionableIncomplete.length;

    return {
      actionable: actionableCompleted.length,
      total: actionableIncomplete.length,
      percentage: totalActionable > 0 ? Math.round((actionableCompleted.length / totalActionable) * 100) : 0
    };
  };

  const getBlockedTasksMetrics = (filteredTodos: Todo[]) => {
    const now = Date.now();

    // All todos that are currently blocked by either a blocker child or an unfinished child
    const blockedTodos = filteredTodos.filter(t => {
      if (t.completed) return false; // Don't count completed todos

      // Check if this todo has any uncompleted children
      const hasUncompletedChildren = todos.some(child => child.parentId === t.id && !child.completed);

      return hasUncompletedChildren;
    });

    // Not started todos (start date hasn't elapsed yet)
    const notStartedTodos = filteredTodos.filter(t => {
      if (t.completed) return false;
      if (!t.startDate) return false; // Only count todos with a start date
      return t.startDate > now;
    });

    // Separate by blocker type for detail
    const blockedByBlocker = blockedTodos.filter(t =>
      todos.some(child => child.parentId === t.id && child.type === 'Blocker' && !child.completed)
    );

    const blockedByOtherChildren = blockedTodos.filter(t => {
      const hasBlocker = todos.some(child => child.parentId === t.id && child.type === 'Blocker' && !child.completed);
      return !hasBlocker; // Has other children but not blockers
    });

    const totalBlocked = blockedTodos.length + notStartedTodos.length;

    return {
      total: totalBlocked,
      byBlocker: blockedByBlocker.length,
      byChildren: blockedByOtherChildren.length,
      notStarted: notStartedTodos.length
    };
  };

  const getTodosByType = (filteredTodos: Todo[]) => {
    const types: Array<{ type: "Task" | "Deliverable" | "Quick Win" | "Meeting" | "Blocker"; color: string; count: number }> = [
      { type: "Blocker", color: "from-red-500 to-red-600", count: 0 }, // Blocker first
      { type: "Task", color: "from-blue-500 to-blue-600", count: 0 },
      { type: "Deliverable", color: "from-purple-500 to-purple-600", count: 0 },
      { type: "Quick Win", color: "from-green-500 to-green-600", count: 0 },
      { type: "Meeting", color: "from-orange-500 to-orange-600", count: 0 },
    ];

    filteredTodos.forEach(todo => {
      const typeData = types.find(t => t.type === todo.type);
      if (typeData) {
        typeData.count++;
      }
    });

    const total = filteredTodos.length;
    return { types, total };
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
          <div className="relative h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
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
          <div className="relative h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
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
              <span className="text-sm font-medium">Actionable To-dos</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {actionableMetrics.actionable} / {actionableMetrics.total}
            </span>
          </div>
          <div className="relative h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
              style={{ width: `${actionableMetrics.percentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Tasks ready to start • {actionableMetrics.percentage}% of project tasks
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium">Blocked To-dos</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {(() => {
                const blockedMetrics = getBlockedTasksMetrics(projectTodos);
                return blockedMetrics.total;
              })()}
            </span>
          </div>
          <div className="relative h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="flex h-full">
              {(() => {
                const blockedMetrics = getBlockedTasksMetrics(projectTodos);
                return (
                  <>
                    <div
                      className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-500"
                      style={{ width: `${blockedMetrics.total > 0 ? (blockedMetrics.byBlocker / blockedMetrics.total) * 100 : 0}%` }}
                      title={`${blockedMetrics.byBlocker} blocked by Blockers`}
                    />
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-500"
                      style={{ width: `${blockedMetrics.total > 0 ? (blockedMetrics.byChildren / blockedMetrics.total) * 100 : 0}%` }}
                      title={`${blockedMetrics.byChildren} blocked by other children`}
                    />
                    <div
                      className="h-full bg-gradient-to-r from-slate-500 to-slate-600 transition-all duration-500"
                      style={{ width: `${blockedMetrics.total > 0 ? (blockedMetrics.notStarted / blockedMetrics.total) * 100 : 0}%` }}
                      title={`${blockedMetrics.notStarted} not started yet`}
                    />
                  </>
                );
              })()}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {(() => {
              const blockedMetrics = getBlockedTasksMetrics(projectTodos);
              return `${blockedMetrics.byBlocker} by Blockers • ${blockedMetrics.byChildren} by other children • ${blockedMetrics.notStarted} not started`;
            })()}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            <span className="text-sm font-medium">To-dos Overview</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* Total To-dos Pie Chart */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground text-center">By Type</div>
              <div className="flex justify-center">
                {(() => {
                  const typeMetrics = getTodosByType(projectTodos);
                  const colorMap: Record<string, string> = {
                    "Blocker": "#ef4444",
                    "Task": "#3b82f6",
                    "Deliverable": "#a855f7",
                    "Quick Win": "#22c55e",
                    "Meeting": "#f97316"
                  };
                  return createPieChart(
                    typeMetrics.types.map(t => ({
                      value: t.count,
                      color: colorMap[t.type] || "#6b7280",
                      label: t.type
                    })),
                    120
                  );
                })()}
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                {(() => {
                  const typeMetrics = getTodosByType(projectTodos);
                  return typeMetrics.types
                    .filter(t => t.count > 0)
                    .map((t, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          t.type === "Blocker" ? "bg-red-500" :
                          t.type === "Task" ? "bg-blue-500" :
                          t.type === "Deliverable" ? "bg-purple-500" :
                          t.type === "Quick Win" ? "bg-green-500" :
                          "bg-orange-500"
                        }`}></div>
                        <span>{t.count} {t.type}{t.count !== 1 ? 's' : ''}</span>
                      </div>
                    ));
                })()}
              </div>
            </div>

            {/* Actionable vs Blocked Pie Chart */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground text-center">Actionable vs Blocked</div>
              <div className="flex justify-center">
                {(() => {
                  const actionableMetrics = getActionableTasksMetrics(projectTodos);
                  const blockedMetrics = getBlockedTasksMetrics(projectTodos);
                  return createPieChart(
                    [
                      { value: actionableMetrics.total, color: "#22c55e", label: "Actionable" },
                      { value: blockedMetrics.total, color: "#ef4444", label: "Blocked" }
                    ],
                    120
                  );
                })()}
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                {(() => {
                  const actionableMetrics = getActionableTasksMetrics(projectTodos);
                  const blockedMetrics = getBlockedTasksMetrics(projectTodos);
                  return (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span>{actionableMetrics.total} Actionable</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span>{blockedMetrics.total} Blocked</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
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
          <div className="relative h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
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
              <span className="text-sm font-medium">Actionable To-dos</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {actionableMetrics.actionable} / {actionableMetrics.total}
            </span>
          </div>
          <div className="relative h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
              style={{ width: `${actionableMetrics.percentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Tasks ready to start • {actionableMetrics.percentage}% of workspace tasks
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium">Blocked To-dos</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {(() => {
                const blockedMetrics = getBlockedTasksMetrics(wsTodos);
                return blockedMetrics.total;
              })()}
            </span>
          </div>
          <div className="relative h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="flex h-full">
              {(() => {
                const blockedMetrics = getBlockedTasksMetrics(wsTodos);
                return (
                  <>
                    <div
                      className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-500"
                      style={{ width: `${blockedMetrics.total > 0 ? (blockedMetrics.byBlocker / blockedMetrics.total) * 100 : 0}%` }}
                      title={`${blockedMetrics.byBlocker} blocked by Blockers`}
                    />
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-500"
                      style={{ width: `${blockedMetrics.total > 0 ? (blockedMetrics.byChildren / blockedMetrics.total) * 100 : 0}%` }}
                      title={`${blockedMetrics.byChildren} blocked by other children`}
                    />
                    <div
                      className="h-full bg-gradient-to-r from-slate-500 to-slate-600 transition-all duration-500"
                      style={{ width: `${blockedMetrics.total > 0 ? (blockedMetrics.notStarted / blockedMetrics.total) * 100 : 0}%` }}
                      title={`${blockedMetrics.notStarted} not started yet`}
                    />
                  </>
                );
              })()}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {(() => {
              const blockedMetrics = getBlockedTasksMetrics(wsTodos);
              return `${blockedMetrics.byBlocker} by Blockers • ${blockedMetrics.byChildren} by other children • ${blockedMetrics.notStarted} not started`;
            })()}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            <span className="text-sm font-medium">To-dos Overview</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* Total To-dos Pie Chart */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground text-center">By Type</div>
              <div className="flex justify-center">
                {(() => {
                  const typeMetrics = getTodosByType(wsTodos);
                  const colorMap: Record<string, string> = {
                    "Blocker": "#ef4444",
                    "Task": "#3b82f6",
                    "Deliverable": "#a855f7",
                    "Quick Win": "#22c55e",
                    "Meeting": "#f97316"
                  };
                  return createPieChart(
                    typeMetrics.types.map(t => ({
                      value: t.count,
                      color: colorMap[t.type] || "#6b7280",
                      label: t.type
                    })),
                    120
                  );
                })()}
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                {(() => {
                  const typeMetrics = getTodosByType(wsTodos);
                  return typeMetrics.types
                    .filter(t => t.count > 0)
                    .map((t, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          t.type === "Blocker" ? "bg-red-500" :
                          t.type === "Task" ? "bg-blue-500" :
                          t.type === "Deliverable" ? "bg-purple-500" :
                          t.type === "Quick Win" ? "bg-green-500" :
                          "bg-orange-500"
                        }`}></div>
                        <span>{t.count} {t.type}{t.count !== 1 ? 's' : ''}</span>
                      </div>
                    ));
                })()}
              </div>
            </div>

            {/* Actionable vs Blocked Pie Chart */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground text-center">Actionable vs Blocked</div>
              <div className="flex justify-center">
                {(() => {
                  const actionableMetrics = getActionableTasksMetrics(wsTodos);
                  const blockedMetrics = getBlockedTasksMetrics(wsTodos);
                  return createPieChart(
                    [
                      { value: actionableMetrics.total, color: "#22c55e", label: "Actionable" },
                      { value: blockedMetrics.total, color: "#ef4444", label: "Blocked" }
                    ],
                    120
                  );
                })()}
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                {(() => {
                  const actionableMetrics = getActionableTasksMetrics(wsTodos);
                  const blockedMetrics = getBlockedTasksMetrics(wsTodos);
                  return (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span>{actionableMetrics.total} Actionable</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span>{blockedMetrics.total} Blocked</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
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
                  <div className="relative h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
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
          <div className="relative h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
              style={{ width: `${dailyMetrics.percentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Tasks due today or overdue • {dailyMetrics.percentage}% complete
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium">Actionable To-dos</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {actionableMetrics.actionable} / {actionableMetrics.total}
            </span>
          </div>
          <div className="relative h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
              style={{ width: `${actionableMetrics.percentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            To-dos ready to start now • {actionableMetrics.percentage}% complete
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium">Blocked To-dos</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {(() => {
                const blockedMetrics = getBlockedTasksMetrics(todos);
                return blockedMetrics.total;
              })()}
            </span>
          </div>
          <div className="relative h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="flex h-full">
              {(() => {
                const blockedMetrics = getBlockedTasksMetrics(todos);
                return (
                  <>
                    <div
                      className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-500"
                      style={{ width: `${blockedMetrics.total > 0 ? (blockedMetrics.byBlocker / blockedMetrics.total) * 100 : 0}%` }}
                      title={`${blockedMetrics.byBlocker} blocked by Blockers`}
                    />
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-500"
                      style={{ width: `${blockedMetrics.total > 0 ? (blockedMetrics.byChildren / blockedMetrics.total) * 100 : 0}%` }}
                      title={`${blockedMetrics.byChildren} blocked by other children`}
                    />
                    <div
                      className="h-full bg-gradient-to-r from-slate-500 to-slate-600 transition-all duration-500"
                      style={{ width: `${blockedMetrics.total > 0 ? (blockedMetrics.notStarted / blockedMetrics.total) * 100 : 0}%` }}
                      title={`${blockedMetrics.notStarted} not started yet`}
                    />
                  </>
                );
              })()}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {(() => {
              const blockedMetrics = getBlockedTasksMetrics(todos);
              return `${blockedMetrics.byBlocker} by Blockers • ${blockedMetrics.byChildren} by other children • ${blockedMetrics.notStarted} not started`;
            })()}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            <span className="text-sm font-medium">To-dos Overview</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* Total To-dos Pie Chart */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground text-center">By Type</div>
              <div className="flex justify-center">
                {(() => {
                  const typeMetrics = getTodosByType(todos);
                  const colorMap: Record<string, string> = {
                    "Blocker": "#ef4444",
                    "Task": "#3b82f6",
                    "Deliverable": "#a855f7",
                    "Quick Win": "#22c55e",
                    "Meeting": "#f97316"
                  };
                  return createPieChart(
                    typeMetrics.types.map(t => ({
                      value: t.count,
                      color: colorMap[t.type] || "#6b7280",
                      label: t.type
                    })),
                    120
                  );
                })()}
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                {(() => {
                  const typeMetrics = getTodosByType(todos);
                  return typeMetrics.types
                    .filter(t => t.count > 0)
                    .map((t, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          t.type === "Blocker" ? "bg-red-500" :
                          t.type === "Task" ? "bg-blue-500" :
                          t.type === "Deliverable" ? "bg-purple-500" :
                          t.type === "Quick Win" ? "bg-green-500" :
                          "bg-orange-500"
                        }`}></div>
                        <span>{t.count} {t.type}{t.count !== 1 ? 's' : ''}</span>
                      </div>
                    ));
                })()}
              </div>
            </div>

            {/* Actionable vs Blocked Pie Chart */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground text-center">Actionable vs Blocked</div>
              <div className="flex justify-center">
                {(() => {
                  const actionableMetrics = getActionableTasksMetrics(todos);
                  const blockedMetrics = getBlockedTasksMetrics(todos);
                  return createPieChart(
                    [
                      { value: actionableMetrics.total, color: "#22c55e", label: "Actionable" },
                      { value: blockedMetrics.total, color: "#ef4444", label: "Blocked" }
                    ],
                    120
                  );
                })()}
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                {(() => {
                  const actionableMetrics = getActionableTasksMetrics(todos);
                  const blockedMetrics = getBlockedTasksMetrics(todos);
                  return (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span>{actionableMetrics.total} Actionable</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span>{blockedMetrics.total} Blocked</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
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
                  <div className="relative h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
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
                                className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
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
