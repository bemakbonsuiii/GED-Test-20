import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, Tag, X, Target, CheckCircle2, Zap } from "lucide-react";

type TodoType = "Task" | "Deliverable" | "Quick Win";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  tags: string[];
  type: TodoType;
}

type FilterType = "all" | "active" | "completed";

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
};

const Home = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<TodoType | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("todos");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const migrated = parsed.map((todo: any) => ({
          ...todo,
          tags: todo.tags || [],
          type: todo.type || "Task",
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

  const getAllTags = (): string[] => {
    const tagSet = new Set<string>();
    todos.forEach((todo) => {
      todo.tags.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
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
    setTodos(
      todos.map((todo) => (todo.id === id ? { ...todo, type } : todo))
    );
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
    setTodos(todos.filter((todo) => !todo.completed));
  };

  const filteredTodos = todos.filter((todo) => {
    if (filter === "active" && todo.completed) return false;
    if (filter === "completed" && !todo.completed) return false;
    if (selectedTagFilter && !todo.tags.includes(selectedTagFilter)) return false;
    if (selectedTypeFilter && todo.type !== selectedTypeFilter) return false;
    return true;
  });

  const activeCount = todos.filter((todo) => !todo.completed).length;
  const completedCount = todos.filter((todo) => todo.completed).length;
  const allTags = getAllTags();

  const typeCount = (type: TodoType) =>
    todos.filter((todo) => todo.type === type).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            To-Do List
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Keep track of your tasks
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>My Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
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
                All ({todos.length})
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
              <div className="text-sm text-muted-foreground">Filter by type:</div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={selectedTypeFilter === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTypeFilter(null)}
                >
                  All Types
                </Button>
                {(Object.keys(TODO_TYPE_CONFIG) as TodoType[]).map((type) => {
                  const Icon = TODO_TYPE_CONFIG[type].icon;
                  return (
                    <Button
                      key={type}
                      variant={selectedTypeFilter === type ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTypeFilter(type)}
                      className="gap-1.5"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {type} ({typeCount(type)})
                    </Button>
                  );
                })}
              </div>
            </div>

            {allTags.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Tag className="h-4 w-4" />
                  <span>Filter by tag:</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={selectedTagFilter === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTagFilter(null)}
                  >
                    All Tags
                  </Button>
                  {allTags.map((tag) => (
                    <Button
                      key={tag}
                      variant={selectedTagFilter === tag ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTagFilter(tag)}
                      className="gap-1"
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

            <div className="space-y-2">
              {filteredTodos.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  {filter === "active" && todos.length > 0
                    ? "No active tasks. Great job!"
                    : filter === "completed" && todos.length > 0
                    ? "No completed tasks yet."
                    : selectedTagFilter
                    ? `No tasks with tag "${selectedTagFilter}"`
                    : selectedTypeFilter
                    ? `No ${selectedTypeFilter} tasks`
                    : "No tasks yet. Add one to get started!"}
                </div>
              ) : (
                filteredTodos.map((todo) => {
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
                            <Select
                              value={todo.type}
                              onValueChange={(value: TodoType) =>
                                updateTodoType(todo.id, value)
                              }
                            >
                              <SelectTrigger className="w-auto h-7 text-xs gap-1.5 border-0 bg-muted/50 hover:bg-muted">
                                <TypeIcon className="h-3.5 w-3.5" />
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(Object.keys(TODO_TYPE_CONFIG) as TodoType[]).map(
                                  (type) => {
                                    const Icon = TODO_TYPE_CONFIG[type].icon;
                                    return (
                                      <SelectItem key={type} value={type}>
                                        <div className="flex items-center gap-2">
                                          <Icon className="h-4 w-4" />
                                          {type}
                                        </div>
                                      </SelectItem>
                                    );
                                  }
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {todo.tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="gap-1 pr-1 text-xs"
                              >
                                <span
                                  className={`h-2 w-2 rounded-full ${getTagColor(tag)}`}
                                />
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
                                <Button
                                  type="submit"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                >
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
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Home;
