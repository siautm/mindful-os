import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Calendar as CalendarIcon, Plus, MapPin, Clock, Edit2, Trash2, Filter } from "lucide-react";
import { getEvents, saveEvents, EventEntry } from "../lib/storage";
import { toast } from "sonner";

const CATEGORIES = [
  "Meeting",
  "Personal",
  "Work",
  "Social",
  "Health",
  "Education",
  "Other",
];

const CATEGORY_COLORS: Record<string, string> = {
  Meeting: "bg-blue-100 text-blue-700 border-blue-300",
  Personal: "bg-purple-100 text-purple-700 border-purple-300",
  Work: "bg-orange-100 text-orange-700 border-orange-300",
  Social: "bg-pink-100 text-pink-700 border-pink-300",
  Health: "bg-green-100 text-green-700 border-green-300",
  Education: "bg-yellow-100 text-yellow-700 border-yellow-300",
  Other: "bg-gray-100 text-gray-700 border-gray-300",
};

export function Events() {
  const [events, setEvents] = useState<EventEntry[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventEntry | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"upcoming" | "past" | "all">("upcoming");
  const [newEvent, setNewEvent] = useState<Partial<EventEntry>>({
    category: "Personal",
    date: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "10:00",
  });

  useEffect(() => {
    loadEvents();
  }, []);

  function loadEvents() {
    setEvents(getEvents());
  }

  function handleAddEvent() {
    if (!newEvent.title?.trim() || !newEvent.date || !newEvent.startTime || !newEvent.endTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    const event: EventEntry = {
      id: Date.now().toString(),
      title: newEvent.title.trim(),
      description: newEvent.description || "",
      date: newEvent.date,
      startTime: newEvent.startTime,
      endTime: newEvent.endTime,
      category: newEvent.category || "Personal",
      location: newEvent.location?.trim(),
    };

    const updatedEvents = [...events, event];
    setEvents(updatedEvents);
    saveEvents(updatedEvents);

    setNewEvent({
      category: "Personal",
      date: new Date().toISOString().split("T")[0],
      startTime: "09:00",
      endTime: "10:00",
    });
    setIsAddDialogOpen(false);
    toast.success("Event added!");
  }

  function handleUpdateEvent() {
    if (!editingEvent || !editingEvent.title.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    const updatedEvents = events.map(e =>
      e.id === editingEvent.id ? editingEvent : e
    );
    setEvents(updatedEvents);
    saveEvents(updatedEvents);
    setEditingEvent(null);
    toast.success("Event updated!");
  }

  function handleDeleteEvent(id: string) {
    const updatedEvents = events.filter(e => e.id !== id);
    setEvents(updatedEvents);
    saveEvents(updatedEvents);
    toast.success("Event deleted");
  }

  // Filter and sort events
  const now = new Date();
  const filteredEvents = events
    .filter(event => {
      const eventDateTime = new Date(`${event.date}T${event.startTime}`);
      
      // Category filter
      if (filterCategory !== "all" && event.category !== filterCategory) {
        return false;
      }

      // Time filter
      if (viewMode === "upcoming") {
        return eventDateTime >= now;
      } else if (viewMode === "past") {
        return eventDateTime < now;
      }
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.startTime}`);
      const dateB = new Date(`${b.date}T${b.startTime}`);
      return viewMode === "past" 
        ? dateB.getTime() - dateA.getTime()
        : dateA.getTime() - dateB.getTime();
    });

  const upcomingCount = events.filter(e => 
    new Date(`${e.date}T${e.startTime}`) >= now
  ).length;

  const todayEvents = events.filter(e => 
    e.date === new Date().toISOString().split("T")[0]
  ).length;

  return (
    <div className="px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6 md:p-8 md:pb-8 space-y-6 w-full min-w-0 max-w-full">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">Events</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage your schedule and activities</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="w-full sm:w-auto shrink-0">
              <Plus className="size-5 mr-2" />
              New Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl w-[min(100vw-1.5rem,42rem)] max-h-[min(90dvh,720px)] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="eventTitle">Title *</Label>
                <Input
                  id="eventTitle"
                  value={newEvent.title || ""}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="Event title"
                />
              </div>
              <div>
                <Label htmlFor="eventDescription">Description</Label>
                <Textarea
                  id="eventDescription"
                  value={newEvent.description || ""}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Event details..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="eventDate">Date *</Label>
                  <Input
                    id="eventDate"
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="eventCategory">Category *</Label>
                  <Select
                    value={newEvent.category}
                    onValueChange={(value) => setNewEvent({ ...newEvent, category: value })}
                  >
                    <SelectTrigger id="eventCategory">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="eventStartTime">Start Time *</Label>
                  <Input
                    id="eventStartTime"
                    type="time"
                    value={newEvent.startTime}
                    onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="eventEndTime">End Time *</Label>
                  <Input
                    id="eventEndTime"
                    type="time"
                    value={newEvent.endTime}
                    onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="eventLocation">Location</Label>
                <Input
                  id="eventLocation"
                  value={newEvent.location || ""}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  placeholder="Event location"
                />
              </div>
              <Button onClick={handleAddEvent} className="w-full">
                Add Event
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card>
          <CardContent className="px-2.5 pt-4 pb-4 sm:px-6 sm:pt-6 sm:pb-6">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="size-9 sm:size-12 shrink-0 bg-blue-100 rounded-full flex items-center justify-center">
                <CalendarIcon className="size-4 sm:size-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <div className="text-lg sm:text-2xl font-semibold text-gray-900 tabular-nums">
                  {events.length}
                </div>
                <p className="text-[10px] sm:text-sm text-gray-600 leading-tight">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-2.5 pt-4 pb-4 sm:px-6 sm:pt-6 sm:pb-6">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="size-9 sm:size-12 shrink-0 bg-green-100 rounded-full flex items-center justify-center">
                <Clock className="size-4 sm:size-6 text-green-600" />
              </div>
              <div className="min-w-0">
                <div className="text-lg sm:text-2xl font-semibold text-gray-900 tabular-nums">
                  {upcomingCount}
                </div>
                <p className="text-[10px] sm:text-sm text-gray-600 leading-tight">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-2.5 pt-4 pb-4 sm:px-6 sm:pt-6 sm:pb-6">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="size-9 sm:size-12 shrink-0 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-lg sm:text-2xl">📅</span>
              </div>
              <div className="min-w-0">
                <div className="text-lg sm:text-2xl font-semibold text-gray-900 tabular-nums">
                  {todayEvents}
                </div>
                <p className="text-[10px] sm:text-sm text-gray-600 leading-tight">Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap sm:gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <Filter className="size-4 text-gray-500 shrink-0" />
                <Label className="text-xs sm:text-sm">View</Label>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["upcoming", "past", "all"] as const).map((mode) => (
                  <Button
                    key={mode}
                    variant={viewMode === mode ? "default" : "outline"}
                    size="sm"
                    className="text-xs sm:text-sm"
                    onClick={() => setViewMode(mode)}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 lg:ml-auto w-full lg:w-auto">
              <Label className="text-xs sm:text-sm shrink-0">Category</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full sm:w-44 lg:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      {filteredEvents.length > 0 ? (
        <div className="grid gap-4">
          {filteredEvents.map((event) => {
            const eventDate = new Date(event.date);
            const isPast = new Date(`${event.date}T${event.endTime}`) < now;
            const isToday = event.date === new Date().toISOString().split("T")[0];

            return (
              <Card
                key={event.id}
                className={`hover:shadow-md transition-shadow ${
                  isPast ? "opacity-60" : ""
                }`}
              >
                <CardHeader className="space-y-3 pb-2 sm:pb-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <CardTitle className="text-base sm:text-lg leading-snug break-words">
                          {event.title}
                        </CardTitle>
                        {isToday && (
                          <Badge variant="default" className="bg-purple-600 shrink-0 text-xs">
                            Today
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1 text-xs sm:text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="size-4" />
                          {eventDate.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="size-4" />
                          {event.startTime} - {event.endTime}
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="size-4" />
                            {event.location}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
                      <Badge
                        variant="outline"
                        className={`text-xs ${CATEGORY_COLORS[event.category] || CATEGORY_COLORS.Other}`}
                      >
                        {event.category}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setEditingEvent(event)}
                        aria-label="Edit event"
                      >
                        <Edit2 className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleDeleteEvent(event.id)}
                        aria-label="Delete event"
                      >
                        <Trash2 className="size-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {event.description && (
                  <CardContent className="pt-0">
                    <p className="text-sm text-gray-700 break-words whitespace-pre-wrap">
                      {event.description}
                    </p>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <CalendarIcon className="size-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">No events found</p>
              <p className="text-sm">
                {viewMode === "upcoming"
                  ? "You have no upcoming events"
                  : viewMode === "past"
                  ? "No past events to show"
                  : "Click 'New Event' to add your first event!"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      {editingEvent && (
        <Dialog open={!!editingEvent} onOpenChange={() => setEditingEvent(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="editTitle">Title *</Label>
                <Input
                  id="editTitle"
                  value={editingEvent.title}
                  onChange={(e) =>
                    setEditingEvent({ ...editingEvent, title: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="editDescription">Description</Label>
                <Textarea
                  id="editDescription"
                  value={editingEvent.description}
                  onChange={(e) =>
                    setEditingEvent({ ...editingEvent, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editDate">Date *</Label>
                  <Input
                    id="editDate"
                    type="date"
                    value={editingEvent.date}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="editCategory">Category *</Label>
                  <Select
                    value={editingEvent.category}
                    onValueChange={(value) =>
                      setEditingEvent({ ...editingEvent, category: value })
                    }
                  >
                    <SelectTrigger id="editCategory">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editStartTime">Start Time *</Label>
                  <Input
                    id="editStartTime"
                    type="time"
                    value={editingEvent.startTime}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, startTime: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="editEndTime">End Time *</Label>
                  <Input
                    id="editEndTime"
                    type="time"
                    value={editingEvent.endTime}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, endTime: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="editLocation">Location</Label>
                <Input
                  id="editLocation"
                  value={editingEvent.location || ""}
                  onChange={(e) =>
                    setEditingEvent({ ...editingEvent, location: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpdateEvent} className="flex-1">
                  Save Changes
                </Button>
                <Button
                  onClick={() => setEditingEvent(null)}
                  variant="outline"
                  className="flex-1"
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
