import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Plus, Trash2, Repeat, ArrowLeft } from "lucide-react";
import {
  getHabits,
  saveHabits,
  getHabitDayEntries,
  saveHabitDayEntries,
  isHabitCompletedOnDate,
  setHabitCompletedOnDate,
  type Habit,
} from "../lib/storage";
import { toast } from "sonner";

function toYmdLocal(d: Date): string {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

export function Habits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const todayYmd = toYmdLocal(new Date());

  useEffect(() => {
    setHabits(getHabits());
  }, []);

  function persistHabits(next: Habit[]) {
    setHabits(next);
    saveHabits(next);
  }

  function handleCreate() {
    if (!name.trim()) {
      toast.error("Enter a habit name");
      return;
    }
    const habit: Habit = {
      id: Date.now().toString(),
      name: name.trim(),
      description: description.trim(),
      createdAt: new Date().toISOString(),
    };
    persistHabits([habit, ...habits]);
    setName("");
    setDescription("");
    setCreateOpen(false);
    toast.success("Habit added");
  }

  function handleDelete(id: string) {
    persistHabits(habits.filter((h) => h.id !== id));
    saveHabitDayEntries(getHabitDayEntries().filter((e) => e.habitId !== id));
    toast.success("Habit removed");
  }

  function toggleToday(habitId: string, done: boolean) {
    setHabitCompletedOnDate(habitId, todayYmd, done);
  }

  return (
    <div className="px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6 md:p-8 md:pb-8 space-y-6 w-full min-w-0 max-w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between min-w-0">
        <div className="min-w-0">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="size-4" />
            Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 flex items-center gap-2">
            <Repeat className="size-8 text-emerald-600 shrink-0" />
            Habits
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Name and description only — tick each habit once per day. Shown on the dashboard for today.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto shrink-0">
              <Plus className="size-4 mr-2" />
              New habit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>New habit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label htmlFor="habit-name">Name *</Label>
                <Input
                  id="habit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Morning walk"
                />
              </div>
              <div>
                <Label htmlFor="habit-desc">Description</Label>
                <Textarea
                  id="habit-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Why it matters, when, tips…"
                />
              </div>
              <Button className="w-full" onClick={handleCreate}>
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <p className="text-sm text-gray-600">
        Today:{" "}
        <span className="font-medium text-gray-900">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </span>
      </p>

      {habits.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500 text-sm">
            No habits yet. Add one to track daily on the dashboard and in Analytics.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {habits.map((h) => {
            const done = isHabitCompletedOnDate(h.id, todayYmd);
            return (
              <Card key={h.id}>
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={done}
                      onCheckedChange={(c) => toggleToday(h.id, c === true)}
                      className="mt-1"
                      aria-label={`Done today: ${h.name}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-medium text-gray-900 ${
                          done ? "line-through text-gray-400" : ""
                        }`}
                      >
                        {h.name}
                      </p>
                      {h.description ? (
                        <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{h.description}</p>
                      ) : null}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-red-600"
                      onClick={() => handleDelete(h.id)}
                      aria-label={`Delete ${h.name}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
