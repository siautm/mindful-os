import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Progress } from "../components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Slider } from "../components/ui/slider";
import { Play, Pause, RotateCcw, Coffee, Target, Plus, Trash2, Edit2, Volume2, VolumeX, Maximize2 } from "lucide-react";
import {
  getTasks,
  getFocusSessions,
  saveFocusSessions,
  FocusSession,
  getTodayFocusTime,
  getFocusPresets,
  saveFocusPresets,
  FocusPreset,
  Task,
} from "../lib/storage";
import { toast } from "sonner";
import { getWhiteNoisePlayer, NoiseType, noiseCategories } from "../lib/whiteNoise";
import {
  getFocusAmbientPreset,
  saveFocusAmbientPreset,
  type FocusAmbientPreset,
} from "../lib/storage";
import { FocusImmersiveOverlay } from "../components/FocusImmersiveOverlay";
import { FOCUS_AMBIENT_LABELS } from "../components/FocusAmbientBackground";
import { useQuoteLocale } from "../contexts/QuoteLocaleContext";

export function FocusTimer() {
  const { locale } = useQuoteLocale();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<string>("none");
  const [presets, setPresets] = useState<FocusPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [customDuration, setCustomDuration] = useState(25);
  const [duration, setDuration] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [todayStats, setTodayStats] = useState({
    sessions: 0,
    totalMinutes: 0,
  });
  const [editingPreset, setEditingPreset] = useState<string | null>(null);
  const [editPresetName, setEditPresetName] = useState("");
  const [editPresetDuration, setEditPresetDuration] = useState(0);
  
  // White noise state
  const [noiseType, setNoiseType] = useState<NoiseType>("none");
  const [noiseVolume, setNoiseVolume] = useState(0.3);
  const [isNoisePlaying, setIsNoisePlaying] = useState(false);
  const noisePlayerRef = useRef(getWhiteNoisePlayer());

  const [ambientPreset, setAmbientPreset] = useState<FocusAmbientPreset>(() => getFocusAmbientPreset());
  const [immersiveOpen, setImmersiveOpen] = useState(false);

  const intervalRef = useRef<number>();

  useEffect(() => {
    loadData();
    return () => {
      // Cleanup: stop noise when component unmounts
      noisePlayerRef.current.stop();
    };
  }, []);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  // Handle white noise when timer starts/stops (volume changes use setVolume only — see below)
  useEffect(() => {
    if (isRunning && noiseType !== "none") {
      setIsNoisePlaying(false);
      void noisePlayerRef.current.play(noiseType, noiseVolume).then(() => {
        setIsNoisePlaying(noisePlayerRef.current.getIsPlaying());
      });
    } else {
      noisePlayerRef.current.stop();
      setIsNoisePlaying(false);
    }
  }, [isRunning, noiseType]);

  useEffect(() => {
    if (isRunning && noiseType !== "none") {
      noisePlayerRef.current.setVolume(noiseVolume);
    }
  }, [noiseVolume, isRunning, noiseType]);

  useEffect(() => {
    if (!isRunning) setImmersiveOpen(false);
  }, [isRunning]);

  function loadData() {
    const loadedTasks = getTasks().filter(t => !t.completed);
    setTasks(loadedTasks);
    
    const loadedPresets = getFocusPresets();
    setPresets(loadedPresets);
    if (loadedPresets.length > 0 && !selectedPreset) {
      setSelectedPreset(loadedPresets[0].id);
      setDuration(loadedPresets[0].duration);
      setTimeLeft(loadedPresets[0].duration * 60);
    }
    
    loadTodayStats();
  }

  function loadTodayStats() {
    const sessions = getFocusSessions();
    const today = new Date().toDateString();
    const todaySessions = sessions.filter(
      s => s.completed && new Date(s.date).toDateString() === today
    );

    setTodayStats({
      sessions: todaySessions.length,
      totalMinutes: Math.round(getTodayFocusTime()),
    });
  }

  function handlePresetChange(presetId: string) {
    if (presetId === "custom") {
      setSelectedPreset("custom");
      setDuration(customDuration);
      setTimeLeft(customDuration * 60);
    } else {
      const preset = presets.find(p => p.id === presetId);
      if (preset) {
        setSelectedPreset(presetId);
        setDuration(preset.duration);
        setTimeLeft(preset.duration * 60);
      }
    }
    setIsRunning(false);
  }

  function handleCustomDurationChange(value: string) {
    const minutes = Math.max(1, Math.min(180, parseInt(value) || 1));
    setCustomDuration(minutes);
    if (selectedPreset === "custom") {
      setDuration(minutes);
      setTimeLeft(minutes * 60);
    }
  }

  function handleAddPreset() {
    const newPreset: FocusPreset = {
      id: Date.now().toString(),
      name: "New Preset",
      duration: 25,
    };
    const updated = [...presets, newPreset];
    setPresets(updated);
    saveFocusPresets(updated);
    toast.success("Preset added!");
  }

  function handleStartEditPreset(preset: FocusPreset) {
    setEditingPreset(preset.id);
    setEditPresetName(preset.name);
    setEditPresetDuration(preset.duration);
  }

  function handleSavePreset(presetId: string) {
    if (!editPresetName.trim()) {
      toast.error("Preset name cannot be empty");
      return;
    }
    if (editPresetDuration < 1 || editPresetDuration > 180) {
      toast.error("Duration must be between 1 and 180 minutes");
      return;
    }

    const updated = presets.map(p =>
      p.id === presetId
        ? { ...p, name: editPresetName, duration: editPresetDuration }
        : p
    );
    setPresets(updated);
    saveFocusPresets(updated);
    setEditingPreset(null);
    
    // Update current session if this preset is selected
    if (selectedPreset === presetId && !isRunning) {
      setDuration(editPresetDuration);
      setTimeLeft(editPresetDuration * 60);
    }
    
    toast.success("Preset updated!");
  }

  function handleDeletePreset(presetId: string) {
    if (presets.length <= 1) {
      toast.error("You must have at least one preset");
      return;
    }
    const updated = presets.filter(p => p.id !== presetId);
    setPresets(updated);
    saveFocusPresets(updated);
    if (selectedPreset === presetId) {
      setSelectedPreset(updated[0].id);
      setDuration(updated[0].duration);
      setTimeLeft(updated[0].duration * 60);
    }
    toast.success("Preset deleted!");
  }

  function handleStart() {
    setImmersiveOpen(true);
    setIsRunning(true);
  }

  function handlePause() {
    setIsRunning(false);
  }

  function handleReset() {
    setIsRunning(false);
    setTimeLeft(duration * 60);
  }

  function handleComplete() {
    setIsRunning(false);
    
    const taskTitle = selectedTask !== "none" 
      ? tasks.find(t => t.id === selectedTask)?.title 
      : undefined;
    
    const session: FocusSession = {
      id: Date.now().toString(),
      taskId: selectedTask !== "none" ? selectedTask : undefined,
      taskTitle: taskTitle,
      duration: duration,
      completed: true,
      date: new Date().toISOString(),
    };

    const sessions = getFocusSessions();
    saveFocusSessions([...sessions, session]);
    
    loadTodayStats();
    toast.success("Focus session completed! 🎉");
    
    const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYHGGS57OihUBELTKXh8bllHAU2jdXwy3cqBSh+zPDckj4JFF2y6OyrWBQLRp7f8r9vIAUrgsvy2Ik2Bxhju+zooVARC0yl4fG5ZRwFNo3V8Mt3KgUofszy3JI+CRRdsujsq1gVC0ae3/K/byAFK4LL8tmJNgcYY7vs6KFQEQtMpeHxuWUcBTaN1fDLdyoFKH7M8tySPgkUXbLo7KtYFQtGnt/yv28gBSuCy/LZiTYHGGO77OihUBELTKXh8bllHAU2jdXwy3cqBSh+zPLckj4JFF2y6OyrWBULRp7f8r9vIAUrgsvy2Yk2Bxhju+zooVARC0yl4fG5ZRwFNo3V8Mt3KgUofszy3JI+CRRdsujsq1gVC0ae3/K/byAFK4LL8tmJNgcYY7vs6KFQEQtMpeHxuWUcBTaN1fDLdyoFKH7M8tySPgkUXbLo7KtYFQtGnt/yv28gBSuCy/LZiTYHGGO77OihUBELTKXh8bllHAU2jdXwy3cqBSh+zPLckj4JFF2y6OyrWBULRp7f8r9vIAUrgsvy2Yk2Bxhju+zooVARC0yl4fG5ZRwFNo3V8Mt3KgUofszy3JI+CRRdsujsq1gVC0ae3/K/byAFK4LL8tmJNgcYY7vs6KFQEQtMpeHxuWUcBTaN1fDLdyoFKH7M8tySPgkUXbLo7KtYFQtGnt/yv28gBSuCy/LZiTYHGGO77OihUBELTKXh8bllHAU2jdXwy3cqBSh+zPLckj4JFF2y6OyrWBULRp7f8r9vIAUrgsvy2Yk2Bxhju+zooVARC0yl4fG5ZRwFNo3V8Mt3KgUofszy3JI+CRRdsujsq1gVC0ae3/K/byAFK4LL8tmJNgcYY7vs6KFQEQtMpeHxuWUcBTaN1fDLdyoFKH7M8tySPgkUXbLo7KtYFQtGnt/yv28gBSuCy/LZiTYHGGO77OihUBELTKXh8bllHAU2jdXwy3cqBSh+zPLckj4JFF2y6OyrWBULRp7f8r9vIAUrgsvy2Yk2Bxhju+zooVARC0yl4fG5ZRwFNo3V8Mt3KgUofszy3JI+CRRdsujsq1gVC0ae3/K/byAFK4LL8tmJNgcYY7vs6KFQEQtMpeHxuWUcBTaN1fDLdyoFKH7M8tySPgkUXbLo7KtYFQtGnt/yv28gBSuCy/LZiTYHGGO77OihUBELTKXh8bllHAU2jdXwy3cqBSh+zPLckj4JFF2y6OyrWBULRp7f8r9vIAUrgsvy2Yk2Bxhju+zooVARC0yl4fG5ZRwFNo3V8Mt3KgUofszy3JI+CRRdsujsq1gVC0ae3/K/byAFK4LL8tmJNgcYY7vs6KFQEQtMpeHxuWUcBTaN1fDLdyoFKH7M8tySPgkUXbLo7KtYFQtGnt/yv28gBSuCy/LZiTYHGGO77OihUBELTKXh8bllHAU2jdXwy3cqBSh+zPLckj4JFF2y6OyrWBULRp7f8r9vIAUrgsvy2Yk2Bxhju+zooVARC0yl4fG5ZRwFNo3V8Mt3KgUofszy3JI+CRRdsujsq1gVC0ae3/K/byAFK4LL8tmJNgcYY7vs6KFQEQtMpeHxuWUcBTaN1fDLdyoFKH7M8tySPgkUXbLo7KtYFQtGnt/yv28gBSuCy/LZiTYHGGO77OihUBELTKXh8bllHAU2jdXwy3cqBSh+zPLckj4JFF2y6OyrWBULRp7f8r9vIAUrgsvy2Yk2Bxhju+zooVARC0yl4fG5ZRwFNo3V8Mt3KgUofszy3JI+CRRdsujsq1gVC0ae3/K/byAFK4LL8tmJNgcYY7vs6KFQEQtMpeHxuWUcBTaN1fDLdyoFKH7M8tySPgkUXbLo7KtYFQtGnt/yv28gBSuCy/LZiTYHGGO77OihUBELTKXh8bllHAU2jdXwy3cqBSh+zPLckj4JFF2y6OyrWBULRp7f8r9vIAUrgsvy2Yk2Bxhju+zooVARC0yl4fG5ZRwFNo3V8Mt3KgUofszy3JI+CRRdsujsq1gVC0ae3/K/byAFK4LL8tmJNgcYY7vs6KFQEQtMpeHxuWUcBTaN1fDLdyoFKH7M8tySPgkUXbLo7KtYFQtGnt/yv28gBSuCy/LZiTYHGGO77OihUBELTKXh8bllHAU2jdXwy3cqBSh+zPLckj4JFF2y6OyrWBULRp7f8r9vIAUrgsvy2Yk2Bxhju+zooVARC0yl4fG5ZRwFNo3V8Mt3KgUofszy3JI+CRRdsujsq1gVC0ae3/K/byAFK4LL8tmJNgcYY7vs6KFQEQtMpeHxuWUcBTaN1fDLdyoFKH7M8tySPgkUXbLo7KtYFQtGnt/yv28gBSuCy/LZiTYHGGO77OihUBELTKXh8bllHAU2jdXwy3cqBSh+zPLckj4JFF2y6OyrWBULRp7f8r9vIAUrgsvy2Yk2Bxhju+zooVARC0yl4fG5ZRwFNo3V8Mt3KgUofszy3JI+CRRdsujsq1gVC0ae3/K/byAFK4LL8tmJNgcYY7vs6KFQEQtMpeHxuWUcBTaN1fDLdyoFKH7M8tySPgkUXbLo7KtYFQtGnt/yv28gBSuCy/LZiTYHGGO77OihUBELTKXh8bllHAU2jdXwy3cqBSh+zPLckj4JFF2y6OyrWBULRp7f8r9vIAUrgsvy2Yk2Bxhju+zooVARC0yl4fG5ZRwFNo3V8Mt3KgUofszy3JI+CRRdsujsq1gVC0ae3/K/byAFK4LL");
    audio.play().catch(() => {});
  }

  function handleNoiseVolumeChange(value: number[]) {
    const volume = value[0];
    setNoiseVolume(volume);
    if (isNoisePlaying) {
      noisePlayerRef.current.setVolume(volume);
    }
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = ((duration * 60 - timeLeft) / (duration * 60)) * 100;

  const timeLeftLabel = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  function handleAmbientChange(value: string) {
    const v = value as FocusAmbientPreset;
    setAmbientPreset(v);
    saveFocusAmbientPreset(v);
  }

  return (
    <div className="p-8 space-y-6">
      <FocusImmersiveOverlay
        open={immersiveOpen && isRunning}
        onClose={() => setImmersiveOpen(false)}
        preset={ambientPreset}
        timeLeftLabel={timeLeftLabel}
        clockLocale={locale === "zh" ? "zh-CN" : "en-US"}
      />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">Focus Timer</h1>
        <p className="text-gray-600 mt-1">
          Stay focused with time-boxed work sessions
        </p>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="size-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Target className="size-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-gray-900">
                  {todayStats.sessions}
                </div>
                <p className="text-sm text-gray-600">Sessions Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="size-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Coffee className="size-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-gray-900">
                  {todayStats.totalMinutes}m
                </div>
                <p className="text-sm text-gray-600">Total Focus Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timer */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Focus Session</CardTitle>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[220px]">
              <Label htmlFor="ambient-preset" className="text-xs text-gray-500">
                {locale === "zh" ? "专注背景动画" : "Focus background"}
              </Label>
              <Select value={ambientPreset} onValueChange={handleAmbientChange} disabled={isRunning}>
                <SelectTrigger id="ambient-preset" className="w-full sm:w-[240px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(FOCUS_AMBIENT_LABELS) as FocusAmbientPreset[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {FOCUS_AMBIENT_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Timer Display */}
          <div className="text-center py-8">
            <div className="text-7xl font-bold text-purple-600 mb-4 tabular-nums">
              {String(minutes).padStart(2, "0")}:
              {String(seconds).padStart(2, "0")}
            </div>
            <Progress value={progress} className="h-3 mb-6" />
            <div className="text-sm text-gray-600">
              {isRunning
                ? locale === "zh"
                  ? "保持专注 💪"
                  : "Stay focused! 💪"
                : timeLeft === duration * 60
                ? locale === "zh"
                  ? "准备开始"
                  : "Ready to start"
                : locale === "zh"
                  ? "已暂停"
                  : "Paused"}
            </div>
          </div>

          {/* Timer Controls */}
          <div className="flex flex-wrap justify-center gap-3">
            {!isRunning ? (
              <Button
                size="lg"
                onClick={handleStart}
                className="px-8"
              >
                <Play className="size-5 mr-2" />
                {locale === "zh" ? "开始" : "Start"}
              </Button>
            ) : (
              <>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handlePause}
                  className="px-8"
                >
                  <Pause className="size-5 mr-2" />
                  {locale === "zh" ? "暂停" : "Pause"}
                </Button>
                {!immersiveOpen && (
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={() => setImmersiveOpen(true)}
                    className="px-8"
                  >
                    <Maximize2 className="size-5 mr-2" />
                    {locale === "zh" ? "专注视图" : "Focus view"}
                  </Button>
                )}
              </>
            )}
            <Button
              size="lg"
              variant="outline"
              onClick={handleReset}
              disabled={timeLeft === duration * 60}
            >
              <RotateCcw className="size-5" />
            </Button>
          </div>

          {/* Settings */}
          <div className="space-y-4 pt-6 border-t">
            <div>
              <Label htmlFor="task">Focus Task</Label>
              <Select
                value={selectedTask}
                onValueChange={setSelectedTask}
                disabled={isRunning}
              >
                <SelectTrigger id="task">
                  <SelectValue placeholder="Select a task..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific task</SelectItem>
                  {tasks.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="preset">Duration Preset</Label>
              <Select
                value={selectedPreset}
                onValueChange={handlePresetChange}
                disabled={isRunning}
              >
                <SelectTrigger id="preset">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {presets.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.name} ({preset.duration} min)
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom Duration</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedPreset === "custom" && (
              <div>
                <Label htmlFor="customDuration">Custom Minutes (1-180)</Label>
                <Input
                  id="customDuration"
                  type="number"
                  min="1"
                  max="180"
                  value={customDuration}
                  onChange={(e) => handleCustomDurationChange(e.target.value)}
                  disabled={isRunning}
                />
              </div>
            )}

            {/* White Noise Controls */}
            <div className="space-y-3 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                {isNoisePlaying ? (
                  <Volume2 className="size-5 text-blue-600" />
                ) : (
                  <VolumeX className="size-5 text-gray-400" />
                )}
                <Label className="text-blue-900 font-semibold">White Noise</Label>
              </div>
              
              <div>
                <Label htmlFor="noiseType" className="text-sm text-blue-800">Ambient Sound</Label>
                <Select
                  value={noiseType}
                  onValueChange={(value) => setNoiseType(value as NoiseType)}
                  disabled={isRunning}
                >
                  <SelectTrigger id="noiseType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[400px]">
                    {Object.entries(noiseCategories).map(([category, sounds]) => (
                      <div key={category}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50">
                          {category}
                        </div>
                        {sounds.map((sound) => (
                          <SelectItem key={sound.value} value={sound.value}>
                            <span className="flex items-center gap-2">
                              <span>{sound.emoji}</span>
                              <span>{sound.label}</span>
                              {sound.description && (
                                <span className="text-xs text-gray-500">• {sound.description}</span>
                              )}
                            </span>
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {noiseType !== "none" && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="noiseVolume" className="text-sm text-blue-800">Volume</Label>
                    <span className="text-sm text-blue-600 font-medium">
                      {Math.round(noiseVolume * 100)}%
                    </span>
                  </div>
                  <Slider
                    id="noiseVolume"
                    min={0}
                    max={1}
                    step={0.05}
                    value={[noiseVolume]}
                    onValueChange={handleNoiseVolumeChange}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-blue-700 mt-2">
                    {isNoisePlaying ? "🎵 Playing..." : "Will play when timer starts"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Presets Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Manage Presets</CardTitle>
            <Button size="sm" onClick={handleAddPreset}>
              <Plus className="size-4 mr-2" />
              Add Preset
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="flex items-center gap-3 p-3 rounded-lg border"
              >
                {editingPreset === preset.id ? (
                  <>
                    <Input
                      value={editPresetName}
                      onChange={(e) => setEditPresetName(e.target.value)}
                      className="flex-1"
                      placeholder="Preset name"
                    />
                    <Input
                      type="number"
                      min="1"
                      max="180"
                      value={editPresetDuration}
                      onChange={(e) => setEditPresetDuration(parseInt(e.target.value) || 1)}
                      className="w-24"
                      placeholder="Minutes"
                    />
                    <Button size="sm" onClick={() => handleSavePreset(preset.id)}>
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingPreset(null)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex-1">
                      <div className="font-medium">{preset.name}</div>
                      <div className="text-sm text-gray-600">{preset.duration} minutes</div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleStartEditPreset(preset)}
                    >
                      <Edit2 className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeletePreset(preset.id)}
                    >
                      <Trash2 className="size-4 text-red-600" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <CardTitle className="text-purple-900">Focus Tips 💡</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-purple-800">
            <li>• Remove distractions before starting your session</li>
            <li>• Take a 5-minute break after each Pomodoro (25 min)</li>
            <li>• Stay hydrated and stretch during breaks</li>
            <li>• Use focus sessions for deep, uninterrupted work</li>
            <li>• Try white noise to help mask distracting sounds</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
