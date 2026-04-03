import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Plus, TrendingUp, TrendingDown, Wallet, Trash2 } from "lucide-react";
import {
  getFinanceEntries,
  saveFinanceEntries,
  FinanceEntry,
  getFinanceSummary,
} from "../lib/storage";
import { toast } from "sonner";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const EXPENSE_CATEGORIES = [
  "Food & Dining",
  "Transportation",
  "Shopping",
  "Entertainment",
  "Bills & Utilities",
  "Education",
  "Healthcare",
  "Other",
];

const INCOME_CATEGORIES = [
  "Salary",
  "Freelance",
  "Investment",
  "Gift",
  "Refund",
  "Other",
];

const COLORS = ["#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#6366f1", "#14b8a6"];

export function Finance() {
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newEntry, setNewEntry] = useState<Partial<FinanceEntry>>({
    type: "expense",
    date: new Date().toISOString().split("T")[0],
  });
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");

  useEffect(() => {
    loadEntries();
  }, []);

  function loadEntries() {
    setEntries(getFinanceEntries());
  }

  function handleAddEntry() {
    if (!newEntry.amount || !newEntry.category || !newEntry.date) {
      toast.error("Please fill in all required fields");
      return;
    }

    const entry: FinanceEntry = {
      id: Date.now().toString(),
      type: newEntry.type!,
      amount: parseFloat(newEntry.amount.toString()),
      category: newEntry.category!,
      description: newEntry.description || "",
      date: newEntry.date!,
    };

    const updatedEntries = [...entries, entry];
    setEntries(updatedEntries);
    saveFinanceEntries(updatedEntries);
    setIsAddDialogOpen(false);
    setNewEntry({
      type: "expense",
      date: new Date().toISOString().split("T")[0],
    });
    toast.success(`${entry.type === "income" ? "Income" : "Expense"} added`);
  }

  function handleDeleteEntry(id: string) {
    const updatedEntries = entries.filter(e => e.id !== id);
    setEntries(updatedEntries);
    saveFinanceEntries(updatedEntries);
    toast.success("Entry deleted");
  }

  const summary = getFinanceSummary(entries);
  const filteredEntries = entries
    .filter(e => filter === "all" || e.type === filter)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Prepare chart data
  const categoryData = Object.entries(summary.categoryTotals).map(([name, value]) => ({
    name,
    value: Math.round(value * 100) / 100,
  }));

  // Monthly trend data (last 6 months)
  const monthlyData = (() => {
    const months: Record<string, { income: number; expense: number }> = {};
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      months[key] = { income: 0, expense: 0 };
    }

    entries.forEach(entry => {
      const date = new Date(entry.date);
      const key = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      if (months[key]) {
        months[key][entry.type] += entry.amount;
      }
    });

    return Object.entries(months).map(([month, data]) => ({
      month,
      income: Math.round(data.income * 100) / 100,
      expense: Math.round(data.expense * 100) / 100,
    }));
  })();

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Finance Tracker</h1>
          <p className="text-gray-600 mt-1">Monitor your income and expenses</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-2" />
              Add Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Financial Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Type</Label>
                <Tabs
                  value={newEntry.type}
                  onValueChange={(value) =>
                    setNewEntry({ ...newEntry, type: value as "income" | "expense" })
                  }
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="expense">Expense</TabsTrigger>
                    <TabsTrigger value="income">Income</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div>
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={newEntry.amount || ""}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, amount: parseFloat(e.target.value) })
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="category">Category *</Label>
                <select
                  id="category"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={newEntry.category || ""}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, category: e.target.value })
                  }
                >
                  <option value="">Select category...</option>
                  {(newEntry.type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(
                    cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newEntry.description || ""}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, description: e.target.value })
                  }
                  placeholder="Coffee at Starbucks"
                />
              </div>
              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={newEntry.date || ""}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, date: e.target.value })
                  }
                />
              </div>
              <Button onClick={handleAddEntry} className="w-full">
                Add Entry
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="size-12 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="size-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Income</p>
                <div className="text-2xl font-semibold text-green-600">
                  ${summary.totalIncome.toFixed(2)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="size-12 bg-red-100 rounded-full flex items-center justify-center">
                <TrendingDown className="size-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Expenses</p>
                <div className="text-2xl font-semibold text-red-600">
                  ${summary.totalExpenses.toFixed(2)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="size-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Wallet className="size-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Balance</p>
                <div
                  className={`text-2xl font-semibold ${
                    summary.balance >= 0 ? "text-purple-600" : "text-red-600"
                  }`}
                >
                  ${summary.balance.toFixed(2)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="income" fill="#10b981" name="Income" />
                <Bar dataKey="expense" fill="#ef4444" name="Expense" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No expense data to display
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
              >
                All
              </Button>
              <Button
                variant={filter === "income" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("income")}
              >
                Income
              </Button>
              <Button
                variant={filter === "expense" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("expense")}
              >
                Expenses
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredEntries.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No transactions yet. Add your first entry!
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEntries.map(entry => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div
                      className={`size-10 rounded-full flex items-center justify-center ${
                        entry.type === "income"
                          ? "bg-green-100"
                          : "bg-red-100"
                      }`}
                    >
                      {entry.type === "income" ? (
                        <TrendingUp className="size-5 text-green-600" />
                      ) : (
                        <TrendingDown className="size-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {entry.category}
                      </h4>
                      {entry.description && (
                        <p className="text-sm text-gray-600">
                          {entry.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {new Date(entry.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div
                      className={`text-lg font-semibold ${
                        entry.type === "income"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {entry.type === "income" ? "+" : "-"}$
                      {entry.amount.toFixed(2)}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteEntry(entry.id)}
                    >
                      <Trash2 className="size-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
