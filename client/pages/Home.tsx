import React, { useState, useEffect, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trash2,
  Plus,
  X,
  Target,
  CheckCircle2,
  Zap,
  Calendar as CalendarIcon,
  Briefcase,
  Clock,
  Users,
  Edit,
  Moon,
  Sun,
  Star,
  StarOff,
  GripVertical,
  Sparkles,
  Send,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { format, isPast, isToday, isTomorrow, differenceInDays } from "date-fns";
import { MetricsWidget } from "../components/MetricsWidget";
import { CircularScore } from "../components/CircularScore";
import { AlertsWidget } from "../components/AlertsWidget";

type TodoType = "Task" | "Deliverable" | "Quick Win" | "Meeting";
type WorkspaceType = "personal" | "work" | "creative";
type Workspace = WorkspaceType | "everything";
type Priority = "P0" | "P1" | "P2";

interface Project {
  id: string;
  name: string;
  description: string;
  workspace: WorkspaceType;
  createdAt: number;
}

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  type: TodoType;
  startDate?: number;
  dueDate?: number;
  dueTime?: string;
  project?: string;
  workspace: WorkspaceType;
  priority: Priority;
  isEOD: boolean;
  agenda?: string;
  meetingTime?: string;
  notes?: string;
  links?: string;
  parentId?: string;
  isPriority?: boolean;
  priorityOrder?: number;
}

type FilterType = "all" | "active" | "completed";

const TODO_TYPE_CONFIG: Record<
  TodoType,
  {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgLight: string;
    bgDark: string;
    borderLight: string;
    borderDark: string;
    textLight: string;
    textDark: string;
  }
> = {
  Task: {
    icon: CheckCircle2,
    color: "bg-blue-500",
    bgLight: "bg-blue-50",
    bgDark: "dark:bg-blue-950/30",
    borderLight: "border-blue-200",
    borderDark: "dark:border-blue-800",
    textLight: "text-blue-700",
    textDark: "dark:text-blue-300"
  },
  Deliverable: {
    icon: Target,
    color: "bg-purple-500",
    bgLight: "bg-purple-50",
    bgDark: "dark:bg-purple-950/30",
    borderLight: "border-purple-200",
    borderDark: "dark:border-purple-800",
    textLight: "text-purple-700",
    textDark: "dark:text-purple-300"
  },
  "Quick Win": {
    icon: Zap,
    color: "bg-green-500",
    bgLight: "bg-green-50",
    bgDark: "dark:bg-green-950/30",
    borderLight: "border-green-200",
    borderDark: "dark:border-green-800",
    textLight: "text-green-700",
    textDark: "dark:text-green-300"
  },
  Meeting: {
    icon: Users,
    color: "bg-orange-500",
    bgLight: "bg-orange-50",
    bgDark: "dark:bg-orange-950/30",
    borderLight: "border-orange-200",
    borderDark: "dark:border-orange-800",
    textLight: "text-orange-700",
    textDark: "dark:text-orange-300"
  },
};

