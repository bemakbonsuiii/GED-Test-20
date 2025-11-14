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
type Workspace = "personal" | "work";
type Priority = "P0" | "P1" | "P2";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  type: TodoType;
  dueDate?: number;
  project?: string;
  workspace: Workspace;
  priority: Priority;
  isEOD: boolean;
  agenda?: string;
  meetingTime?: string;
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
  const [workspace, setWorkspace] = useState<Workspace>("personal");
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<TodoType | null>(null);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string | null>(null);
  const [projectInput, setProjectInput] = useState("");
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [dialogStep, setDialogStep] = useState<"type" | "details">("type");
  const [newTodoText, setNewTodoText] = useState("");
  const [newTodoType, setNewTodoType] = useState<TodoType>("Task");
  const [newTodoDueDate, setNewTodoDueDate] = useState<Date | undefined>(undefined);
  const [newTodoProject, setNewTodoProject] = useState("");
  const [isCreatingNewProject, setIsCreatingNewProject] = useState(false);
  const [newTodoPriority, setNewTodoPriority] = useState<Priority>("P2");
  const [newTodoIsEOD, setNewTodoIsEOD] = useState(false);
  const [newTodoAgenda, setNewTodoAgenda] = useState("");
  const [newTodoMeetingTime, setNewTodoMeetingTime] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("todos");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const migrated = parsed.map((todo: any) => ({
          ...todo,
          type: todo.isMeeting ? "Meeting" : (todo.type || "Task"),
          workspace: todo.workspace || "personal",
          priority: todo.priority || "P2",
          isEOD: todo.isEOD || false,
          agenda: todo.agenda,
          meetingTime: todo.meetingTime,
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

  const workspaceTodos = todos.filter((todo) => todo.workspace === workspace);

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

  const createTodo = () => {
    let dueDateTime = newTodoDueDate ? newTodoDueDate.getTime() : undefined;

    if (newTodoType === "Meeting" && newTodoDueDate && newTodoMeetingTime) {
      const [hours, minutes] = newTodoMeetingTime.split(":");
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
      workspace,
      dueDate: dueDateTime,
      project: newTodoProject || undefined,
      priority: newTodoPriority,
      isEOD: newTodoIsEOD,
      agenda: newTodoType === "Meeting" ? newTodoAgenda : undefined,
      meetingTime: newTodoType === "Meeting" ? newTodoMeetingTime : undefined,
    };

    setTodos([newTodo, ...todos]);
    setIsCreateDialogOpen(false);
    setDialogStep("type");
    setNewTodoText("");
    setNewTodoType("Task");
    setNewTodoDueDate(undefined);
    setNewTodoProject("");
    setIsCreatingNewProject(false);
    setNewTodoPriority("P2");
    setNewTodoIsEOD(false);
    setNewTodoAgenda("");
    setNewTodoMeetingTime("");
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
    setTodos(todos.filter((todo) => todo.workspace !== workspace || !todo.completed));
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

  const typeCount = (type: TodoType) =>
    workspaceTodos.filter((todo) => todo.type === type).length;

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
                className={`flex-1 ${
                  todo.completed
                    ? "line-through text-muted-foreground"
                    : "text-foreground"
                }`}
              >
                {todo.text}
              </span>
              <div className="flex items-center gap-1.5">
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
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="work">Work</TabsTrigger>
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
                          <div className="font-medium text-sm truncate">{meeting.text}</div>
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
                          All Types
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
                {dialogStep === "type" ? "Select To-Do Type" : "Create New To-Do"}
              </DialogTitle>
              <DialogDescription>
                {dialogStep === "type"
                  ? `What type of to-do is "${newTodoText}"?`
                  : `Add details for "${newTodoText}"`
                }
              </DialogDescription>
            </DialogHeader>

            {dialogStep === "type" ? (
              <>
                <div className="space-y-3 py-4">
                  {(Object.keys(TODO_TYPE_CONFIG) as TodoType[]).map((type) => {
                    const Icon = TODO_TYPE_CONFIG[type].icon;
                    return (
                      <Button
                        key={type}
                        variant={newTodoType === type ? "default" : "outline"}
                        className="w-full justify-start h-auto py-4"
                        onClick={() => {
                          setNewTodoType(type);
                          setDialogStep("details");
                        }}
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
                      setNewTodoDueDate(undefined);
                      setNewTodoProject("");
                      setIsCreatingNewProject(false);
                      setNewTodoPriority("P2");
                      setNewTodoIsEOD(false);
                      setNewTodoAgenda("");
                      setNewTodoMeetingTime("");
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
                      <Popover>
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
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={newTodoDueDate}
                            onSelect={setNewTodoDueDate}
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
                      setNewTodoDueDate(undefined);
                      setNewTodoProject("");
                      setIsCreatingNewProject(false);
                      setNewTodoPriority("P2");
                      setNewTodoIsEOD(false);
                      setNewTodoAgenda("");
                      setNewTodoMeetingTime("");
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
      </div>
    </div>
  );
};

export default Home;
