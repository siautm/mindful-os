import { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router";
import {
  LayoutDashboard,
  Calendar,
  Timer,
  DollarSign,
  StickyNote,
  BarChart3,
  Brain,
  ChevronDown,
  Menu,
  BookOpen,
  Repeat2,
} from "lucide-react";
import { cn } from "./ui/utils";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "./ui/button";
import { useAuth } from "../contexts/AuthContext";
import { useIsMobile } from "./ui/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";

const routePreloaders: Record<string, () => Promise<unknown>> = {
  "/": () => import("../pages/Dashboard"),
  "/checkin": () => import("../pages/CheckIn"),
  "/timetable": () => import("../pages/Timetable"),
  "/study-plans": () => import("../pages/StudyPlans"),
  "/focus": () => import("../pages/FocusTimer"),
  "/finance": () => import("../pages/Finance"),
  "/habits": () => import("../pages/Habits"),
  "/analytics": () => import("../pages/Analytics"),
  "/memo": () => import("../pages/Memo"),
  "/minigame": () => import("../pages/Minigame"),
};

const preloadedRoutes = new Set<string>();

function prefetchRoute(path: string): void {
  if (preloadedRoutes.has(path)) return;
  const preload = routePreloaders[path];
  if (!preload) return;
  preloadedRoutes.add(path);
  void preload().catch(() => {
    // Ignore prefetch errors; actual navigation will retry.
    preloadedRoutes.delete(path);
  });
}

const navigationGroups = [
  {
    name: "Daily",
    collapsible: false,
    items: [
      { name: "Dashboard", path: "/", icon: LayoutDashboard },
      { name: "Timetable", path: "/timetable", icon: Calendar },
      { name: "Study plans", path: "/study-plans", icon: BookOpen },
      { name: "Focus Timer", path: "/focus", icon: Timer },
    ],
  },
  {
    name: "Tracking",
    collapsible: false,
    items: [
      { name: "Finance", path: "/finance", icon: DollarSign },
      { name: "Habits", path: "/habits", icon: Repeat2 },
      { name: "Analytics", path: "/analytics", icon: BarChart3 },
    ],
  },
  {
    name: "More",
    collapsible: true,
    items: [
      { name: "Memo", path: "/memo", icon: StickyNote },
      { name: "Brain Break", path: "/minigame", icon: Brain },
    ],
  },
];

function currentPageTitle(pathname: string): string {
  for (const g of navigationGroups) {
    const hit = g.items.find((i) => i.path === pathname);
    if (hit) return hit.name;
  }
  return "Mindful OS";
}

type NavLinkClick = () => void;

function SidebarNavBlocks({
  locationPathname,
  expandedSections,
  toggleSection,
  onNavLinkClick,
}: {
  locationPathname: string;
  expandedSections: { [key: string]: boolean };
  toggleSection: (name: string) => void;
  onNavLinkClick?: NavLinkClick;
}) {
  return (
    <>
      <nav className="space-y-6">
        {navigationGroups.map((group) => (
          <div key={group.name}>
            {group.collapsible ? (
              <>
                <button
                  type="button"
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
                          const isActive = locationPathname === item.path;
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              onClick={onNavLinkClick}
                              onMouseEnter={() => prefetchRoute(item.path)}
                              onFocus={() => prefetchRoute(item.path)}
                              onTouchStart={() => prefetchRoute(item.path)}
                              className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 group",
                                isActive
                                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200"
                                  : "text-gray-700 hover:bg-gradient-to-r hover:from-emerald-100 hover:to-teal-100 hover:shadow-md"
                              )}
                            >
                              <Icon
                                className={cn(
                                  "size-5 transition-transform group-hover:scale-110 shrink-0",
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
                    const isActive = locationPathname === item.path;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={onNavLinkClick}
                        onMouseEnter={() => prefetchRoute(item.path)}
                        onFocus={() => prefetchRoute(item.path)}
                        onTouchStart={() => prefetchRoute(item.path)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 group",
                          isActive
                            ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200"
                            : "text-gray-700 hover:bg-gradient-to-r hover:from-emerald-100 hover:to-teal-100 hover:shadow-md"
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-5 transition-transform group-hover:scale-110 shrink-0",
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
    </>
  );
}

function SidebarFooter({
  userEmail,
  onSignOut,
  onAfterSignOut,
}: {
  userEmail?: string | null;
  onSignOut: () => void;
  onAfterSignOut?: () => void;
}) {
  return (
    <div className="px-6 pb-6 pt-2 border-t border-emerald-100/80 mt-auto">
      <div className="mb-3 text-xs text-gray-500 truncate">{userEmail}</div>
      <Button
        variant="outline"
        className="w-full mb-3"
        onClick={() => {
          onAfterSignOut?.();
          void onSignOut();
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
  );
}

export function MainLayout() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    More: false,
  });

  useEffect(() => {
    if (!isMobile) setMobileNavOpen(false);
  }, [isMobile]);

  const toggleSection = (sectionName: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));
  };

  const closeMobileNav = () => setMobileNavOpen(false);

  const brandBlock = (
    <div className="flex items-center gap-3 mb-6 md:mb-8 shrink-0">
      <div className="size-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shrink-0">
        <Brain className="size-6 text-white" />
      </div>
      <div className="min-w-0">
        <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent truncate">
          Mindful OS
        </h1>
        <p className="text-xs text-gray-500">Stay focused 🌱</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-[100dvh] min-h-0 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-white/80 backdrop-blur-lg border-r border-emerald-200 shadow-xl overflow-hidden">
        <div className="p-6 flex-1 overflow-y-auto min-h-0">
          {brandBlock}
          <SidebarNavBlocks
            locationPathname={location.pathname}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
          />
        </div>
        <SidebarFooter userEmail={user?.email} onSignOut={() => signOut()} />
      </aside>

      {/* Main column */}
      <div className="flex flex-1 flex-col min-w-0 min-h-0">
        {/* Mobile top bar */}
        <header
          style={{ paddingTop: "max(0.625rem, env(safe-area-inset-top, 0px))" }}
          className="flex md:hidden items-center gap-3 px-3 pb-2.5 border-b border-emerald-200/80 bg-white/90 backdrop-blur-md shadow-sm shrink-0 z-30"
        >
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0 size-10 border-emerald-200"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5 text-emerald-700" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-emerald-600/90 uppercase tracking-wide truncate">
              Mindful OS
            </p>
            <p className="text-sm font-semibold text-gray-900 truncate">
              {currentPageTitle(location.pathname)}
            </p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 overscroll-contain">
          <Outlet />
        </main>
      </div>

      {/* Mobile nav sheet */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          className="w-[min(20rem,calc(100vw-2rem))] max-w-[20rem] p-0 flex flex-col bg-white border-emerald-200 gap-0 overflow-hidden"
        >
          <SheetHeader className="p-4 pb-2 border-b border-emerald-100 text-left space-y-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="flex items-center gap-3 pr-8">
              <div className="size-9 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center shadow-md shrink-0">
                <Brain className="size-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-emerald-800">Mindful OS</p>
                <p className="text-xs text-gray-500">Menu</p>
              </div>
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
            <SidebarNavBlocks
              locationPathname={location.pathname}
              expandedSections={expandedSections}
              toggleSection={toggleSection}
              onNavLinkClick={closeMobileNav}
            />
          </div>
          <SidebarFooter
            userEmail={user?.email}
            onSignOut={() => signOut()}
            onAfterSignOut={closeMobileNav}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
