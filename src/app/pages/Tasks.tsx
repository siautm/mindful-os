import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";
import { Badge } from "../components/ui/badge";
import { Plus, Trash2, AlertCircle, Clock, TrendingUp, Edit2 } from "lucide-react";
import {
  getTasks,
  saveTasks,
  getTimetable,
  getTimetableCourseSelectOptions,
  resolveTaskCourseLabel,
  formatTaskDueDateTime,
  taskDueSortKey,
  type Task,
  type TimetableEntry,
  calculatePriority,
} from "../lib/storage";
import { toast } from "sonner";

const NO_COURSE = "none";

const TASK_CATEGORIES = [
  { value: "study", label: "Study" },
  { value: "game", label: "Game" },
  { value: "hobby", label: "Hobby" },
  { value: "other", label: "Other" },
] as const;

const CATEGORY_BADGE: Record<string, string> = {
  study: "border-indigo-200 bg-indigo-50 text-indigo-900",
  game: "border-violet-200 bg-violet-50 text-violet-900",
  hobby: "border-teal-200 bg-teal-50 text-teal-900",
  other: "border-gray-200 bg-gray-50 text-gray-800",
};

export function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [sortBy, setSortBy] = useState<"priority" | "dueDate">("priority");
  const [newTask, setNewTask] = useState<Partial<Task>>({
    urgency: 5,
    importance: 5,
    category: "other",
  });

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    if (isAddDialogOpen || editingTask) {
      setTimetableEntries(getTimetable());
    }
  }, [isAddDialogOpen, editingTask]);

  function refreshData() {
    setTasks(getTasks());
    setTimetableEntries(getTimetable());
  }

  const addCourseOptions = useMemo(
    () => getTimetableCourseSelectOptions(timetableEntries),
    [timetableEntries]
  );

  const editCourseOptions = useMemo(() => {
    if (!editingTask) return addCourseOptions;
    const id = editingTask.linkedTimetableEntryId;
    if (!id || addCourseOptions.some((o) => o.timetableEntryId === id)) {
      return addCourseOptions;
    }
    return [
      {
        timetableEntryId: id,
        label: editingTask.courseLabel?.trim() || "Former course (removed from timetable)",
      },
      ...addCourseOptions,
    ];
  }, [editingTask, addCourseOptions]);

  function handleAddTask() {
    if (!newTask.title || !newTask.dueDate) {
      toast.error("Please fill in title and due date");
      return;
    }

    const priority = calculatePriority(
      newTask.urgency || 5,
      newTask.importance || 5
    );

    const cat = newTask.category || "other";
    const cid = cat === "study" ? newTask.linkedTimetableEntryId : undefined;
    let linkedTimetableEntryId: string | undefined;
    let courseLabel: string | undefined;
    if (cid && cid !== NO_COURSE) {
      linkedTimetableEntryId = cid;
      courseLabel = addCourseOptions.find((o) => o.timetableEntryId === cid)?.label;
    }

    const dueTimeRaw = newTask.dueTime?.trim();
    const task: Task = {
      id: Date.now().toString(),
      title: newTask.title!,
      description: newTask.description || "",
      urgency: newTask.urgency || 5,
      importance: newTask.importance || 5,
      priority,
      dueDate: newTask.dueDate!,
      dueTime: dueTimeRaw || undefined,
      completed: false,
      createdAt: new Date().toISOString(),
      category: cat,
      linkedTimetableEntryId,
      courseLabel,
    };

    const updatedTasks = [...tasks, task];
    setTasks(updatedTasks);
    saveTasks(updatedTasks);
    setIsAddDialogOpen(false);
    setNewTask({
      urgency: 5,
      importance: 5,
      category: "other",
      linkedTimetableEntryId: undefined,
      dueTime: undefined,
    });
    toast.success("Task added successfully");
  }

  function handleToggleComplete(id: string) {
    const updatedTasks = tasks.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    setTasks(updatedTasks);
    saveTasks(updatedTasks);
    
    const task = updatedTasks.find(t => t.id === id);
    if (task?.completed) {
      toast.success("Task completed! 🎉");
    }
  }

  function handleDeleteTask(id: string) {
    const updatedTasks = tasks.filter(t => t.id !== id);
    setTasks(updatedTasks);
    saveTasks(updatedTasks);
    toast.success("Task deleted");
  }

  function handleUpdateTask() {
    if (!editingTask?.title?.trim() || !editingTask.dueDate) {
      toast.error("Please fill in title and due date");
      return;
    }
    const priority = calculatePriority(editingTask.urgency, editingTask.importance);
    const cat = editingTask.category || "other";
    const cid = cat === "study" ? editingTask.linkedTimetableEntryId : undefined;
    let linkedTimetableEntryId: string | undefined;
    let courseLabel: string | undefined;
    if (cid && cid !== NO_COURSE) {
      linkedTimetableEntryId = cid;
      courseLabel = editCourseOptions.find((o) => o.timetableEntryId === cid)?.label;
    }
    const dueTimeRaw = editingTask.dueTime?.trim();
    const updatedTask: Task = {
      ...editingTask,
      title: editingTask.title.trim(),
      description: editingTask.description?.trim() || "",
      priority,
      category: cat,
      dueTime: dueTimeRaw || undefined,
      linkedTimetableEntryId,
      courseLabel: cat === "study" ? courseLabel : undefined,
    };
    const updatedTasks = tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t));
    setTasks(updatedTasks);
    saveTasks(updatedTasks);
    setEditingTask(null);
    toast.success("Task updated");
  }

  function getFilteredTasks() {
    let filtered = tasks;

    if (filter === "active") {
      filtered = filtered.filter(t => !t.completed);
    } else if (filter === "completed") {
      filtered = filtered.filter(t => t.completed);
    }

    return filtered.sort((a, b) => {
      if (sortBy === "priority") {
        return b.priority - a.priority;
      }
      return taskDueSortKey(a) - taskDueSortKey(b);
    });
  }

  function getPriorityColor(priority: number) {
    if (priority >= 8) return "bg-red-100 text-red-700 border-red-300";
    if (priority >= 6) return "bg-orange-100 text-orange-700 border-orange-300";
    if (priority >= 4) return "bg-yellow-100 text-yellow-700 border-yellow-300";
    return "bg-green-100 text-green-700 border-green-300";
  }

  function getPriorityLabel(priority: number) {
    if (priority >= 8) return "Urgent";
    if (priority >= 6) return "High";
    if (priority >= 4) return "Medium";
    return "Low";
  }

  function getDaysUntilDue(dueDate: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  const filteredTasks = getFilteredTasks();
  const stats = {
    total: tasks.length,
    active: tasks.filter(t => !t.completed).length,
    completed: tasks.filter(t => t.completed).length,
  };

  return (
    <div className="px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6 md:p-8 md:pb-8 space-y-6 w-full min-w-0 max-w-full">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">Task Manager</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Categories, optional course link for study tasks, and urgency & importance scoring
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto shrink-0">
              <Plus className="size-4 mr-2" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[min(90dvh,720px)] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Task Title *</Label>
                <Input
                  id="title"
                  value={newTask.title || ""}
                  onChange={(e) =>
                    setNewTask({ ...newTask, title: e.target.value })
                  }
                  placeholder="Complete project report"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newTask.description || ""}
                  onChange={(e) =>
                    setNewTask({ ...newTask, description: e.target.value })
                  }
                  placeholder="Additional details..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="task-category">Category</Label>
                <Select
                  value={newTask.category || "other"}
                  onValueChange={(v) =>
                    setNewTask({
                      ...newTask,
                      category: v,
                      linkedTimetableEntryId: v === "study" ? newTask.linkedTimetableEntryId : undefined,
                    })
                  }
                >
                  <SelectTrigger id="task-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(newTask.category || "other") === "study" && (
                <div>
                  <Label htmlFor="task-course">Course (optional)</Label>
                  <Select
                    value={newTask.linkedTimetableEntryId ?? NO_COURSE}
                    onValueChange={(v) =>
                      setNewTask({
                        ...newTask,
                        linkedTimetableEntryId: v === NO_COURSE ? undefined : v,
                      })
                    }
                  >
                    <SelectTrigger id="task-course">
                      <SelectValue placeholder="No course" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_COURSE}>No course</SelectItem>
                      {addCourseOptions.map((o) => (
                        <SelectItem key={o.timetableEntryId} value={o.timetableEntryId}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {addCourseOptions.length === 0 && (
                    <p className="text-xs text-amber-700 mt-1.5">
                      Add classes in Timetable to pick a course here.
                    </p>
                  )}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dueDate">Due date *</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={newTask.dueDate || ""}
                    onChange={(e) =>
                      setNewTask({ ...newTask, dueDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="dueTime">Due time (optional)</Label>
                  <Input
                    id="dueTime"
                    type="time"
                    value={newTask.dueTime || ""}
                    onChange={(e) =>
                      setNewTask({
                        ...newTask,
                        dueTime: e.target.value || undefined,
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="urgency">
                  Urgency: {newTask.urgency || 5}/10
                </Label>
                <input
                  id="urgency"
                  type="range"
                  min="1"
                  max="10"
                  value={newTask.urgency || 5}
                  onChange={(e) =>
                    setNewTask({
                      ...newTask,
                      urgency: parseInt(e.target.value),
                    })
                  }
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  How time-sensitive is this task?
                </p>
              </div>
              <div>
                <Label htmlFor="importance">
                  Importance: {newTask.importance || 5}/10
                </Label>
                <input
                  id="importance"
                  type="range"
                  min="1"
                  max="10"
                  value={newTask.importance || 5}
                  onChange={(e) =>
                    setNewTask({
                      ...newTask,
                      importance: parseInt(e.target.value),
                    })
                  }
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  How important is this to your goals?
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-purple-900">
                    Calculated Priority:
                  </span>
                  <Badge
                    className={getPriorityColor(
                      calculatePriority(
                        newTask.urgency || 5,
                        newTask.importance || 5
                      )
                    )}
                  >
                    {calculatePriority(
                      newTask.urgency || 5,
                      newTask.importance || 5
                    ).toFixed(1)}
                  </Badge>
                </div>
              </div>
              <Button onClick={handleAddTask} className="w-full">
                Add Task
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card>
          <CardContent className="px-3 pt-4 pb-4 sm:px-6 sm:pt-6 sm:pb-6">
            <div className="text-lg sm:text-2xl font-semibold text-gray-900 tabular-nums">
              {stats.total}
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1 leading-tight">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-3 pt-4 pb-4 sm:px-6 sm:pt-6 sm:pb-6">
            <div className="text-lg sm:text-2xl font-semibold text-blue-600 tabular-nums">
              {stats.active}
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1 leading-tight">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-3 pt-4 pb-4 sm:px-6 sm:pt-6 sm:pb-6">
            <div className="text-lg sm:text-2xl font-semibold text-green-600 tabular-nums">
              {stats.completed}
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1 leading-tight">Done</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Sort */}
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                className="text-xs sm:text-sm"
                onClick={() => setFilter("all")}
              >
                All
              </Button>
              <Button
                variant={filter === "active" ? "default" : "outline"}
                size="sm"
                className="text-xs sm:text-sm"
                onClick={() => setFilter("active")}
              >
                Active
              </Button>
              <Button
                variant={filter === "completed" ? "default" : "outline"}
                size="sm"
                className="text-xs sm:text-sm"
                onClick={() => setFilter("completed")}
              >
                Done
              </Button>
            </div>
            <div className="hidden h-6 w-px bg-gray-300 sm:block" aria-hidden />
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs sm:text-sm text-gray-600 shrink-0">Sort:</span>
              <Button
                variant={sortBy === "priority" ? "default" : "outline"}
                size="sm"
                className="text-xs sm:text-sm"
                aria-label="Sort by priority"
                onClick={() => setSortBy("priority")}
              >
                <TrendingUp className="size-3.5 sm:size-4 sm:mr-1" />
                <span className="hidden sm:inline">Priority</span>
              </Button>
              <Button
                variant={sortBy === "dueDate" ? "default" : "outline"}
                size="sm"
                className="text-xs sm:text-sm"
                aria-label="Sort by due date"
                onClick={() => setSortBy("dueDate")}
              >
                <Clock className="size-3.5 sm:size-4 sm:mr-1" />
                <span className="hidden sm:inline">Due date</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">
                {filter === "all"
                  ? "No tasks yet. Create your first task to get started!"
                  : `No ${filter} tasks.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map(task => {
            const daysUntil = getDaysUntilDue(task.dueDate);
            const pastDeadline = taskDueSortKey(task) < Date.now();
            const isOverdue = pastDeadline;
            const isDueSoon = !pastDeadline && daysUntil >= 0 && daysUntil <= 2;
            const courseLine = resolveTaskCourseLabel(task, timetableEntries);
            const dueLine = formatTaskDueDateTime(task);
            const taskCat = task.category || "other";
            const catLabel =
              TASK_CATEGORIES.find((c) => c.value === taskCat)?.label ?? "Other";

            return (
              <Card
                key={task.id}
                className={task.completed ? "opacity-60" : ""}
              >
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => handleToggleComplete(task.id)}
                      className="mt-1 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3
                              className={`font-medium text-base text-gray-900 break-words ${
                                task.completed ? "line-through" : ""
                              }`}
                            >
                              {task.title}
                            </h3>
                            <Badge
                              variant="outline"
                              className={`text-[10px] sm:text-xs font-normal max-w-full truncate ${
                                CATEGORY_BADGE[taskCat] || CATEGORY_BADGE.other
                              }`}
                            >
                              {catLabel}
                            </Badge>
                            {courseLine && (
                              <Badge
                                variant="outline"
                                className="text-[10px] sm:text-xs font-normal border-blue-200 bg-blue-50 text-blue-900 max-w-full truncate"
                              >
                                {courseLine}
                              </Badge>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">
                              {task.description}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                          <Badge
                            className={`${getPriorityColor(task.priority)} text-[10px] sm:text-xs`}
                          >
                            {getPriorityLabel(task.priority)} ({task.priority.toFixed(1)})
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 sm:h-9 sm:w-9"
                            onClick={() => setEditingTask(task)}
                            aria-label="Edit task"
                          >
                            <Edit2 className="size-4 text-gray-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 sm:h-9 sm:w-9"
                            onClick={() => handleDeleteTask(task.id)}
                            aria-label="Delete task"
                          >
                            <Trash2 className="size-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-1 mt-3 text-xs sm:text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <AlertCircle className="size-4" />
                          <span>Urgency: {task.urgency}/10</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="size-4" />
                          <span>Importance: {task.importance}/10</span>
                        </div>
                        <div
                          className={`flex items-center gap-1 ${
                            isOverdue
                              ? "text-red-600 font-medium"
                              : isDueSoon
                              ? "text-orange-600 font-medium"
                              : ""
                          }`}
                        >
                          📅
                          <span>
                            {isOverdue
                              ? daysUntil < 0
                                ? `Overdue by ${Math.abs(daysUntil)} days · ${dueLine}`
                                : `Past due · ${dueLine}`
                              : daysUntil === 0
                              ? `Due today · ${dueLine}`
                              : daysUntil === 1
                              ? `Due tomorrow · ${dueLine}`
                              : `Due in ${daysUntil} days · ${dueLine}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {editingTask && (
        <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Task title *</Label>
                <Input
                  id="edit-title"
                  value={editingTask.title}
                  onChange={(e) =>
                    setEditingTask({ ...editingTask, title: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingTask.description}
                  onChange={(e) =>
                    setEditingTask({ ...editingTask, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="edit-category">Category</Label>
                <Select
                  value={editingTask.category || "other"}
                  onValueChange={(v) =>
                    setEditingTask({
                      ...editingTask,
                      category: v,
                      linkedTimetableEntryId: v === "study" ? editingTask.linkedTimetableEntryId : undefined,
                      courseLabel: v === "study" ? editingTask.courseLabel : undefined,
                    })
                  }
                >
                  <SelectTrigger id="edit-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(editingTask.category || "other") === "study" && (
                <div>
                  <Label htmlFor="edit-course">Course (optional)</Label>
                  <Select
                    value={editingTask.linkedTimetableEntryId ?? NO_COURSE}
                    onValueChange={(v) =>
                      setEditingTask({
                        ...editingTask,
                        linkedTimetableEntryId: v === NO_COURSE ? undefined : v,
                      })
                    }
                  >
                    <SelectTrigger id="edit-course">
                      <SelectValue placeholder="No course" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_COURSE}>No course</SelectItem>
                      {editCourseOptions.map((o) => (
                        <SelectItem key={o.timetableEntryId} value={o.timetableEntryId}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-dueDate">Due date *</Label>
                  <Input
                    id="edit-dueDate"
                    type="date"
                    value={editingTask.dueDate.split("T")[0]}
                    onChange={(e) =>
                      setEditingTask({ ...editingTask, dueDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-dueTime">Due time (optional)</Label>
                  <Input
                    id="edit-dueTime"
                    type="time"
                    value={editingTask.dueTime || ""}
                    onChange={(e) =>
                      setEditingTask({
                        ...editingTask,
                        dueTime: e.target.value || undefined,
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Urgency: {editingTask.urgency}/10</Label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={editingTask.urgency}
                  onChange={(e) =>
                    setEditingTask({
                      ...editingTask,
                      urgency: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full"
                />
              </div>
              <div>
                <Label>Importance: {editingTask.importance}/10</Label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={editingTask.importance}
                  onChange={(e) =>
                    setEditingTask({
                      ...editingTask,
                      importance: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full"
                />
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-purple-900">
                    Calculated priority
                  </span>
                  <Badge
                    className={getPriorityColor(
                      calculatePriority(editingTask.urgency, editingTask.importance)
                    )}
                  >
                    {calculatePriority(
                      editingTask.urgency,
                      editingTask.importance
                    ).toFixed(1)}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpdateTask} className="flex-1">
                  Save changes
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setEditingTask(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
