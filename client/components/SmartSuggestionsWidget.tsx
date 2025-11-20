import React from "react";
import { Lightbulb, TrendingUp, Clock, Calendar, Zap } from "lucide-react";
import { isToday, isTomorrow, differenceInDays, addDays } from "date-fns";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  type: "Task" | "Deliverable" | "Quick Win" | "Meeting";
  startDate?: number;
  dueDate?: number;
  project?: string;
  workspace: string;
  priority: string;
}

interface SmartSuggestionsWidgetProps {
  todos: Todo[];
  workspace: string;
  selectedProjectPage: string | null;
  onTodoClick?: (todoId: string) => void;
  onCountChange?: (count: number) => void;
}

interface Suggestion {
  id: string;
  type: "head-start" | "stale-todo" | "light-day" | "upcoming-deadline" | "quick-wins";
  message: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  priority: number;
  todoId?: string;
  todoIds?: string[];
}

// Export function to get suggestions count
export const getSuggestionsCount = (todos: Todo[], workspace: string, selectedProjectPage: string | null): number => {
  const now = Date.now();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter todos by workspace and project
  const relevantTodos = todos.filter(t => {
    if (workspace !== "everything" && t.workspace !== workspace) return false;
    if (selectedProjectPage && t.project !== selectedProjectPage) return false;
    return !t.completed;
  });

  const suggestions: Suggestion[] = [];

  // Use same logic as getSuggestions but just count
  // Stale todos
  const staleTodos = relevantTodos.filter(t => {
    const daysSinceCreated = differenceInDays(new Date(), new Date(t.createdAt));
    return daysSinceCreated >= 7;
  });
  staleTodos.slice(0, 2).forEach(() => suggestions.push({} as Suggestion));

  // Head start
  const todayTasks = relevantTodos.filter(t => {
    if (!t.dueDate) return false;
    const dueDate = new Date(typeof t.dueDate === 'string' ? new Date(t.dueDate).getTime() : t.dueDate);
    return isToday(dueDate);
  });

  if (todayTasks.length <= 2) {
    const upcomingTasks = relevantTodos.filter(t => {
      if (!t.dueDate) return false;
      const dueDate = new Date(typeof t.dueDate === 'string' ? new Date(t.dueDate).getTime() : t.dueDate);
      const daysUntil = differenceInDays(dueDate, today);
      return daysUntil >= 3 && daysUntil <= 5;
    });
    if (upcomingTasks.length > 0) suggestions.push({} as Suggestion);
  }

  // Quick wins
  const quickWins = relevantTodos.filter(t => t.type === "Quick Win");
  if (quickWins.length >= 3) suggestions.push({} as Suggestion);

  // Upcoming deadlines
  const upcomingDeadlines = relevantTodos.filter(t => {
    if (!t.dueDate) return false;
    const dueDate = new Date(typeof t.dueDate === 'string' ? new Date(t.dueDate).getTime() : t.dueDate);
    const daysUntil = differenceInDays(dueDate, today);
    return daysUntil >= 1 && daysUntil <= 3 && t.type === "Deliverable";
  });
  upcomingDeadlines.slice(0, 3).forEach(() => suggestions.push({} as Suggestion));

  // Workload balance (check next 5 days)
  const next5Days = Array.from({ length: 5 }, (_, i) => addDays(today, i + 1));
  const tasksByDay = next5Days.map(day => {
    return relevantTodos.filter(t => {
      if (!t.dueDate) return false;
      const dueDate = new Date(typeof t.dueDate === 'string' ? new Date(t.dueDate).getTime() : t.dueDate);
      return dueDate.toDateString() === day.toDateString();
    }).length;
  });

  const maxTasks = Math.max(...tasksByDay);
  const minTasks = Math.min(...tasksByDay);
  if (maxTasks - minTasks >= 5) suggestions.push({} as Suggestion);

  return suggestions.length;
};

