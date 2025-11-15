import React from "react";
import { AlertTriangle, Calendar, Clock, Users, Target, Flame, FileWarning } from "lucide-react";
import { format, isToday, isTomorrow, isPast, differenceInDays } from "date-fns";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  type: "Task" | "Deliverable" | "Quick Win" | "Meeting";
  startDate?: number;
  dueDate?: number;
  dueTime?: string;
  project?: string;
  workspace: string;
  priority: string;
  isEOD: boolean;
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
}

interface Alert {
  id: string;
  type: "meeting-incomplete" | "imminent-deadline" | "overdue" | "unscheduled-critical" | "blocked-priority" | "workload-overload" | "deliverable-not-started" | "multiple-overdue";
  priority: number;
  message: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export const AlertsWidget: React.FC<AlertsWidgetProps> = ({ todos, workspace, selectedProjectPage }) => {
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

    overdueTodos.forEach(todo => {
      const dueTime = typeof todo.dueDate === 'string' ? new Date(todo.dueDate).getTime() : todo.dueDate!;
      const daysOverdue = Math.abs(differenceInDays(new Date(dueTime), new Date()));
      alerts.push({
        id: `overdue-${todo.id}`,
        type: "overdue",
        priority: 1,
        message: `Overdue: "${todo.text}" (${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} ago)`,
        icon: AlertTriangle,
        color: "text-red-600 dark:text-red-400",
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
        });
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
        return (
          <div
            key={alert.id}
            className="flex items-start gap-2 p-3 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
          >
            <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${alert.color}`} />
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {alert.message}
            </p>
          </div>
        );
      })}
    </div>
  );
};