const Home = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  const [toddMessages, setToddMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; suggestions?: string[] }>>([]);
  const [toddInput, setToddInput] = useState("");
  const [toddLoading, setToddLoading] = useState(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout>();
  const [inputValue, setInputValue] = useState("");
  const [isAddTodoExpanded, setIsAddTodoExpanded] = useState(false);
  const [isToddExpanded, setIsToddExpanded] = useState(false);
  const [isAlertsExpanded, setIsAlertsExpanded] = useState(false);
  const [isCreateProjectDialogOpen, setIsCreateProjectDialogOpen] = useState(false);
  const [isMeetingsExpanded, setIsMeetingsExpanded] = useState(true);
  const [isDeadlinesExpanded, setIsDeadlinesExpanded] = useState(true);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);
  const [isTasksExpanded, setIsTasksExpanded] = useState(true);
  const [isMetricsExpanded, setIsMetricsExpanded] = useState(true);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [newProjectWorkspace, setNewProjectWorkspace] = useState<WorkspaceType>("personal");
  const [pendingTodoData, setPendingTodoData] = useState<Partial<Todo> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const [workspace, setWorkspace] = useState<Workspace>("everything");
  const [selectedProjectPage, setSelectedProjectPage] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<TodoType | null>(null);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string | null>(null);
  const [projectInput, setProjectInput] = useState("");
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [dialogStep, setDialogStep] = useState<"type" | "workspace" | "details">("type");
  const [newTodoText, setNewTodoText] = useState("");
  const [newTodoType, setNewTodoType] = useState<TodoType>("Task");
  const [newTodoWorkspace, setNewTodoWorkspace] = useState<WorkspaceType>("personal");
  const [newTodoStartDate, setNewTodoStartDate] = useState<Date | undefined>(undefined);
  const [newTodoDueDate, setNewTodoDueDate] = useState<Date | undefined>(undefined);
  const [newTodoProject, setNewTodoProject] = useState("");
  const [isCreatingNewProject, setIsCreatingNewProject] = useState(false);
  const [newTodoPriority, setNewTodoPriority] = useState<Priority>("P2");
  const [newTodoIsEOD, setNewTodoIsEOD] = useState(false);
  const [newTodoAgenda, setNewTodoAgenda] = useState("");
  const [newTodoMeetingTime, setNewTodoMeetingTime] = useState("");
  const [newTodoDueTime, setNewTodoDueTime] = useState("");
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [dueDatePopoverOpen, setDueDatePopoverOpen] = useState(false);
  const [newTodoNotes, setNewTodoNotes] = useState("");
  const [newTodoLinks, setNewTodoLinks] = useState("");
  const [newTodoParentId, setNewTodoParentId] = useState<string | undefined>(undefined);
  const [linkingTodoId, setLinkingTodoId] = useState<string | null>(null);
  const [creatingChildForId, setCreatingChildForId] = useState<string | null>(null);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [viewingTodo, setViewingTodo] = useState<Todo | null>(null);
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("todos");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const migrated = parsed.map((todo: any) => ({
          ...todo,
          type: todo.isMeeting ? "Meeting" : (todo.type || "Task"),
          workspace: (todo.workspace === "personal" || todo.workspace === "work" || todo.workspace === "creative")
            ? todo.workspace
            : "personal",
          priority: todo.priority || "P2",
          isEOD: todo.isEOD || false,
          agenda: todo.agenda,
          meetingTime: todo.meetingTime,
          dueTime: todo.dueTime,
          isPriority: todo.isPriority || false,
          priorityOrder: todo.priorityOrder,
          startDate: todo.startDate,
        }));
        setTodos(migrated);
      } catch (e) {
        console.error("Failed to parse todos from localStorage");
      }
    }

    const savedProjects = localStorage.getItem("projects");
    if (savedProjects) {
      try {
        setProjects(JSON.parse(savedProjects));
      } catch (e) {
        console.error("Failed to parse projects from localStorage");
      }
    }

    const savedDarkMode = localStorage.getItem("darkMode");
    if (savedDarkMode) {
      const isDark = savedDarkMode === "true";
      setDarkMode(isDark);
      if (isDark) {
        document.documentElement.classList.add("dark");
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("todos", JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    localStorage.setItem("projects", JSON.stringify(projects));
  }, [projects]);

  // Auto-minimize empty widgets
  useEffect(() => {
    const filteredTodos = (workspace === "everything"
      ? todos
      : todos.filter((todo) => todo.workspace === workspace)
    ).filter((todo) => {
      if (selectedProjectPage && todo.project !== selectedProjectPage) {
        return false;
      }
      if (selectedTypeFilter) {
        return true;
      }
      return !todo.parentId;
    });

    const meetings = filteredTodos.filter((todo) => todo.type === "Meeting" && !todo.completed);
    const deadlines = filteredTodos.filter(t => !t.completed && t.dueDate && t.type !== "Meeting");

    if (meetings.length === 0) {
      setIsMeetingsExpanded(false);
    }
    if (deadlines.length === 0) {
      setIsDeadlinesExpanded(false);
    }
  }, [todos, workspace, selectedProjectPage, selectedTypeFilter]);

  // Auto-update metrics every minute to keep daily tasks current
  const [metricsUpdateTrigger, setMetricsUpdateTrigger] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setMetricsUpdateTrigger(prev => prev + 1);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem("darkMode", darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const workspaceTodos = (workspace === "everything"
    ? todos
    : todos.filter((todo) => todo.workspace === workspace)
  ).filter((todo) => {
    // If viewing a specific project page, only show todos from that project
    if (selectedProjectPage && todo.project !== selectedProjectPage) {
      return false;
    }
    // If filtering by type, show child todos of that type as standalone items
    if (selectedTypeFilter) {
      return true; // Don't filter out children when type filter is active
    }
    // Otherwise, only show parent todos (children appear nested under parents)
    return !todo.parentId;
  });

  const getAllProjects = (): Project[] => {
    if (workspace === "everything") {
      return projects.sort((a, b) => a.name.localeCompare(b.name));
    }
    return getWorkspaceProjects(workspace as WorkspaceType);
  };

  const getWorkspaceProjects = (targetWorkspace: WorkspaceType): Project[] => {
    return projects
      .filter((project) => project.workspace === targetWorkspace)
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const createProject = () => {
    if (!newProjectName.trim()) return;

    const project: Project = {
      id: Date.now().toString(),
      name: newProjectName.trim(),
      description: newProjectDescription.trim(),
      workspace: newProjectWorkspace,
      createdAt: Date.now(),
    };

    setProjects([...projects, project]);
    setNewProjectName("");
    setNewProjectDescription("");
    setIsCreateProjectDialogOpen(false);

    // If there's a pending todo waiting for this project
    if (pendingTodoData) {
      const updatedTodo: Todo = {
        ...pendingTodoData as Todo,
        project: project.name,
      };

      // Check if this is an edit (todo already exists) or a new todo
      const existingTodoIndex = todos.findIndex(t => t.id === updatedTodo.id);

      if (existingTodoIndex !== -1) {
        // Update existing todo
        setTodos(todos.map((todo) =>
          todo.id === updatedTodo.id ? updatedTodo : todo
        ));
      } else {
        // Create new todo
        setTodos([updatedTodo, ...todos]);
        setIsCreateDialogOpen(false);
        resetTodoForm();
      }

      setPendingTodoData(null);
    }
  };

  const resetTodoForm = () => {
    setDialogStep("type");
    setNewTodoText("");
    setNewTodoType("Task");
    setNewTodoWorkspace("personal");
    setNewTodoStartDate(undefined);
    setNewTodoDueDate(undefined);
    setNewTodoProject("");
    setIsCreatingNewProject(false);
    setNewTodoPriority("P2");
    setNewTodoIsEOD(false);
    setNewTodoAgenda("");
    setNewTodoMeetingTime("");
    setNewTodoDueTime("");
    setDueDatePopoverOpen(false);
    setNewTodoNotes("");
    setNewTodoLinks("");
    setNewTodoParentId(undefined);
    setCreatingChildForId(null);
  };

  const openCreateProjectDialog = (targetWorkspace: WorkspaceType) => {
    setNewProjectWorkspace(targetWorkspace);
    setNewProjectName("");
    setNewProjectDescription("");
    setIsCreateProjectDialogOpen(true);
  };

  const addTodo = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    setNewTodoText(trimmed);
    setInputValue("");
    setDialogStep("type");
    setIsCreateDialogOpen(true);
  };

  const getActualWorkspace = (): WorkspaceType => {
    if (workspace === "everything") return newTodoWorkspace;
    return workspace as WorkspaceType;
  };

  const canBeParent = (parentType: TodoType, childType: TodoType): boolean => {
    const allowedRelationships: Record<TodoType, TodoType[]> = {
      Meeting: ["Deliverable", "Task", "Quick Win"],
      Deliverable: ["Deliverable", "Task", "Quick Win"],
      Task: ["Task", "Quick Win"],
      "Quick Win": ["Quick Win"],
    };
    return allowedRelationships[parentType]?.includes(childType) || false;
  };

  const getAllowedChildTypes = (parentType: TodoType): TodoType[] => {
    // Allow any type to be a child of any type
    return ["Task", "Deliverable", "Quick Win", "Meeting"];
  };

  const startCreatingChild = (parentId: string) => {
    const parent = todos.find(t => t.id === parentId);
    if (!parent) return;

    const allowedTypes = getAllowedChildTypes(parent.type);
    if (allowedTypes.length === 0) return;

    setCreatingChildForId(parentId);
    setNewTodoParentId(parentId);
    setNewTodoWorkspace(parent.workspace);
    setNewTodoText("");
    setNewTodoType(allowedTypes[0]); // Default to first allowed type

    // Inherit parent's due date, project, priority, and EOD flag
    setNewTodoDueDate(parent.dueDate ? new Date(parent.dueDate) : undefined);
    setNewTodoDueTime(parent.dueTime || "");
    setNewTodoMeetingTime(parent.meetingTime || "");
    setNewTodoProject(parent.project || "");
    setNewTodoPriority(parent.priority);
    setNewTodoIsEOD(parent.isEOD);

    setDialogStep("type");
    setIsCreateDialogOpen(true);
  };

  const getEligibleParents = (childType: TodoType, childWorkspace: WorkspaceType): Todo[] => {
    return todos.filter((todo) => {
      return (
        !todo.completed &&
        todo.workspace === childWorkspace &&
        canBeParent(todo.type, childType)
      );
    });
  };

  const getChildren = (parentId: string): Todo[] => {
    return todos.filter((todo) => todo.parentId === parentId);
  };

  const unlinkTodo = (todoId: string) => {
    setTodos(todos.map((todo) =>
      todo.id === todoId ? { ...todo, parentId: undefined } : todo
    ));
  };

  const linkTodoToParent = (childId: string, parentId: string) => {
    const child = todos.find((t) => t.id === childId);
    const parent = todos.find((t) => t.id === parentId);

    if (!child || !parent) return;
    if (child.workspace !== parent.workspace) return;
    if (!canBeParent(parent.type, child.type)) return;

    setTodos(todos.map((todo) =>
      todo.id === childId ? { ...todo, parentId } : todo
    ));
    setLinkingTodoId(null);
  };

  const openEditDialog = (todo: Todo) => {
    setEditingTodo(todo);
    setIsEditDialogOpen(true);
  };

  const openSummaryDialog = (todo: Todo) => {
    setViewingTodo(todo);
    setIsSummaryDialogOpen(true);
  };

  const saveEditedTodo = () => {
    if (!editingTodo) return;

    // Check if this is a new project that doesn't exist yet
    if (editingTodo.project && editingTodo.project.trim()) {
      const existingProject = projects.find(
        p => p.name === editingTodo.project!.trim() && p.workspace === editingTodo.workspace
      );

      if (!existingProject) {
        // This is a new project - open project creation dialog
        setPendingTodoData(editingTodo);
        setNewProjectName(editingTodo.project.trim());
        setNewProjectWorkspace(editingTodo.workspace);
        setNewProjectDescription("");
        setIsCreateProjectDialogOpen(true);
        setIsEditDialogOpen(false);
        return;
      }
    }

    setTodos(todos.map((todo) =>
      todo.id === editingTodo.id ? editingTodo : todo
    ));
    setIsEditDialogOpen(false);
    setEditingTodo(null);
  };

  const togglePriority = (todoId: string) => {
    setTodos(prevTodos => {
      const todo = prevTodos.find(t => t.id === todoId);
      if (!todo) return prevTodos;

      const newIsPriority = !todo.isPriority;
      const priorityTodos = prevTodos.filter(t => t.isPriority && t.id !== todoId);
      const newPriorityOrder = newIsPriority ? priorityTodos.length : undefined;

      return prevTodos.map(t =>
        t.id === todoId
          ? { ...t, isPriority: newIsPriority, priorityOrder: newPriorityOrder }
          : t
      );
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    setTodos(prevTodos => {
      const priorityTodos = prevTodos
        .filter(t => t.isPriority)
        .sort((a, b) => (a.priorityOrder || 0) - (b.priorityOrder || 0));

      const oldIndex = priorityTodos.findIndex(t => t.id === active.id);
      const newIndex = priorityTodos.findIndex(t => t.id === over.id);

      const reorderedPriority = arrayMove(priorityTodos, oldIndex, newIndex);

      // Update priority orders
      const updatedTodos = prevTodos.map(todo => {
        const priorityIndex = reorderedPriority.findIndex(pt => pt.id === todo.id);
        if (priorityIndex !== -1) {
          return { ...todo, priorityOrder: priorityIndex };
        }
        return todo;
      });

      return updatedTodos;
    });
  };

  const askTodd = async () => {
    if (!toddInput.trim()) return;

    const userMessage = toddInput.trim();
    setToddInput("");
    setToddMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setToddLoading(true);

    try {
      const response = await fetch('/api/todd-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          todos: todos,
          priorityTodos: todos.filter(t => t.isPriority).sort((a, b) => (a.priorityOrder || 0) - (b.priorityOrder || 0))
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get Todd response');
      }

      const data = await response.json();
      setToddMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        suggestions: data.suggestions
      }]);
    } catch (error: any) {
      console.error('Error talking to Todd:', error);
      setToddMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setToddLoading(false);
    }
  };

  const addTodoToPriorities = (todoId: string) => {
    setTodos(prevTodos => {
      const todo = prevTodos.find(t => t.id === todoId);
      if (!todo || todo.isPriority) return prevTodos;

      const priorityTodos = prevTodos.filter(t => t.isPriority);
      const newPriorityOrder = priorityTodos.length;

      return prevTodos.map(t =>
        t.id === todoId
          ? { ...t, isPriority: true, priorityOrder: newPriorityOrder }
          : t
      );
    });
  };

  const clearPriorities = () => {
    setTodos(prevTodos =>
      prevTodos.map(t => ({
        ...t,
        isPriority: false,
        priorityOrder: undefined
      }))
    );
  };

  const suggestPrioritization = async () => {
    const suggestionPrompt = "Based on my current to-dos, what should I prioritize today? Please suggest specific items I should add to my priority list.";
    setToddInput("");
    setToddMessages(prev => [...prev, { role: 'user', content: suggestionPrompt }]);
    setToddLoading(true);

    try {
      const response = await fetch('/api/todd-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: suggestionPrompt,
          todos: todos,
          priorityTodos: todos.filter(t => t.isPriority).sort((a, b) => (a.priorityOrder || 0) - (b.priorityOrder || 0))
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get Todd response');
      }

      const data = await response.json();
      setToddMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        suggestions: data.suggestions
      }]);
    } catch (error: any) {
      console.error('Error talking to Todd:', error);
      setToddMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setToddLoading(false);
    }
  };

  const autoPrioritize = async () => {
    setToddLoading(true);

    try {
      // Get all todos from the current workspace (not filtered by project/type)
      const currentWorkspaceTodos = workspace === "everything"
        ? todos
        : todos.filter((todo) => todo.workspace === workspace);

      const workspaceLabel = workspace === "everything" ? "all workspaces" : `the ${workspace} workspace`;
      const autoPrioritizePrompt = `Analyze all my to-dos in ${workspaceLabel} and automatically select the top 5 most important items I should focus on today.

PRIORITY ORDER (STRICT):
1. OVERDUE items MUST be prioritized FIRST above everything else
2. Items with EOD (End of Day) flag
3. Items due today
4. High priority (P0) items
5. Items due soon
6. Everything else

Return ONLY the todo IDs, no explanation needed.`;

      const response = await fetch('/api/todd-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: autoPrioritizePrompt,
          todos: currentWorkspaceTodos,
          priorityTodos: currentWorkspaceTodos.filter(t => t.isPriority).sort((a, b) => (a.priorityOrder || 0) - (b.priorityOrder || 0))
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to auto-prioritize');
      }

      const data = await response.json();

      // Clear existing priorities first
      setTodos(prevTodos =>
        prevTodos.map(t => ({
          ...t,
          isPriority: false,
          priorityOrder: undefined
        }))
      );

      // Add suggested todos to priorities
      if (data.suggestions && data.suggestions.length > 0) {
        const topSuggestions = data.suggestions.slice(0, 5);
        setTodos(prevTodos =>
          prevTodos.map(t => {
            const suggestionIndex = topSuggestions.indexOf(t.id);
            if (suggestionIndex !== -1) {
              return {
                ...t,
                isPriority: true,
                priorityOrder: suggestionIndex
              };
            }
            return t;
          })
        );
      }
    } catch (error: any) {
      console.error('Error auto-prioritizing:', error);
      alert('Failed to auto-prioritize. Please try again.');
    } finally {
      setToddLoading(false);
    }
  };

  const createTodo = () => {
    const startDateTime = newTodoStartDate ? newTodoStartDate.getTime() : undefined;
    let dueDateTime = newTodoDueDate ? newTodoDueDate.getTime() : undefined;

    if (newTodoType === "Meeting" && newTodoDueDate && newTodoMeetingTime) {
      const [hours, minutes] = newTodoMeetingTime.split(":");
      const dateWithTime = new Date(newTodoDueDate);
      dateWithTime.setHours(parseInt(hours), parseInt(minutes));
      dueDateTime = dateWithTime.getTime();
    } else if (newTodoType !== "Meeting" && newTodoDueDate && newTodoDueTime) {
      const [hours, minutes] = newTodoDueTime.split(":");
      const dateWithTime = new Date(newTodoDueDate);
      dateWithTime.setHours(parseInt(hours), parseInt(minutes));
      dueDateTime = dateWithTime.getTime();
    }

    const todoWorkspace = getActualWorkspace();

    // Check if this is a new project that doesn't exist yet
    if (newTodoProject && newTodoProject.trim()) {
      const existingProject = projects.find(
        p => p.name === newTodoProject.trim() && p.workspace === todoWorkspace
      );

      if (!existingProject) {
        // This is a new project - open project creation dialog
        const newTodo: Todo = {
          id: Date.now().toString(),
          text: newTodoText,
          completed: false,
          createdAt: Date.now(),
          type: newTodoType,
          workspace: todoWorkspace,
          startDate: newTodoType !== "Meeting" ? startDateTime : undefined,
          dueDate: dueDateTime,
          dueTime: newTodoType !== "Meeting" ? (newTodoDueTime || undefined) : undefined,
          project: undefined, // Will be set after project creation
          priority: newTodoPriority,
          isEOD: newTodoIsEOD,
          agenda: newTodoType === "Meeting" ? newTodoAgenda : undefined,
          meetingTime: newTodoType === "Meeting" ? newTodoMeetingTime : undefined,
          notes: newTodoNotes || undefined,
          links: newTodoLinks || undefined,
          parentId: newTodoParentId,
        };

        setPendingTodoData(newTodo);
        setNewProjectName(newTodoProject.trim());
        setNewProjectWorkspace(todoWorkspace);
        setNewProjectDescription("");
        setIsCreateProjectDialogOpen(true);
        return;
      }
    }

    const newTodo: Todo = {
      id: Date.now().toString(),
      text: newTodoText,
      completed: false,
      createdAt: Date.now(),
      type: newTodoType,
      workspace: todoWorkspace,
      startDate: newTodoType !== "Meeting" ? startDateTime : undefined,
      dueDate: dueDateTime,
      dueTime: newTodoType !== "Meeting" ? (newTodoDueTime || undefined) : undefined,
      project: newTodoProject || undefined,
      priority: newTodoPriority,
      isEOD: newTodoIsEOD,
      agenda: newTodoType === "Meeting" ? newTodoAgenda : undefined,
      meetingTime: newTodoType === "Meeting" ? newTodoMeetingTime : undefined,
      notes: newTodoNotes || undefined,
      links: newTodoLinks || undefined,
      parentId: newTodoParentId,
    };

    setTodos([newTodo, ...todos]);
    setIsCreateDialogOpen(false);
    resetTodoForm();
  };

  const toggleTodo = (id: string) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter((todo) => todo.id !== id));
    if (editingTodoId === id) {
      setEditingTodoId(null);
    }
  };

  const updateTodoType = (id: string, type: TodoType) => {
    setTodos(todos.map((todo) => (todo.id === id ? { ...todo, type } : todo)));
  };

  const updateTodoDueDate = (id: string, date: Date | undefined) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, dueDate: date ? date.getTime() : undefined } : todo
      )
    );
  };

  const updateTodoProject = (id: string, project: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    // Check if this is a new project that doesn't exist yet
    if (project && project.trim()) {
      const existingProject = projects.find(
        p => p.name === project.trim() && p.workspace === todo.workspace
      );

      if (!existingProject) {
        // This is a new project - open project creation dialog
        const updatedTodo = { ...todo, project: project.trim() };
        setPendingTodoData(updatedTodo);
        setNewProjectName(project.trim());
        setNewProjectWorkspace(todo.workspace);
        setNewProjectDescription("");
        setIsCreateProjectDialogOpen(true);
        setProjectInput("");
        setEditingProject(null);
        return;
      }
    }

    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, project: project || undefined } : todo
      )
    );
    setProjectInput("");
    setEditingProject(null);
  };

  const clearCompleted = () => {
    if (workspace === "everything") {
      setTodos(todos.filter((todo) => !todo.completed));
    } else {
      setTodos(todos.filter((todo) => todo.workspace !== workspace || !todo.completed));
    }
  };

  const getDueDateLabel = (dueDate?: number): string => {
    if (!dueDate) return "";
    const date = new Date(dueDate);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    if (isPast(date)) return "Overdue";
    const days = differenceInDays(date, new Date());
    if (days <= 7) return `${days}d`;
    return format(date, "MMM d");
  };

  const getDueDateColor = (dueDate?: number): string => {
    if (!dueDate) return "";
    const date = new Date(dueDate);
    if (isPast(date) && !isToday(date)) return "text-red-500";
    if (isToday(date)) return "text-orange-500";
    return "text-muted-foreground";
  };

  const filteredTodos = workspaceTodos.filter((todo) => {
    if (filter === "active" && todo.completed) return false;
    if (filter === "completed" && !todo.completed) return false;
    if (selectedTypeFilter && todo.type !== selectedTypeFilter) return false;
    if (selectedProjectFilter && todo.project !== selectedProjectFilter) return false;
    return true;
  });

  const meetingTodos = workspaceTodos
    .filter((todo) => todo.type === "Meeting" && !todo.completed)
    .sort((a, b) => {
      // Sort meetings with dates first, then by date, then undated meetings
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate - b.dueDate;
    });

  const activeCount = workspaceTodos.filter((todo) => !todo.completed).length;
  const completedCount = workspaceTodos.filter((todo) => todo.completed).length;
  const allProjects = getAllProjects();

  const typeCount = (type: TodoType) => {
    const allWorkspaceTodos = workspace === "everything"
      ? todos
      : todos.filter((todo) => todo.workspace === workspace);
    return allWorkspaceTodos.filter((todo) => todo.type === type).length;
  };

  // Metrics calculations
  const getDailyTasksMetrics = () => {
    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const dailyTasks = todos.filter(t => {
      if (t.completed) return false;
      // EOD items
      if (t.isEOD) return true;
      // Items due today
      if (t.dueDate) {
        const dueTime = typeof t.dueDate === 'string' ? new Date(t.dueDate).getTime() : t.dueDate;
        return dueTime >= today.getTime() && dueTime <= todayEnd.getTime();
      }
      return false;
    });

    const completedToday = todos.filter(t => {
      if (!t.completed) return false;
      if (t.isEOD) return true;
      if (t.dueDate) {
        const dueTime = typeof t.dueDate === 'string' ? new Date(t.dueDate).getTime() : t.dueDate;
        return dueTime >= today.getTime() && dueTime <= todayEnd.getTime();
      }
      return false;
    });

    return {
      total: dailyTasks.length,
      completed: completedToday.length,
      percentage: (dailyTasks.length + completedToday.length) > 0 ? Math.round((completedToday.length / (dailyTasks.length + completedToday.length)) * 100) : 0
    };
  };

  const getActionableTasksMetrics = () => {
    const now = Date.now();
    const actionableTasks = todos.filter(t => {
      if (t.completed) return false;
      // No start date or start date has passed
      return !t.startDate || t.startDate <= now;
    });

    const totalIncompleteTasks = todos.filter(t => !t.completed);

    return {
      actionable: actionableTasks.length,
      total: totalIncompleteTasks.length,
      percentage: totalIncompleteTasks.length > 0 ? Math.round((actionableTasks.length / totalIncompleteTasks.length) * 100) : 0
    };
  };

  const getProjectsMetrics = () => {
    const workspaceTypes: WorkspaceType[] = ['personal', 'work', 'creative'];
    return workspaceTypes.map(ws => {
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
  };

  // Score calculations for circular indicators
  const getWorkLeftForDayScore = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Get todos for the current workspace
    const relevantTodos = workspace === "everything"
      ? todos
      : todos.filter(t => t.workspace === workspace);

    // Filter by selected project if on a project page
    const filteredByProject = selectedProjectPage
      ? relevantTodos.filter(t => t.project === selectedProjectPage)
      : relevantTodos;

    // Tasks due today (including EOD) - incomplete
    const tasksForToday = filteredByProject.filter(t => {
      if (t.completed) return false;
      if (t.isEOD) return true;
      if (t.dueDate) {
        const dueTime = typeof t.dueDate === 'string' ? new Date(t.dueDate).getTime() : t.dueDate;
        return dueTime >= today.getTime() && dueTime <= todayEnd.getTime();
      }
      return false;
    });

    // Meetings for today - incomplete
    const meetingsToday = filteredByProject.filter(t => {
      if (t.completed || t.type !== "Meeting") return false;
      if (t.dueDate) {
        const dueTime = typeof t.dueDate === 'string' ? new Date(t.dueDate).getTime() : t.dueDate;
        return dueTime >= today.getTime() && dueTime <= todayEnd.getTime();
      }
      return false;
    });

    // Completed tasks/meetings for today
    const completedToday = filteredByProject.filter(t => {
      if (!t.completed) return false;
      if (t.isEOD) return true;
      if (t.dueDate) {
        const dueTime = typeof t.dueDate === 'string' ? new Date(t.dueDate).getTime() : t.dueDate;
        return dueTime >= today.getTime() && dueTime <= todayEnd.getTime();
      }
      return false;
    });

    const incompleteDailyWork = tasksForToday.length + meetingsToday.length;
    const totalDailyWork = incompleteDailyWork + completedToday.length;

    // If no work for today, return 0
    if (totalDailyWork === 0) return 0;

    // Calculate work left as percentage (100 = all work remaining, 0 = all work done)
    const score = Math.min(100, Math.round((incompleteDailyWork / totalDailyWork) * 100));

    return score;
  };

  const getWorkLeftScore = () => {
    const now = Date.now();

    // Get todos for the current workspace
    const relevantTodos = workspace === "everything"
      ? todos
      : todos.filter(t => t.workspace === workspace);

    // Filter by selected project if on a project page
    const filteredByProject = selectedProjectPage
      ? relevantTodos.filter(t => t.project === selectedProjectPage)
      : relevantTodos;

    // All incomplete actionable tasks (excluding those with future start dates)
    const actionableTasks = filteredByProject.filter(t => {
      if (t.completed) return false;
      // Exclude tasks with future start dates
      if (t.startDate && t.startDate > now) return false;
      return true;
    });

    // All tasks (excluding future start dates)
    const allRelevantTasks = filteredByProject.filter(t => {
      // Exclude tasks with future start dates
      if (t.startDate && t.startDate > now) return false;
      return true;
    });

    // If no relevant tasks, return 0
    if (allRelevantTasks.length === 0) return 0;

    // Calculate work left as percentage (100 = all work remaining, 0 = all work done)
    const score = Math.min(100, Math.round((actionableTasks.length / allRelevantTasks.length) * 100));

    return score;
  };

  // Workspace-specific metrics
  const getWorkspaceMetrics = (targetWorkspace: WorkspaceType) => {
    const wsTodos = todos.filter(t => t.workspace === targetWorkspace);
    const wsProjects = projects.filter(p => p.workspace === targetWorkspace);

    // Daily tasks for this workspace
    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const dailyTasks = wsTodos.filter(t => {
      if (t.completed) return false;
      if (t.isEOD) return true;
      if (t.dueDate) {
        const dueTime = typeof t.dueDate === 'string' ? new Date(t.dueDate).getTime() : t.dueDate;
        return dueTime >= today.getTime() && dueTime <= todayEnd.getTime();
      }
      return false;
    });

    const completedToday = wsTodos.filter(t => {
      if (!t.completed) return false;
      if (t.isEOD) return true;
      if (t.dueDate) {
        const dueTime = typeof t.dueDate === 'string' ? new Date(t.dueDate).getTime() : t.dueDate;
        return dueTime >= today.getTime() && dueTime <= todayEnd.getTime();
      }
      return false;
    });

    // Actionable tasks for this workspace
    const actionableTasks = wsTodos.filter(t => {
      if (t.completed) return false;
      return !t.startDate || t.startDate <= now;
    });

    const totalIncompleteTasks = wsTodos.filter(t => !t.completed);

    // Projects in this workspace
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

    return {
      dailyTasks: {
        total: dailyTasks.length,
        completed: completedToday.length,
        percentage: (dailyTasks.length + completedToday.length) > 0 ? Math.round((completedToday.length / (dailyTasks.length + completedToday.length)) * 100) : 0
      },
      actionableTasks: {
        actionable: actionableTasks.length,
        total: totalIncompleteTasks.length,
        percentage: totalIncompleteTasks.length > 0 ? Math.round((actionableTasks.length / totalIncompleteTasks.length) * 100) : 0
      },
      projects: projectsData
    };
  };

  // Project-specific metrics
  const getProjectMetrics = (projectName: string) => {
    const projectTodos = todos.filter(t => t.project === projectName);
    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Daily tasks for this project
    const dailyTasks = projectTodos.filter(t => {
      if (t.completed) return false;
      if (t.isEOD) return true;
      if (t.dueDate) {
        const dueTime = typeof t.dueDate === 'string' ? new Date(t.dueDate).getTime() : t.dueDate;
        return dueTime >= today.getTime() && dueTime <= todayEnd.getTime();
      }
      return false;
    });

    const completedToday = projectTodos.filter(t => {
      if (!t.completed) return false;
      if (t.isEOD) return true;
      if (t.dueDate) {
        const dueTime = typeof t.dueDate === 'string' ? new Date(t.dueDate).getTime() : t.dueDate;
        return dueTime >= today.getTime() && dueTime <= todayEnd.getTime();
      }
      return false;
    });

    // Actionable tasks for this project
    const actionableTasks = projectTodos.filter(t => {
      if (t.completed) return false;
      return !t.startDate || t.startDate <= now;
    });

    const totalIncompleteTasks = projectTodos.filter(t => !t.completed);
    const totalCompleted = projectTodos.filter(t => t.completed).length;

    return {
      dailyTasks: {
        total: dailyTasks.length,
        completed: completedToday.length,
        percentage: (dailyTasks.length + completedToday.length) > 0 ? Math.round((completedToday.length / (dailyTasks.length + completedToday.length)) * 100) : 0
      },
      actionableTasks: {
        actionable: actionableTasks.length,
        total: totalIncompleteTasks.length,
        percentage: totalIncompleteTasks.length > 0 ? Math.round((actionableTasks.length / totalIncompleteTasks.length) * 100) : 0
      },
      overall: {
        total: projectTodos.length,
        completed: totalCompleted,
        percentage: projectTodos.length > 0 ? Math.round((totalCompleted / projectTodos.length) * 100) : 0
      }
    };
  };

  const SortablePriorityItem = ({ todo }: { todo: Todo }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
    } = useSortable({ id: todo.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    const typeConfig = TODO_TYPE_CONFIG[todo.type];

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`p-3 rounded-lg border-2 transition-all ${typeConfig.bgLight} ${typeConfig.bgDark} ${typeConfig.borderLight} ${typeConfig.borderDark} hover:shadow-md`}
      >
        <div className="flex items-start gap-2">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing mt-1">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <Checkbox
            checked={todo.completed}
            onCheckedChange={() => toggleTodo(todo.id)}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 flex-wrap">
              <span
                className={`font-medium break-words cursor-pointer hover:underline flex-1 ${todo.completed ? "line-through text-muted-foreground" : ""}`}
                onClick={() => openSummaryDialog(todo)}
              >
                {todo.text}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => togglePriority(todo.id)}
                title="Remove from priorities"
              >
                <StarOff className="h-4 w-4 text-yellow-500" />
              </Button>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge
                variant="outline"
                className={`text-xs border ${typeConfig.borderLight} ${typeConfig.borderDark} ${typeConfig.textLight} ${typeConfig.textDark}`}
              >
                {todo.type}
              </Badge>
              <Badge
                variant={todo.priority === "P0" ? "destructive" : "outline"}
                className={`text-xs ${
                  todo.priority === "P1" ? "border-orange-500 text-orange-500" : ""
                }`}
              >
                {todo.priority}
              </Badge>
              {todo.dueDate && (
                <Badge variant="outline" className="text-xs gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  {format(new Date(todo.dueDate), "MMM d")}
                </Badge>
              )}
              {todo.isEOD && (
                <Badge variant="default" className="text-xs bg-red-600">
                  EOD
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTodoItem = (todo: Todo) => {
    const TypeIcon = TODO_TYPE_CONFIG[todo.type].icon;
    const typeConfig = TODO_TYPE_CONFIG[todo.type];
    return (
      <div
        key={todo.id}
        className={`p-3 rounded-lg border-2 transition-colors group ${typeConfig.bgLight} ${typeConfig.bgDark} ${typeConfig.borderLight} ${typeConfig.borderDark} hover:shadow-md`}
      >
        <div className="flex items-start gap-3">
          <Checkbox
            checked={todo.completed}
            onCheckedChange={() => toggleTodo(todo.id)}
            className="mt-0.5"
          />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`flex-1 break-words cursor-pointer hover:underline ${
                  todo.completed
                    ? "line-through text-muted-foreground"
                    : "text-foreground"
                }`}
                onClick={() => openSummaryDialog(todo)}
              >
                {todo.text}
              </span>
              <div className="flex items-center gap-1.5">
                {selectedTypeFilter && todo.parentId && (
                  <Badge variant="secondary" className="text-xs">
                    Has Parent
                  </Badge>
                )}
                {selectedTypeFilter && getChildren(todo.id).length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {getChildren(todo.id).length} Child{getChildren(todo.id).length !== 1 ? 'ren' : ''}
                  </Badge>
                )}
                <Badge
                  variant={todo.priority === "P0" ? "destructive" : "outline"}
                  className={`text-xs ${
                    todo.priority === "P1" ? "border-orange-500 text-orange-500" : ""
                  }`}
                >
                  {todo.priority}
                </Badge>
                {todo.isEOD && (
                  <Badge variant="default" className="gap-1 text-xs bg-red-600">
                    EOD
                  </Badge>
                )}
                {workspace === "everything" && (
                  <Badge variant="secondary" className="text-xs capitalize">
                    {todo.workspace}
                  </Badge>
                )}
                {todo.project && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Briefcase className="h-3 w-3" />
                    {todo.project}
                  </Badge>
                )}
                {todo.dueDate && (
                  <Badge
                    variant="outline"
                    className={`gap-1 text-xs ${getDueDateColor(todo.dueDate)}`}
                  >
                    <Clock className="h-3 w-3" />
                    {getDueDateLabel(todo.dueDate)}
                    {todo.type !== "Meeting" && todo.dueTime && ` ${todo.dueTime}`}
                  </Badge>
                )}
                <Select
                  value={todo.type}
                  onValueChange={(value: TodoType) => updateTodoType(todo.id, value)}
                >
                  <SelectTrigger className="w-auto h-7 text-xs gap-1.5 border-0 bg-muted/50 hover:bg-muted">
                    <TypeIcon className="h-3.5 w-3.5" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TODO_TYPE_CONFIG) as TodoType[]).map((type) => {
                      const Icon = TODO_TYPE_CONFIG[type].icon;
                      return (
                        <SelectItem key={type} value={type}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {type}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    Due
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={todo.dueDate ? new Date(todo.dueDate) : undefined}
                    onSelect={(date) => updateTodoDueDate(todo.id, date)}
                    initialFocus
                  />
                  {todo.dueDate && (
                    <div className="p-3 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => updateTodoDueDate(todo.id, undefined)}
                      >
                        Clear due date
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              {editingProject === todo.id ? (
                <div className="relative">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      updateTodoProject(todo.id, projectInput);
                    }}
                    className="flex gap-1"
                  >
                    <Input
                      type="text"
                      placeholder="Project name..."
                      value={projectInput}
                      onChange={(e) => setProjectInput(e.target.value)}
                      className="h-6 text-xs w-32"
                      autoFocus
                      onBlur={(e) => {
                        setTimeout(() => {
                          if (!projectInput.trim()) {
                            setEditingProject(null);
                          }
                        }, 200);
                      }}
                      list={`workspace-projects-${todo.workspace}`}
                    />
                    <datalist id={`workspace-projects-${todo.workspace}`}>
                      {getWorkspaceProjects(todo.workspace).map((proj) => (
                        <option key={proj.id} value={proj.name} />
                      ))}
                    </datalist>
                    <Button type="submit" size="sm" className="h-6 px-2 text-xs">
                      Set
                    </Button>
                  </form>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => {
                    setProjectInput(todo.project || "");
                    setEditingProject(todo.id);
                  }}
                >
                  <Briefcase className="h-3 w-3 mr-1" />
                  Project
                </Button>
              )}
            </div>

            {todo.type === "Meeting" && (todo.meetingTime || todo.agenda) && (
              <div className="text-sm space-y-2 pt-2 border-t">
                {todo.meetingTime && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{todo.meetingTime}</span>
                  </div>
                )}
                {todo.agenda && (
                  <div className="text-muted-foreground">
                    <span className="font-medium">Agenda:</span>
                    <ul className="mt-1 ml-4 space-y-0.5">
                      {todo.agenda.split('\n').filter(item => item.trim()).map((item, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="text-orange-500 dark:text-orange-400 flex-shrink-0">���</span>
                          <span className="flex-1">{item.trim()}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {(todo.notes || todo.links) && (
              <div className="text-sm space-y-2 pt-2 border-t mt-2">
                {todo.notes && (
                  <div className="text-muted-foreground">
                    <span className="font-medium">Notes:</span>
                    <p className="mt-1 whitespace-pre-wrap">{todo.notes}</p>
                  </div>
                )}
                {todo.links && (
                  <div className="text-muted-foreground">
                    <span className="font-medium">Links:</span>
                    <div className="mt-1 space-y-1">
                      {todo.links.split('\n').filter(link => link.trim()).map((link, idx) => (
                        <a
                          key={idx}
                          href={link.trim()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-blue-500 hover:text-blue-600 underline break-all"
                        >
                          {link.trim()}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {(todo.parentId || getChildren(todo.id).length > 0) && !selectedTypeFilter && (
              <div className="text-sm space-y-2 pt-2 border-t mt-2">
                {todo.parentId && (() => {
                  const parent = todos.find(t => t.id === todo.parentId);
                  return parent ? (
                    <div className="text-muted-foreground">
                      <span className="font-medium">Parent:</span>
                      <div className="flex items-start gap-2 mt-1">
                        <span className="text-xs bg-accent px-2 py-0.5 rounded break-words flex-1">[{parent.type}] {parent.text}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-2 text-xs flex-shrink-0"
                          onClick={() => unlinkTodo(todo.id)}
                        >
                          Unlink
                        </Button>
                      </div>
                    </div>
                  ) : null;
                })()}
                {getChildren(todo.id).length > 0 && (
                  <div className="text-muted-foreground">
                    <span className="font-medium">Children ({getChildren(todo.id).length}):</span>
                    <div className="mt-2 ml-4 space-y-3 border-l-2 border-muted pl-3">
                      {getChildren(todo.id).map((child) => {
                        const childConfig = TODO_TYPE_CONFIG[child.type];
                        return (
                        <div key={child.id} className="space-y-2">
                          <div className={`flex items-start gap-2 p-2 rounded-md border-2 ${childConfig.bgLight} ${childConfig.bgDark} ${childConfig.borderLight} ${childConfig.borderDark}`}>
                            <Checkbox
                              checked={child.completed}
                              onCheckedChange={() => toggleTodo(child.id)}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-2 flex-wrap">
                                <span
                                  className={`text-sm break-words cursor-pointer hover:underline ${child.completed ? "line-through text-muted-foreground" : ""}`}
                                  onClick={() => openSummaryDialog(child)}
                                >
                                  {child.text}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`text-xs border-2 ${childConfig.borderLight} ${childConfig.borderDark} ${childConfig.bgLight} ${childConfig.bgDark} ${childConfig.textLight} ${childConfig.textDark}`}
                                >
                                  {child.type}
                                </Badge>
                              </div>
                              {child.priority !== "P2" && (
                                <Badge
                                  variant={child.priority === "P0" ? "destructive" : "default"}
                                  className="text-xs mt-1"
                                >
                                  {child.priority}
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => unlinkTodo(child.id)}
                            >
                              Unlink
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteTodo(child.id)}
                              className="h-6 w-6"
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>

                          {/* Nested children of this child */}
                          {getChildren(child.id).length > 0 && (
                            <div className="ml-6 space-y-2 border-l-2 border-muted/50 pl-3">
                              <span className="text-xs font-medium">Sub-items ({getChildren(child.id).length}):</span>
                              {getChildren(child.id).map((grandchild) => {
                                const grandchildConfig = TODO_TYPE_CONFIG[grandchild.type];
                                return (
                                <div key={grandchild.id} className="space-y-1">
                                  <div className={`flex items-start gap-2 text-xs p-2 rounded-md border-2 ${grandchildConfig.bgLight} ${grandchildConfig.bgDark} ${grandchildConfig.borderLight} ${grandchildConfig.borderDark}`}>
                                    <Checkbox
                                      checked={grandchild.completed}
                                      onCheckedChange={() => toggleTodo(grandchild.id)}
                                      className="mt-0.5 h-3 w-3"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <span
                                        className={`break-words cursor-pointer hover:underline ${grandchild.completed ? "line-through text-muted-foreground" : ""}`}
                                        onClick={() => openSummaryDialog(grandchild)}
                                      >
                                        {grandchild.text}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className={`text-[10px] ml-1 px-1 py-0 border ${grandchildConfig.borderLight} ${grandchildConfig.borderDark} ${grandchildConfig.textLight} ${grandchildConfig.textDark}`}
                                      >
                                        {grandchild.type}
                                      </Badge>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-4 px-1 text-xs"
                                      onClick={() => unlinkTodo(grandchild.id)}
                                    >
                                      Unlink
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => deleteTodo(grandchild.id)}
                                      className="h-4 w-4"
                                    >
                                      <Trash2 className="h-2 w-2 text-destructive" />
                                    </Button>
                                  </div>
                                  {getAllowedChildTypes(grandchild.type).length > 0 && (
                                    <div className="ml-4">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-4 px-1.5 text-[10px]"
                                        onClick={() => startCreatingChild(grandchild.id)}
                                      >
                                        + Child
                                      </Button>
                                    </div>
                                  )}
                                </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Create child button for this child */}
                          {getAllowedChildTypes(child.type).length > 0 && (
                            <div className="ml-6">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-5 px-2 text-xs"
                                onClick={() => startCreatingChild(child.id)}
                              >
                                + Create Child
                              </Button>
                            </div>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {linkingTodoId !== todo.id && (
              <div className="pt-2 mt-2 border-t flex gap-2">
                {!todo.parentId && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setLinkingTodoId(todo.id)}
                  >
                    Link to Parent
                  </Button>
                )}
                {getAllowedChildTypes(todo.type).length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => startCreatingChild(todo.id)}
                  >
                    + Create Child
                  </Button>
                )}
              </div>
            )}

            {linkingTodoId === todo.id && (
              <div className="pt-2 mt-2 border-t space-y-2">
                <p className="text-xs font-medium">Select a parent to link to:</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {getEligibleParents(todo.type, todo.workspace).map((parent) => (
                    <Button
                      key={parent.id}
                      variant="ghost"
                      size="sm"
                      className="h-auto py-1 px-2 text-xs w-full justify-start break-words text-left"
                      onClick={() => linkTodoToParent(todo.id, parent.id)}
                    >
                      [{parent.type}] {parent.text}
                    </Button>
                  ))}
                  {getEligibleParents(todo.type, todo.workspace).length === 0 && (
                    <p className="text-xs text-muted-foreground">No eligible parents available</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setLinkingTodoId(null)}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => togglePriority(todo.id)}
              className="h-8 w-8"
              title={todo.isPriority ? "Remove from priorities" : "Add to priorities"}
            >
              {todo.isPriority ? (
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              ) : (
                <Star className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openEditDialog(todo)}
              className="h-8 w-8"
              title="Edit todo"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteTodo(todo.id)}
              className="h-8 w-8"
              title="Delete todo"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 relative">
          <div className="absolute left-0 top-0 flex gap-2">
            <Button
              variant="default"
              size="icon"
              onClick={() => {
                setIsAddTodoExpanded(!isAddTodoExpanded);
                if (!isAddTodoExpanded) {
                  setIsToddExpanded(false);
                  setIsAlertsExpanded(false);
                }
              }}
              className="rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              title={isAddTodoExpanded ? "Close" : "Add new to-do"}
            >
              {isAddTodoExpanded ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </Button>
            <Button
              variant="default"
              size="icon"
              onClick={() => {
                setIsToddExpanded(!isToddExpanded);
                if (!isToddExpanded) {
                  setIsAddTodoExpanded(false);
                  setIsAlertsExpanded(false);
                }
              }}
              className="rounded-full shadow-lg bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
              title={isToddExpanded ? "Close" : "Ask Todd"}
            >
              {isToddExpanded ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
            </Button>
          </div>
          <div className="absolute right-0 top-0 flex items-start gap-4">
            <CircularScore
              label="Work Left Today"
              score={getWorkLeftForDayScore()}
              color="#f97316"
            />
            <CircularScore
              label="Work Left"
              score={getWorkLeftScore()}
              color="#3b82f6"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            To-Do List
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Keep track of your tasks
          </p>
        </div>

        <Tabs value={workspace} onValueChange={(v) => {
          setWorkspace(v as Workspace);
          setSelectedProjectPage(null);
        }}>
          <div className="flex flex-col items-center gap-3 mb-6">
            <TabsList>
              <TabsTrigger value="everything">Homepage</TabsTrigger>
            </TabsList>
            <TabsList>
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="work">Work</TabsTrigger>
              <TabsTrigger value="creative">Creative</TabsTrigger>
            </TabsList>
          </div>

          {/* Project Pages Navigation */}
          {workspace !== "everything" && (() => {
            const currentWorkspaceProjects = getWorkspaceProjects(workspace as WorkspaceType);

            return (
              <div className="flex justify-center mb-6">
                <Card className="w-full max-w-4xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      {workspace.charAt(0).toUpperCase() + workspace.slice(1)} Projects
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {currentWorkspaceProjects.length > 0 && (
                        <Button
                          variant={selectedProjectPage === null ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedProjectPage(null)}
                        >
                          All {workspace.charAt(0).toUpperCase() + workspace.slice(1)} To-Dos
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openCreateProjectDialog(workspace as WorkspaceType)}
                        className="gap-2 border-dashed"
                      >
                        <Plus className="h-3 w-3" />
                        New Project
                      </Button>
                      {currentWorkspaceProjects.map((project) => {
                        const projectTodosCount = todos.filter(t => t.project === project.name && t.workspace === workspace).length;
                        const activeTodosCount = todos.filter(t => t.project === project.name && t.workspace === workspace && !t.completed).length;
                        return (
                          <Button
                            key={project.id}
                            variant={selectedProjectPage === project.name ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedProjectPage(project.name)}
                            className="gap-2"
                          >
                            <Briefcase className="h-3 w-3" />
                            {project.name}
                            <Badge variant="secondary" className="ml-1 text-xs">
                              {activeTodosCount}/{projectTodosCount}
                            </Badge>
                          </Button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })()}

          <TabsContent value={workspace}>
            {/* Expandable Add New To-Do */}
            {isAddTodoExpanded && (
              <Card className="mb-6 shadow-lg border-2 border-blue-200 dark:border-blue-800 animate-in fade-in slide-in-from-top-2 duration-200">
                <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-slate-50 dark:from-blue-950/30 dark:to-slate-950/30">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Plus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Add New To-Do
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <form onSubmit={(e) => {
                    addTodo(e);
                    setIsAddTodoExpanded(false);
                  }} className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Add a new to-do..."
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      className="flex-1"
                      autoFocus
                    />
                    <Button type="submit" size="icon">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Expandable Ask Todd */}
            {isToddExpanded && (
              <Card className="mb-6 shadow-lg border-2 border-purple-200 dark:border-purple-800 animate-in fade-in slide-in-from-top-2 duration-200">
                <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        Ask Todd
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your AI productivity assistant
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={suggestPrioritization}
                      disabled={toddLoading}
                      className="text-xs"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Suggest
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    {/* Chat messages */}
                    <div className="max-h-64 overflow-y-auto space-y-3">
                      {toddMessages.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          Ask Todd to suggest priorities or recommend which to-dos to focus on!
                        </div>
                      ) : (
                        toddMessages.map((msg, idx) => (
                          <div key={idx} className={`${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                            <div
                              className={`inline-block rounded-lg p-3 max-w-[85%] ${
                                msg.role === 'user'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-accent text-foreground'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              {msg.suggestions && msg.suggestions.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-white/20 space-y-1">
                                  <p className="text-xs font-medium">Suggested to-dos:</p>
                                  {msg.suggestions.map((todoId) => {
                                    const todo = todos.find(t => t.id === todoId);
                                    if (!todo) return null;
                                    return (
                                      <div key={todoId} className="flex items-center gap-2">
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          className="h-6 text-xs flex-1 justify-start"
                                          onClick={() => addTodoToPriorities(todoId)}
                                          disabled={todo.isPriority}
                                        >
                                          {todo.isPriority ? '✓ ' : '+ '}{todo.text}
                                        </Button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                      {toddLoading && (
                        <div className="text-left">
                          <div className="inline-block rounded-lg p-3 bg-accent">
                            <div className="animate-pulse text-sm">Todd is thinking...</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Input */}
                    <form onSubmit={(e) => { e.preventDefault(); askTodd(); }} className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Ask Todd about priorities..."
                        value={toddInput}
                        onChange={(e) => setToddInput(e.target.value)}
                        className="flex-1"
                        disabled={toddLoading}
                        autoFocus
                      />
                      <Button type="submit" size="icon" disabled={toddLoading || !toddInput.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Alerts Widget */}
            <AlertsWidget
              todos={todos}
              workspace={workspace}
              selectedProjectPage={selectedProjectPage}
            />

            {/* Priorities Widget */}
            <Card className="mb-6 shadow-lg border-2 border-yellow-200 dark:border-yellow-800">
                <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                        Today's Priorities
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Drag to reorder your priority items
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={autoPrioritize}
                        disabled={toddLoading}
                        className="text-xs bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600"
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        Auto
                      </Button>
                      {todos.some(t => t.isPriority) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearPriorities}
                          className="text-xs"
                        >
                          Clear All
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {(() => {
                    const priorityTodos = todos
                      .filter(t => t.isPriority && !t.completed)
                      .sort((a, b) => (a.priorityOrder || 0) - (b.priorityOrder || 0));

                    if (priorityTodos.length === 0) {
                      return (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          No priority items yet. Star a to-do to add it here!
                        </div>
                      );
                    }

                    return (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={priorityTodos.map(t => t.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-3">
                            {priorityTodos.map((todo) => (
                              <SortablePriorityItem key={todo.id} todo={todo} />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    );
                  })()}
                </CardContent>
            </Card>

            {/* Upcoming Meetings and Deadlines */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader className="pb-3 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setIsMeetingsExpanded(!isMeetingsExpanded)}>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Upcoming Meetings
                    {meetingTodos.length > 0 && (
                      <Badge variant="secondary">
                        {meetingTodos.length}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMeetingsExpanded(!isMeetingsExpanded);
                      }}
                    >
                      {isMeetingsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CardTitle>
                </CardHeader>
                {isMeetingsExpanded && (
                <CardContent>
                  {meetingTodos.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      No upcoming meetings
                    </div>
                  ) : (
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {meetingTodos.map((meeting) => {
                        const meetingConfig = TODO_TYPE_CONFIG["Meeting"];
                        return (
                        <div
                          key={meeting.id}
                          className={`flex-shrink-0 flex items-center gap-3 p-3 rounded-lg border-2 transition-colors min-w-[300px] ${meetingConfig.bgLight} ${meetingConfig.bgDark} ${meetingConfig.borderLight} ${meetingConfig.borderDark} hover:shadow-md`}
                        >
                          <Checkbox
                            checked={meeting.completed}
                            onCheckedChange={() => toggleTodo(meeting.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div
                              className="font-medium text-sm break-words cursor-pointer hover:underline"
                              onClick={() => openSummaryDialog(meeting)}
                            >
                              {meeting.text}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="outline" className="text-xs gap-1">
                                <CalendarIcon className="h-3 w-3" />
                                {meeting.dueDate
                                  ? format(new Date(meeting.dueDate), "MMM d")
                                  : "No date"}
                              </Badge>
                              {meeting.meetingTime && (
                                <Badge variant="outline" className="text-xs gap-1">
                                  <Clock className="h-3 w-3" />
                                  {meeting.meetingTime}
                                </Badge>
                              )}
                              <Badge
                                variant={meeting.priority === "P0" ? "destructive" : "outline"}
                                className={`text-xs ${
                                  meeting.priority === "P1" ? "border-orange-500 text-orange-500" : ""
                                }`}
                              >
                                {meeting.priority}
                              </Badge>
                              {meeting.isEOD && (
                                <Badge variant="default" className="text-xs bg-red-600">
                                  EOD
                                </Badge>
                              )}
                              {workspace === "everything" && (
                                <Badge variant="secondary" className="text-xs capitalize">
                                  {meeting.workspace}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
                )}
              </Card>

              {/* Upcoming Deadlines */}
              <Card>
                <CardHeader className="pb-3 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setIsDeadlinesExpanded(!isDeadlinesExpanded)}>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    Upcoming Deadlines
                    {(() => {
                      const deadlineCount = workspaceTodos.filter(t => !t.completed && t.dueDate && t.type !== "Meeting").length;
                      return deadlineCount > 0 ? (
                        <Badge variant="secondary">
                          {deadlineCount}
                        </Badge>
                      ) : null;
                    })()}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDeadlinesExpanded(!isDeadlinesExpanded);
                      }}
                    >
                      {isDeadlinesExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CardTitle>
                </CardHeader>
                {isDeadlinesExpanded && (
                <CardContent>
                  {(() => {
                    const upcomingDeadlines = workspaceTodos
                      .filter(t => !t.completed && t.dueDate && t.type !== "Meeting")
                      .sort((a, b) => {
                        const dateA = new Date(a.dueDate!);
                        const dateB = new Date(b.dueDate!);
                        return dateA.getTime() - dateB.getTime();
                      })
                      .slice(0, 5);

                    if (upcomingDeadlines.length === 0) {
                      return (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          No upcoming deadlines
                        </div>
                      );
                    }

                    return (
                      <div className="flex gap-3 overflow-x-auto pb-2">
                        {upcomingDeadlines.map((todo) => {
                          const typeConfig = TODO_TYPE_CONFIG[todo.type];
                          const daysUntil = Math.ceil((new Date(todo.dueDate!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                          const isOverdue = daysUntil < 0;
                          const isToday = daysUntil === 0;

                          return (
                            <div
                              key={todo.id}
                              className={`flex-shrink-0 flex items-center gap-3 p-3 rounded-lg border-2 transition-colors min-w-[300px] ${typeConfig.bgLight} ${typeConfig.bgDark} ${typeConfig.borderLight} ${typeConfig.borderDark} hover:shadow-md`}
                            >
                              <Checkbox
                                checked={todo.completed}
                                onCheckedChange={() => toggleTodo(todo.id)}
                              />
                              <div className="flex-1 min-w-0">
                                <div
                                  className="font-medium text-sm break-words cursor-pointer hover:underline"
                                  onClick={() => openSummaryDialog(todo)}
                                >
                                  {todo.text}
                                </div>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <Badge variant="outline" className="text-xs gap-1">
                                    <CalendarIcon className="h-3 w-3" />
                                    {format(new Date(todo.dueDate!), "MMM d")}
                                  </Badge>
                                  {isOverdue && (
                                    <Badge variant="destructive" className="text-xs">
                                      Overdue
                                    </Badge>
                                  )}
                                  {isToday && (
                                    <Badge variant="default" className="text-xs bg-red-600">
                                      Due Today
                                    </Badge>
                                  )}
                                  {!isOverdue && !isToday && daysUntil <= 3 && (
                                    <Badge variant="outline" className="text-xs text-orange-600">
                                      {daysUntil} day{daysUntil !== 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className="text-xs">
                                    {todo.priority}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </CardContent>
                )}
              </Card>
            </div>

            {/* Metrics Widget */}
            <MetricsWidget
              workspace={workspace}
              selectedProjectPage={selectedProjectPage}
              todos={todos}
              projects={projects}
              isExpanded={isMetricsExpanded}
              setIsExpanded={setIsMetricsExpanded}
            />

            {false && (
              <Card className="mb-6 shadow-lg border-2 border-blue-200 dark:border-blue-800">
                <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setIsMetricsExpanded(!isMetricsExpanded)}>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Metrics & Progress
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMetricsExpanded(!isMetricsExpanded);
                      }}
                    >
                      {isMetricsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CardTitle>
                </CardHeader>
                {isMetricsExpanded && (
                  <CardContent className="space-y-6 pt-4">
                    {/* Daily Tasks Metric */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                          <span className="text-sm font-medium">Today's Tasks</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {getDailyTasksMetrics().completed} / {getDailyTasksMetrics().completed + getDailyTasksMetrics().total} completed
                        </span>
                      </div>
                      <div className="relative h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-500"
                          style={{ width: `${getDailyTasksMetrics().percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Tasks due today or marked as EOD • {getDailyTasksMetrics().percentage}% complete
                      </p>
                    </div>

                    {/* Actionable Tasks Metric */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <span className="text-sm font-medium">Actionable Tasks</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {getActionableTasksMetrics().actionable} / {getActionableTasksMetrics().total}
                        </span>
                      </div>
                      <div className="relative h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                          style={{ width: `${getActionableTasksMetrics().percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Tasks ready to start now • {getActionableTasksMetrics().percentage}% of all tasks
                      </p>
                    </div>

                    {/* Projects Progress */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        <span className="text-sm font-medium">Projects by Workspace</span>
                      </div>
                      {getProjectsMetrics().map(wsMetric => (
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
                  </CardContent>
                )}
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card className="shadow-lg">
                  <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setIsTasksExpanded(!isTasksExpanded)}>
                    <CardTitle className="flex items-center gap-2">
                      {selectedProjectPage ? (
                        <>
                          <Briefcase className="h-5 w-5" />
                          {selectedProjectPage}
                          <Badge variant="secondary" className="ml-2">
                            {workspaceTodos.filter(t => !t.completed).length} active
                          </Badge>
                        </>
                      ) : (
                        "My Tasks"
                      )}
                      <Badge variant="secondary" className="ml-auto">
                        {workspaceTodos.length}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsTasksExpanded(!isTasksExpanded);
                        }}
                      >
                        {isTasksExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  {isTasksExpanded && (
                  <CardContent className="space-y-6">
                        {selectedProjectPage && (() => {
                          const currentProject = projects.find(p => p.name === selectedProjectPage);
                          return (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 p-3 bg-accent/50 rounded-lg border">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedProjectPage(null)}
                                className="gap-2"
                              >
                                ← Back to All {workspace !== "everything" ? workspace.charAt(0).toUpperCase() + workspace.slice(1) : ""} To-Dos
                              </Button>
                              <div className="flex-1"></div>
                              <span className="text-sm text-muted-foreground capitalize">
                                {workspace !== "everything" ? workspace : ""} / {selectedProjectPage}
                              </span>
                            </div>
                            {currentProject?.description && (
                              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <p className="text-sm text-muted-foreground">
                                  <strong className="text-foreground">Project Description:</strong> {currentProject.description}
                                </p>
                              </div>
                            )}
                          </div>
                          );
                        })()}
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            variant={filter === "all" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilter("all")}
                          >
                            All ({workspaceTodos.length})
                          </Button>
                          <Button
                            variant={filter === "active" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilter("active")}
                          >
                            Active ({activeCount})
                          </Button>
                          <Button
                            variant={filter === "completed" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilter("completed")}
                          >
                            Completed ({completedCount})
                          </Button>
                          {completedCount > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={clearCompleted}
                              className="ml-auto"
                            >
                              Clear Completed
                            </Button>
                          )}
                        </div>

                        <div className="space-y-2">
                          {filteredTodos.length === 0 ? (
                            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                              {filter === "active" && workspaceTodos.length > 0
                                ? "No active tasks. Great job!"
                                : filter === "completed" && workspaceTodos.length > 0
                                ? "No completed tasks yet."
                                : selectedTypeFilter
                                ? `No ${selectedTypeFilter} tasks`
                                : selectedProjectFilter
                                ? `No tasks in project "${selectedProjectFilter}"`
                                : "No tasks yet. Add one to get started!"}
                            </div>
                          ) : (
                            filteredTodos.map(renderTodoItem)
                          )}
                        </div>
                  </CardContent>
                  )}
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}>
                    <CardTitle className="text-lg flex items-center gap-2">
                      Filters
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsFiltersExpanded(!isFiltersExpanded);
                        }}
                      >
                        {isFiltersExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  {isFiltersExpanded && (
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Type</div>
                      <div className="flex flex-col gap-1.5">
                        <Button
                          variant={selectedTypeFilter === null ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedTypeFilter(null)}
                          className="justify-start"
                        >
                          Nested View
                        </Button>
                        {(Object.keys(TODO_TYPE_CONFIG) as TodoType[]).map((type) => {
                          const Icon = TODO_TYPE_CONFIG[type].icon;
                          const typeConfig = TODO_TYPE_CONFIG[type];
                          return (
                            <Button
                              key={type}
                              variant={
                                selectedTypeFilter === type ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => setSelectedTypeFilter(type)}
                              className={`justify-start gap-1.5 ${selectedTypeFilter !== type ? `border-2 ${typeConfig.borderLight} ${typeConfig.borderDark}` : ''}`}
                            >
                              <Icon className={`h-3.5 w-3.5 ${selectedTypeFilter !== type ? `${typeConfig.textLight} ${typeConfig.textDark}` : ''}`} />
                              {type} ({typeCount(type)})
                            </Button>
                          );
                        })}
                      </div>
                    </div>

                    {allProjects.length > 0 && !selectedProjectPage && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Briefcase className="h-4 w-4" />
                          Projects
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Button
                            variant={
                              selectedProjectFilter === null ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => setSelectedProjectFilter(null)}
                            className="justify-start"
                          >
                            All Projects
                          </Button>
                          {allProjects.map((project) => {
                            return (
                            <Button
                              key={project.id}
                              variant={
                                selectedProjectFilter === project.name ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => setSelectedProjectFilter(project.name)}
                              className="justify-start"
                            >
                              <span className="flex-1 text-left">{project.name}</span>
                              {workspace === "everything" && (
                                <Badge variant="secondary" className="ml-2 text-[10px] capitalize">
                                  {project.workspace}
                                </Badge>
                              )}
                            </Button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                  )}
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {dialogStep === "type"
                  ? creatingChildForId ? "Select Child To-Do Type" : "Select To-Do Type"
                  : dialogStep === "workspace"
                  ? "Select Workspace"
                  : creatingChildForId ? "Create Child To-Do" : "Create New To-Do"}
              </DialogTitle>
              <DialogDescription>
                {dialogStep === "type"
                  ? newTodoText
                    ? `What type of to-do is "${newTodoText}"?`
                    : "Select the type for this to-do"
                  : dialogStep === "workspace"
                  ? newTodoText
                    ? `Where does "${newTodoText}" belong?`
                    : "Select where this to-do belongs"
                  : newTodoText
                    ? `Add details for "${newTodoText}"`
                    : "Add details for this to-do"
                }
              </DialogDescription>
            </DialogHeader>

            {dialogStep === "type" ? (
              <>
                <div className="space-y-3 py-4">
                  {creatingChildForId && (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Creating a child for: <strong>{todos.find(t => t.id === creatingChildForId)?.text}</strong>
                      </p>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">To-Do Description</label>
                        <Input
                          placeholder="What needs to be done?"
                          value={newTodoText}
                          onChange={(e) => setNewTodoText(e.target.value)}
                          autoFocus
                        />
                      </div>
                    </>
                  )}
                  {(Object.keys(TODO_TYPE_CONFIG) as TodoType[])
                    .filter((type) => {
                      if (!creatingChildForId) return true;
                      const parent = todos.find(t => t.id === creatingChildForId);
                      if (!parent) return true;
                      return getAllowedChildTypes(parent.type).includes(type);
                    })
                    .map((type) => {
                    const Icon = TODO_TYPE_CONFIG[type].icon;
                    const typeConfig = TODO_TYPE_CONFIG[type];
                    return (
                      <Button
                        key={type}
                        variant={newTodoType === type ? "default" : "outline"}
                        className={`w-full justify-start h-auto py-4 border-2 ${newTodoType === type ? '' : `${typeConfig.borderLight} ${typeConfig.borderDark} ${typeConfig.bgLight} ${typeConfig.bgDark}`}`}
                        onClick={() => {
                          if (creatingChildForId && !newTodoText.trim()) {
                            return; // Don't proceed without text when creating a child
                          }
                          setNewTodoType(type);
                          setDialogStep(workspace === "everything" && !creatingChildForId ? "workspace" : "details");
                        }}
                        disabled={creatingChildForId && !newTodoText.trim()}
                      >
                        <Icon className={`h-5 w-5 mr-3 ${newTodoType === type ? '' : `${typeConfig.textLight} ${typeConfig.textDark}`}`} />
                        <div className="text-left">
                          <div className="font-semibold">{type}</div>
                          <div className="text-xs text-muted-foreground">
                            {type === "Task" && "Standard work item"}
                            {type === "Deliverable" && "Project outcome or milestone"}
                            {type === "Quick Win" && "Easy task with immediate impact"}
                            {type === "Meeting" && "Scheduled discussion or event"}
                          </div>
                        </div>
                      </Button>
                    );
                  })}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      setDialogStep("type");
                      setNewTodoText("");
                      setNewTodoType("Task");
                      setNewTodoWorkspace("personal");
                      setNewTodoStartDate(undefined);
                      setNewTodoDueDate(undefined);
                      setNewTodoProject("");
                      setIsCreatingNewProject(false);
                      setNewTodoPriority("P2");
                      setNewTodoIsEOD(false);
                      setNewTodoAgenda("");
                      setNewTodoMeetingTime("");
                      setNewTodoDueTime("");
                      setDueDatePopoverOpen(false);
                      setNewTodoNotes("");
                      setNewTodoLinks("");
                      setNewTodoParentId(undefined);
                      setCreatingChildForId(null);
                    }}
                  >
                    Cancel
                  </Button>
                </DialogFooter>
              </>
            ) : dialogStep === "workspace" ? (
              <>
                <div className="space-y-3 py-4">
                  <Button
                    variant={newTodoWorkspace === "personal" ? "default" : "outline"}
                    className="w-full justify-start h-auto py-4"
                    onClick={() => {
                      setNewTodoWorkspace("personal");
                      setDialogStep("details");
                    }}
                  >
                    <div className="text-left">
                      <div className="font-semibold">Personal</div>
                      <div className="text-xs text-muted-foreground">
                        Personal tasks and activities
                      </div>
                    </div>
                  </Button>
                  <Button
                    variant={newTodoWorkspace === "work" ? "default" : "outline"}
                    className="w-full justify-start h-auto py-4"
                    onClick={() => {
                      setNewTodoWorkspace("work");
                      setDialogStep("details");
                    }}
                  >
                    <div className="text-left">
                      <div className="font-semibold">Work</div>
                      <div className="text-xs text-muted-foreground">
                        Professional and work-related tasks
                      </div>
                    </div>
                  </Button>
                  <Button
                    variant={newTodoWorkspace === "creative" ? "default" : "outline"}
                    className="w-full justify-start h-auto py-4"
                    onClick={() => {
                      setNewTodoWorkspace("creative");
                      setDialogStep("details");
                    }}
                  >
                    <div className="text-left">
                      <div className="font-semibold">Creative</div>
                      <div className="text-xs text-muted-foreground">
                        Creative projects and ideas
                      </div>
                    </div>
                  </Button>
                </div>
                <DialogFooter>
                  <Button
                    variant="ghost"
                    onClick={() => setDialogStep("type")}
                  >
                    Back
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      setDialogStep("type");
                      setNewTodoText("");
                      setNewTodoType("Task");
                      setNewTodoWorkspace("personal");
                      setNewTodoStartDate(undefined);
                      setNewTodoDueDate(undefined);
                      setNewTodoProject("");
                      setIsCreatingNewProject(false);
                      setNewTodoPriority("P2");
                      setNewTodoIsEOD(false);
                      setNewTodoAgenda("");
                      setNewTodoMeetingTime("");
                      setNewTodoDueTime("");
                      setDueDatePopoverOpen(false);
                      setNewTodoNotes("");
                      setNewTodoLinks("");
                      setNewTodoParentId(undefined);
                      setCreatingChildForId(null);
                    }}
                  >
                    Cancel
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <div className="space-y-4 py-4">
                  {newTodoType !== "Meeting" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Start Date (Optional)</label>
                      <div className="flex gap-2">
                        <Popover modal={true}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {newTodoStartDate ? (
                                format(newTodoStartDate, "PPP")
                              ) : (
                                <span>Pick a start date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-auto p-0"
                            align="start"
                          >
                            <Calendar
                              mode="single"
                              selected={newTodoStartDate}
                              onSelect={(date) => setNewTodoStartDate(date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        {newTodoStartDate && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setNewTodoStartDate(undefined)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        First date you can take action on this item
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Due Date</label>
                    <div className="flex gap-2">
                      <Popover open={dueDatePopoverOpen} onOpenChange={setDueDatePopoverOpen} modal={true}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {newTodoDueDate ? (
                              format(newTodoDueDate, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-auto p-0"
                          align="start"
                        >
                          <Calendar
                            mode="single"
                            selected={newTodoDueDate}
                            onSelect={(date) => {
                              setNewTodoDueDate(date);
                              if (date) {
                                setDueDatePopoverOpen(false);
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      {newTodoDueDate && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setNewTodoDueDate(undefined)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {!newTodoDueDate && (
                      <p className="text-xs text-muted-foreground">
                        Leave empty for "No due date"
                      </p>
                    )}
                  </div>

                  {newTodoType === "Meeting" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Time</label>
                      <Input
                        type="time"
                        value={newTodoMeetingTime}
                        onChange={(e) => setNewTodoMeetingTime(e.target.value)}
                      />
                      {!newTodoMeetingTime && (
                        <p className="text-xs text-muted-foreground">
                          Optional: Set meeting time
                        </p>
                      )}
                    </div>
                  )}

                  {newTodoType !== "Meeting" && newTodoDueDate && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Due Time (Optional)</label>
                      <Input
                        type="time"
                        value={newTodoDueTime}
                        onChange={(e) => setNewTodoDueTime(e.target.value)}
                      />
                      {!newTodoDueTime && (
                        <p className="text-xs text-muted-foreground">
                          Optional: Set specific time for due date
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Project ({getActualWorkspace()})</label>
                    {(() => {
                      const currentWorkspaceProjects = getWorkspaceProjects(getActualWorkspace());
                      return currentWorkspaceProjects.length > 0 && !isCreatingNewProject ? (
                        <>
                          <Select
                        value={newTodoProject || "__none__"}
                        onValueChange={(value) => {
                          if (value === "__new__") {
                            setIsCreatingNewProject(true);
                            setNewTodoProject("");
                          } else if (value === "__none__") {
                            setNewTodoProject("");
                          } else {
                            setNewTodoProject(value);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select or create a project" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">No Project</SelectItem>
                              {currentWorkspaceProjects.map((project) => (
                                <SelectItem key={project.id} value={project.name}>
                                  {project.name}
                                </SelectItem>
                              ))}
                              <SelectItem value="__new__">+ Create New Project</SelectItem>
                            </SelectContent>
                          </Select>
                        </>
                      ) : (
                        <div className="space-y-2">
                          <Input
                            placeholder={`Enter ${getActualWorkspace()} project name`}
                            value={newTodoProject}
                            onChange={(e) => setNewTodoProject(e.target.value)}
                            autoFocus={isCreatingNewProject}
                            list={`workspace-projects-input-${getActualWorkspace()}`}
                          />
                          <datalist id={`workspace-projects-input-${getActualWorkspace()}`}>
                            {currentWorkspaceProjects.map((proj) => (
                              <option key={proj.id} value={proj.name} />
                            ))}
                          </datalist>
                          {currentWorkspaceProjects.length > 0 && isCreatingNewProject && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setIsCreatingNewProject(false);
                                setNewTodoProject("");
                              }}
                            >
                              ← Back to select
                            </Button>
                          )}
                        </div>
                      );
                    })()}
                    {!newTodoProject && !isCreatingNewProject && (
                      <p className="text-xs text-muted-foreground">
                        Projects are specific to {getActualWorkspace()} workspace
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Priority</label>
                    <Select value={newTodoPriority} onValueChange={(value: Priority) => setNewTodoPriority(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="P0">P0 - Critical</SelectItem>
                        <SelectItem value="P1">P1 - High</SelectItem>
                        <SelectItem value="P2">P2 - Normal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between space-x-2">
                    <div className="space-y-0.5">
                      <label className="text-sm font-medium">Needs to be done today</label>
                      <p className="text-xs text-muted-foreground">
                        To-do will be marked as EOD (End of Day)
                      </p>
                    </div>
                    <Switch
                      checked={newTodoIsEOD}
                      onCheckedChange={setNewTodoIsEOD}
                    />
                  </div>

                  {creatingChildForId && (
                    <div className="space-y-2 p-3 bg-accent/50 rounded-md border">
                      <div className="text-sm">
                        <span className="font-medium">Creating child for:</span> {todos.find(t => t.id === creatingChildForId)?.text}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Due date, project, priority, and EOD settings are inherited from parent. You can change them below.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Parent To-Do (Optional)</label>
                    {creatingChildForId ? (
                      <div className="text-sm p-3 bg-accent rounded-md">
                        <span className="font-medium">Parent:</span> {todos.find(t => t.id === creatingChildForId)?.text}
                      </div>
                    ) : (
                      <>
                        <Select
                          value={newTodoParentId || "__none__"}
                          onValueChange={(value) => {
                            setNewTodoParentId(value === "__none__" ? undefined : value);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Link to a parent to-do" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">No Parent</SelectItem>
                            {getEligibleParents(newTodoType, getActualWorkspace()).map((parent) => (
                              <SelectItem key={parent.id} value={parent.id}>
                                [{parent.type}] {parent.text}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {getEligibleParents(newTodoType, getActualWorkspace()).length === 0 && (
                          <p className="text-xs text-muted-foreground">
                            No eligible parent to-dos available
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notes</label>
                    <Textarea
                      placeholder="Add any notes about this to-do (optional)"
                      value={newTodoNotes}
                      onChange={(e) => setNewTodoNotes(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Links</label>
                    <Textarea
                      placeholder="Add URLs to related artifacts, one per line (optional)"
                      value={newTodoLinks}
                      onChange={(e) => setNewTodoLinks(e.target.value)}
                      rows={2}
                    />
                  </div>

                  {newTodoType === "Meeting" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Agenda</label>
                      <Textarea
                        placeholder="Enter agenda items, one per line (optional)"
                        value={newTodoAgenda}
                        onChange={(e) => setNewTodoAgenda(e.target.value)}
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter each agenda item on a new line - they will be displayed as bullet points
                      </p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="ghost"
                    onClick={() => setDialogStep(workspace === "everything" ? "workspace" : "type")}
                  >
                    Back
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      setDialogStep("type");
                      setNewTodoText("");
                      setNewTodoType("Task");
                      setNewTodoWorkspace("personal");
                      setNewTodoStartDate(undefined);
                      setNewTodoDueDate(undefined);
                      setNewTodoProject("");
                      setIsCreatingNewProject(false);
                      setNewTodoPriority("P2");
                      setNewTodoIsEOD(false);
                      setNewTodoAgenda("");
                      setNewTodoMeetingTime("");
                      setNewTodoDueTime("");
                      setDueDatePopoverOpen(false);
                      setNewTodoNotes("");
                      setNewTodoLinks("");
                      setNewTodoParentId(undefined);
                      setCreatingChildForId(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={createTodo}>Create To-Do</Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Summary To-Do Dialog */}
        <Dialog open={isSummaryDialogOpen} onOpenChange={setIsSummaryDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>To-Do Summary</DialogTitle>
            </DialogHeader>

            {viewingTodo && (
              <div className="space-y-4 py-4">
                {/* Main Info */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={viewingTodo.completed}
                      onCheckedChange={() => {
                        toggleTodo(viewingTodo.id);
                        setViewingTodo({ ...viewingTodo, completed: !viewingTodo.completed });
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <h3 className={`text-lg font-medium break-words ${viewingTodo.completed ? "line-through text-muted-foreground" : ""}`}>
                        {viewingTodo.text}
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge
                          variant="outline"
                          className={`border-2 ${TODO_TYPE_CONFIG[viewingTodo.type].borderLight} ${TODO_TYPE_CONFIG[viewingTodo.type].borderDark} ${TODO_TYPE_CONFIG[viewingTodo.type].bgLight} ${TODO_TYPE_CONFIG[viewingTodo.type].bgDark} ${TODO_TYPE_CONFIG[viewingTodo.type].textLight} ${TODO_TYPE_CONFIG[viewingTodo.type].textDark}`}
                        >
                          {viewingTodo.type}
                        </Badge>
                        <Badge variant={viewingTodo.priority === "P0" ? "destructive" : "default"}>
                          {viewingTodo.priority}
                        </Badge>
                        {viewingTodo.isEOD && (
                          <Badge variant="default" className="bg-red-600">EOD</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-accent/30 rounded-lg">
                  {viewingTodo.startDate && (
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-1">Start Date</p>
                      <p className="text-sm">{format(new Date(viewingTodo.startDate), "PPP")}</p>
                    </div>
                  )}
                  {viewingTodo.dueDate && (
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-1">Due Date</p>
                      <p className="text-sm">{format(new Date(viewingTodo.dueDate), "PPP")}</p>
                    </div>
                  )}
                  {viewingTodo.dueTime && (
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-1">Due Time</p>
                      <p className="text-sm">{viewingTodo.dueTime}</p>
                    </div>
                  )}
                  {viewingTodo.type === "Meeting" && viewingTodo.meetingTime && (
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-1">Meeting Time</p>
                      <p className="text-sm">{viewingTodo.meetingTime}</p>
                    </div>
                  )}
                  {viewingTodo.project && (
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-1">Project</p>
                      <Button
                        variant="link"
                        className="h-auto p-0 text-sm font-normal text-blue-600 dark:text-blue-400 hover:underline"
                        onClick={() => {
                          setWorkspace(viewingTodo.workspace);
                          setSelectedProjectPage(viewingTodo.project || null);
                          setIsSummaryDialogOpen(false);
                          setViewingTodo(null);
                        }}
                      >
                        <Briefcase className="h-3 w-3 mr-1" />
                        {viewingTodo.project}
                      </Button>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">Workspace</p>
                    <Button
                      variant="link"
                      className="h-auto p-0 text-sm font-normal text-blue-600 dark:text-blue-400 hover:underline capitalize"
                      onClick={() => {
                        setWorkspace(viewingTodo.workspace);
                        setSelectedProjectPage(null);
                        setIsSummaryDialogOpen(false);
                        setViewingTodo(null);
                      }}
                    >
                      {viewingTodo.workspace}
                    </Button>
                  </div>
                </div>

                {/* Meeting Agenda and Notes - Below details for meetings */}
                {viewingTodo.type === "Meeting" && (viewingTodo.agenda || viewingTodo.notes) && (
                  <div className="space-y-3 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
                    <h4 className="text-sm font-semibold text-orange-900 dark:text-orange-100">Meeting Details</h4>
                    {viewingTodo.agenda && (
                      <div>
                        <p className="text-sm font-medium mb-2">Agenda</p>
                        <ul className="space-y-1.5 text-sm text-muted-foreground">
                          {viewingTodo.agenda.split('\n').filter(item => item.trim()).map((item, idx) => (
                            <li key={idx} className="flex gap-2">
                              <span className="text-orange-500 dark:text-orange-400 flex-shrink-0">•</span>
                              <span className="flex-1">{item.trim()}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {viewingTodo.notes && (
                      <div>
                        <p className="text-sm font-medium mb-2">Notes</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingTodo.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes and Links for non-meeting types */}
                {viewingTodo.type !== "Meeting" && (viewingTodo.notes || viewingTodo.links) && (
                  <div className="space-y-3">
                    {viewingTodo.notes && (
                      <div>
                        <p className="text-sm font-medium mb-2">Notes</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingTodo.notes}</p>
                      </div>
                    )}
                    {viewingTodo.links && (
                      <div>
                        <p className="text-sm font-medium mb-2">Links</p>
                        <div className="space-y-1">
                          {viewingTodo.links.split('\n').filter(link => link.trim()).map((link, idx) => (
                            <a
                              key={idx}
                              href={link.trim()}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-sm text-blue-500 hover:text-blue-600 underline break-all"
                            >
                              {link.trim()}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Links for meeting types */}
                {viewingTodo.type === "Meeting" && viewingTodo.links && (
                  <div>
                    <p className="text-sm font-medium mb-2">Links</p>
                    <div className="space-y-1">
                      {viewingTodo.links.split('\n').filter(link => link.trim()).map((link, idx) => (
                        <a
                          key={idx}
                          href={link.trim()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm text-blue-500 hover:text-blue-600 underline break-all"
                        >
                          {link.trim()}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hierarchy */}
                {(viewingTodo.parentId || getChildren(viewingTodo.id).length > 0) && (
                  <div className="space-y-3 p-4 bg-accent/30 rounded-lg border">
                    <h4 className="text-sm font-semibold">Hierarchy</h4>

                    {viewingTodo.parentId && (() => {
                      const parent = todos.find(t => t.id === viewingTodo.parentId);
                      if (!parent) return null;
                      const parentConfig = TODO_TYPE_CONFIG[parent.type];
                      return (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Parent:</p>
                          <div
                            className={`flex items-center gap-2 p-2 rounded border-2 cursor-pointer hover:shadow-md transition-colors ${parentConfig.bgLight} ${parentConfig.bgDark} ${parentConfig.borderLight} ${parentConfig.borderDark}`}
                            onClick={() => {
                              setViewingTodo(parent);
                            }}
                          >
                            <Badge
                              variant="outline"
                              className={`text-xs border ${parentConfig.borderLight} ${parentConfig.borderDark} ${parentConfig.textLight} ${parentConfig.textDark}`}
                            >
                              {parent.type}
                            </Badge>
                            <span className="text-sm flex-1 break-words">{parent.text}</span>
                          </div>
                        </div>
                      );
                    })()}

                    {getChildren(viewingTodo.id).length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Children ({getChildren(viewingTodo.id).length}):</p>
                        <div className="space-y-1 ml-4 border-l-2 border-muted pl-3">
                          {getChildren(viewingTodo.id).map((child) => {
                            const childConfig = TODO_TYPE_CONFIG[child.type];
                            return (
                            <div
                              key={child.id}
                              className={`flex items-center gap-2 p-2 rounded border-2 text-xs cursor-pointer hover:shadow-md transition-colors ${childConfig.bgLight} ${childConfig.bgDark} ${childConfig.borderLight} ${childConfig.borderDark}`}
                              onClick={() => {
                                setViewingTodo(child);
                              }}
                            >
                              <Badge
                                variant="outline"
                                className={`text-[10px] border ${childConfig.borderLight} ${childConfig.borderDark} ${childConfig.textLight} ${childConfig.textDark}`}
                              >
                                {child.type}
                              </Badge>
                              <span className="flex-1 break-words">{child.text}</span>
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsSummaryDialogOpen(false);
                  setViewingTodo(null);
                }}
              >
                Close
              </Button>
              {viewingTodo && !viewingTodo.completed && (
                <Button
                  onClick={() => {
                    toggleTodo(viewingTodo.id);
                    setIsSummaryDialogOpen(false);
                    setViewingTodo(null);
                  }}
                >
                  Mark as Complete
                </Button>
              )}
              {viewingTodo && (
                <Button
                  variant="default"
                  onClick={() => {
                    setIsSummaryDialogOpen(false);
                    openEditDialog(viewingTodo);
                    setViewingTodo(null);
                  }}
                >
                  Edit
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit To-Do Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit To-Do</DialogTitle>
              <DialogDescription>
                Update details and view relationships
              </DialogDescription>
            </DialogHeader>

            {editingTodo && (
              <div className="space-y-6 py-4">
                {/* Hierarchy Visualization */}
                <div className="space-y-3 p-4 bg-accent/30 rounded-lg border">
                  <h3 className="text-sm font-semibold">Hierarchy</h3>

                  {/* Show parent if exists */}
                  {editingTodo.parentId && (() => {
                    const parent = todos.find(t => t.id === editingTodo.parentId);
                    if (!parent) return null;
                    const parentConfig = TODO_TYPE_CONFIG[parent.type];
                    return (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Parent:</p>
                        <div
                          className={`flex items-center gap-2 p-2 rounded border-2 cursor-pointer hover:shadow-md transition-colors ${parentConfig.bgLight} ${parentConfig.bgDark} ${parentConfig.borderLight} ${parentConfig.borderDark}`}
                          onClick={() => {
                            setEditingTodo(parent);
                          }}
                        >
                          <Badge
                            variant="outline"
                            className={`text-xs border ${parentConfig.borderLight} ${parentConfig.borderDark} ${parentConfig.textLight} ${parentConfig.textDark}`}
                          >
                            {parent.type}
                          </Badge>
                          <span className="text-sm flex-1 break-words">{parent.text}</span>
                          <span className="text-xs text-muted-foreground">Click to edit</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Current todo */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Current:</p>
                    <div className="flex items-center gap-2 p-2 bg-primary/10 rounded border border-primary">
                      <Badge variant="default" className="text-xs">{editingTodo.type}</Badge>
                      <span className="text-sm flex-1 break-words font-medium">{editingTodo.text}</span>
                    </div>
                  </div>

                  {/* Show children if exist */}
                  {getChildren(editingTodo.id).length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Children ({getChildren(editingTodo.id).length}):</p>
                      <div className="space-y-1 ml-4 border-l-2 border-muted pl-3">
                        {getChildren(editingTodo.id).map((child) => {
                          const childConfig = TODO_TYPE_CONFIG[child.type];
                          return (
                          <div
                            key={child.id}
                            className={`flex items-center gap-2 p-2 rounded border-2 text-xs cursor-pointer hover:shadow-md transition-colors ${childConfig.bgLight} ${childConfig.bgDark} ${childConfig.borderLight} ${childConfig.borderDark}`}
                            onClick={() => {
                              setEditingTodo(child);
                            }}
                          >
                            <Badge
                              variant="outline"
                              className={`text-[10px] border ${childConfig.borderLight} ${childConfig.borderDark} ${childConfig.textLight} ${childConfig.textDark}`}
                            >
                              {child.type}
                            </Badge>
                            <span className="flex-1 break-words">{child.text}</span>
                            <span className="text-[10px] text-muted-foreground">Click to edit</span>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Edit Fields */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Input
                      value={editingTodo.text}
                      onChange={(e) => setEditingTodo({ ...editingTodo, text: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Type</label>
                    <Select
                      value={editingTodo.type}
                      onValueChange={(value: TodoType) => setEditingTodo({ ...editingTodo, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(TODO_TYPE_CONFIG) as TodoType[]).map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Priority</label>
                    <Select
                      value={editingTodo.priority}
                      onValueChange={(value: Priority) => setEditingTodo({ ...editingTodo, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="P0">P0 - Critical</SelectItem>
                        <SelectItem value="P1">P1 - High</SelectItem>
                        <SelectItem value="P2">P2 - Medium</SelectItem>
                        <SelectItem value="P3">P3 - Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Project ({editingTodo.workspace})</label>
                    <Input
                      value={editingTodo.project || ""}
                      onChange={(e) => setEditingTodo({ ...editingTodo, project: e.target.value || undefined })}
                      placeholder={`Enter ${editingTodo.workspace} project name (optional)`}
                      list={`edit-workspace-projects-${editingTodo.workspace}`}
                    />
                    <datalist id={`edit-workspace-projects-${editingTodo.workspace}`}>
                      {getWorkspaceProjects(editingTodo.workspace).map((proj) => (
                        <option key={proj.id} value={proj.name} />
                      ))}
                    </datalist>
                    <p className="text-xs text-muted-foreground">
                      Projects are specific to {editingTodo.workspace} workspace
                    </p>
                  </div>

                  {editingTodo.type !== "Meeting" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Start Date (Optional)</label>
                      <div className="flex gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {editingTodo.startDate ? (
                                format(new Date(editingTodo.startDate), "PPP")
                              ) : (
                                <span>Pick a start date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={editingTodo.startDate ? new Date(editingTodo.startDate) : undefined}
                              onSelect={(date) => setEditingTodo({ ...editingTodo, startDate: date?.getTime() })}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        {editingTodo.startDate && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingTodo({ ...editingTodo, startDate: undefined })}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        First date you can take action on this item
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Due Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {editingTodo.dueDate ? (
                            format(new Date(editingTodo.dueDate), "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={editingTodo.dueDate ? new Date(editingTodo.dueDate) : undefined}
                          onSelect={(date) => setEditingTodo({ ...editingTodo, dueDate: date?.getTime() })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {editingTodo.dueDate && editingTodo.type !== "Meeting" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Due Time (Optional)</label>
                      <Input
                        type="time"
                        value={editingTodo.dueTime || ""}
                        onChange={(e) => setEditingTodo({ ...editingTodo, dueTime: e.target.value || undefined })}
                      />
                    </div>
                  )}

                  {editingTodo.type === "Meeting" && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Meeting Time</label>
                        <Input
                          type="time"
                          value={editingTodo.meetingTime || ""}
                          onChange={(e) => setEditingTodo({ ...editingTodo, meetingTime: e.target.value || undefined })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Agenda</label>
                        <Textarea
                          value={editingTodo.agenda || ""}
                          onChange={(e) => setEditingTodo({ ...editingTodo, agenda: e.target.value || undefined })}
                          placeholder="Enter agenda items, one per line (optional)"
                          rows={4}
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter each agenda item on a new line - they will be displayed as bullet points
                        </p>
                      </div>
                    </>
                  )}

                  <div className="flex items-center justify-between space-x-2">
                    <div className="space-y-0.5">
                      <label className="text-sm font-medium">End of Day</label>
                      <p className="text-xs text-muted-foreground">
                        Must be done today
                      </p>
                    </div>
                    <Switch
                      checked={editingTodo.isEOD}
                      onCheckedChange={(checked) => setEditingTodo({ ...editingTodo, isEOD: checked })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notes</label>
                    <Textarea
                      value={editingTodo.notes || ""}
                      onChange={(e) => setEditingTodo({ ...editingTodo, notes: e.target.value || undefined })}
                      rows={3}
                      placeholder="Add notes (optional)"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Links</label>
                    <Textarea
                      value={editingTodo.links || ""}
                      onChange={(e) => setEditingTodo({ ...editingTodo, links: e.target.value || undefined })}
                      rows={2}
                      placeholder="Add URLs, one per line (optional)"
                    />
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingTodo(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={saveEditedTodo}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Project Dialog */}
        <Dialog open={isCreateProjectDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setIsCreateProjectDialogOpen(false);
            setNewProjectName("");
            setNewProjectDescription("");
            if (pendingTodoData) {
              const wasEditing = todos.some(t => t.id === pendingTodoData.id);
              if (wasEditing) {
                setEditingTodo(pendingTodoData as Todo);
                setIsEditDialogOpen(true);
              } else {
                setIsCreateDialogOpen(true);
              }
              setPendingTodoData(null);
            }
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                {pendingTodoData
                  ? `First, let's set up the project for your new to-do in the ${newProjectWorkspace} workspace`
                  : `Define a new project in your ${newProjectWorkspace} workspace`
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Project Name</label>
                <Input
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Enter project name"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newProjectName.trim()) {
                      e.preventDefault();
                      createProject();
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Project Description</label>
                <Textarea
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  placeholder="Describe the project goals, scope, or objectives..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateProjectDialogOpen(false);
                  setNewProjectName("");
                  setNewProjectDescription("");
                  if (pendingTodoData) {
                    const wasEditing = todos.some(t => t.id === pendingTodoData.id);
                    if (wasEditing) {
                      setEditingTodo(pendingTodoData as Todo);
                      setIsEditDialogOpen(true);
                    } else {
                      setIsCreateDialogOpen(true);
                    }
                    setPendingTodoData(null);
                  }
                }}
              >
                Cancel
              </Button>
              <Button onClick={createProject} disabled={!newProjectName.trim()}>
                {pendingTodoData ? "Create Project & To-Do" : "Create Project"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Home;