export const SmartSuggestionsWidget: React.FC<SmartSuggestionsWidgetProps> = ({
  todos,
  workspace,
  selectedProjectPage,
  onTodoClick,
  onCountChange
}) => {
  const getSuggestions = (): Suggestion[] => {
    const suggestions: Suggestion[] = [];
    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter todos by workspace and project
    const relevantTodos = todos.filter(t => {
      if (workspace !== "everything" && t.workspace !== workspace) return false;
      if (selectedProjectPage && t.project !== selectedProjectPage) return false;
      return true;
    });

    const incompleteTodos = relevantTodos.filter(t => !t.completed);

    // 1. Detect stale todos (created more than 7 days ago, no action)
    const staleTodos = incompleteTodos.filter(t => {
      const daysSinceCreated = differenceInDays(new Date(), new Date(t.createdAt));
      return daysSinceCreated >= 7;
    });

    staleTodos.slice(0, 2).forEach(todo => {
      const daysSinceCreated = differenceInDays(new Date(), new Date(todo.createdAt));
      suggestions.push({
        id: `stale-${todo.id}`,
        type: "stale-todo",
        message: `"${todo.text}" has been sitting for ${daysSinceCreated} days. Consider breaking it down or scheduling it.`,
        icon: Clock,
        color: "text-amber-600 dark:text-amber-400",
        priority: 3,
        todoId: todo.id,
      });
    });

    // 2. Suggest getting a head start on upcoming items (3-5 days out) if today is light
    const todayTasks = incompleteTodos.filter(t => {
      if (t.dueDate) {
        const dueTime = typeof t.dueDate === 'string' ? new Date(t.dueDate).getTime() : t.dueDate;
        const dueDate = new Date(dueTime);
        return isToday(dueDate);
      }
      return false;
    });

    if (todayTasks.length <= 2) {
      const upcomingTasks = incompleteTodos.filter(t => {
        if (!t.dueDate) return false;
        const dueTime = typeof t.dueDate === 'string' ? new Date(t.dueDate).getTime() : t.dueDate;
        const dueDate = new Date(dueTime);
        const daysUntil = differenceInDays(dueDate, today);
        return daysUntil >= 3 && daysUntil <= 5;
      });

      upcomingTasks.slice(0, 1).forEach(todo => {
        const dueTime = typeof todo.dueDate === 'string' ? new Date(todo.dueDate).getTime() : todo.dueDate!;
        const daysUntil = differenceInDays(new Date(dueTime), today);
        suggestions.push({
          id: `head-start-${todo.id}`,
          type: "head-start",
          message: `Light day ahead! Get a head start on "${todo.text}" (due in ${daysUntil} days).`,
          icon: TrendingUp,
          color: "text-blue-600 dark:text-blue-400",
          priority: 2,
          todoId: todo.id,
        });
      });
    }

    // 3. Identify light days in the next 7 days and suggest redistributing work
    const nextSevenDays = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(today, i + 1);
      const tasksOnDay = incompleteTodos.filter(t => {
        if (!t.dueDate) return false;
        const dueTime = typeof t.dueDate === 'string' ? new Date(t.dueDate).getTime() : t.dueDate;
        const dueDate = new Date(dueTime);
        return dueDate.toDateString() === date.toDateString();
      });
      return { date, count: tasksOnDay.length };
    });

    const lightDays = nextSevenDays.filter(day => day.count === 0);
    const heavyDays = nextSevenDays.filter(day => day.count >= 5);

    if (lightDays.length > 0 && heavyDays.length > 0) {
      const lightDay = lightDays[0];
      const heavyDay = heavyDays[0];
      const daysUntilLight = differenceInDays(lightDay.date, today);
      const daysUntilHeavy = differenceInDays(heavyDay.date, today);
      
      suggestions.push({
        id: `light-day-${lightDay.date.getTime()}`,
        type: "light-day",
        message: `Day ${daysUntilLight + 1} looks light while day ${daysUntilHeavy + 1} has ${heavyDay.count} tasks. Consider moving some tasks to balance your workload.`,
        icon: Calendar,
        color: "text-purple-600 dark:text-purple-400",
        priority: 4,
      });
    }

    // 4. Suggest tackling quick wins when there are many
    const quickWins = incompleteTodos.filter(t => t.type === "Quick Win");
    if (quickWins.length >= 3) {
      suggestions.push({
        id: `quick-wins`,
        type: "quick-wins",
        message: `You have ${quickWins.length} Quick Wins ready. Knock out a few to build momentum!`,
        icon: Zap,
        color: "text-green-600 dark:text-green-400",
        priority: 5,
        todoIds: quickWins.map(t => t.id),
      });
    }

    // 5. Upcoming deadline without much progress
    const upcomingDeadlines = incompleteTodos.filter(t => {
      if (!t.dueDate) return false;
      const dueTime = typeof t.dueDate === 'string' ? new Date(t.dueDate).getTime() : t.dueDate;
      const dueDate = new Date(dueTime);
      const daysUntil = differenceInDays(dueDate, today);
      return daysUntil >= 1 && daysUntil <= 3 && t.type === "Deliverable";
    });

    upcomingDeadlines.slice(0, 1).forEach(todo => {
      const dueTime = typeof todo.dueDate === 'string' ? new Date(todo.dueDate).getTime() : todo.dueDate!;
      const daysUntil = differenceInDays(new Date(dueTime), today);
      suggestions.push({
        id: `upcoming-${todo.id}`,
        type: "upcoming-deadline",
        message: `Deliverable "${todo.text}" is due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}. Make sure you're on track!`,
        icon: Calendar,
        color: "text-orange-600 dark:text-orange-400",
        priority: 1,
        todoId: todo.id,
      });
    });

    // Sort by priority (lower number = higher priority)
    return suggestions.sort((a, b) => a.priority - b.priority);
  };

  const suggestions = getSuggestions();

  if (suggestions.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        No suggestions right now. You're on track!
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {suggestions.map(suggestion => {
        const Icon = suggestion.icon;
        const isClickable = suggestion.todoId || (suggestion.todoIds && suggestion.todoIds.length > 0);
        const handleClick = () => {
          if (onTodoClick && suggestion.todoId) {
            onTodoClick(suggestion.todoId);
          } else if (onTodoClick && suggestion.todoIds && suggestion.todoIds.length > 0) {
            onTodoClick(suggestion.todoIds[0]);
          }
        };

        return (
          <div
            key={suggestion.id}
            onClick={isClickable ? handleClick : undefined}
            className={`flex items-start gap-2 p-3 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 ${
              isClickable ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors' : ''
            }`}
          >
            <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${suggestion.color}`} />
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {suggestion.message}
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
