import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Brain, Trophy, RefreshCw, Zap } from "lucide-react";
import { motion } from "motion/react";
import { getMinigameHighScore, saveMinigameHighScore } from "../lib/storage";

const COLORS = [
  { name: "red", bg: "bg-red-500", hover: "hover:bg-red-600" },
  { name: "blue", bg: "bg-blue-500", hover: "hover:bg-blue-600" },
  { name: "green", bg: "bg-green-500", hover: "hover:bg-green-600" },
  { name: "yellow", bg: "bg-yellow-500", hover: "hover:bg-yellow-600" },
  { name: "purple", bg: "bg-purple-500", hover: "hover:bg-purple-600" },
  { name: "pink", bg: "bg-pink-500", hover: "hover:bg-pink-600" },
  { name: "orange", bg: "bg-orange-500", hover: "hover:bg-orange-600" },
  { name: "cyan", bg: "bg-cyan-500", hover: "hover:bg-cyan-600" },
];

export function Minigame() {
  const [gameMode, setGameMode] = useState<"menu" | "memory" | "reaction">("menu");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    setHighScore(getMinigameHighScore());
  }, []);

  function updateHighScore(newScore: number) {
    if (newScore > highScore) {
      setHighScore(newScore);
      saveMinigameHighScore(newScore);
    }
  }

  return (
    <div className="px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6 md:p-8 md:pb-8 space-y-6 w-full min-w-0 max-w-full">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">Brain Break 🧠</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Quick games to refresh your mind</p>
        </div>
        {gameMode !== "menu" && (
          <Button onClick={() => setGameMode("menu")} variant="outline" className="w-full sm:w-auto shrink-0">
            Back to Menu
          </Button>
        )}
      </div>

      {/* High Score Display */}
      <Card className="bg-gradient-to-r from-emerald-100 to-teal-100 border-2 border-emerald-300">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="size-8 text-yellow-600" />
              <div>
                <p className="text-sm font-semibold text-emerald-900">High Score</p>
                <p className="text-2xl font-bold text-emerald-700">{highScore}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <p className="text-sm font-semibold text-emerald-900 text-right">Current Score</p>
                <p className="text-2xl font-bold text-teal-700">{score}</p>
              </div>
              <Zap className="size-8 text-teal-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Game Selection Menu */}
      {gameMode === "menu" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card 
              className="cursor-pointer hover:shadow-2xl transition-all border-2 hover:border-emerald-400 bg-gradient-to-br from-blue-50 to-cyan-50"
              onClick={() => setGameMode("memory")}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-blue-900">
                  <Brain className="size-8 text-blue-600" />
                  Memory Match
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">
                  Test your memory by matching color patterns! Watch the sequence and repeat it.
                </p>
                <div className="flex gap-2">
                  <span className="text-xs px-3 py-1 bg-blue-200 text-blue-800 rounded-full">Memory</span>
                  <span className="text-xs px-3 py-1 bg-green-200 text-green-800 rounded-full">Focus</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card 
              className="cursor-pointer hover:shadow-2xl transition-all border-2 hover:border-emerald-400 bg-gradient-to-br from-orange-50 to-yellow-50"
              onClick={() => setGameMode("reaction")}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-orange-900">
                  <Zap className="size-8 text-orange-600" />
                  Reaction Speed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">
                  How fast are your reflexes? Click the button when it turns green!
                </p>
                <div className="flex gap-2">
                  <span className="text-xs px-3 py-1 bg-orange-200 text-orange-800 rounded-full">Speed</span>
                  <span className="text-xs px-3 py-1 bg-red-200 text-red-800 rounded-full">Reflexes</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Memory Game */}
      {gameMode === "memory" && (
        <MemoryGame 
          score={score} 
          setScore={setScore} 
          updateHighScore={updateHighScore}
        />
      )}

      {/* Reaction Game */}
      {gameMode === "reaction" && (
        <ReactionGame 
          score={score} 
          setScore={setScore} 
          updateHighScore={updateHighScore}
        />
      )}
    </div>
  );
}

