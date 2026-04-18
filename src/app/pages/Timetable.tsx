import { useState, useEffect } from "react";
import Papa from "papaparse";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import {
  Plus,
  Upload,
  Trash2,
  Download,
  Calendar as CalendarIcon,
  ListTodo,
  Grid3x3,
  Edit2,
} from "lucide-react";
import {
  getTimetable,
  saveTimetable,
  TimetableEntry,
} from "../lib/storage";
import { toast } from "sonner";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface CombinedEntry {
  id: string;
  title: string;
  subtitle?: string;
  time: string;
  location?: string;
  type: "course";
  color: string;
}

// Time slots from 8:00 to 18:00 (6 PM)
const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", 
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"
];

const COURSE_COLORS = [
  "bg-pink-200",
  "bg-blue-200", 
  "bg-green-200",
  "bg-yellow-200",
  "bg-purple-200",
  "bg-orange-200",
  "bg-cyan-200",
  "bg-red-200",
  "bg-indigo-200",
  "bg-teal-200",
];

type TimetableTab = "grid" | "combined" | "courses";

function getInitialTimetableTab(): TimetableTab {
  if (typeof window === "undefined") return "combined";
  return window.matchMedia("(min-width: 768px)").matches ? "grid" : "combined";
}

export function Timetable() {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [newEntry, setNewEntry] = useState<Partial<TimetableEntry>>({
    day: "Monday",
  });
  const [timetableTab, setTimetableTab] = useState<TimetableTab>(getInitialTimetableTab);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      setTimetableTab((t) => (!mq.matches && t === "grid" ? "combined" : t));
    };
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function loadData() {
    setEntries(getTimetable());
  }

  function handleAddEntry() {
    if (!newEntry.courseName || !newEntry.startTime || !newEntry.endTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    const entry: TimetableEntry = {
      id: Date.now().toString(),
      courseName: newEntry.courseName!,
      courseCode: newEntry.courseCode || "",
      day: newEntry.day || "Monday",
      startTime: newEntry.startTime!,
      endTime: newEntry.endTime!,
      location: newEntry.location || "",
      instructor: newEntry.instructor || "",
    };

    const updatedEntries = [...entries, entry];
    setEntries(updatedEntries);
    saveTimetable(updatedEntries);
    setIsAddDialogOpen(false);
    setNewEntry({ day: "Monday" });
    toast.success("Class added successfully");
  }

  function handleUpdateEntry() {
    if (!editingEntry) return;
    if (
      !editingEntry.courseName?.trim() ||
      !editingEntry.startTime ||
      !editingEntry.endTime
    ) {
      toast.error("Please fill in all required fields");
      return;
    }
    const updated = entries.map((e) =>
      e.id === editingEntry.id
        ? {
            ...editingEntry,
            courseName: editingEntry.courseName.trim(),
            courseCode: editingEntry.courseCode?.trim() || "",
            location: editingEntry.location?.trim() || "",
            instructor: editingEntry.instructor?.trim() || "",
          }
        : e
    );
    setEntries(updated);
    saveTimetable(updated);
    setEditingEntry(null);
    toast.success("Class updated");
  }

  function handleDeleteEntry(id: string) {
    const updatedEntries = entries.filter(e => e.id !== id);
    setEntries(updatedEntries);
    saveTimetable(updatedEntries);
    toast.success("Class deleted");
  }

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        try {
          const parsedEntries: TimetableEntry[] = results.data
            .filter((row: any) => row.courseName || row.CourseName)
            .map((row: any, index) => ({
              id: Date.now().toString() + index,
              courseName: row.courseName || row.CourseName || "",
              courseCode: row.courseCode || row.CourseCode || "",
              day: row.day || row.Day || "Monday",
              startTime: row.startTime || row.StartTime || "",
              endTime: row.endTime || row.EndTime || "",
              location: row.location || row.Location || "",
              instructor: row.instructor || row.Instructor || "",
            }));

          if (parsedEntries.length > 0) {
            const updatedEntries = [...entries, ...parsedEntries];
            setEntries(updatedEntries);
            saveTimetable(updatedEntries);
            toast.success(`Imported ${parsedEntries.length} classes`);
          } else {
            toast.error("No valid data found in CSV");
          }
        } catch (error) {
          toast.error("Error parsing CSV file");
        }
      },
      error: () => {
        toast.error("Failed to read CSV file");
      },
    });

    event.target.value = "";
  }

  function handleExportCSV() {
    const csv = Papa.unparse(entries);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mindful-timetable-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Timetable exported");
  }

  function getCoursesForDay(day: string): TimetableEntry[] {
    return entries
      .filter(e => e.day === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  function getCombinedForDay(day: string): CombinedEntry[] {
    const combined: CombinedEntry[] = [];

    // Add courses
    const courses = entries.filter(e => e.day === day);
    courses.forEach(course => {
      combined.push({
        id: course.id,
        title: course.courseName,
        subtitle: course.courseCode,
        time: `${course.startTime} - ${course.endTime}`,
        location: course.location,
        type: "course",
        color: "bg-blue-100 border-blue-300",
      });
    });

    // Sort by time
    combined.sort((a, b) => {
      const aTime = a.time.includes("-") ? a.time.split(" - ")[0] : "23:59";
      const bTime = b.time.includes("-") ? b.time.split(" - ")[0] : "23:59";
      return aTime.localeCompare(bTime);
    });

    return combined;
  }

  function getTimeToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  }

  function getCourseColor(courseCode: string): string {
    // Generate a consistent color based on course code hash
    let hash = 0;
    for (let i = 0; i < courseCode.length; i++) {
      hash = courseCode.charCodeAt(i) + ((hash << 5) - hash);
    }
    return COURSE_COLORS[Math.abs(hash) % COURSE_COLORS.length];
  }

  function getCoursePosition(entry: TimetableEntry) {
    const startMinutes = getTimeToMinutes(entry.startTime);
    const endMinutes = getTimeToMinutes(entry.endTime);
    const dayStartMinutes = getTimeToMinutes(TIME_SLOTS[0]);
    
    const gridStart = Math.floor((startMinutes - dayStartMinutes) / 60) + 2; // +2 for header rows
    const duration = Math.ceil((endMinutes - startMinutes) / 60);
    
    return { gridStart, duration };
  }

  return (
    <div className="px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6 md:p-8 md:pb-8 space-y-6 w-full min-w-0 max-w-full">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">Timetable</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage your weekly schedule</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <label htmlFor="csv-upload">
            <Button variant="outline" className="cursor-pointer">
              <Upload className="size-4 mr-2" />
              Import CSV
            </Button>
          </label>
          <input
            id="csv-upload"
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileUpload}
          />
          
          {entries.length > 0 && (
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="size-4 mr-2" />
              Export
            </Button>
          )}

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4 mr-2" />
                Add Class
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Class</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="courseName">Course Name *</Label>
                  <Input
                    id="courseName"
                    value={newEntry.courseName || ""}
                    onChange={(e) =>
                      setNewEntry({ ...newEntry, courseName: e.target.value })
                    }
                    placeholder="Introduction to Psychology"
                  />
                </div>
                <div>
                  <Label htmlFor="courseCode">Course Code</Label>
                  <Input
                    id="courseCode"
                    value={newEntry.courseCode || ""}
                    onChange={(e) =>
                      setNewEntry({ ...newEntry, courseCode: e.target.value })
                    }
                    placeholder="PSY101"
                  />
                </div>
                <div>
                  <Label htmlFor="day">Day *</Label>
                  <Select
                    value={newEntry.day || "Monday"}
                    onValueChange={(value) =>
                      setNewEntry({ ...newEntry, day: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS.map(day => (
                        <SelectItem key={day} value={day}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startTime">Start Time *</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={newEntry.startTime || ""}
                      onChange={(e) =>
                        setNewEntry({ ...newEntry, startTime: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime">End Time *</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={newEntry.endTime || ""}
                      onChange={(e) =>
                        setNewEntry({ ...newEntry, endTime: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={newEntry.location || ""}
                    onChange={(e) =>
                      setNewEntry({ ...newEntry, location: e.target.value })
                    }
                    placeholder="Room 301, Building A"
                  />
                </div>
                <div>
                  <Label htmlFor="instructor">Instructor</Label>
                  <Input
                    id="instructor"
                    value={newEntry.instructor || ""}
                    onChange={(e) =>
                      setNewEntry({ ...newEntry, instructor: e.target.value })
                    }
                    placeholder="Dr. Smith"
                  />
                </div>
                <Button onClick={handleAddEntry} className="w-full">
                  Add Class
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* CSV Format Info */}
      {entries.length === 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="font-medium text-blue-900 mb-2">CSV Import Format</h3>
            <p className="text-sm text-blue-800 mb-3">
              Your CSV file should include the following columns:
            </p>
            <code className="text-xs bg-white px-3 py-2 rounded block text-blue-900">
              courseName, courseCode, day, startTime, endTime, location, instructor
            </code>
            <p className="text-xs text-blue-700 mt-3">
              Example: "Introduction to Psychology", "PSY101", "Monday", "09:00", "10:30", "Room 301", "Dr. Smith"
            </p>
          </CardContent>
        </Card>
      )}

      {/* Timetable Tabs: grid view hidden below md (phones use list views) */}
      <Tabs
        value={timetableTab}
        onValueChange={(v) => setTimetableTab(v as TimetableTab)}
        className="space-y-6"
      >
        <TabsList className="flex h-auto w-full max-w-2xl flex-col gap-1.5 sm:grid sm:grid-cols-3">
          <TabsTrigger
            value="grid"
            className="hidden justify-center gap-2 text-xs sm:text-sm md:flex"
          >
            <Grid3x3 className="size-4 shrink-0" />
            Grid view
          </TabsTrigger>
          <TabsTrigger value="combined" className="justify-center gap-2 text-xs sm:text-sm">
            <CalendarIcon className="size-4 shrink-0" />
            Full schedule
          </TabsTrigger>
          <TabsTrigger value="courses" className="justify-center gap-2 text-xs sm:text-sm">
            <ListTodo className="size-4 shrink-0" />
            Courses only
          </TabsTrigger>
        </TabsList>

        {/* Grid View (desktop / tablet only) */}
        <TabsContent value="grid" className="hidden space-y-6 md:block">
          <Card>
            <CardContent className="pt-6 overflow-x-auto">
              <div className="min-w-max">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-semibold text-left w-32">
                        DAY / TIME
                      </th>
                      {TIME_SLOTS.map((time, idx) => {
                        if (idx === TIME_SLOTS.length - 1) return null;
                        const nextTime = TIME_SLOTS[idx + 1];
                        return (
                          <th
                            key={time}
                            className="border border-gray-300 bg-gray-100 px-4 py-2 text-xs font-semibold text-center min-w-[120px]"
                          >
                            {time}-{nextTime}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.slice(0, 5).map((day) => {
                      const dayEntries = getCoursesForDay(day);
                      return (
                        <tr key={day}>
                          <td className="border border-gray-300 bg-gray-50 px-4 py-2 font-semibold text-sm">
                            {day.toUpperCase().slice(0, 3)}
                          </td>
                          {TIME_SLOTS.map((time, idx) => {
                            if (idx === TIME_SLOTS.length - 1) return null;
                            const nextTime = TIME_SLOTS[idx + 1];
                            const startMinutes = getTimeToMinutes(time);
                            const endMinutes = getTimeToMinutes(nextTime);

                            // Find courses that overlap with this time slot
                            const coursesInSlot = dayEntries.filter((entry) => {
                              const courseStart = getTimeToMinutes(entry.startTime);
                              const courseEnd = getTimeToMinutes(entry.endTime);
                              return courseStart < endMinutes && courseEnd > startMinutes;
                            });

                            // Only render if this is the start of the course
                            const courseToRender = coursesInSlot.find((entry) => {
                              const courseStart = getTimeToMinutes(entry.startTime);
                              return courseStart >= startMinutes && courseStart < endMinutes;
                            });

                            if (courseToRender) {
                              const courseStart = getTimeToMinutes(courseToRender.startTime);
                              const courseEnd = getTimeToMinutes(courseToRender.endTime);
                              const spanHours = Math.ceil((courseEnd - courseStart) / 60);
                              const color = getCourseColor(courseToRender.courseCode || courseToRender.courseName);

                              return (
                                <td
                                  key={time}
                                  colSpan={spanHours}
                                  className={`border border-gray-300 px-3 py-2 ${color} align-top`}
                                >
                                  <div className="text-xs font-semibold">{courseToRender.courseCode}</div>
                                  <div className="text-xs font-medium mt-1 leading-tight">
                                    {courseToRender.courseName}
                                  </div>
                                  {courseToRender.location && (
                                    <div className="text-xs mt-1 text-gray-700">
                                      {courseToRender.location}
                                    </div>
                                  )}
                                  {courseToRender.instructor && (
                                    <div className="text-xs mt-1 text-gray-700">
                                      {courseToRender.instructor}
                                    </div>
                                  )}
                                </td>
                              );
                            }

                            // Skip rendering if this cell is part of a spanning course
                            const isPartOfSpan = coursesInSlot.some((entry) => {
                              const courseStart = getTimeToMinutes(entry.startTime);
                              return courseStart < startMinutes;
                            });

                            if (isPartOfSpan) {
                              return null;
                            }

                            return (
                              <td
                                key={time}
                                className="border border-gray-300 px-3 py-2 h-24"
                              >
                                {/* Empty cell */}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Combined View (All courses by day) */}
        <TabsContent value="combined" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {DAYS.map(day => {
              const dayEntries = getCombinedForDay(day);
              const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
              const isToday = day === today;

              return (
                <Card key={day} className={isToday ? "border-purple-300 shadow-lg" : ""}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{day}</span>
                      {isToday && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                          Today
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dayEntries.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        Nothing scheduled
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {dayEntries.map(entry => (
                          <div
                            key={entry.id}
                            className={`p-3 rounded-lg border ${entry.color} ${
                                  ""
                            }`}
                          >
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-gray-900">
                                    {entry.title}
                                  </h4>
                                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                                    entry.type === "course"
                                      ? "bg-blue-200 text-blue-800"
                                      : "bg-blue-200 text-blue-800"
                                  }`}>
                                    {entry.type}
                                  </span>
                                </div>
                                {entry.subtitle && (
                                  <p className="text-xs text-gray-600">{entry.subtitle}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <div>⏰ {entry.time}</div>
                              {entry.location && <div>📍 {entry.location}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Courses Only View */}
        <TabsContent value="courses" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {DAYS.map(day => {
              const dayEntries = getCoursesForDay(day);
              const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
              const isToday = day === today;

              return (
                <Card key={day} className={isToday ? "border-purple-300 shadow-lg" : ""}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{day}</span>
                      {isToday && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                          Today
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dayEntries.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No classes scheduled
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {dayEntries.map(entry => (
                          <div
                            key={entry.id}
                            className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-purple-300 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">
                                  {entry.courseName}
                                </h4>
                                {entry.courseCode && (
                                  <p className="text-xs text-gray-600">{entry.courseCode}</p>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingEntry(entry)}
                                  aria-label="Edit class"
                                >
                                  <Edit2 className="size-4 text-gray-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteEntry(entry.id)}
                                  aria-label="Delete class"
                                >
                                  <Trash2 className="size-4 text-red-500" />
                                </Button>
                              </div>
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <div>
                                ⏰ {entry.startTime} - {entry.endTime}
                              </div>
                              {entry.location && <div>📍 {entry.location}</div>}
                              {entry.instructor && <div>👤 {entry.instructor}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {editingEntry && (
        <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit class</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-courseName">Course name *</Label>
                <Input
                  id="edit-courseName"
                  value={editingEntry.courseName}
                  onChange={(e) =>
                    setEditingEntry({ ...editingEntry, courseName: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-courseCode">Course code</Label>
                <Input
                  id="edit-courseCode"
                  value={editingEntry.courseCode}
                  onChange={(e) =>
                    setEditingEntry({ ...editingEntry, courseCode: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-day">Day *</Label>
                <Select
                  value={editingEntry.day}
                  onValueChange={(value) =>
                    setEditingEntry({ ...editingEntry, day: value })
                  }
                >
                  <SelectTrigger id="edit-day">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day) => (
                      <SelectItem key={day} value={day}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-startTime">Start *</Label>
                  <Input
                    id="edit-startTime"
                    type="time"
                    value={editingEntry.startTime}
                    onChange={(e) =>
                      setEditingEntry({ ...editingEntry, startTime: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-endTime">End *</Label>
                  <Input
                    id="edit-endTime"
                    type="time"
                    value={editingEntry.endTime}
                    onChange={(e) =>
                      setEditingEntry({ ...editingEntry, endTime: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  value={editingEntry.location}
                  onChange={(e) =>
                    setEditingEntry({ ...editingEntry, location: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-instructor">Instructor</Label>
                <Input
                  id="edit-instructor"
                  value={editingEntry.instructor}
                  onChange={(e) =>
                    setEditingEntry({ ...editingEntry, instructor: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpdateEntry} className="flex-1">
                  Save changes
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setEditingEntry(null)}>
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
