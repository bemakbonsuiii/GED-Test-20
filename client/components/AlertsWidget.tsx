import React from "react";
import { AlertTriangle, Calendar, Clock, Users, Target, Flame, FileWarning } from "lucide-react";
import { format, isToday, isTomorrow, isPast, differenceInDays } from "date-fns";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  type: "Task" | "Deliverable" | "Quick Win" | "Meeting" | "Blocker";
  startDate?: number;
  dueDate?: number;
  dueTime?: string;
  project?: string;
  workspace: string;
  priority: string;
  agenda?: string;
  meetingTime?: string;
  notes?: string;
  links?: string;
  parentId?: string;
  isPriority?: boolean;
  priorityOrder?: number;
}

interface AlertsWidgetProps {
  todos: Todo[];
  workspace: string;
  selectedProjectPage: string | null;
  onTodoClick?: (todoId: string) => void;
}

interface Alert {
  id: string;
  type: "meeting-incomplete" | "imminent-deadline" | "overdue" | "unscheduled-critical" | "blocked-priority" | "workload-overload" | "deliverable-not-started" | "multiple-overdue" | "blocker-overdue" | "high-priority-blocked";
  priority: number;
  message: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  todoId?: string;
  todoIds?: string[];
}

export const AlertsWidget: React.FC<AlertsWidgetProps> = ({ todos, workspace, selectedProjectPage, onTodoClick }) => {
  const getAlerts = (): Alert[] => {
    const alerts: Alert[] = [];
    const now = Date.now();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    // Filter todos by workspace and project
    const relevantTodos = todos.filter(t => {
      if (workspace !== "everything" && t.workspace !== workspace) return false;
      if (selectedProjectPage && t.project !== selectedProjectPage) return false;
      return true;
    });

    // Check for overdue todos
    const overdueTodos = relevantTodos.filter(t => {
      if (t.completed) return false;
      if (!t.dueDate) return false;
      const dueTime = typeof t.dueDate === 'string' ? new Date(t.dueDate).getTime() : t.dueDate;
      const dueDate = new Date(dueTime);
      return isPast(dueDate) && !isToday(dueDate);
    });

    // Separate overdue blockers (highest priority)
    const overdueBlockers = overdueTodos.filter(t => t.type === "Blocker");
    const otherOverdue = overdueTodos.filter(t => t.type !== "Blocker");

    overdueBlockers.forEach(todo => {
      const dueTime = typeof todo.dueDate === 'string' ? new Date(todo.dueDate).getTime() : todo.dueDate!;
      const daysOverdue = Math.abs(differenceInDays(new Date(dueTime), new Date()));
      const parent = relevantTodos.find(t => t.id === todo.parentId);
      alerts.push({
        id: `overdue-blocker-${todo.id}`,
        type: "blocker-overdue",
        priority: 0, // Highest priority
        message: `BLOCKER OVERDUE: "${todo.text}" (${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} ago)${parent ? ` - blocking "${parent.text}"` : ''}`,
        icon: FileWarning,
        color: "text-red-600 dark:text-red-400",
        todoId: todo.id,
      });
    });

    otherOverdue.forEach(todo => {
      const dueTime = typeof todo.dueDate === 'string' ? new Date(todo.dueDate).getTime() : todo.dueDate!;
      const daysOverdue = Math.abs(differenceInDays(new Date(dueTime), new Date()));
      alerts.push({
        id: `overdue-${todo.id}`,
        type: "overdue",
        priority: 1,
        message: `Overdue: "${todo.text}" (${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} ago)`,
        icon: AlertTriangle,
        color: "text-red-600 dark:text-red-400",
        todoId: todo.id,
      });
    });

    // Check for upcoming meetings (today or tomorrow) with incomplete child todos
    const upcomingMeetings = relevantTodos.filter(t => {
      if (t.completed || t.type !== "Meeting") return false;
      if (!t.dueDate) return false;
      const dueTime = typeof t.dueDate === 'string' ? new Date(t.dueDate).getTime() : t.dueDate;
      const dueDate = new Date(dueTime);
      return isToday(dueDate) || isTomorrow(dueDate);
    });

    upcomingMeetings.forEach(meeting => {
      const childTodos = relevantTodos.filter(t => t.parentId === meeting.id && !t.completed);
      if (childTodos.length > 0) {
        const dueTime = typeof meeting.dueDate === 'string' ? new Date(meeting.dueDate).getTime() : meeting.dueDate!;
        const dueDate = new Date(dueTime);
        const when = isToday(dueDate) ? "today" : "tomorrow";
        alerts.push({
          id: `meeting-${meeting.id}`,
          type: "meeting-incomplete",
          priority: 2,
          message: `Meeting "${meeting.text}" ${when} has ${childTodos.length} incomplete prep task${childTodos.length !== 1 ? 's' : ''}`,
          icon: Users,
          color: "text-orange-600 dark:text-orange-400",
          todoId: meeting.id,
        });
      }
    });

    // Check for upcoming deliverables (today or tomorrow) with incomplete dependencies
    const upcomingDeliverablesWithDeps = relevantTodos.filter(t => {
      if (t.completed || t.type !== "Deliverable") return false;
      if (!t.dueDate) return false;
      const dueTime = typeof t.dueDate === 'string' ? new Date(t.dueDate).getTime() : t.dueDate;
      const dueDate = new Date(dueTime);
      return isToday(dueDate) || isTomorrow(dueDate);
    });

    upcomingDeliverablesWithDeps.forEach(deliverable => {
      const childTodos = relevantTodos.filter(t => t.parentId === deliverable.id && !t.completed);
      if (childTodos.length > 0) {
        const dueTime = typeof deliverable.dueDate === 'string' ? new Date(deliverable.dueDate).getTime() : deliverable.dueDate!;
        const dueDate = new Date(dueTime);
        const when = isToday(dueDate) ? "today" : "tomorrow";
        const blockerCount = childTodos.filter(c => c.type === "Blocker").length;

        if (blockerCount > 0) {
          alerts.push({
            id: `deliverable-blocked-${deliverable.id}`,
            type: "meeting-incomplete",
            priority: 1, // Higher priority for blocked deliverables
            message: `Deliverable "${deliverable.text}" due ${when} is BLOCKED by ${blockerCount} incomplete blocker${blockerCount !== 1 ? 's' : ''}`,
            icon: FileWarning,
            color: "text-red-600 dark:text-red-400",
            todoId: deliverable.id,
          });
        } else {
          alerts.push({
            id: `deliverable-deps-${deliverable.id}`,
            type: "meeting-incomplete",
            priority: 2,
            message: `Deliverable "${deliverable.text}" due ${when} has ${childTodos.length} incomplete dependency${childTodos.length !== 1 ? 'ies' : 'y'}`,
            icon: Target,
            color: "text-orange-600 dark:text-orange-400",
            todoId: deliverable.id,
          });
        }
      }
    });

    // Check for imminent deadlines (due today or tomorrow)
    const imminentDeadlines = relevantTodos.filter(t => {
      if (t.completed || t.type === "Meeting") return false;
      if (!t.dueDate) return false;
      const dueTime = typeof t.dueDate === 'string' ? new Date(t.dueDate).getTime() : t.dueDate;
      const dueDate = new Date(dueTime);
      return isToday(dueDate) || isTomorrow(dueDate);
    });

    imminentDeadlines.forEach(todo => {
      const dueTime = typeof todo.dueDate === 'string' ? new Date(todo.dueDate).getTime() : todo.dueDate!;
      const dueDate = new Date(dueTime);
      const when = isToday(dueDate) ? "today" : "tomorrow";
      alerts.push({
        id: `deadline-${todo.id}`,
        type: "imminent-deadline",
        priority: 3,
        message: `Due ${when}: "${todo.text}"${todo.dueTime ? ` at ${todo.dueTime}` : ''}`,
        icon: Clock,
        color: "text-yellow-600 dark:text-yellow-400",
        todoId: todo.id,
      });
    });

    // Check for multiple overdue deliverables (critical situation)
    const overdueDeliverables = overdueTodos.filter(t => t.type === "Deliverable");
    if (overdueDeliverables.length >= 3) {
      alerts.push({
        id: `multiple-overdue`,
        type: "multiple-overdue",
        priority: 1,
        message: `CRITICAL: ${overdueDeliverables.length} deliverables are overdue! Immediate action needed.`,
        icon: Flame,
        color: "text-red-600 dark:text-red-400",
        todoIds: overdueDeliverables.map(t => t.id),
      });
    }

    // Check for P0 (critical priority) tasks with no due date
    const unscheduledCritical = relevantTodos.filter(t => {
      if (t.completed) return false;
      if (t.priority !== "P0") return false;
      return !t.dueDate;
    });

    unscheduledCritical.slice(0, 2).forEach(todo => {
      alerts.push({
        id: `unscheduled-${todo.id}`,
        type: "unscheduled-critical",
        priority: 2,
        message: `Critical task "${todo.text}" has no due date. Schedule it now!`,
        icon: Target,
        color: "text-red-600 dark:text-red-400",
        todoId: todo.id,
      });
    });

    // Check for high-priority tasks blocked by incomplete children
    const blockedPriorityTasks = relevantTodos.filter(t => {
      if (t.completed) return false;
      if (t.priority !== "P0" && t.priority !== "P1") return false;
      const hasIncompleteChildren = relevantTodos.some(child =>
        child.parentId === t.id && !child.completed
      );
      return hasIncompleteChildren;
    });

    blockedPriorityTasks.slice(0, 2).forEach(todo => {
      const incompleteChildren = relevantTodos.filter(child =>
        child.parentId === todo.id && !child.completed
      );
      const blockerChildren = incompleteChildren.filter(c => c.type === "Blocker");
      const hasBlockers = blockerChildren.length > 0;

      if (hasBlockers) {
        alerts.push({
          id: `blocked-${todo.id}`,
          type: "high-priority-blocked",
          priority: 1, // Higher priority for blocker-blocked items
          message: `High-priority "${todo.text}" is BLOCKED by ${blockerChildren.length} incomplete blocker${blockerChildren.length !== 1 ? 's' : ''}`,
          icon: FileWarning,
          color: "text-red-600 dark:text-red-400",
          todoId: todo.id,
        });
      } else {
        alerts.push({
          id: `blocked-${todo.id}`,
          type: "blocked-priority",
          priority: 2,
          message: `High-priority "${todo.text}" is blocked by ${incompleteChildren.length} incomplete subtask${incompleteChildren.length !== 1 ? 's' : ''}`,
          icon: AlertTriangle,
          color: "text-orange-600 dark:text-orange-400",
          todoId: todo.id,
        });
      }
    });

    // Check for workload overload (too many tasks due today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const tasksToday = relevantTodos.filter(t => {
      if (t.completed) return false;
      if (t.dueDate) {
        const dueTime = typeof t.dueDate === 'string' ? new Date(t.dueDate).getTime() : t.dueDate;
        return dueTime >= today.getTime() && dueTime <= todayEnd.getTime();
      }
      return false;
    });

    if (tasksToday.length >= 8) {
      alerts.push({
        id: `workload-overload`,
        type: "workload-overload",
        priority: 3,
        message: `Overloaded schedule: ${tasksToday.length} tasks due today. Consider rescheduling some items.`,
        icon: Flame,
        color: "text-orange-600 dark:text-orange-400",
        todoIds: tasksToday.map(t => t.id),
      });
    }

    // Check for deliverables due in 2-3 days with no start date or future start date
    const upcomingDeliverables = relevantTodos.filter(t => {
      if (t.completed || t.type !== "Deliverable") return false;
      if (!t.dueDate) return false;
      const dueTime = typeof t.dueDate === 'string' ? new Date(t.dueDate).getTime() : t.dueDate;
      const dueDate = new Date(dueTime);
      const daysUntil = differenceInDays(dueDate, today);
      // Check if it has a future start date or no start date
      const notStarted = !t.startDate || t.startDate > now;
      return daysUntil >= 2 && daysUntil <= 3 && notStarted;
    });

    upcomingDeliverables.slice(0, 2).forEach(todo => {
      const dueTime = typeof todo.dueDate === 'string' ? new Date(todo.dueDate).getTime() : todo.dueDate!;
      const daysUntil = differenceInDays(new Date(dueTime), today);
      alerts.push({
        id: `not-started-${todo.id}`,
        type: "deliverable-not-started",
        priority: 2,
        message: `Deliverable "${todo.text}" due in ${daysUntil} days hasn't been started yet!`,
        icon: FileWarning,
        color: "text-orange-600 dark:text-orange-400",
        todoId: todo.id,
      });
    });

    // Sort by priority (lower number = higher priority)
    return alerts.sort((a, b) => a.priority - b.priority);
  };

  const alerts = getAlerts();

  if (alerts.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        No alerts at the moment. Great job staying on top of things!
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map(alert => {
        const Icon = alert.icon;
        const isClickable = alert.todoId || (alert.todoIds && alert.todoIds.length > 0);
        const handleClick = () => {
          if (onTodoClick && alert.todoId) {
            onTodoClick(alert.todoId);
          } else if (onTodoClick && alert.todoIds && alert.todoIds.length > 0) {
            onTodoClick(alert.todoIds[0]);
          }
        };

        return (
          <div
            key={alert.id}
            onClick={isClickable ? handleClick : undefined}
            className={`flex items-start gap-2 p-3 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 ${
              isClickable ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors' : ''
            }`}
          >
            <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${alert.color}`} />
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {alert.message}
              {isClickable && (
                <span className="ml-1 text-xs text-blue-600 dark:text-blue-400">(click to view)</span>
              )}
            </p>
          </div>
        );
      })}
    </div>
  );
};
