import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router";
import { 
  LayoutDashboard, 
  Calendar, 
  CheckSquare, 
  Timer, 
  DollarSign, 
  Lightbulb,
  CalendarDays,
  BarChart3,
  Brain,
  BookOpen,
  TrendingUp,
  Sparkles,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "./ui/utils";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "./ui/button";
import { useAuth } from "../contexts/AuthContext";

const navigationGroups = [
  {
    name: "Daily",
    collapsible: false,
    items: [
      { name: "Dashboard", path: "/", icon: LayoutDashboard },
      { name: "Timetable", path: "/timetable", icon: Calendar },
      { name: "Focus Timer", path: "/focus", icon: Timer },
    ]
  },
  {
    name: "Planning",
    collapsible: false,
    items: [
      { name: "Tasks", path: "/tasks", icon: CheckSquare },
      { name: "Events", path: "/events", icon: CalendarDays },
    ]
  },
  {
    name: "Tracking",
    collapsible: false,
    items: [
      { name: "Finance", path: "/finance", icon: DollarSign },
      { name: "Analytics", path: "/analytics", icon: BarChart3 },
    ]
  },
  {
    name: "More",
    collapsible: true,
    items: [
      { name: "Ideas", path: "/ideas", icon: Lightbulb },
      { name: "Brain Break", path: "/minigame", icon: Brain },
    ]
  }
];

export function MainLayout() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    More: false, // More section starts collapsed
  });

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white/80 backdrop-blur-lg border-r border-emerald-200 shadow-xl overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="size-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
              <Brain className="size-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Mindful OS
              </h1>
              <p className="text-xs text-gray-500">Stay focused 🌱</p>
            </div>
          </div>
          
          <nav className="space-y-6">
            {navigationGroups.map((group) => (
              <div key={group.name}>
                {group.collapsible ? (
                  <>
                    <button
                      onClick={() => toggleSection(group.name)}
                      className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider hover:text-emerald-600 transition-colors group"
                    >
                      <span>{group.name}</span>
                      <motion.div
                        animate={{ rotate: expandedSections[group.name] ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="size-4 group-hover:text-emerald-600" />
                      </motion.div>
                    </button>
                    <AnimatePresence>
                      {expandedSections[group.name] && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-1 mt-2">
                            {group.items.map((item) => {
                              const isActive = location.pathname === item.path;
                              const Icon = item.icon;
                              
                              return (
                                <Link
                                  key={item.path}
                                  to={item.path}
                                  className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 group",
                                    isActive
                                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200"
                                      : "text-gray-700 hover:bg-gradient-to-r hover:from-emerald-100 hover:to-teal-100 hover:shadow-md"
                                  )}
                                >
                                  <Icon
                                    className={cn(
                                      "size-5 transition-transform group-hover:scale-110",
                                      isActive ? "text-white" : "text-emerald-600"
                                    )}
                                  />
                                  <span className="text-sm">{item.name}</span>
                                </Link>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                ) : (
                  <>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-4">
                      {group.name}
                    </h3>
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const isActive = location.pathname === item.path;
                        const Icon = item.icon;
                        
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                              "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 group",
                              isActive
                                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200"
                                : "text-gray-700 hover:bg-gradient-to-r hover:from-emerald-100 hover:to-teal-100 hover:shadow-md"
                            )}
                          >
                            <Icon
                              className={cn(
                                "size-5 transition-transform group-hover:scale-110",
                                isActive ? "text-white" : "text-emerald-600"
                              )}
                            />
                            <span className="text-sm">{item.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            ))}
          </nav>
        </div>
        
        {/* Fun decorative element */}
        <div className="px-6 pb-6">
          <div className="mb-3 text-xs text-gray-500 truncate">{user?.email}</div>
          <Button
            variant="outline"
            className="w-full mb-3"
            onClick={() => {
              void signOut();
            }}
          >
            Sign out
          </Button>
          <div className="bg-gradient-to-r from-emerald-100 to-teal-100 rounded-2xl p-4 border border-emerald-200">
            <p className="text-xs font-semibold text-emerald-900 mb-1">💡 Pro Tip</p>
            <p className="text-xs text-emerald-700">
              Take a brain break every hour to stay fresh!
            </p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
