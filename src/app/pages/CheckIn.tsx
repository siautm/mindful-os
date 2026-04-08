import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Slider } from "../components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { 
  Heart, 
  CheckCircle2,
  Circle,
  Dumbbell,
  DollarSign,
  Moon,
  Brain,
  Scale,
  Flame,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Calendar,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  getCheckIns,
  saveCheckIns,
  getCheckInStreak,
  CheckInEntry,
  getExerciseEntries,
  saveExerciseEntries,
  ExerciseEntry,
  getSleepEntries,
  saveSleepEntries,
  SleepEntry,
  getMeditationEntries,
  saveMeditationEntries,
  MeditationEntry,
  getWeightEntries,
  saveWeightEntries,
  WeightEntry,
  getWellnessChecklistStatusForDate,
} from "../lib/storage";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { getWhiteNoisePlayer, NoiseType, noiseCategories } from "../lib/whiteNoise";

const PREDEFINED_EXERCISE_TYPES = [
  "Running",
  "Walking",
  "Cycling",
  "Gym",
  "Strength Training",
  "Yoga",
  "Stretching",
  "Swimming",
  "Jump Rope",
  "Other",
] as const;
const CREATE_NEW_TYPE_VALUE = "__create_new__";

export function CheckIn() {
  const MEDITATION_AUTO_STOP_SECONDS = 5 * 60;
  const navigate = useNavigate();
  const location = useLocation();
  const [streak, setStreak] = useState(0);
  const [pastCheckIns, setPastCheckIns] = useState<CheckInEntry[]>([]);
  const [streakJustAdded, setStreakJustAdded] = useState(false);
  
  // Checklist status
  const [checklistStatus, setChecklistStatus] = useState({
    exercise: false,
    finance: false,
    sleep: false,
    meditation: false,
    weight: false,
  });

  // Exercise dialog
  const [exerciseDialogOpen, setExerciseDialogOpen] = useState(false);
  const [exerciseForm, setExerciseForm] = useState({
    selectedType: PREDEFINED_EXERCISE_TYPES[0],
    customType: "",
    duration: "",
    timesText: "1",
    notes: "",
  });

  // Sleep dialog
  const [sleepDialogOpen, setSleepDialogOpen] = useState(false);
  const [sleepForm, setSleepForm] = useState({
    bedTime: "",
    notes: "",
  });

  // Meditation timer
  const [meditationDialogOpen, setMeditationDialogOpen] = useState(false);
  const [meditationTimer, setMeditationTimer] = useState(0);
  const [meditationTimerRunning, setMeditationTimerRunning] = useState(false);
  const [meditationTimerInterval, setMeditationTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [meditationNotes, setMeditationNotes] = useState("");
  
  // White noise for meditation
  const [meditationNoiseType, setMeditationNoiseType] = useState<NoiseType>("none");
  const [meditationNoiseVolume, setMeditationNoiseVolume] = useState(0.3);
  const [meditationNoisePlaying, setMeditationNoisePlaying] = useState(false);
  const meditationNoisePlayer = getWhiteNoisePlayer();

  // Weight dialog
  const [weightDialogOpen, setWeightDialogOpen] = useState(false);
  const [weightForm, setWeightForm] = useState({
    weight: 0,
    unit: "kg",
    notes: "",
  });

  // Optional notes
  const [optionalNotes, setOptionalNotes] = useState("");
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [userExerciseTypes, setUserExerciseTypes] = useState<string[]>([]);

  const exerciseTypeOptions = useMemo(() => {
    const fromHistory = userExerciseTypes.filter(
      (t) => !PREDEFINED_EXERCISE_TYPES.some((p) => p.toLowerCase() === t.toLowerCase())
    );
    return [...PREDEFINED_EXERCISE_TYPES, ...fromHistory];
  }, [userExerciseTypes]);

  const syncChecklistFromStorage = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setChecklistStatus(getWellnessChecklistStatusForDate(today));
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        syncChecklistFromStorage();
        setStreak(getCheckInStreak());
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [syncChecklistFromStorage]);

  useEffect(() => {
    if (location.pathname === "/checkin") {
      syncChecklistFromStorage();
      setStreak(getCheckInStreak());
    }
  }, [location.pathname, syncChecklistFromStorage]);

  useEffect(() => {
    if (meditationTimerRunning) {
      const interval = setInterval(() => {
        setMeditationTimer((prev) => prev + 1);
      }, 1000);
      setMeditationTimerInterval(interval);
      return () => clearInterval(interval);
    } else if (meditationTimerInterval) {
      clearInterval(meditationTimerInterval);
      setMeditationTimerInterval(null);
    }
  }, [meditationTimerRunning]);

  // Control white noise for meditation
  useEffect(() => {
    if (meditationTimerRunning && meditationNoiseType !== "none") {
      setMeditationNoisePlaying(false);
      void meditationNoisePlayer
        .play(meditationNoiseType, meditationNoiseVolume)
        .then(() => setMeditationNoisePlaying(meditationNoisePlayer.getIsPlaying()));
    } else {
      meditationNoisePlayer.stop();
      setMeditationNoisePlaying(false);
    }
  }, [meditationTimerRunning, meditationNoiseType]);

  useEffect(() => {
    if (meditationTimerRunning && meditationNoiseType !== "none") {
      meditationNoisePlayer.setVolume(meditationNoiseVolume);
    }
  }, [meditationNoiseVolume, meditationTimerRunning, meditationNoiseType]);

  useEffect(() => {
    if (!meditationTimerRunning) return;
    if (meditationTimer < MEDITATION_AUTO_STOP_SECONDS) return;

    setMeditationTimerRunning(false);
    meditationNoisePlayer.stop();
    setMeditationNoisePlaying(false);
    toast.success("5 minutes completed. Meditation timer stopped.");
  }, [meditationTimer, meditationTimerRunning]);

  function loadData() {
    setStreak(getCheckInStreak());

    const all = getCheckIns();
    const sorted = [...all].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    setPastCheckIns(sorted.slice(0, 7));
    const knownTypes = Array.from(
      new Set(
        getExerciseEntries()
          .map((e) => e.type.trim())
          .filter((t) => t !== "")
      )
    );
    setUserExerciseTypes(knownTypes);

    syncChecklistFromStorage();
  }

  /** Call after mutating checklist-related storage; optionally play streak +1 animation. */
  function afterWellnessLogSaved() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const before = checklistStatus;
    const beforeAll = Object.values(before).every(Boolean);
    const after = getWellnessChecklistStatusForDate(today);
    const afterAll = Object.values(after).every(Boolean);
    setChecklistStatus(after);
    setStreak(getCheckInStreak());
    if (afterAll && !beforeAll) {
      setStreakJustAdded(true);
      window.setTimeout(() => setStreakJustAdded(false), 2800);
    }
  }

  function handleExerciseLog() {
    const type =
      exerciseForm.selectedType === CREATE_NEW_TYPE_VALUE
        ? exerciseForm.customType.trim()
        : exerciseForm.selectedType.trim();
    if (type === "") {
      toast.error("Please enter exercise type");
      return;
    }

    const timesRaw = exerciseForm.timesText.trim();
    if (!/^\d+$/.test(timesRaw)) {
      toast.error("Please enter a valid times value");
      return;
    }
    const times = Number(timesRaw);
    if (!Number.isFinite(times) || times <= 0) {
      toast.error("Please enter a valid times value");
      return;
    }

    const parsedDuration = exerciseForm.duration.trim() === ""
      ? undefined
      : Number(exerciseForm.duration);
    if (
      parsedDuration !== undefined &&
      (!Number.isFinite(parsedDuration) || parsedDuration <= 0)
    ) {
      toast.error("Duration must be empty or greater than 0");
      return;
    }

    const exercises = getExerciseEntries();
    const newExercise: ExerciseEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      type,
      duration: parsedDuration,
      times: Math.floor(times),
      notes: exerciseForm.notes,
    };

    const nextEntries = [...exercises, newExercise];
    saveExerciseEntries(nextEntries);
    toast.success("Exercise logged! 💪");
    setExerciseDialogOpen(false);
    setExerciseForm({
      selectedType: PREDEFINED_EXERCISE_TYPES[0],
      customType: "",
      duration: "",
      timesText: "1",
      notes: "",
    });
    const knownTypes = Array.from(
      new Set(nextEntries.map((e) => e.type.trim()).filter((t) => t !== ""))
    );
    setUserExerciseTypes(knownTypes);
    afterWellnessLogSaved();
  }

  function handleSleepLog() {
    if (!sleepForm.bedTime) {
      toast.error("Please enter bed time");
      return;
    }

    const sleeps = getSleepEntries();
    const newSleep: SleepEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      bedTime: sleepForm.bedTime,
      notes: sleepForm.notes,
    };

    saveSleepEntries([...sleeps, newSleep]);
    toast.success("Sleep logged! 😴");
    setSleepDialogOpen(false);
    setSleepForm({ bedTime: "", notes: "" });
    afterWellnessLogSaved();
  }

  function startMeditationTimer() {
    setMeditationTimerRunning(true);
  }

  function pauseMeditationTimer() {
    setMeditationTimerRunning(false);
  }

  function resetMeditationTimer() {
    setMeditationTimerRunning(false);
    setMeditationTimer(0);
  }

  function handleMeditationComplete() {
    if (meditationTimer < 30) {
      toast.error("Meditation must be at least 30 seconds");
      return;
    }

    const meditations = getMeditationEntries();
    const newMeditation: MeditationEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      duration: Math.round((meditationTimer / 60) * 10) / 10,
      type: "mindfulness",
      notes: meditationNotes,
    };

    saveMeditationEntries([...meditations, newMeditation]);
    toast.success("Meditation completed! 🧘");
    setMeditationDialogOpen(false);
    resetMeditationTimer();
    setMeditationNotes("");
    meditationNoisePlayer.stop(); // Stop white noise
    afterWellnessLogSaved();
  }

  function handleWeightLog() {
    if (weightForm.weight <= 0) {
      toast.error("Please enter a valid weight");
      return;
    }

    const weights = getWeightEntries();
    const newWeight: WeightEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      weight: weightForm.weight,
      unit: weightForm.unit,
      notes: weightForm.notes,
    };

    saveWeightEntries([...weights, newWeight]);
    toast.success("Weight logged! ⚖️");
    setWeightDialogOpen(false);
    setWeightForm({ weight: 0, unit: "kg", notes: "" });
    afterWellnessLogSaved();
  }

  function handleOptionalNotesSave() {
    if (!optionalNotes.trim()) {
      toast.error("Please enter some notes");
      return;
    }

    const checkIns = getCheckIns();
    const today = new Date().toISOString();
    const todayCheckIn = checkIns.find(c => 
      new Date(c.date).toDateString() === new Date().toDateString()
    );

    if (todayCheckIn) {
      // Update existing
      const updated = checkIns.map(c => 
        c.id === todayCheckIn.id 
          ? { ...c, note: optionalNotes }
          : c
      );
      saveCheckIns(updated);
      toast.success("Notes updated! 📝");
    } else {
      // Create new
      const newCheckIn: CheckInEntry = {
        id: Date.now().toString(),
        date: today,
        mood: "good",
        energy: 3,
        intention: "",
        gratitude: "",
        note: optionalNotes,
      };
      saveCheckIns([...checkIns, newCheckIn]);
      toast.success("Notes saved! 📝");
    }

    setOptionalNotes("");
    setNotesExpanded(false);
    loadData();
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const allCompleted = Object.values(checklistStatus).every(status => status === true);
  const completedCount = Object.values(checklistStatus).filter(status => status === true).length;

  return (
    <div className="px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6 md:p-8 md:pb-8 space-y-6 w-full min-w-0 max-w-full">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">Daily Check-In</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Complete your daily wellness checklist</p>
        </div>
        <div className="flex items-center gap-4 shrink-0 self-start sm:self-auto">
          <div className="relative text-center rounded-xl border border-orange-200 bg-orange-50/80 px-4 py-2 pt-5">
            <AnimatePresence>
              {streakJustAdded && (
                <motion.div
                  className="absolute -top-1 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-white shadow-md"
                  initial={{ opacity: 0, y: 8, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ type: "spring", stiffness: 420, damping: 24 }}
                >
                  +1 day streak!
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex items-center gap-2 justify-center mb-1">
              <Flame className="size-6 text-orange-500" />
              <motion.span
                key={streak}
                className="text-2xl sm:text-3xl font-bold text-orange-600 tabular-nums"
                animate={
                  streakJustAdded ? { scale: [1, 1.28, 1] } : { scale: 1 }
                }
                transition={{ duration: 0.55, ease: "easeOut" }}
              >
                {streak}
              </motion.span>
            </div>
            <p className="text-xs text-gray-600">Day Streak</p>
          </div>
        </div>
      </div>

      {/* Checklist Progress */}
      <Card className={`border-2 ${allCompleted ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50' : 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50'}`}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Heart className="size-6 text-red-500" />
              Today's Checklist
            </span>
            <span className={`text-lg font-bold ${allCompleted ? 'text-green-600' : 'text-emerald-600'}`}>
              {completedCount}/5 Complete
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className={`h-full ${allCompleted ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`}
                initial={{ width: 0 }}
                animate={{ width: `${(completedCount / 5) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          <div className="space-y-3">
            {/* Exercise */}
            <div className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
              checklistStatus.exercise 
                ? 'bg-green-50 border-green-300' 
                : 'bg-white border-gray-200 hover:border-emerald-300'
            }`}>
              <div className="flex items-center gap-3">
                {checklistStatus.exercise ? (
                  <CheckCircle2 className="size-6 text-green-600" />
                ) : (
                  <Circle className="size-6 text-gray-400" />
                )}
                <div>
                  <p className="font-semibold text-gray-900">Exercise</p>
                  <p className="text-sm text-gray-600">Log at least 1 workout</p>
                </div>
              </div>
              <Dialog open={exerciseDialogOpen} onOpenChange={setExerciseDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    size="sm" 
                    className={checklistStatus.exercise ? "bg-green-600 hover:bg-green-700" : "bg-emerald-600 hover:bg-emerald-700"}
                  >
                    <Dumbbell className="size-4 mr-2" />
                    {checklistStatus.exercise ? "Log More" : "Log"}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Dumbbell className="size-6 text-emerald-600" />
                      Log Exercise
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Type</Label>
                      <select
                        value={exerciseForm.selectedType}
                        onChange={(e) =>
                          setExerciseForm({
                            ...exerciseForm,
                            selectedType: e.target.value,
                          })
                        }
                        className="w-full mt-1 p-2 border rounded-lg"
                      >
                        {exerciseTypeOptions.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                        <option value={CREATE_NEW_TYPE_VALUE}>+ Create new type</option>
                      </select>
                    </div>
                    {exerciseForm.selectedType === CREATE_NEW_TYPE_VALUE && (
                      <div>
                        <Label>New Type Name</Label>
                        <Input
                          value={exerciseForm.customType}
                          onChange={(e) =>
                            setExerciseForm({
                              ...exerciseForm,
                              customType: e.target.value,
                            })
                          }
                          placeholder="e.g. Push-up, Squat, Dance"
                        />
                      </div>
                    )}
                    <div>
                      <Label>Times</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={exerciseForm.timesText}
                        onChange={(e) =>
                          setExerciseForm({
                            ...exerciseForm,
                            timesText: e.target.value,
                          })
                        }
                        onFocus={(e) => e.currentTarget.select()}
                        placeholder="1"
                      />
                    </div>
                    <div>
                      <Label>Duration (minutes, optional)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={exerciseForm.duration}
                        onChange={(e) => setExerciseForm({ ...exerciseForm, duration: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Notes (optional)</Label>
                      <Textarea
                        value={exerciseForm.notes}
                        onChange={(e) => setExerciseForm({ ...exerciseForm, notes: e.target.value })}
                        placeholder="How did it go?"
                        rows={2}
                      />
                    </div>
                    <Button onClick={handleExerciseLog} className="w-full bg-emerald-600 hover:bg-emerald-700">
                      Save Exercise
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Finance */}
            <div className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
              checklistStatus.finance 
                ? 'bg-green-50 border-green-300' 
                : 'bg-white border-gray-200 hover:border-emerald-300'
            }`}>
              <div className="flex items-center gap-3">
                {checklistStatus.finance ? (
                  <CheckCircle2 className="size-6 text-green-600" />
                ) : (
                  <Circle className="size-6 text-gray-400" />
                )}
                <div>
                  <p className="font-semibold text-gray-900">Finance</p>
                  <p className="text-sm text-gray-600">Log income or expenses</p>
                </div>
              </div>
              <Button 
                size="sm" 
                className={checklistStatus.finance ? "bg-green-600 hover:bg-green-700" : "bg-emerald-600 hover:bg-emerald-700"}
                onClick={() => navigate("/finance")}
              >
                <DollarSign className="size-4 mr-2" />
                {checklistStatus.finance ? "Add More" : "Go to Finance"}
              </Button>
            </div>

            {/* Sleep */}
            <div className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
              checklistStatus.sleep 
                ? 'bg-green-50 border-green-300' 
                : 'bg-white border-gray-200 hover:border-emerald-300'
            }`}>
              <div className="flex items-center gap-3">
                {checklistStatus.sleep ? (
                  <CheckCircle2 className="size-6 text-green-600" />
                ) : (
                  <Circle className="size-6 text-gray-400" />
                )}
                <div>
                  <p className="font-semibold text-gray-900">Sleep</p>
                  <p className="text-sm text-gray-600">Log your sleep time</p>
                </div>
              </div>
              <Dialog open={sleepDialogOpen} onOpenChange={setSleepDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    size="sm" 
                    className={checklistStatus.sleep ? "bg-green-600 hover:bg-green-700" : "bg-emerald-600 hover:bg-emerald-700"}
                  >
                    <Moon className="size-4 mr-2" />
                    {checklistStatus.sleep ? "Update" : "Log"}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Moon className="size-6 text-indigo-600" />
                      Log Sleep
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Bed Time</Label>
                      <Input
                        type="time"
                        value={sleepForm.bedTime}
                        onChange={(e) => setSleepForm({ ...sleepForm, bedTime: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Notes (optional)</Label>
                      <Textarea
                        value={sleepForm.notes}
                        onChange={(e) => setSleepForm({ ...sleepForm, notes: e.target.value })}
                        placeholder="Any dreams or sleep disruptions?"
                        rows={2}
                      />
                    </div>
                    <Button onClick={handleSleepLog} className="w-full bg-indigo-600 hover:bg-indigo-700">
                      Save Sleep
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Meditation */}
            <div className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
              checklistStatus.meditation 
                ? 'bg-green-50 border-green-300' 
                : 'bg-white border-gray-200 hover:border-emerald-300'
            }`}>
              <div className="flex items-center gap-3">
                {checklistStatus.meditation ? (
                  <CheckCircle2 className="size-6 text-green-600" />
                ) : (
                  <Circle className="size-6 text-gray-400" />
                )}
                <div>
                  <p className="font-semibold text-gray-900">Meditation</p>
                  <p className="text-sm text-gray-600">At least 30 seconds</p>
                </div>
              </div>
              <Dialog open={meditationDialogOpen} onOpenChange={setMeditationDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    size="sm" 
                    className={checklistStatus.meditation ? "bg-green-600 hover:bg-green-700" : "bg-emerald-600 hover:bg-emerald-700"}
                  >
                    <Brain className="size-4 mr-2" />
                    {checklistStatus.meditation ? "Meditate Again" : "Start"}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Brain className="size-6 text-purple-600" />
                      Meditation Timer
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="text-center py-8">
                      <p className="text-6xl font-bold text-purple-600 mb-4">
                        {formatTime(meditationTimer)}
                      </p>
                      <div className="flex items-center justify-center gap-4">
                        {!meditationTimerRunning ? (
                          <Button
                            onClick={startMeditationTimer}
                            className="bg-purple-600 hover:bg-purple-700"
                            size="lg"
                          >
                            <Play className="size-6 mr-2" />
                            Start
                          </Button>
                        ) : (
                          <Button
                            onClick={pauseMeditationTimer}
                            className="bg-orange-600 hover:bg-orange-700"
                            size="lg"
                          >
                            <Pause className="size-6 mr-2" />
                            Pause
                          </Button>
                        )}
                        <Button
                          onClick={resetMeditationTimer}
                          variant="outline"
                          size="lg"
                        >
                          <RotateCcw className="size-6" />
                        </Button>
                      </div>
                    </div>

                    {/* White Noise Controls */}
                    <div className="space-y-3 p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border-2 border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        {meditationNoisePlaying ? (
                          <Volume2 className="size-5 text-purple-600" />
                        ) : (
                          <VolumeX className="size-5 text-gray-400" />
                        )}
                        <Label className="text-purple-900 font-semibold">White Noise</Label>
                      </div>
                      
                      <div>
                        <Label htmlFor="meditationNoiseType" className="text-sm text-purple-800">Ambient Sound</Label>
                        <select
                          id="meditationNoiseType"
                          value={meditationNoiseType}
                          onChange={(e) => setMeditationNoiseType(e.target.value as NoiseType)}
                          disabled={meditationTimerRunning}
                          className="w-full mt-1 px-3 py-2 border border-purple-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          {Object.entries(noiseCategories).map(([category, sounds]) => (
                            <optgroup key={category} label={category}>
                              {sounds.map((sound) => (
                                <option key={sound.value} value={sound.value}>
                                  {sound.emoji} {sound.label} {sound.description ? `• ${sound.description}` : ''}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>

                      {meditationNoiseType !== "none" && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label htmlFor="meditationNoiseVolume" className="text-sm text-purple-800">Volume</Label>
                            <span className="text-sm text-purple-600 font-medium">
                              {Math.round(meditationNoiseVolume * 100)}%
                            </span>
                          </div>
                          <Slider
                            id="meditationNoiseVolume"
                            min={0}
                            max={1}
                            step={0.05}
                            value={[meditationNoiseVolume]}
                            onValueChange={(value) => {
                              setMeditationNoiseVolume(value[0]);
                              if (meditationNoisePlaying) {
                                meditationNoisePlayer.setVolume(value[0]);
                              }
                            }}
                            className="cursor-pointer"
                          />
                          <p className="text-xs text-purple-700 mt-2">
                            {meditationNoisePlaying ? "🎵 Playing..." : "Will play when timer starts"}
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label>Notes (optional)</Label>
                      <Textarea
                        value={meditationNotes}
                        onChange={(e) => setMeditationNotes(e.target.value)}
                        placeholder="How do you feel?"
                        rows={2}
                      />
                    </div>
                    <Button 
                      onClick={handleMeditationComplete} 
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      disabled={meditationTimer < 30}
                    >
                      Complete Meditation {meditationTimer >= 30 ? '✓' : `(${30 - meditationTimer}s remaining)`}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Weight */}
            <div className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
              checklistStatus.weight 
                ? 'bg-green-50 border-green-300' 
                : 'bg-white border-gray-200 hover:border-emerald-300'
            }`}>
              <div className="flex items-center gap-3">
                {checklistStatus.weight ? (
                  <CheckCircle2 className="size-6 text-green-600" />
                ) : (
                  <Circle className="size-6 text-gray-400" />
                )}
                <div>
                  <p className="font-semibold text-gray-900">Weight</p>
                  <p className="text-sm text-gray-600">Track your weight</p>
                </div>
              </div>
              <Dialog open={weightDialogOpen} onOpenChange={setWeightDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    size="sm" 
                    className={checklistStatus.weight ? "bg-green-600 hover:bg-green-700" : "bg-emerald-600 hover:bg-emerald-700"}
                  >
                    <Scale className="size-4 mr-2" />
                    {checklistStatus.weight ? "Update" : "Log"}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Scale className="size-6 text-teal-600" />
                      Log Weight
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Weight</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={weightForm.weight}
                          onChange={(e) => setWeightForm({ ...weightForm, weight: parseFloat(e.target.value) || 0 })}
                          className="flex-1"
                        />
                        <select
                          value={weightForm.unit}
                          onChange={(e) => setWeightForm({ ...weightForm, unit: e.target.value })}
                          className="w-24 p-2 border rounded-lg"
                        >
                          <option value="kg">kg</option>
                          <option value="lbs">lbs</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <Label>Notes (optional)</Label>
                      <Textarea
                        value={weightForm.notes}
                        onChange={(e) => setWeightForm({ ...weightForm, notes: e.target.value })}
                        placeholder="Any changes or goals?"
                        rows={2}
                      />
                    </div>
                    <Button onClick={handleWeightLog} className="w-full bg-teal-600 hover:bg-teal-700">
                      Save Weight
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {allCompleted && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-gradient-to-r from-green-400 to-emerald-400 rounded-xl text-center"
            >
              <p className="text-white font-bold text-lg">🎉 All tasks completed! Great job!</p>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Optional Notes Section */}
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Plus className="size-6 text-purple-600" />
              Optional: Record Anything
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNotesExpanded(!notesExpanded)}
              className="text-purple-600 hover:text-purple-700"
            >
              {notesExpanded ? "Hide" : "Show"}
            </Button>
          </CardTitle>
        </CardHeader>
        {notesExpanded && (
          <CardContent className="space-y-4">
            <Textarea
              value={optionalNotes}
              onChange={(e) => setOptionalNotes(e.target.value)}
              placeholder="Journal your thoughts, ideas, reflections, wins, or anything else..."
              rows={5}
              className="resize-none"
            />
            <Button 
              onClick={handleOptionalNotesSave} 
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              Save Notes
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Recent Check-In Notes */}
      {pastCheckIns.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="size-6 text-emerald-600" />
            Recent Notes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastCheckIns.filter(c => c.note).map((checkIn) => {
              const date = new Date(checkIn.date);
              const isToday = date.toDateString() === new Date().toDateString();

              return (
                <Card key={checkIn.id} className={isToday ? "border-2 border-emerald-300" : ""}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      {isToday && (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                          Today
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700">{checkIn.note}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
