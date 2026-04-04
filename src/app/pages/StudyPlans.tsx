import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
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
import { Plus, Trash2, BookOpen, ListPlus } from "lucide-react";
import {
  getStudyPlans,
  saveStudyPlans,
  type StudyPlan,
  type StudyPlanPart,
} from "../lib/storage";
import { parseStudyPlanBulkText } from "../lib/studyPlanParse";
import { toast } from "sonner";

const PARTS_PREVIEW_COUNT = 5;

/** Completed parts first (by order), then rest; used for the 5-item preview. */
function orderPartsForDisplay(parts: StudyPlanPart[]): StudyPlanPart[] {
  const sorted = [...parts].sort((a, b) => a.order - b.order);
  const done = sorted.filter((p) => p.completed);
  const todo = sorted.filter((p) => !p.completed);
  return done.length > 0 ? [...done, ...todo] : sorted;
}

function newPart(title: string, detail: string, order: number): StudyPlanPart {
  return {
    id: `${Date.now()}-${order}-${Math.random().toString(36).slice(2, 7)}`,
    title: title.trim(),
    detail: detail.trim(),
    order,
    completed: false,
  };
}

export function StudyPlans() {
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [durationHours, setDurationHours] = useState(1);
  const [description, setDescription] = useState("");
  const [partsDraft, setPartsDraft] = useState<StudyPlanPart[]>([]);
  const [singleTitle, setSingleTitle] = useState("");
  const [singleDetail, setSingleDetail] = useState("");
  const [bulkText, setBulkText] = useState("");
  /** planId -> show every part instead of preview */
  const [showAllParts, setShowAllParts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setPlans(getStudyPlans());
  }, []);

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [plans]
  );

  function persist(next: StudyPlan[]) {
    setPlans(next);
    saveStudyPlans(next);
  }

  function resetCreateForm() {
    setName("");
    setDurationHours(1);
    setDescription("");
    setPartsDraft([]);
    setSingleTitle("");
    setSingleDetail("");
    setBulkText("");
  }

  function handleAddPartRow() {
    if (!singleTitle.trim()) {
      toast.error("Enter a part title");
      return;
    }
    const order = partsDraft.length;
    setPartsDraft([...partsDraft, newPart(singleTitle, singleDetail, order)]);
    setSingleTitle("");
    setSingleDetail("");
  }

  function handleImportBulk() {
    const parsed = parseStudyPlanBulkText(bulkText);
    if (!parsed.length) {
      toast.error("No parts found. Use lines like “Part 1: Title” or paste a course outline.");
      return;
    }
    const start = partsDraft.length;
    const next = parsed.map((p, i) => newPart(p.title, p.detail, start + i));
    setPartsDraft([...partsDraft, ...next]);
    setBulkText("");
    toast.success(`Added ${next.length} part(s)`);
  }

  function handleRemoveDraftPart(id: string) {
    setPartsDraft(partsDraft.filter((p) => p.id !== id).map((p, i) => ({ ...p, order: i })));
  }

  function handleCreatePlan() {
    if (!name.trim()) {
      toast.error("Enter a plan name");
      return;
    }
    const hrs = Math.max(0.25, Math.min(500, Number(durationHours) || 1));
    if (partsDraft.length === 0) {
      toast.error("Add at least one part (one-by-one or bulk paste)");
      return;
    }
    const plan: StudyPlan = {
      id: Date.now().toString(),
      name: name.trim(),
      description: description.trim(),
      durationHours: hrs,
      parts: partsDraft.map((p, i) => ({ ...p, order: i })),
      createdAt: new Date().toISOString(),
    };
    persist([plan, ...plans]);
    setCreateOpen(false);
    resetCreateForm();
    setExpandedId(plan.id);
    toast.success("Study plan created");
  }

  function togglePart(planId: string, partId: string, completed: boolean) {
    const next = plans.map((p) => {
      if (p.id !== planId) return p;
      return {
        ...p,
        parts: p.parts.map((part) =>
          part.id === partId ? { ...part, completed } : part
        ),
      };
    });
    persist(next);
  }

  function deletePlan(id: string) {
    persist(plans.filter((p) => p.id !== id));
    if (expandedId === id) setExpandedId(null);
    toast.success("Plan removed");
  }

  return (
    <div className="px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6 md:p-8 md:pb-8 space-y-6 w-full min-w-0 max-w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 flex items-center gap-2">
            <BookOpen className="size-8 text-indigo-600 shrink-0" />
            Study plans
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Break courses into parts, track completion, and link parts from the Focus timer.
          </p>
        </div>
        <Dialog
          open={createOpen}
          onOpenChange={(o) => {
            setCreateOpen(o);
            if (!o) resetCreateForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto shrink-0">
              <Plus className="size-4 mr-2" />
              New plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[min(90dvh,720px)] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create study plan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label htmlFor="sp-name">Name *</Label>
                <Input
                  id="sp-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. ML Specialization"
                />
              </div>
              <div>
                <Label htmlFor="sp-hours">Target duration (hours)</Label>
                <Input
                  id="sp-hours"
                  type="number"
                  min={0.25}
                  step={0.25}
                  value={durationHours}
                  onChange={(e) => setDurationHours(parseFloat(e.target.value) || 1)}
                />
              </div>
              <div>
                <Label htmlFor="sp-desc">Description</Label>
                <Textarea
                  id="sp-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Goals, resources, notes…"
                />
              </div>

              <div className="border rounded-lg p-3 space-y-3 bg-slate-50/80">
                <p className="text-sm font-medium text-gray-800">Parts</p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Title</Label>
                    <Input
                      value={singleTitle}
                      onChange={(e) => setSingleTitle(e.target.value)}
                      placeholder="Part title"
                    />
                  </div>
                  <Button type="button" variant="secondary" onClick={handleAddPartRow}>
                    <ListPlus className="size-4 mr-1" />
                    Add
                  </Button>
                </div>
                <div>
                  <Label className="text-xs">Detail (optional)</Label>
                  <Input
                    value={singleDetail}
                    onChange={(e) => setSingleDetail(e.target.value)}
                    placeholder="e.g. 4 lectures • 10min"
                  />
                </div>
                <div>
                  <Label htmlFor="sp-bulk">Or paste outline</Label>
                  <Textarea
                    id="sp-bulk"
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    rows={6}
                    placeholder={`Section title on its own line, then lecture lines (blank line between sections).\n\nWelcome…\n5 lectures • 12min\n\nData Preprocessing\n4 lectures • 10min …\n\nRegression\n1 lecture • 1min …\n\n(Also works: Part 1: Title)`}
                    className="text-xs font-mono"
                  />
                  <Button type="button" variant="outline" size="sm" className="mt-2" onClick={handleImportBulk}>
                    Parse into parts
                  </Button>
                </div>
                {partsDraft.length > 0 && (
                  <ul className="text-xs space-y-1 max-h-40 overflow-y-auto border rounded bg-white p-2">
                    {partsDraft.map((p) => (
                      <li key={p.id} className="flex justify-between gap-2 items-start">
                        <span className="min-w-0">
                          <span className="font-medium">{p.title}</span>
                          {p.detail ? (
                            <span className="text-gray-500 block truncate">{p.detail}</span>
                          ) : null}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="shrink-0 h-8 w-8 p-0"
                          onClick={() => handleRemoveDraftPart(p.id)}
                          aria-label="Remove part"
                        >
                          <Trash2 className="size-3.5 text-red-500" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <Button className="w-full" onClick={handleCreatePlan}>
                Save plan
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {sortedPlans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500 text-sm">
            No study plans yet. Create one to split a course into trackable parts.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedPlans.map((plan) => {
            const open = expandedId === plan.id;
            const done = plan.parts.filter((p) => p.completed).length;
            const ordered = orderPartsForDisplay(plan.parts);
            const showAll = showAllParts[plan.id] === true;
            const visibleParts = showAll ? ordered : ordered.slice(0, PARTS_PREVIEW_COUNT);
            const hiddenCount = Math.max(0, ordered.length - visibleParts.length);

            return (
              <Card key={plan.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <CardTitle className="text-lg leading-snug">{plan.name}</CardTitle>
                      <p className="text-xs text-gray-500 mt-1">
                        {plan.durationHours}h target · {done}/{plan.parts.length} parts done
                      </p>
                      {plan.description && (
                        <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{plan.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => setExpandedId(open ? null : plan.id)}>
                        {open ? "Hide parts" : "View parts"}
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => deletePlan(plan.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {open && (
                  <CardContent className="pt-0 space-y-3 border-t bg-slate-50/50">
                    <p className="text-xs text-gray-500 pt-3">
                      Showing {visibleParts.length} of {plan.parts.length} parts
                      {done > 0 ? " (completed listed first)" : ""}.
                    </p>
                    {visibleParts.map((part) => (
                      <label
                        key={part.id}
                        className="flex items-start gap-3 rounded-lg border bg-white p-3 cursor-pointer hover:bg-slate-50"
                      >
                        <Checkbox
                          checked={part.completed}
                          onCheckedChange={(c) =>
                            togglePart(plan.id, part.id, c === true)
                          }
                          className="mt-1"
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className={`font-medium text-sm ${
                              part.completed ? "line-through text-gray-400" : "text-gray-900"
                            }`}
                          >
                            {part.title}
                          </p>
                          {part.detail ? (
                            <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{part.detail}</p>
                          ) : null}
                        </div>
                      </label>
                    ))}
                    {hiddenCount > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() =>
                          setShowAllParts((prev) => ({
                            ...prev,
                            [plan.id]: !showAll,
                          }))
                        }
                      >
                        {showAll ? "Show fewer" : `Show all ${plan.parts.length} parts (${hiddenCount} hidden)`}
                      </Button>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
