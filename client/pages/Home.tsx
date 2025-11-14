import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { format, isPast, isToday, isTomorrow, differenceInDays } from "date-fns";

type TodoType = "Task" | "Deliverable" | "Quick Win" | "Meeting";
type WorkspaceType = "personal" | "work" | "creative";
type Workspace = WorkspaceType | "everything";
type Priority = "P0" | "P1" | "P2";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  type: TodoType;
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
}

type FilterType = "all" | "active" | "completed";

const TODO_TYPE_CONFIG: Record<
  TodoType,
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  Task: { icon: CheckCircle2, color: "bg-blue-500" },
  Deliverable: { icon: Target, color: "bg-purple-500" },
  "Quick Win": { icon: Zap, color: "bg-green-500" },
  Meeting: { icon: Users, color: "bg-orange-500" },
};

const Home = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [workspace, setWorkspace] = useState<Workspace>("everything");
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
        }));
        setTodos(migrated);
      } catch (e) {
        console.error("Failed to parse todos from localStorage");
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("todos", JSON.stringify(todos));
  }, [todos]);

  const workspaceTodos = (workspace === "everything"
    ? todos
    : todos.filter((todo) => todo.workspace === workspace)
  ).filter((todo) => {
    // If filtering by type, show child todos of that type as standalone items
    if (selectedTypeFilter) {
      return true; // Don't filter out children when type filter is active
    }
    // Otherwise, only show parent todos (children appear nested under parents)
    return !todo.parentId;
  });

  const getAllProjects = (): string[] => {
    const projectSet = new Set<string>();
    workspaceTodos.forEach((todo) => {
      if (todo.project) projectSet.add(todo.project);
    });
    return Array.from(projectSet).sort();
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
    const allowedRelationships: Record<TodoType, TodoType[]> = {
      Meeting: ["Deliverable", "Task", "Quick Win"],
      Deliverable: ["Deliverable", "Task", "Quick Win"],
      Task: ["Task", "Quick Win"],
      "Quick Win": ["Quick Win"],
    };
    return allowedRelationships[parentType] || [];
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

    setTodos(todos.map((todo) =>
      todo.id === editingTodo.id ? editingTodo : todo
    ));
    setIsEditDialogOpen(false);
    setEditingTodo(null);
  };

  const createTodo = () => {
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

    const newTodo: Todo = {
      id: Date.now().toString(),
      text: newTodoText,
      completed: false,
      createdAt: Date.now(),
      type: newTodoType,
      workspace: getActualWorkspace(),
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
    setDialogStep("type");
    setNewTodoText("");
    setNewTodoType("Task");
    setNewTodoWorkspace("personal");
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

  const renderTodoItem = (todo: Todo) => {
    const TypeIcon = TODO_TYPE_CONFIG[todo.type].icon;
    return (
      <div
        key={todo.id}
        className="p-3 rounded-lg border bg-background hover:bg-accent/50 transition-colors group"
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
                onClick={() => openEditDialog(todo)}
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
                    onBlur={() => {
                      if (!projectInput.trim()) {
                        setEditingProject(null);
                      }
                    }}
                  />
                  <Button type="submit" size="sm" className="h-6 px-2 text-xs">
                    Set
                  </Button>
                </form>
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
              <div className="text-sm space-y-1 pt-1 border-t">
                {todo.meetingTime && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{todo.meetingTime}</span>
                  </div>
                )}
                {todo.agenda && (
                  <div className="text-muted-foreground">
                    <span className="font-medium">Agenda:</span> {todo.agenda}
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
                      {getChildren(todo.id).map((child) => (
                        <div key={child.id} className="space-y-2">
                          <div className="flex items-start gap-2">
                            <Checkbox
                              checked={child.completed}
                              onCheckedChange={() => toggleTodo(child.id)}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-2 flex-wrap">
                                <span
                                  className={`text-sm break-words cursor-pointer hover:underline ${child.completed ? "line-through text-muted-foreground" : ""}`}
                                  onClick={() => openEditDialog(child)}
                                >
                                  {child.text}
                                </span>
                                <Badge variant="outline" className="text-xs">
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
                              {getChildren(child.id).map((grandchild) => (
                                <div key={grandchild.id} className="space-y-1">
                                  <div className="flex items-start gap-2 text-xs">
                                    <Checkbox
                                      checked={grandchild.completed}
                                      onCheckedChange={() => toggleTodo(grandchild.id)}
                                      className="mt-0.5 h-3 w-3"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <span
                                        className={`break-words cursor-pointer hover:underline ${grandchild.completed ? "line-through text-muted-foreground" : ""}`}
                                        onClick={() => openEditDialog(grandchild)}
                                      >
                                        {grandchild.text}
                                      </span>
                                      <Badge variant="outline" className="text-[10px] ml-1 px-1 py-0">
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
                              ))}
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
                      ))}
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => deleteTodo(todo.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            To-Do List
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Keep track of your tasks
          </p>
        </div>

        <Tabs value={workspace} onValueChange={(v) => setWorkspace(v as Workspace)}>
          <div className="flex justify-center mb-6">
            <TabsList>
              <TabsTrigger value="everything">Everything</TabsTrigger>
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="work">Work</TabsTrigger>
              <TabsTrigger value="creative">Creative</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={workspace}>
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Upcoming Meetings
                </CardTitle>
              </CardHeader>
              <CardContent>
                {meetingTodos.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No upcoming meetings
                  </div>
                ) : (
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {meetingTodos.map((meeting) => (
                      <div
                        key={meeting.id}
                        className="flex-shrink-0 flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-accent/50 transition-colors min-w-[300px]"
                      >
                        <Checkbox
                          checked={meeting.completed}
                          onCheckedChange={() => toggleTodo(meeting.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div
                            className="font-medium text-sm break-words cursor-pointer hover:underline"
                            onClick={() => openEditDialog(meeting)}
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
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle>My Tasks</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                        <form onSubmit={addTodo} className="flex gap-2">
                          <Input
                            type="text"
                            placeholder="Add a new to-do..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className="flex-1"
                          />
                          <Button type="submit" size="icon">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </form>

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
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Filters</CardTitle>
                  </CardHeader>
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
                          return (
                            <Button
                              key={type}
                              variant={
                                selectedTypeFilter === type ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => setSelectedTypeFilter(type)}
                              className="justify-start gap-1.5"
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {type} ({typeCount(type)})
                            </Button>
                          );
                        })}
                      </div>
                    </div>

                    {allProjects.length > 0 && (
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
                          {allProjects.map((project) => (
                            <Button
                              key={project}
                              variant={
                                selectedProjectFilter === project ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => setSelectedProjectFilter(project)}
                              className="justify-start"
                            >
                              {project}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
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
                    return (
                      <Button
                        key={type}
                        variant={newTodoType === type ? "default" : "outline"}
                        className="w-full justify-start h-auto py-4"
                        onClick={() => {
                          if (creatingChildForId && !newTodoText.trim()) {
                            return; // Don't proceed without text when creating a child
                          }
                          setNewTodoType(type);
                          setDialogStep(workspace === "everything" && !creatingChildForId ? "workspace" : "details");
                        }}
                        disabled={creatingChildForId && !newTodoText.trim()}
                      >
                        <Icon className="h-5 w-5 mr-3" />
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
                    <label className="text-sm font-medium">Project</label>
                    {allProjects.length > 0 && !isCreatingNewProject ? (
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
                            {allProjects.map((project) => (
                              <SelectItem key={project} value={project}>
                                {project}
                              </SelectItem>
                            ))}
                            <SelectItem value="__new__">+ Create New Project</SelectItem>
                          </SelectContent>
                        </Select>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <Input
                          placeholder="Enter project name or leave empty"
                          value={newTodoProject}
                          onChange={(e) => setNewTodoProject(e.target.value)}
                          autoFocus={isCreatingNewProject}
                        />
                        {allProjects.length > 0 && isCreatingNewProject && (
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
                    )}
                    {!newTodoProject && !isCreatingNewProject && (
                      <p className="text-xs text-muted-foreground">
                        Leave empty for "No Project"
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
                        placeholder="Enter meeting agenda (optional)"
                        value={newTodoAgenda}
                        onChange={(e) => setNewTodoAgenda(e.target.value)}
                        rows={3}
                      />
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
                    return parent ? (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Parent:</p>
                        <div
                          className="flex items-center gap-2 p-2 bg-background rounded border cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={() => {
                            setEditingTodo(parent);
                          }}
                        >
                          <Badge variant="outline" className="text-xs">{parent.type}</Badge>
                          <span className="text-sm flex-1 break-words">{parent.text}</span>
                          <span className="text-xs text-muted-foreground">Click to edit</span>
                        </div>
                      </div>
                    ) : null;
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
                        {getChildren(editingTodo.id).map((child) => (
                          <div
                            key={child.id}
                            className="flex items-center gap-2 p-2 bg-background rounded border text-xs cursor-pointer hover:bg-accent/50 transition-colors"
                            onClick={() => {
                              setEditingTodo(child);
                            }}
                          >
                            <Badge variant="outline" className="text-[10px]">{child.type}</Badge>
                            <span className="flex-1 break-words">{child.text}</span>
                            <span className="text-[10px] text-muted-foreground">Click to edit</span>
                          </div>
                        ))}
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
                    <label className="text-sm font-medium">Project</label>
                    <Input
                      value={editingTodo.project || ""}
                      onChange={(e) => setEditingTodo({ ...editingTodo, project: e.target.value || undefined })}
                      placeholder="Enter project name (optional)"
                    />
                  </div>

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
                          rows={3}
                        />
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
      </div>
    </div>
  );
};

export default Home;
