import { useState, useEffect } from "react";
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
  getTodayFinanceEntries,
  getSleepEntries,
  saveSleepEntries,
  SleepEntry,
  getMeditationEntries,
  saveMeditationEntries,
  MeditationEntry,
  getWeightEntries,
  saveWeightEntries,
  WeightEntry,
  getLatestWeightEntry,
} from "../lib/storage";
import { toast } from "sonner";
import { motion } from "motion/react";
import { getWhiteNoisePlayer, NoiseType, noiseCategories } from "../lib/whiteNoise";

export function CheckIn() {
  const [streak, setStreak] = useState(0);
  const [pastCheckIns, setPastCheckIns] = useState<CheckInEntry[]>([]);
  
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
    type: "cardio",
    duration: 30,
    intensity: "moderate",
    notes: "",
  });

  // Sleep dialog
  const [sleepDialogOpen, setSleepDialogOpen] = useState(false);
  const [sleepForm, setSleepForm] = useState({
    bedTime: "",
    wakeTime: "",
    quality: 3,
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

  useEffect(() => {
    loadData();
  }, []);

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

  function loadData() {
    setStreak(getCheckInStreak());
    
    // Load past check-ins (last 7 days)
    const all = getCheckIns();
    const sorted = [...all].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    setPastCheckIns(sorted.slice(0, 7));
    
    // Check today's completion status
    checkTodayStatus();
  }

  function checkTodayStatus() {
    const today = new Date().toDateString();
    
    // Check exercise (at least 1)
    const exerciseEntries = getExerciseEntries();
    const todayExercise = exerciseEntries.filter(e => 
      new Date(e.date).toDateString() === today
    );
    
    // Check finance entries
    const todayFinance = getTodayFinanceEntries();
    
    // Check sleep
    const sleepEntries = getSleepEntries();
    const todaySleep = sleepEntries.filter(e => 
      new Date(e.date).toDateString() === today
    );
    
    // Check meditation (at least 30 seconds)
    const meditationEntries = getMeditationEntries();
    const todayMeditation = meditationEntries.filter(e => 
      new Date(e.date).toDateString() === today && e.duration >= 0.5
    );
    
    // Check weight
    const weightEntries = getWeightEntries();
    const todayWeight = weightEntries.filter(e => 
      new Date(e.date).toDateString() === today
    );
    
    setChecklistStatus({
      exercise: todayExercise.length > 0,
      finance: todayFinance.length > 0,
      sleep: todaySleep.length > 0,
      meditation: todayMeditation.length > 0,
      weight: todayWeight.length > 0,
    });
  }

  function handleExerciseLog() {
    if (exerciseForm.duration <= 0) {
      toast.error("Please enter a valid duration");
      return;
    }

    const exercises = getExerciseEntries();
    const newExercise: ExerciseEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      type: exerciseForm.type,
      duration: exerciseForm.duration,
      intensity: exerciseForm.intensity,
      notes: exerciseForm.notes,
    };

    saveExerciseEntries([...exercises, newExercise]);
    toast.success("Exercise logged! 💪");
    setExerciseDialogOpen(false);
    setExerciseForm({ type: "cardio", duration: 30, intensity: "moderate", notes: "" });
    checkTodayStatus();
    updateCheckInStreak();
  }

  function handleSleepLog() {
    if (!sleepForm.bedTime || !sleepForm.wakeTime) {
      toast.error("Please enter both bed time and wake time");
      return;
    }

    // Calculate duration
    const bedTime = new Date(`2000-01-01 ${sleepForm.bedTime}`);
    let wakeTime = new Date(`2000-01-01 ${sleepForm.wakeTime}`);
    
    // If wake time is before bed time, assume next day
    if (wakeTime < bedTime) {
      wakeTime = new Date(`2000-01-02 ${sleepForm.wakeTime}`);
    }
    
    const durationMs = wakeTime.getTime() - bedTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    const sleeps = getSleepEntries();
    const newSleep: SleepEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      bedTime: sleepForm.bedTime,
      wakeTime: sleepForm.wakeTime,
      duration: Math.round(durationHours * 10) / 10,
      quality: sleepForm.quality,
      notes: sleepForm.notes,
    };

    saveSleepEntries([...sleeps, newSleep]);
    toast.success("Sleep logged! 😴");
    setSleepDialogOpen(false);
    setSleepForm({ bedTime: "", wakeTime: "", quality: 3, notes: "" });
    checkTodayStatus();
    updateCheckInStreak();
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
    checkTodayStatus();
    updateCheckInStreak();
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
    checkTodayStatus();
    updateCheckInStreak();
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

  function updateCheckInStreak() {
    // Check if all checklist items are completed
    const allCompleted = Object.values({
      ...checklistStatus,
      // We need to check the updated status, so we call checkTodayStatus
      // But for simplicity, we'll update the streak when all are done
    }).every(status => status === true);
    
    if (allCompleted) {
      // Streak is already calculated in getCheckInStreak based on daily completions
      loadData();
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const allCompleted = Object.values(checklistStatus).every(status => status === true);
  const completedCount = Object.values(checklistStatus).filter(status => status === true).length;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Daily Check-In</h1>
          <p className="text-gray-600 mt-1">Complete your daily wellness checklist</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="flex items-center gap-2 justify-center mb-1">
              <Flame className="size-6 text-orange-500" />
              <span className="text-3xl font-bold text-orange-600">{streak}</span>
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
                        value={exerciseForm.type}
                        onChange={(e) => setExerciseForm({ ...exerciseForm, type: e.target.value })}
                        className="w-full mt-1 p-2 border rounded-lg"
                      >
                        <option value="cardio">Cardio</option>
                        <option value="strength">Strength Training</option>
                        <option value="yoga">Yoga</option>
                        <option value="sports">Sports</option>
                        <option value="walking">Walking</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <Label>Duration (minutes)</Label>
                      <Input
                        type="number"
                        value={exerciseForm.duration}
                        onChange={(e) => setExerciseForm({ ...exerciseForm, duration: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label>Intensity</Label>
                      <select
                        value={exerciseForm.intensity}
                        onChange={(e) => setExerciseForm({ ...exerciseForm, intensity: e.target.value })}
                        className="w-full mt-1 p-2 border rounded-lg"
                      >
                        <option value="light">Light</option>
                        <option value="moderate">Moderate</option>
                        <option value="intense">Intense</option>
                      </select>
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
                onClick={() => window.location.href = '/finance'}
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
                      <Label>Wake Time</Label>
                      <Input
                        type="time"
                        value={sleepForm.wakeTime}
                        onChange={(e) => setSleepForm({ ...sleepForm, wakeTime: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Sleep Quality: {sleepForm.quality}/5</Label>
                      <div className="flex gap-2 mt-2">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <button
                            key={level}
                            onClick={() => setSleepForm({ ...sleepForm, quality: level })}
                            className={`flex-1 h-10 rounded-lg border-2 font-bold transition-all ${
                              sleepForm.quality >= level
                                ? "bg-gradient-to-r from-indigo-400 to-purple-400 border-indigo-500 text-white"
                                : "bg-white border-gray-200 text-gray-400"
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
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
