import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Checkbox } from "../components/ui/checkbox";
import { Badge } from "../components/ui/badge";
import { Plus, Trash2, AlertCircle, Clock, TrendingUp } from "lucide-react";
import { getTasks, saveTasks, Task, calculatePriority } from "../lib/storage";
import { toast } from "sonner";

export function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [sortBy, setSortBy] = useState<"priority" | "dueDate">("priority");
  const [newTask, setNewTask] = useState<Partial<Task>>({
    urgency: 5,
    importance: 5,
    estimatedMinutes: 30,
  });

  useEffect(() => {
    loadTasks();
  }, []);

  function loadTasks() {
    setTasks(getTasks());
  }

  function handleAddTask() {
    if (!newTask.title || !newTask.dueDate) {
      toast.error("Please fill in title and due date");
      return;
    }

    const priority = calculatePriority(
      newTask.urgency || 5,
      newTask.importance || 5
    );

    const task: Task = {
      id: Date.now().toString(),
      title: newTask.title!,
      description: newTask.description || "",
      urgency: newTask.urgency || 5,
      importance: newTask.importance || 5,
      priority,
      dueDate: newTask.dueDate!,
      completed: false,
      estimatedMinutes: newTask.estimatedMinutes || 30,
      createdAt: new Date().toISOString(),
    };

    const updatedTasks = [...tasks, task];
    setTasks(updatedTasks);
    saveTasks(updatedTasks);
    setIsAddDialogOpen(false);
    setNewTask({
      urgency: 5,
      importance: 5,
      estimatedMinutes: 30,
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
      } else {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
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
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Task Manager</h1>
          <p className="text-gray-600 mt-1">
            Organize with urgency & importance scoring
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-2" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
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
                <Label htmlFor="dueDate">Due Date *</Label>
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
                <Label htmlFor="estimatedMinutes">
                  Estimated Time (minutes)
                </Label>
                <Input
                  id="estimatedMinutes"
                  type="number"
                  value={newTask.estimatedMinutes || 30}
                  onChange={(e) =>
                    setNewTask({
                      ...newTask,
                      estimatedMinutes: parseInt(e.target.value) || 30,
                    })
                  }
                  min={5}
                  step={5}
                />
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
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-semibold text-gray-900">
              {stats.total}
            </div>
            <p className="text-sm text-gray-600 mt-1">Total Tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-semibold text-blue-600">
              {stats.active}
            </div>
            <p className="text-sm text-gray-600 mt-1">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-semibold text-green-600">
              {stats.completed}
            </div>
            <p className="text-sm text-gray-600 mt-1">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Sort */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex gap-2">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
              >
                All
              </Button>
              <Button
                variant={filter === "active" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("active")}
              >
                Active
              </Button>
              <Button
                variant={filter === "completed" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("completed")}
              >
                Completed
              </Button>
            </div>
            <div className="h-6 w-px bg-gray-300" />
            <div className="flex gap-2 items-center">
              <span className="text-sm text-gray-600">Sort by:</span>
              <Button
                variant={sortBy === "priority" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("priority")}
              >
                <TrendingUp className="size-4 mr-1" />
                Priority
              </Button>
              <Button
                variant={sortBy === "dueDate" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("dueDate")}
              >
                <Clock className="size-4 mr-1" />
                Due Date
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
            const isOverdue = daysUntil < 0;
            const isDueSoon = daysUntil >= 0 && daysUntil <= 2;

            return (
              <Card
                key={task.id}
                className={task.completed ? "opacity-60" : ""}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => handleToggleComplete(task.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3
                            className={`font-medium text-gray-900 ${
                              task.completed ? "line-through" : ""
                            }`}
                          >
                            {task.title}
                          </h3>
                          {task.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {task.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={getPriorityColor(task.priority)}
                          >
                            {getPriorityLabel(task.priority)} ({task.priority.toFixed(1)})
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            <Trash2 className="size-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="size-4" />
                          <span>{task.estimatedMinutes} min</span>
                        </div>
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
                              ? `Overdue by ${Math.abs(daysUntil)} days`
                              : daysUntil === 0
                              ? "Due today"
                              : daysUntil === 1
                              ? "Due tomorrow"
                              : `Due in ${daysUntil} days`}
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
    </div>
  );
}