function MemoryGame({ score, setScore, updateHighScore }: { 
  score: number; 
  setScore: (s: number) => void; 
  updateHighScore: (s: number) => void;
}) {
  const [sequence, setSequence] = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUserTurn, setIsUserTurn] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [level, setLevel] = useState(1);

  function startGame() {
    setScore(0);
    setLevel(1);
    setSequence([]);
    setUserSequence([]);
    addToSequence();
  }

  function addToSequence() {
    const newSequence = [...sequence, Math.floor(Math.random() * 8)];
    setSequence(newSequence);
    setIsPlaying(true);
    setIsUserTurn(false);
    setUserSequence([]);
    playSequence(newSequence);
  }

  function playSequence(seq: number[]) {
    seq.forEach((colorIndex, idx) => {
      setTimeout(() => {
        setActiveIndex(colorIndex);
        setTimeout(() => {
          setActiveIndex(null);
          if (idx === seq.length - 1) {
            setIsUserTurn(true);
            setIsPlaying(false);
          }
        }, 400);
      }, idx * 700);
    });
  }

  function handleColorClick(colorIndex: number) {
    if (!isUserTurn || isPlaying) return;

    const newUserSequence = [...userSequence, colorIndex];
    setUserSequence(newUserSequence);
    setActiveIndex(colorIndex);
    setTimeout(() => setActiveIndex(null), 300);

    // Check if correct
    if (newUserSequence[newUserSequence.length - 1] !== sequence[newUserSequence.length - 1]) {
      // Wrong!
      updateHighScore(score);
      alert(`Game Over! Your score: ${score}`);
      setSequence([]);
      setUserSequence([]);
      setIsUserTurn(false);
      setLevel(1);
      setScore(0);
      return;
    }

    // Check if completed sequence
    if (newUserSequence.length === sequence.length) {
      const newScore = score + 10;
      setScore(newScore);
      setLevel(level + 1);
      setTimeout(() => addToSequence(), 1000);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-300">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-blue-900 mb-2">Level {level}</h3>
            <p className="text-gray-700">
              {!isPlaying && !isUserTurn && sequence.length === 0 && "Click 'Start Game' to begin!"}
              {isPlaying && "Watch the pattern..."}
              {isUserTurn && "Your turn! Repeat the pattern."}
            </p>
          </div>

          <div className="grid grid-cols-4 gap-4 max-w-2xl mx-auto mb-6">
            {COLORS.map((color, idx) => (
              <motion.button
                key={idx}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`h-24 rounded-2xl shadow-lg transition-all ${
                  activeIndex === idx 
                    ? `${color.bg} ring-4 ring-white scale-105` 
                    : `${color.bg} opacity-70`
                } ${!isUserTurn || isPlaying ? "cursor-not-allowed" : "cursor-pointer"}`}
                onClick={() => handleColorClick(idx)}
                disabled={!isUserTurn || isPlaying}
              />
            ))}
          </div>

          <div className="text-center">
            {sequence.length === 0 && (
              <Button 
                onClick={startGame} 
                size="lg"
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
              >
                <Brain className="size-5 mr-2" />
                Start Game
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReactionGame({ score, setScore, updateHighScore }: { 
  score: number; 
  setScore: (s: number) => void; 
  updateHighScore: (s: number) => void;
}) {
  const [gameState, setGameState] = useState<"waiting" | "ready" | "click" | "early">("waiting");
  const [startTime, setStartTime] = useState(0);
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [round, setRound] = useState(0);

  function startRound() {
    setGameState("ready");
    setReactionTime(null);
    const delay = Math.random() * 3000 + 1000; // 1-4 seconds
    setTimeout(() => {
      setStartTime(Date.now());
      setGameState("click");
    }, delay);
  }

  function handleClick() {
    if (gameState === "ready") {
      setGameState("early");
      setTimeout(() => {
        updateHighScore(score);
        alert(`Too early! Final score: ${score}`);
        setScore(0);
        setRound(0);
        setGameState("waiting");
      }, 1000);
    } else if (gameState === "click") {
      const time = Date.now() - startTime;
      setReactionTime(time);
      const points = Math.max(10 - Math.floor(time / 100), 1);
      setScore(score + points);
      setRound(round + 1);
      setTimeout(() => setGameState("waiting"), 1500);
    }
  }

  function resetGame() {
    updateHighScore(score);
    setScore(0);
    setRound(0);
    setGameState("waiting");
    setReactionTime(null);
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-300">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-orange-900 mb-2">Round {round}</h3>
            {reactionTime && (
              <p className="text-lg font-semibold text-green-600">
                {reactionTime}ms! 🎉
              </p>
            )}
          </div>

          <div className="max-w-md mx-auto mb-6">
            <motion.button
              whileHover={{ scale: gameState === "waiting" ? 1.02 : 1 }}
              whileTap={{ scale: 0.98 }}
              onClick={gameState === "waiting" ? startRound : handleClick}
              className={`w-full h-64 rounded-3xl shadow-2xl font-bold text-2xl transition-all ${
                gameState === "waiting"
                  ? "bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700 cursor-pointer"
                  : gameState === "ready"
                  ? "bg-gradient-to-br from-red-400 to-red-500 text-white cursor-pointer"
                  : gameState === "click"
                  ? "bg-gradient-to-br from-green-400 to-green-500 text-white cursor-pointer animate-pulse"
                  : "bg-gradient-to-br from-red-600 to-red-700 text-white cursor-not-allowed"
              }`}
              disabled={gameState === "early"}
            >
              {gameState === "waiting" && "Click to Start"}
              {gameState === "ready" && "Wait for green..."}
              {gameState === "click" && "CLICK NOW!"}
              {gameState === "early" && "Too Early! 😅"}
            </motion.button>
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              {gameState === "waiting" 
                ? "Click the button to start. Wait for it to turn green, then click as fast as you can!"
                : gameState === "ready"
                ? "Get ready... Don't click yet!"
                : ""}
            </p>
            {round > 0 && (
              <Button onClick={resetGame} variant="outline">
                <RefreshCw className="size-4 mr-2" />
                Reset Game
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
