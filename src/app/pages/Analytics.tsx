import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Calendar, TrendingUp, Clock, CheckCircle2, DollarSign } from "lucide-react";
import {
  getFocusSessions,
  getTasks,
  getFinanceEntries,
  FocusSession,
  Task,
  FinanceEntry,
} from "../lib/storage";

type TimePeriod = "daily" | "weekly" | "monthly" | "yearly" | "total";

const COLORS = ["#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444"];

export function Analytics() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("weekly");
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [financeEntries, setFinanceEntries] = useState<FinanceEntry[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  function loadData() {
    setFocusSessions(getFocusSessions());
    setTasks(getTasks());
    setFinanceEntries(getFinanceEntries());
  }

  // Helper function to get date range based on period
  function getDateRange(period: TimePeriod): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case "daily":
        start.setHours(0, 0, 0, 0);
        break;
      case "weekly":
        start.setDate(start.getDate() - 7);
        break;
      case "monthly":
        start.setMonth(start.getMonth() - 1);
        break;
      case "yearly":
        start.setFullYear(start.getFullYear() - 1);
        break;
      case "total":
        start.setFullYear(2000); // Far past date
        break;
    }

    return { start, end };
  }

  // Helper to format dates for grouping
  function getDateKey(date: Date, period: TimePeriod): string {
    switch (period) {
      case "daily":
        return date.toLocaleTimeString([], { hour: "2-digit" });
      case "weekly":
        return date.toLocaleDateString("en-US", { weekday: "short" });
      case "monthly":
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      case "yearly":
        return date.toLocaleDateString("en-US", { month: "short" });
      case "total":
        return date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
      default:
        return date.toLocaleDateString();
    }
  }

  // Process Pomodoro data
  function getPomodoroData() {
    const { start, end } = getDateRange(timePeriod);
    const filtered = focusSessions.filter(s => {
      const date = new Date(s.date);
      return s.completed && date >= start && date <= end;
    });

    if (timePeriod === "total") {
      const totalMinutes = filtered.reduce((sum, s) => sum + s.duration, 0);
      const totalSessions = filtered.length;
      return {
        chart: [{ name: "Total", minutes: totalMinutes, sessions: totalSessions }],
        total: { minutes: totalMinutes, sessions: totalSessions },
      };
    }

    const grouped: Record<string, { minutes: number; sessions: number }> = {};
    filtered.forEach(session => {
      const key = getDateKey(new Date(session.date), timePeriod);
      if (!grouped[key]) {
        grouped[key] = { minutes: 0, sessions: 0 };
      }
      grouped[key].minutes += session.duration;
      grouped[key].sessions += 1;
    });

    const chart = Object.entries(grouped).map(([name, data]) => ({
      name,
      minutes: data.minutes,
      sessions: data.sessions,
    }));

    const totalMinutes = filtered.reduce((sum, s) => sum + s.duration, 0);
    const totalSessions = filtered.length;

    return {
      chart,
      total: { minutes: totalMinutes, sessions: totalSessions },
    };
  }

  // Process Tasks data
  function getTasksData() {
    const { start, end } = getDateRange(timePeriod);
    const filtered = tasks.filter(t => {
      const date = new Date(t.createdAt);
      return t.completed && date >= start && date <= end;
    });

    if (timePeriod === "total") {
      const totalTasks = filtered.length;
      const avgPriority = filtered.length > 0
        ? filtered.reduce((sum, t) => sum + t.priority, 0) / filtered.length
        : 0;
      return {
        chart: [{ name: "Total", completed: totalTasks, avgPriority: avgPriority.toFixed(1) }],
        total: { tasks: totalTasks, avgPriority: avgPriority.toFixed(1) },
      };
    }

    const grouped: Record<string, { count: number; totalPriority: number }> = {};
    filtered.forEach(task => {
      const key = getDateKey(new Date(task.createdAt), timePeriod);
      if (!grouped[key]) {
        grouped[key] = { count: 0, totalPriority: 0 };
      }
      grouped[key].count += 1;
      grouped[key].totalPriority += task.priority;
    });

    const chart = Object.entries(grouped).map(([name, data]) => ({
      name,
      completed: data.count,
      avgPriority: (data.totalPriority / data.count).toFixed(1),
    }));

    const totalTasks = filtered.length;
    const avgPriority = totalTasks > 0
      ? (filtered.reduce((sum, t) => sum + t.priority, 0) / totalTasks).toFixed(1)
      : "0";

    return {
      chart,
      total: { tasks: totalTasks, avgPriority },
    };
  }

  // Process Finance data
  function getFinanceData() {
    const { start, end } = getDateRange(timePeriod);
    const filtered = financeEntries.filter(e => {
      const date = new Date(e.date);
      return date >= start && date <= end;
    });

    const totalIncome = filtered.filter(e => e.type === "income").reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = filtered.filter(e => e.type === "expense").reduce((sum, e) => sum + e.amount, 0);

    // Category breakdown
    const categoryData: Record<string, number> = {};
    filtered
      .filter(e => e.type === "expense")
      .forEach(e => {
        categoryData[e.category] = (categoryData[e.category] || 0) + e.amount;
      });

    const pieData = Object.entries(categoryData).map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2)),
    }));

    if (timePeriod === "total") {
      return {
        chart: [
          { name: "Income", amount: totalIncome },
          { name: "Expenses", amount: totalExpenses },
        ],
        pieData,
        total: { income: totalIncome, expenses: totalExpenses, balance: totalIncome - totalExpenses },
      };
    }

    const grouped: Record<string, { income: number; expenses: number }> = {};
    filtered.forEach(entry => {
      const key = getDateKey(new Date(entry.date), timePeriod);
      if (!grouped[key]) {
        grouped[key] = { income: 0, expenses: 0 };
      }
      if (entry.type === "income") {
        grouped[key].income += entry.amount;
      } else {
        grouped[key].expenses += entry.amount;
      }
    });

    const chart = Object.entries(grouped).map(([name, data]) => ({
      name,
      income: parseFloat(data.income.toFixed(2)),
      expenses: parseFloat(data.expenses.toFixed(2)),
    }));

    return {
      chart,
      pieData,
      total: { income: totalIncome, expenses: totalExpenses, balance: totalIncome - totalExpenses },
    };
  }

  const pomodoroData = getPomodoroData();
  const tasksData = getTasksData();
  const financeData = getFinanceData();

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Visualize your productivity and spending patterns
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timePeriod} onValueChange={(v) => setTimePeriod(v as TimePeriod)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Today</SelectItem>
              <SelectItem value="weekly">Last 7 Days</SelectItem>
              <SelectItem value="monthly">Last Month</SelectItem>
              <SelectItem value="yearly">Last Year</SelectItem>
              <SelectItem value="total">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="size-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Clock className="size-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-gray-900">
                  {pomodoroData.total.minutes}m
                </div>
                <p className="text-sm text-gray-600">Focus Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="size-12 bg-blue-100 rounded-full flex items-center justify-center">
                <TrendingUp className="size-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-gray-900">
                  {pomodoroData.total.sessions}
                </div>
                <p className="text-sm text-gray-600">Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="size-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="size-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-gray-900">
                  {tasksData.total.tasks}
                </div>
                <p className="text-sm text-gray-600">Tasks Done</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="size-12 bg-red-100 rounded-full flex items-center justify-center">
                <DollarSign className="size-6 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-gray-900">
                  ${financeData.total.expenses.toFixed(0)}
                </div>
                <p className="text-sm text-gray-600">Expenses</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="pomodoro" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pomodoro">
            <Clock className="size-4 mr-2" />
            Pomodoro
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <CheckCircle2 className="size-4 mr-2" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="finance">
            <DollarSign className="size-4 mr-2" />
            Finance
          </TabsTrigger>
        </TabsList>

        {/* Pomodoro Tab */}
        <TabsContent value="pomodoro" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Focus Time Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {pomodoroData.chart.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={pomodoroData.chart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="minutes" fill="#8b5cf6" name="Minutes" />
                    <Bar dataKey="sessions" fill="#ec4899" name="Sessions" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-gray-500">
                  No pomodoro data for this period
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total Focus Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {pomodoroData.total.minutes} minutes
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  ≈ {Math.floor(pomodoroData.total.minutes / 60)}h {pomodoroData.total.minutes % 60}m
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Average Session Length</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-pink-600">
                  {pomodoroData.total.sessions > 0
                    ? Math.round(pomodoroData.total.minutes / pomodoroData.total.sessions)
                    : 0}{" "}
                  min
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Across {pomodoroData.total.sessions} sessions
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tasks Completed</CardTitle>
            </CardHeader>
            <CardContent>
              {tasksData.chart.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={tasksData.chart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="Completed Tasks"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-gray-500">
                  No completed tasks for this period
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total Tasks Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {tasksData.total.tasks}
                </div>
                <p className="text-sm text-gray-600 mt-1">Tasks finished</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Average Priority</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {tasksData.total.avgPriority}
                </div>
                <p className="text-sm text-gray-600 mt-1">Out of 10</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Finance Tab */}
        <TabsContent value="finance" className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Income vs Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                {financeData.chart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={financeData.chart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="income" fill="#10b981" name="Income" />
                      <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-500">
                    No finance data for this period
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expense Categories</CardTitle>
              </CardHeader>
              <CardContent>
                {financeData.pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={financeData.pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: $${entry.value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {financeData.pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-500">
                    No expenses for this period
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  ${financeData.total.income.toFixed(2)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  ${financeData.total.expenses.toFixed(2)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-3xl font-bold ${
                    financeData.total.balance >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  ${financeData.total.balance.toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}