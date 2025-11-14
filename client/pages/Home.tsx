import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Tag,
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

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  tags: string[];
  type: TodoType;
  dueDate?: number;
  project?: string;
  workspace: Workspace;
}

type FilterType = "all" | "active" | "completed";
type ViewMode = "list" | "timeline";

const TAG_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-yellow-500",
  "bg-orange-500",
  "bg-red-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-cyan-500",
];

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
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<TodoType | null>(null);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [projectInput, setProjectInput] = useState("");
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("todos");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const migrated = parsed.map((todo: any) => ({
          ...todo,
          tags: todo.tags || [],
          type: todo.isMeeting ? "Meeting" : (todo.type || "Task"),
          workspace: todo.workspace || "personal",
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

  const getAllTags = (): string[] => {
    const tagSet = new Set<string>();
    workspaceTodos.forEach((todo) => {
      todo.tags.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  };

  const getAllProjects = (): string[] => {
    const projectSet = new Set<string>();
    workspaceTodos.forEach((todo) => {
      if (todo.project) projectSet.add(todo.project);
    });
    return Array.from(projectSet).sort();
  };

  const getTagColor = (tag: string): string => {
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
  };

  const addTodo = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const newTodo: Todo = {
      id: Date.now().toString(),
      text: trimmed,
      completed: false,
      createdAt: Date.now(),
      tags: [],
      type: "Task",
      workspace,
    };

    setTodos([newTodo, ...todos]);
    setInputValue("");
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

  const addTagToTodo = (todoId: string, tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (!trimmedTag) return;

    setTodos(
      todos.map((todo) => {
        if (todo.id === todoId && !todo.tags.includes(trimmedTag)) {
          return { ...todo, tags: [...todo.tags, trimmedTag] };
        }
        return todo;
      })
    );
    setTagInput("");
  };

  const removeTagFromTodo = (todoId: string, tagToRemove: string) => {
    setTodos(
      todos.map((todo) => {
        if (todo.id === todoId) {
          return {
            ...todo,
            tags: todo.tags.filter((tag) => tag !== tagToRemove),
          };
        }
        return todo;
      })
    );
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
    if (selectedTagFilter && !todo.tags.includes(selectedTagFilter)) return false;
    if (selectedTypeFilter && todo.type !== selectedTypeFilter) return false;
    if (selectedProjectFilter && todo.project !== selectedProjectFilter) return false;
    return true;
  });

  const meetingTodos = workspaceTodos
    .filter((todo) => todo.type === "Meeting" && todo.dueDate && !todo.completed)
    .sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0));

  const activeCount = workspaceTodos.filter((todo) => !todo.completed).length;
  const completedCount = workspaceTodos.filter((todo) => todo.completed).length;
  const allTags = getAllTags();
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
              {todo.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1 pr-1 text-xs">
                  <span className={`h-2 w-2 rounded-full ${getTagColor(tag)}`} />
                  {tag}
                  <button
                    onClick={() => removeTagFromTodo(todo.id, tag)}
                    className="ml-1 hover:bg-background/50 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}

              {editingTodoId === todo.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    addTagToTodo(todo.id, tagInput);
                  }}
                  className="flex gap-1"
                >
                  <Input
                    type="text"
                    placeholder="Tag name..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    className="h-6 text-xs w-24"
                    autoFocus
                    onBlur={() => {
                      if (!tagInput.trim()) {
                        setEditingTodoId(null);
                      }
                    }}
                  />
                  <Button type="submit" size="sm" className="h-6 px-2 text-xs">
                    Add
                  </Button>
                </form>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setEditingTodoId(todo.id)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Tag
                </Button>
              )}

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

              <Button
                variant={todo.isMeeting ? "default" : "outline"}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => toggleMeeting(todo.id)}
              >
                <Users className="h-3 w-3 mr-1" />
                Meeting
              </Button>
            </div>
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card className="shadow-lg">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>My Tasks</CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant={viewMode === "list" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setViewMode("list")}
                        >
                          List
                        </Button>
                        <Button
                          variant={viewMode === "timeline" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setViewMode("timeline")}
                          disabled={meetingTodos.length === 0}
                        >
                          Timeline
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {viewMode === "list" ? (
                      <>
                        <form onSubmit={addTodo} className="flex gap-2">
                          <Input
                            type="text"
                            placeholder="Add a new task..."
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
                                : selectedTagFilter
                                ? `No tasks with tag "${selectedTagFilter}"`
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
                      </>
                    ) : (
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Upcoming Meetings</h3>
                        {meetingTodos.length === 0 ? (
                          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                            No upcoming meetings scheduled
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {meetingTodos.map((meeting) => (
                              <div
                                key={meeting.id}
                                className="flex items-start gap-4 p-4 rounded-lg border bg-background"
                              >
                                <div className="flex flex-col items-center justify-center min-w-[60px] p-2 rounded bg-primary/10">
                                  <div className="text-xs font-medium text-primary">
                                    {format(new Date(meeting.dueDate!), "MMM")}
                                  </div>
                                  <div className="text-2xl font-bold text-primary">
                                    {format(new Date(meeting.dueDate!), "d")}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {format(new Date(meeting.dueDate!), "EEE")}
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Users className="h-4 w-4 text-primary" />
                                    <span className="font-medium">{meeting.text}</span>
                                  </div>
                                  {meeting.project && (
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                      <Briefcase className="h-3 w-3" />
                                      {meeting.project}
                                    </div>
                                  )}
                                  <div className="flex gap-1.5 mt-2">
                                    {meeting.tags.map((tag) => (
                                      <Badge
                                        key={tag}
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                <Checkbox
                                  checked={meeting.completed}
                                  onCheckedChange={() => toggleTodo(meeting.id)}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
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

                    {allTags.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Tag className="h-4 w-4" />
                          Tags
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Button
                            variant={
                              selectedTagFilter === null ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => setSelectedTagFilter(null)}
                            className="justify-start"
                          >
                            All Tags
                          </Button>
                          {allTags.map((tag) => (
                            <Button
                              key={tag}
                              variant={
                                selectedTagFilter === tag ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => setSelectedTagFilter(tag)}
                              className="justify-start gap-1.5"
                            >
                              <span
                                className={`h-2 w-2 rounded-full ${getTagColor(tag)}`}
                              />
                              {tag}
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
      </div>
    </div>
  );
};

export default Home;
