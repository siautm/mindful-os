import { useState, useEffect } from "react";
import { useLocation, Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Checkbox } from "../components/ui/checkbox";
import { StickyNote, Trash2, ArrowLeft } from "lucide-react";
import {
  getDailyMemoState,
  addDailyMemoItem,
  removeDailyMemoItem,
  toggleDailyMemoItem,
  STORAGE_HYDRATED_EVENT,
  type DailyMemoItem,
} from "../lib/storage";

export function Memo() {
  const location = useLocation();
  const [items, setItems] = useState<DailyMemoItem[]>([]);
  const [draft, setDraft] = useState("");

  function refresh() {
    setItems(getDailyMemoState().items);
  }

  useEffect(() => {
    refresh();
  }, [location.pathname]);

  useEffect(() => {
    const onHydrated = () => refresh();
    window.addEventListener(STORAGE_HYDRATED_EVENT, onHydrated);
    return () => window.removeEventListener(STORAGE_HYDRATED_EVENT, onHydrated);
  }, []);

  return (
    <div className="px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6 md:p-8 md:pb-8 space-y-6 w-full min-w-0 max-w-full max-w-2xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <StickyNote className="size-8 text-amber-600 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">Memo</h1>
            <p className="text-gray-600 text-sm sm:text-base mt-0.5">
              Today&apos;s personal list — not linked to Tasks or Analytics.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild className="shrink-0 w-full sm:w-auto">
          <Link to="/" className="inline-flex items-center gap-2">
            <ArrowLeft className="size-4" />
            Dashboard
          </Link>
        </Button>
      </div>

      <Card className="border-2 border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-amber-950">Today</CardTitle>
          <p className="text-sm text-amber-900/80 font-normal">
            Add lines for what you want to do. Check them off on the dashboard or here.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-center"
            onSubmit={(e) => {
              e.preventDefault();
              addDailyMemoItem(draft);
              setDraft("");
              refresh();
            }}
          >
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="e.g. Email professor, buy groceries…"
              className="flex-1"
            />
            <Button type="submit" className="shrink-0 bg-amber-600 hover:bg-amber-700">
              Add
            </Button>
          </form>

          {items.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center border border-dashed border-amber-200 rounded-xl">
              No items yet. Add something for today.
            </p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start gap-3 rounded-xl border border-amber-100 bg-white/90 px-3 py-2.5"
                >
                  <Checkbox
                    checked={item.done}
                    onCheckedChange={() => {
                      toggleDailyMemoItem(item.id);
                      refresh();
                    }}
                    className="mt-1"
                    aria-label={`Done: ${item.text}`}
                  />
                  <p
                    className={`flex-1 text-sm min-w-0 pt-0.5 ${
                      item.done ? "line-through text-gray-400" : "text-gray-900"
                    }`}
                  >
                    {item.text}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    aria-label="Remove"
                    onClick={() => {
                      removeDailyMemoItem(item.id);
                      refresh();
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
