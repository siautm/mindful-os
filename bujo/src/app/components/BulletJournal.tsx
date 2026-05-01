import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Calendar } from './ui/calendar';
import { ChevronLeft, ChevronRight, BookOpen, Download, Bookmark, Calendar as CalendarIcon } from 'lucide-react';
import { format, getDaysInMonth } from 'date-fns';
import {
  getBujoState,
  saveBujoState,
  STORAGE_HYDRATED_EVENT,
  type BujoState,
} from '../../../../src/app/lib/storage';

type BulletType = 'task' | 'event' | 'note';
type BulletStatus = 'active' | 'completed' | 'cancelled' | 'deferred' | 'scheduled';

interface Bullet {
  id: string;
  type: BulletType;
  text: string;
  status: BulletStatus;
  important: boolean;
  notes: string[];
  date?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  parentProjectId?: string;
}

interface YearlyGoal {
  id: string;
  text: string;
  completed: boolean;
  category: 'tasks' | 'interested';
}

interface YearlyEvent {
  id: string;
  text: string;
  month?: number;
}

interface MonthlyGoal {
  id: string;
  text: string;
  completed: boolean;
  category: 'tasks' | 'interested';
}

interface MonthlyEvent {
  id: string;
  text: string;
}

interface LongProject {
  id: string;
  title: string;
  createdDate: string;
  sourceBulletId?: string;
}

interface LongProjectSubtask {
  id: string;
  projectId: string;
  text: string;
  completed: boolean;
  plannedDate?: string;
  anchorBulletId?: string;
  nextSubtaskId?: string;
}

interface Page {
  id: number;
  type: 'index' | 'key' | 'yearlyGoals-tasks' | 'yearlyGoals-interested' | 'yearlyEvents' |
        'longTaskIndex' | 'longTaskProject' | 'monthlyIndex' | 'monthlyGoals' | 'monthlyEvents' | 'daily';
  title: string;
  month?: number;
  dates?: string[];
  dailyPageRefs?: { title: string; pageNum: number }[];
  projectId?: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const ITEMS_PER_PAGE = 15;
const ITEMS_FOR_COMBINING = 3;
const MAX_DAYS_COMBINED = 3;
const MAX_INDEX_ENTRIES = 20;

export function BulletJournal() {
  const currentYear = new Date().getFullYear();
  const today = format(new Date(), 'yyyy-MM-dd');

  const [yearlyGoals, setYearlyGoals] = useState<YearlyGoal[]>([]);
  const [yearlyEvents, setYearlyEvents] = useState<YearlyEvent[]>([]);
  const [monthlyGoals, setMonthlyGoals] = useState<{ [key: number]: MonthlyGoal[] }>({});
  const [monthlyEvents, setMonthlyEvents] = useState<{ [key: number]: MonthlyEvent[] }>({});
  const [dailyBullets, setDailyBullets] = useState<{ [key: string]: Bullet[] }>({});
  const [longProjects, setLongProjects] = useState<LongProject[]>([]);
  const [longProjectSubtasks, setLongProjectSubtasks] = useState<LongProjectSubtask[]>([]);

  const [currentPageNumber, setCurrentPageNumber] = useState(1);
  const [newItemText, setNewItemText] = useState('');
  const [dailyDraftByDate, setDailyDraftByDate] = useState<Record<string, string>>({});
  const [selectedBulletId, setSelectedBulletId] = useState<string | null>(null);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [editingNote, setEditingNote] = useState<{ bulletId: string; noteIndex: number } | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const [showBookmarks, setShowBookmarks] = useState<'deferred' | 'scheduled' | false>(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(undefined);
  const [scheduleTime, setScheduleTime] = useState('');
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev'>('next');
  const [editingBulletId, setEditingBulletId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [draggedBullet, setDraggedBullet] = useState<{ bullet: Bullet; sourceDate: string } | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [jumpToDate, setJumpToDate] = useState(today);
  const [storageReady, setStorageReady] = useState(false);
  const hasHydratedOnceRef = useRef(false);
  const lastSavedStateRef = useRef<string | null>(null);

  const hydrateFromStorage = useCallback(() => {
    const state = getBujoState();
    const hydratedState: BujoState = {
      yearlyGoals: state.yearlyGoals as BujoState["yearlyGoals"],
      yearlyEvents: state.yearlyEvents as BujoState["yearlyEvents"],
      monthlyGoals: state.monthlyGoals as BujoState["monthlyGoals"],
      monthlyEvents: state.monthlyEvents as BujoState["monthlyEvents"],
      dailyBullets: state.dailyBullets as BujoState["dailyBullets"],
      longProjects: (state as unknown as { longProjects?: BujoState["longProjects"] }).longProjects || [],
      longProjectSubtasks: (state as unknown as { longProjectSubtasks?: BujoState["longProjectSubtasks"] }).longProjectSubtasks || [],
      schemaVersion: 2,
    };
    lastSavedStateRef.current = JSON.stringify(hydratedState);
    hasHydratedOnceRef.current = true;
    setYearlyGoals(state.yearlyGoals as YearlyGoal[]);
    setYearlyEvents(state.yearlyEvents as YearlyEvent[]);
    setMonthlyGoals(state.monthlyGoals as { [key: number]: MonthlyGoal[] });
    setMonthlyEvents(state.monthlyEvents as { [key: number]: MonthlyEvent[] });
    setDailyBullets(state.dailyBullets as { [key: string]: Bullet[] });
    setLongProjects(((state as unknown as { longProjects?: LongProject[] }).longProjects) || []);
    setLongProjectSubtasks(((state as unknown as { longProjectSubtasks?: LongProjectSubtask[] }).longProjectSubtasks) || []);
    setStorageReady(true);
  }, []);

  useEffect(() => {
    hydrateFromStorage();
    const onHydrated = () => hydrateFromStorage();
    window.addEventListener(STORAGE_HYDRATED_EVENT, onHydrated);
    return () => window.removeEventListener(STORAGE_HYDRATED_EVENT, onHydrated);
  }, [hydrateFromStorage]);

  useEffect(() => {
    if (!storageReady) return;
    const timer = window.setTimeout(() => {
      if (!hasHydratedOnceRef.current) return;
      const next: BujoState = {
        yearlyGoals: yearlyGoals as BujoState["yearlyGoals"],
        yearlyEvents: yearlyEvents as BujoState["yearlyEvents"],
        monthlyGoals: monthlyGoals as BujoState["monthlyGoals"],
        monthlyEvents: monthlyEvents as BujoState["monthlyEvents"],
        dailyBullets: dailyBullets as BujoState["dailyBullets"],
        longProjects: longProjects as BujoState["longProjects"],
        longProjectSubtasks: longProjectSubtasks as BujoState["longProjectSubtasks"],
        schemaVersion: 2,
      };
      const serialized = JSON.stringify(next);
      if (serialized === lastSavedStateRef.current) return;
      saveBujoState(next);
      lastSavedStateRef.current = serialized;
    }, 500);
    return () => window.clearTimeout(timer);
  }, [storageReady, yearlyGoals, yearlyEvents, monthlyGoals, monthlyEvents, dailyBullets, longProjects, longProjectSubtasks]);

  // Daily page *layout* (titles + which dates each spread covers). Page *ids* are assigned in `pages` useMemo
  // so they match the real order: monthly index → goals → events → dailies.
  const buildDailyLayouts = (month: number, daysInMonth: number) => {
    const layouts: { title: string; dates: string[] }[] = [];
    const dates: string[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      dates.push(dateStr);
    }

    let i = 0;
    while (i < dates.length) {
      const currentDate = dates[i];
      const bullets = dailyBullets[currentDate] || [];
      const isPast = currentDate < today;
      const isToday = currentDate === today;
      const isFuture = currentDate > today;

      if (isToday || isFuture) {
        const pagesNeeded = Math.max(1, Math.ceil(bullets.length / ITEMS_PER_PAGE));
        for (let p = 0; p < pagesNeeded; p++) {
          layouts.push({
            title:
              p === 0
                ? format(new Date(currentDate), 'MMMM d')
                : format(new Date(currentDate), 'MMMM d') + ` (cont. ${p + 1})`,
            dates: [currentDate],
          });
        }
        i++;
      } else if (isPast) {
        const combinableDates = [currentDate];
        let j = i + 1;

        while (
          j < dates.length &&
          combinableDates.length < MAX_DAYS_COMBINED &&
          dates[j] < today
        ) {
          const nextDate = dates[j];
          const nextBullets = dailyBullets[nextDate] || [];
          const currentTotal = combinableDates.reduce(
            (sum, d) => sum + (dailyBullets[d] || []).length,
            0
          );

          if (currentTotal <= ITEMS_FOR_COMBINING && nextBullets.length <= ITEMS_FOR_COMBINING) {
            combinableDates.push(nextDate);
            j++;
          } else {
            break;
          }
        }

        if (combinableDates.length === 1) {
          const pagesNeeded = Math.max(1, Math.ceil(bullets.length / ITEMS_PER_PAGE));
          for (let p = 0; p < pagesNeeded; p++) {
            layouts.push({
              title:
                p === 0
                  ? format(new Date(currentDate), 'MMMM d')
                  : format(new Date(currentDate), 'MMMM d') + ` (cont. ${p + 1})`,
              dates: [currentDate],
            });
          }
        } else {
          const startDay = parseInt(combinableDates[0].split('-')[2]);
          const endDay = parseInt(combinableDates[combinableDates.length - 1].split('-')[2]);
          const combinedBulletsCount = combinableDates.reduce(
            (sum, d) => sum + (dailyBullets[d] || []).length,
            0
          );
          const combinedPagesNeeded = Math.max(1, Math.ceil(combinedBulletsCount / ITEMS_PER_PAGE));
          for (let p = 0; p < combinedPagesNeeded; p++) {
            layouts.push({
              title:
                p === 0
                  ? `${MONTHS[month]} ${startDay}-${endDay}`
                  : `${MONTHS[month]} ${startDay}-${endDay} (cont. ${p + 1})`,
              dates: combinableDates,
            });
          }
        }

        i = j;
      }
    }

    return layouts;
  };

  // Calculate pages dynamically
  const pages = useMemo(() => {
    const pageList: Page[] = [];
    let pageNum = 1;

    // Index & Key
    pageList.push({ id: pageNum++, type: 'index', title: 'Index' });
    pageList.push({ id: pageNum++, type: 'key', title: 'Key' });

    // Yearly Goals - Tasks
    const tasksGoals = yearlyGoals.filter(g => g.category === 'tasks');
    const taskPages = Math.max(1, Math.ceil(tasksGoals.length / ITEMS_PER_PAGE));
    for (let i = 0; i < taskPages; i++) {
      pageList.push({
        id: pageNum++,
        type: 'yearlyGoals-tasks',
        title: i === 0 ? 'Annual Goals - Tasks' : `Annual Goals - Tasks (cont. ${i + 1})`
      });
    }

    // Yearly Goals - Interested
    const interestedGoals = yearlyGoals.filter(g => g.category === 'interested');
    const interestedPages = Math.max(1, Math.ceil(interestedGoals.length / ITEMS_PER_PAGE));
    for (let i = 0; i < interestedPages; i++) {
      pageList.push({
        id: pageNum++,
        type: 'yearlyGoals-interested',
        title: i === 0 ? 'Annual Goals - Interested' : `Annual Goals - Interested (cont. ${i + 1})`
      });
    }

    // Yearly Events
    const eventPages = Math.max(1, Math.ceil(yearlyEvents.length / ITEMS_PER_PAGE));
    for (let i = 0; i < eventPages; i++) {
      pageList.push({
        id: pageNum++,
        type: 'yearlyEvents',
        title: i === 0 ? 'Annual Events' : `Annual Events (cont. ${i + 1})`
      });
    }

    // Long-running project index and pages (inserted before all monthly sections)
    pageList.push({
      id: pageNum++,
      type: 'longTaskIndex',
      title: 'Annual Long-running Projects',
    });

    longProjects.forEach((project) => {
      const subtasksCount = longProjectSubtasks.filter(s => s.projectId === project.id).length;
      const projectPages = Math.max(1, Math.ceil(subtasksCount / ITEMS_PER_PAGE));
      for (let i = 0; i < projectPages; i++) {
        pageList.push({
          id: pageNum++,
          type: 'longTaskProject',
          projectId: project.id,
          title: i === 0 ? `${project.title} - Project` : `${project.title} - Project (cont. ${i + 1})`,
        });
      }
    });

    // Monthly pages
    for (let month = 0; month < 12; month++) {
      const daysInMonth = getDaysInMonth(new Date(currentYear, month));
      const monthGoalsCount = (monthlyGoals[month] || []).length;
      const monthEventsCount = (monthlyEvents[month] || []).length;
      const monthGoalPages = Math.max(1, Math.ceil(monthGoalsCount / ITEMS_PER_PAGE));
      const monthEventPages = Math.max(1, Math.ceil(monthEventsCount / ITEMS_PER_PAGE));

      const dailyLayouts = buildDailyLayouts(month, daysInMonth);
      const monthIndexSpreads = Math.max(1, Math.ceil(dailyLayouts.length / MAX_INDEX_ENTRIES));
      // Book order within the month: #month index spread(s)# → goals → events → dailies
      const dailyPagesStartId = pageNum + monthIndexSpreads + monthGoalPages + monthEventPages;
      const dailyPagesData = dailyLayouts.map((layout, idx) => ({
        ...layout,
        pageNum: dailyPagesStartId + idx,
      }));

      for (let i = 0; i < monthIndexSpreads; i++) {
        const startIdx = i * MAX_INDEX_ENTRIES;
        const endIdx = Math.min((i + 1) * MAX_INDEX_ENTRIES, dailyPagesData.length);

        pageList.push({
          id: pageNum++,
          type: 'monthlyIndex',
          title: i === 0 ? `${MONTHS[month]} - Index` : `${MONTHS[month]} - Index (cont.)`,
          month,
          dailyPageRefs: dailyPagesData.slice(startIdx, endIdx).map((dp) => ({
            title: dp.title,
            pageNum: dp.pageNum,
          })),
        });
      }

      // Monthly Goals
      for (let i = 0; i < monthGoalPages; i++) {
        pageList.push({
          id: pageNum++,
          type: 'monthlyGoals',
          title: i === 0 ? `${MONTHS[month]} - Goals` : `${MONTHS[month]} - Goals (cont. ${i + 1})`,
          month
        });
      }

      // Monthly Events
      for (let i = 0; i < monthEventPages; i++) {
        pageList.push({
          id: pageNum++,
          type: 'monthlyEvents',
          title: i === 0 ? `${MONTHS[month]} - Events` : `${MONTHS[month]} - Events (cont. ${i + 1})`,
          month
        });
      }

      // Daily pages
      dailyPagesData.forEach(dp => {
        pageList.push({
          id: pageNum++,
          type: 'daily',
          title: dp.title,
          month,
          dates: dp.dates
        });
      });
    }

    return pageList;
  }, [yearlyGoals, yearlyEvents, monthlyGoals, monthlyEvents, dailyBullets, longProjects, longProjectSubtasks, today]);

  // Find today's page
  const todayPageNum = useMemo(() => {
    return pages.find(p => p.type === 'daily' && p.dates?.includes(today))?.id || 1;
  }, [pages, today]);

  // Get deferred and scheduled bullets
  const deferredBullets = useMemo(() => {
    const result: Bullet[] = [];
    Object.values(dailyBullets).forEach(bullets => {
      bullets.forEach(b => {
        if (b.status === 'deferred') result.push(b);
      });
    });
    return result;
  }, [dailyBullets]);

  const scheduledBullets = useMemo(() => {
    const result: Bullet[] = [];
    Object.values(dailyBullets).forEach(bullets => {
      bullets.forEach(b => {
        if (b.status === 'scheduled') result.push(b);
      });
    });
    return result;
  }, [dailyBullets]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedBulletId || isAddingNote || showScheduleModal || editingBulletId) return;

      if (e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 'c':
            e.preventDefault();
            handleComplete(selectedBulletId);
            break;
          case 'x':
            e.preventDefault();
            handleCancel(selectedBulletId);
            break;
          case 'enter':
            e.preventDefault();
            setIsAddingNote(true);
            break;
          case 'd':
            e.preventDefault();
            handleDefer(selectedBulletId);
            break;
          case 's':
            e.preventDefault();
            setShowScheduleModal(true);
            break;
          case 'a':
            e.preventDefault();
            handleToggleImportant(selectedBulletId);
            break;
          case 'r':
            e.preventDefault();
            handleStartEdit(selectedBulletId);
            break;
          case 'p':
            e.preventDefault();
            createLongProjectFromSelected(selectedBulletId);
            break;
        }
      }

      if (e.key === 'Delete') {
        e.preventDefault();
        handleDelete(selectedBulletId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBulletId, isAddingNote, showScheduleModal, editingBulletId, longProjects, pages]);

  // Helper to find bullet by ID across all dates
  const findBulletById = (id: string): { bullet: Bullet; date: string } | null => {
    for (const [date, bullets] of Object.entries(dailyBullets)) {
      const bullet = bullets.find(b => b.id === id);
      if (bullet) return { bullet, date };
    }
    return null;
  };

  // FIXED: Complete with shared ID sync
  const handleComplete = (id: string) => {
    // Update daily bullets
    setDailyBullets(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(date => {
        updated[date] = updated[date].map(b =>
          b.id === id ? { ...b, status: b.status === 'completed' ? 'active' : 'completed' as BulletStatus } : b
        );
      });
      return updated;
    });

    // Update yearly goals (shared ID)
    setYearlyGoals(prev => prev.map(g =>
      g.id === id ? { ...g, completed: !g.completed } : g
    ));

    // Update monthly goals (shared ID) - FIXED: added safety check
    setMonthlyGoals(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(month => {
        const monthNum = parseInt(month);
        if (updated[monthNum]) {
          updated[monthNum] = updated[monthNum].map(g =>
            g.id === id ? { ...g, completed: !g.completed } : g
          );
        }
      });
      return updated;
    });
  };

  const handleStartEdit = (id: string) => {
    const found = findBulletById(id);
    if (!found) {
      // Check yearly goals
      const yearlyGoal = yearlyGoals.find(g => g.id === id);
      if (yearlyGoal) {
        setEditText(yearlyGoal.text);
        setEditingBulletId(id);
        return;
      }

      // Check monthly goals
      for (const goals of Object.values(monthlyGoals)) {
        const goal = goals.find(g => g.id === id);
        if (goal) {
          setEditText(goal.text);
          setEditingBulletId(id);
          return;
        }
      }

      // Check yearly events
      const yearlyEvent = yearlyEvents.find(e => e.id === id);
      if (yearlyEvent) {
        setEditText(yearlyEvent.text);
        setEditingBulletId(id);
        return;
      }

      return;
    }

    setEditText(found.bullet.text);
    setEditingBulletId(id);
  };

  const handleSaveEdit = () => {
    if (!editingBulletId || !editText.trim()) {
      setEditingBulletId(null);
      setEditText('');
      return;
    }

    // Update daily bullets
    setDailyBullets(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(date => {
        updated[date] = updated[date].map(b =>
          b.id === editingBulletId ? { ...b, text: editText } : b
        );
      });
      return updated;
    });

    // Update yearly goals
    setYearlyGoals(prev => prev.map(g =>
      g.id === editingBulletId ? { ...g, text: editText } : g
    ));

    // Update monthly goals
    setMonthlyGoals(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(month => {
        const monthNum = parseInt(month);
        if (updated[monthNum]) {
          updated[monthNum] = updated[monthNum].map(g =>
            g.id === editingBulletId ? { ...g, text: editText } : g
          );
        }
      });
      return updated;
    });

    // Update yearly events
    setYearlyEvents(prev => prev.map(e =>
      e.id === editingBulletId ? { ...e, text: editText } : e
    ));

    // Update monthly events
    setMonthlyEvents(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(month => {
        const monthNum = parseInt(month);
        if (updated[monthNum]) {
          updated[monthNum] = updated[monthNum].map(e =>
            e.id === editingBulletId ? { ...e, text: editText } : e
          );
        }
      });
      return updated;
    });

    setEditingBulletId(null);
    setEditText('');
  };

  const handleDragStart = (bullet: Bullet, sourceDate: string) => {
    if (bullet.status !== 'deferred') return;
    setDraggedBullet({ bullet, sourceDate });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetDate: string) => {
    if (!draggedBullet) return;

    const { bullet, sourceDate } = draggedBullet;

    setDailyBullets(prev => {
      const updated = { ...prev };

      // Remove from source
      updated[sourceDate] = updated[sourceDate].filter(b => b.id !== bullet.id);

      // Add to target with active status
      if (!updated[targetDate]) updated[targetDate] = [];
      updated[targetDate].push({
        ...bullet,
        status: 'active',
        date: targetDate
      });

      return updated;
    });

    setDraggedBullet(null);
  };

  const handleCancel = (id: string) => {
    setDailyBullets(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(date => {
        updated[date] = updated[date].map(b =>
          b.id === id ? { ...b, status: 'cancelled' as BulletStatus } : b
        );
      });
      return updated;
    });
  };

  const handleDelete = (id: string) => {
    setDailyBullets(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(date => {
        updated[date] = updated[date].filter(b => b.id !== id);
      });
      return updated;
    });

    setYearlyGoals(prev => prev.filter(g => g.id !== id));
    setYearlyEvents(prev => prev.filter(e => e.id !== id));

    setMonthlyGoals(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(month => {
        updated[parseInt(month)] = updated[parseInt(month)].filter(g => g.id !== id);
      });
      return updated;
    });

    setMonthlyEvents(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(month => {
        updated[parseInt(month)] = updated[parseInt(month)].filter(e => e.id !== id);
      });
      return updated;
    });

    setLongProjects(prev => prev.filter(p => p.sourceBulletId !== id));
    setLongProjectSubtasks(prev => prev.filter(s => s.anchorBulletId !== id));
  };

  const handleDefer = (id: string) => {
    setDailyBullets(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(date => {
        updated[date] = updated[date].map(b =>
          b.id === id ? { ...b, status: 'deferred' as BulletStatus } : b
        );
      });
      return updated;
    });
  };

  // FIXED: Schedule with modal (no prompt)
  const handleScheduleConfirm = () => {
    if (!selectedBulletId || !scheduleDate) return;

    const dateStr = format(scheduleDate, 'yyyy-MM-dd');
    const found = findBulletById(selectedBulletId);
    if (!found) return;

    setDailyBullets(prev => {
      const updated = { ...prev };

      // Mark as scheduled in source
      updated[found.date] = updated[found.date].map(b =>
        b.id === selectedBulletId
          ? { ...b, status: 'scheduled' as BulletStatus, scheduledDate: dateStr, scheduledTime: scheduleTime || undefined }
          : b
      );

      // Add to target date
      if (!updated[dateStr]) updated[dateStr] = [];
      updated[dateStr].push({
        ...found.bullet,
        status: 'active',
        date: dateStr,
        scheduledDate: undefined,
        scheduledTime: undefined
      });

      return updated;
    });

    // If important, mirror to monthly/yearly goals (tasks) or events — same ID
    if (found.bullet.important) {
      const targetMonth = parseInt(dateStr.split('-')[1]) - 1;

      if (found.bullet.type === 'event') {
        setMonthlyEvents(prev => {
          const exists = prev[targetMonth]?.some(ev => ev.id === selectedBulletId);
          if (exists) return prev;
          return {
            ...prev,
            [targetMonth]: [...(prev[targetMonth] || []), {
              id: selectedBulletId,
              text: found.bullet.text,
            }],
          };
        });

        setYearlyEvents(prev => {
          const exists = prev.some(e => e.id === selectedBulletId);
          if (exists) return prev;
          return [...prev, {
            id: selectedBulletId,
            text: found.bullet.text,
            month: targetMonth,
          }];
        });
      } else {
        setMonthlyGoals(prev => {
          const exists = prev[targetMonth]?.some(g => g.id === selectedBulletId);
          if (exists) return prev;

          return {
            ...prev,
            [targetMonth]: [...(prev[targetMonth] || []), {
              id: selectedBulletId,
              text: found.bullet.text,
              completed: false,
              category: 'tasks' as const
            }]
          };
        });

        setYearlyGoals(prev => {
          const exists = prev.some(g => g.id === selectedBulletId);
          if (exists) return prev;

          return [...prev, {
            id: selectedBulletId,
            text: found.bullet.text,
            completed: false,
            category: 'tasks' as const
          }];
        });
      }
    }

    setShowScheduleModal(false);
    setScheduleDate(undefined);
    setScheduleTime('');
  };

  // FIXED: Toggle important with shared ID (no duplicates)
  const handleToggleImportant = (id: string) => {
    const found = findBulletById(id);
    if (!found) return;

    const newImportantState = !found.bullet.important;

    // Update daily bullet
    setDailyBullets(prev => {
      const updated = { ...prev };
      updated[found.date] = updated[found.date].map(b =>
        b.id === id ? { ...b, important: newImportantState } : b
      );
      return updated;
    });

    if (newImportantState) {
      const month = parseInt(found.date.split('-')[1]) - 1;
      const isEvent = found.bullet.type === 'event';

      if (isEvent) {
        setMonthlyEvents(prev => {
          const exists = prev[month]?.some(ev => ev.id === id);
          if (exists) return prev;
          return {
            ...prev,
            [month]: [...(prev[month] || []), { id, text: found.bullet.text }],
          };
        });

        setYearlyEvents(prev => {
          const exists = prev.some(e => e.id === id);
          if (exists) return prev;
          return [...prev, { id, text: found.bullet.text, month }];
        });
      } else {
        setMonthlyGoals(prev => {
          const exists = prev[month]?.some(g => g.id === id);
          if (exists) return prev;

          return {
            ...prev,
            [month]: [...(prev[month] || []), {
              id,
              text: found.bullet.text,
              completed: found.bullet.status === 'completed',
              category: 'tasks' as const
            }]
          };
        });

        setYearlyGoals(prev => {
          const exists = prev.some(g => g.id === id);
          if (exists) return prev;

          return [...prev, {
            id,
            text: found.bullet.text,
            completed: found.bullet.status === 'completed',
            category: 'tasks' as const
          }];
        });
      }
    } else {
      const month = parseInt(found.date.split('-')[1]) - 1;
      const isEvent = found.bullet.type === 'event';

      if (isEvent) {
        setMonthlyEvents(prev => ({
          ...prev,
          [month]: (prev[month] || []).filter(e => e.id !== id)
        }));
        setYearlyEvents(prev => prev.filter(e => e.id !== id));
      } else {
        setMonthlyGoals(prev => ({
          ...prev,
          [month]: (prev[month] || []).filter(g => g.id !== id)
        }));

        setYearlyGoals(prev => prev.filter(g => g.id !== id));
      }
    }
  };

  const addNote = () => {
    if (!noteText.trim() || !selectedBulletId) return;

    setDailyBullets(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(date => {
        updated[date] = updated[date].map(b =>
          b.id === selectedBulletId ? { ...b, notes: [...b.notes, noteText] } : b
        );
      });
      return updated;
    });

    setNoteText('');
    setIsAddingNote(false);
  };

  const handleStartEditNote = (bulletId: string, noteIndex: number, current: string) => {
    setEditingNote({ bulletId, noteIndex });
    setEditingNoteText(current);
  };

  const handleSaveEditNote = () => {
    if (!editingNote) return;
    const nextText = editingNoteText.trim();
    if (!nextText) {
      setEditingNote(null);
      setEditingNoteText('');
      return;
    }

    setDailyBullets(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(date => {
        updated[date] = updated[date].map(b => {
          if (b.id !== editingNote.bulletId) return b;
          const nextNotes = [...b.notes];
          if (editingNote.noteIndex >= 0 && editingNote.noteIndex < nextNotes.length) {
            nextNotes[editingNote.noteIndex] = nextText;
          }
          return { ...b, notes: nextNotes };
        });
      });
      return updated;
    });

    setEditingNote(null);
    setEditingNoteText('');
  };

  const addDailyBullet = (date: string, type: BulletType, text: string) => {
    if (!date || !text.trim()) return;

    const newBullet: Bullet = {
      id: Date.now().toString(),
      type,
      text: text.trim(),
      status: 'active',
      important: false,
      notes: [],
      date
    };

    setDailyBullets(prev => ({
      ...prev,
      [date]: [...(prev[date] || []), newBullet]
    }));

    setDailyDraftByDate(prev => ({ ...prev, [date]: '' }));
  };

  const addYearlyGoal = (category: 'tasks' | 'interested') => {
    if (!newItemText.trim()) return;

    setYearlyGoals(prev => [...prev, {
      id: Date.now().toString(),
      text: newItemText,
      completed: false,
      category
    }]);

    setNewItemText('');
  };

  const addYearlyEvent = () => {
    if (!newItemText.trim()) return;

    setYearlyEvents(prev => [...prev, {
      id: Date.now().toString(),
      text: newItemText
    }]);

    setNewItemText('');
  };

  const addMonthlyGoal = (month: number, category: 'tasks' | 'interested') => {
    if (!newItemText.trim()) return;

    setMonthlyGoals(prev => ({
      ...prev,
      [month]: [...(prev[month] || []), {
        id: Date.now().toString(),
        text: newItemText,
        completed: false,
        category
      }]
    }));

    setNewItemText('');
  };

  const addMonthlyEvent = (month: number) => {
    if (!newItemText.trim()) return;

    const newEvent = {
      id: Date.now().toString(),
      text: newItemText
    };

    setMonthlyEvents(prev => ({
      ...prev,
      [month]: [...(prev[month] || []), newEvent]
    }));

    setYearlyEvents(prev => [...prev, { ...newEvent, month }]);

    setNewItemText('');
  };

  const createLongProjectFromSelected = (id: string) => {
    const found = findBulletById(id);
    if (!found) return;

    const existing = longProjects.find(p => p.sourceBulletId === id);
    if (existing) {
      setSelectedProjectId(existing.id);
      const firstProjectPage = pages.find(p => p.type === 'longTaskProject' && p.projectId === existing.id);
      if (firstProjectPage) navigateToPage(firstProjectPage.id);
      return;
    }

    const projectId = `lp-${Date.now()}`;
    const project: LongProject = {
      id: projectId,
      title: found.bullet.text,
      createdDate: found.date,
      sourceBulletId: id,
    };
    setLongProjects(prev => [...prev, project]);
    setSelectedProjectId(projectId);

    setDailyBullets(prev => {
      const updated = { ...prev };
      updated[found.date] = updated[found.date].map(b =>
        b.id === id ? { ...b, parentProjectId: projectId } : b
      );
      return updated;
    });
  };

  const addSubtaskToProject = (projectId: string) => {
    const text = newItemText.trim();
    if (!text) return;
    setLongProjectSubtasks(prev => [...prev, {
      id: `ls-${Date.now()}`,
      projectId,
      text,
      completed: false,
    }]);
    setNewItemText('');
  };

  const attachSelectedBulletToProject = (projectId: string) => {
    if (!selectedBulletId) return;
    const found = findBulletById(selectedBulletId);
    if (!found) return;

    setDailyBullets(prev => {
      const updated = { ...prev };
      updated[found.date] = updated[found.date].map(b =>
        b.id === selectedBulletId ? { ...b, parentProjectId: projectId } : b
      );
      return updated;
    });

    const exists = longProjectSubtasks.some(s => s.anchorBulletId === selectedBulletId && s.projectId === projectId);
    if (!exists) {
      setLongProjectSubtasks(prev => [...prev, {
        id: `ls-${Date.now()}`,
        projectId,
        text: found.bullet.text,
        completed: found.bullet.status === 'completed',
        anchorBulletId: selectedBulletId,
        plannedDate: found.date,
      }]);
    }
  };

  const toggleProjectSubtask = (subtaskId: string) => {
    setLongProjectSubtasks(prev => prev.map(s =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    ));
  };

  const jumpToDailyDate = (dateStr: string) => {
    const page = pages.find(p => p.type === 'daily' && p.dates?.includes(dateStr));
    if (page) navigateToPage(page.id);
  };

  const exportYear = () => {
    const data = {
      year: currentYear,
      yearlyGoals,
      yearlyEvents,
      monthlyGoals,
      monthlyEvents,
      dailyBullets,
      longProjects,
      longProjectSubtasks,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bullet-journal-${currentYear}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const navigateToPage = (pageNum: number) => {
    if (pageNum < 1 || pageNum > pages.length) return;

    // Determine flip direction
    setFlipDirection(pageNum > currentPageNumber ? 'next' : 'prev');
    setIsFlipping(true);

    setTimeout(() => {
      setCurrentPageNumber(pageNum % 2 === 0 ? pageNum - 1 : pageNum);
      setIsFlipping(false);
    }, 600);
  };

  const getBulletIcon = (type: BulletType, status: BulletStatus) => {
    if (type === 'task') {
      if (status === 'completed') return '✕';
      if (status === 'cancelled') return '—';
      if (status === 'deferred') return '>';
      if (status === 'scheduled') return '<';
      return '•';
    }
    if (type === 'event') return '○';
    return '−';
  };

  const currentPage = pages[currentPageNumber - 1];
  const nextPage = pages[currentPageNumber];

  const renderBulletItem = (bullet: Bullet, showDate?: boolean) => {
    const isSelected = selectedBulletId === bullet.id;
    const isEditing = editingBulletId === bullet.id;

    if (isEditing) {
      return (
        <div key={bullet.id} className="mb-2 p-2 bg-amber-50 border-2 border-amber-200 rounded">
          <Input
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit();
              if (e.key === 'Escape') { setEditingBulletId(null); setEditText(''); }
            }}
            autoFocus
            className="w-full"
          />
          <div className="flex gap-2 mt-2">
            <Button onClick={handleSaveEdit} size="sm">Save</Button>
            <Button onClick={() => { setEditingBulletId(null); setEditText(''); }} size="sm" variant="outline">
              Cancel
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div key={bullet.id} className="mb-2">
        <div
          className={`flex items-start gap-3 group cursor-pointer p-2 rounded transition-colors ${
            isSelected ? 'bg-amber-100' : 'hover:bg-gray-50'
          }`}
          onClick={() => setSelectedBulletId(bullet.id)}
          draggable={bullet.status === 'deferred'}
          onDragStart={() => bullet.date && handleDragStart(bullet, bullet.date)}
        >
          {bullet.important && <span className="text-amber-600 font-bold text-lg">*</span>}
          <span className="font-mono text-lg select-none mt-0.5">
            {getBulletIcon(bullet.type, bullet.status)}
          </span>
          <span className={`flex-1 ${bullet.status === 'cancelled' ? 'line-through text-gray-400' : ''} ${bullet.status === 'completed' ? 'text-gray-600' : ''}`}>
            {bullet.text}
            {bullet.parentProjectId && (
              <span className="ml-2 text-xs text-purple-600">
                [project]
              </span>
            )}
            {showDate && bullet.date && (
              <span className="ml-2 text-xs text-gray-500">
                ({format(new Date(bullet.date), 'MMM d')})
              </span>
            )}
            {bullet.scheduledDate && (
              <span className="ml-2 text-xs text-blue-600">
                → {format(new Date(bullet.scheduledDate), 'MMM d')}
                {bullet.scheduledTime && ` ${bullet.scheduledTime}`}
              </span>
            )}
          </span>
          {isSelected && (
            <span className="text-xs text-gray-500 whitespace-nowrap">
              ⇧C ⇧X ⇧R ⇧D ⇧S ⇧A ⇧P
            </span>
          )}
        </div>
        {bullet.notes.map((note, idx) => {
          const isEditingThisNote =
            editingNote?.bulletId === bullet.id && editingNote.noteIndex === idx;
          if (isEditingThisNote) {
            return (
              <div key={idx} className="ml-12 mt-1 rounded border border-amber-200 bg-amber-50 p-2">
                <Input
                  value={editingNoteText}
                  onChange={(e) => setEditingNoteText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEditNote();
                    if (e.key === 'Escape') { setEditingNote(null); setEditingNoteText(''); }
                  }}
                  autoFocus
                  className="w-full"
                />
                <div className="mt-2 flex gap-2">
                  <Button size="sm" onClick={handleSaveEditNote}>Save</Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setEditingNote(null); setEditingNoteText(''); }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            );
          }

          return (
            <button
              key={idx}
              type="button"
              className="ml-12 flex items-start gap-2 rounded p-1 text-left text-sm text-gray-600 hover:bg-amber-50"
              onClick={() => handleStartEditNote(bullet.id, idx, note)}
              title="Click to rename note"
            >
              <span className="font-mono">−</span>
              <span>{note}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderPageContent = (page: Page | undefined) => {
    if (!page) return <div className="text-gray-400 text-center py-20">End of journal</div>;

    switch (page.type) {
      case 'index':
        return renderMainIndex();
      case 'key':
        return renderKey();
      case 'yearlyGoals-tasks':
        return renderYearlyGoals(page, 'tasks');
      case 'yearlyGoals-interested':
        return renderYearlyGoals(page, 'interested');
      case 'yearlyEvents':
        return renderYearlyEvents(page);
      case 'longTaskIndex':
        return renderLongTaskIndex();
      case 'longTaskProject':
        return renderLongTaskProject(page);
      case 'monthlyIndex':
        return renderMonthlyIndex(page);
      case 'monthlyGoals':
        return renderMonthlyGoals(page);
      case 'monthlyEvents':
        return renderMonthlyEvents(page);
      case 'daily':
        return renderDailyPage(page);
      default:
        return null;
    }
  };

  const renderMainIndex = () => {
    const yearlyGoalsTasksPage = pages.find(p => p.type === 'yearlyGoals-tasks');
    const yearlyGoalsInterestedPage = pages.find(p => p.type === 'yearlyGoals-interested');
    const yearlyEventsPage = pages.find(p => p.type === 'yearlyEvents');
    const longTaskIndexPage = pages.find(p => p.type === 'longTaskIndex');

    return (
      <>
        <div className="mb-8 pb-4 border-b-2 border-gray-800">
          <h1 className="font-serif text-5xl mb-2">Index</h1>
          <p className="text-xl text-gray-600">{currentYear}</p>
        </div>

        <div className="mb-6">
          <div className="space-y-2">
            <Button onClick={() => navigateToPage(todayPageNum)} className="w-full" size="lg">
              <CalendarIcon className="h-5 w-5 mr-2" />
              Go to Today
            </Button>
            <div className="flex gap-2">
              <Input
                type="date"
                value={jumpToDate}
                onChange={(e) => setJumpToDate(e.target.value)}
              />
              <Button variant="outline" onClick={() => jumpToDailyDate(jumpToDate)}>
                Jump to Date
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-6 text-lg">
          <div>
            <h3 className="font-serif text-2xl mb-4">Annual</h3>
            <div className="space-y-2 ml-4">
              <button
                onClick={() => navigateToPage(yearlyGoalsTasksPage?.id || 3)}
                className="block w-full text-left hover:bg-gray-100 p-2 rounded"
              >
                <span>Goals - Tasks</span>
                <span className="float-right text-gray-500">{yearlyGoalsTasksPage?.id || 3}</span>
              </button>
              <button
                onClick={() => navigateToPage(yearlyGoalsInterestedPage?.id || 4)}
                className="block w-full text-left hover:bg-gray-100 p-2 rounded"
              >
                <span>Goals - Interested</span>
                <span className="float-right text-gray-500">{yearlyGoalsInterestedPage?.id || 4}</span>
              </button>
              <button
                onClick={() => navigateToPage(yearlyEventsPage?.id || 5)}
                className="block w-full text-left hover:bg-gray-100 p-2 rounded"
              >
                <span>Events</span>
                <span className="float-right text-gray-500">{yearlyEventsPage?.id || 5}</span>
              </button>
              <button
                onClick={() => navigateToPage(longTaskIndexPage?.id || 6)}
                className="block w-full text-left hover:bg-gray-100 p-2 rounded"
              >
                <span>Long-running Projects</span>
                <span className="float-right text-gray-500">{longTaskIndexPage?.id || 6}</span>
              </button>
            </div>
          </div>

          <div>
            <h3 className="font-serif text-2xl mb-4">Monthly</h3>
            <div className="space-y-2 ml-4">
              {MONTHS.map((monthName, idx) => {
                const monthIndexPage = pages.find(p => p.type === 'monthlyIndex' && p.month === idx);

                return (
                  <button
                    key={idx}
                    onClick={() => navigateToPage(monthIndexPage?.id || 6)}
                    className="block w-full text-left hover:bg-gray-100 p-2 rounded"
                  >
                    <span>{monthName}</span>
                    <span className="float-right text-gray-500">{monthIndexPage?.id || '—'}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderKey = () => (
    <>
      <div className="mb-6 pb-4 border-b-2 border-gray-800">
        <h2 className="font-serif text-4xl">Key</h2>
      </div>

      <div className="space-y-6 text-lg">
        <div>
          <h3 className="font-semibold text-xl mb-3">Bullets</h3>
          <div className="space-y-2 ml-4">
            <div className="flex gap-3"><span className="font-mono text-xl">•</span> <span>Task</span></div>
            <div className="flex gap-3"><span className="font-mono text-xl">✕</span> <span>Task Complete</span></div>
            <div className="flex gap-3"><span className="font-mono text-xl">—</span> <span>Task Cancelled</span></div>
            <div className="flex gap-3"><span className="font-mono text-xl">{'>'}</span> <span>Task Deferred</span></div>
            <div className="flex gap-3"><span className="font-mono text-xl">{'<'}</span> <span>Task Scheduled</span></div>
            <div className="flex gap-3"><span className="font-mono text-xl">○</span> <span>Event</span></div>
            <div className="flex gap-3"><span className="font-mono text-xl">−</span> <span>Note</span></div>
            <div className="flex gap-3"><span className="font-mono text-xl text-amber-600">*</span> <span>Important</span></div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-xl mb-3">Keyboard Shortcuts</h3>
          <div className="space-y-2 ml-4">
            <div className="flex gap-3">
              <kbd className="px-3 py-1 bg-gray-200 rounded text-sm">Shift + C</kbd>
              <span>Complete</span>
            </div>
            <div className="flex gap-3">
              <kbd className="px-3 py-1 bg-gray-200 rounded text-sm">Shift + X</kbd>
              <span>Cancel</span>
            </div>
            <div className="flex gap-3">
              <kbd className="px-3 py-1 bg-gray-200 rounded text-sm">Delete</kbd>
              <span>Delete</span>
            </div>
            <div className="flex gap-3">
              <kbd className="px-3 py-1 bg-gray-200 rounded text-sm">Shift + Enter</kbd>
              <span>Add Note</span>
            </div>
            <div className="flex gap-3">
              <kbd className="px-3 py-1 bg-gray-200 rounded text-sm">Shift + D</kbd>
              <span>Defer</span>
            </div>
            <div className="flex gap-3">
              <kbd className="px-3 py-1 bg-gray-200 rounded text-sm">Shift + S</kbd>
              <span>Schedule</span>
            </div>
            <div className="flex gap-3">
              <kbd className="px-3 py-1 bg-gray-200 rounded text-sm">Shift + A</kbd>
              <span>Mark important — tasks/notes sync to monthly & yearly goals; events sync to monthly & yearly events</span>
            </div>
            <div className="flex gap-3">
              <kbd className="px-3 py-1 bg-gray-200 rounded text-sm">Shift + R</kbd>
              <span>Rename/Edit</span>
            </div>
            <div className="flex gap-3">
              <kbd className="px-3 py-1 bg-gray-200 rounded text-sm">Shift + P</kbd>
              <span>Create long-running project from selected daily bullet</span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-300">
          <Button onClick={exportYear} variant="outline" size="lg" className="w-full">
            <Download className="h-5 w-5 mr-2" />
            Export {currentYear}
          </Button>
        </div>
      </div>
    </>
  );

  const renderLongTaskIndex = () => {
    return (
      <>
        <div className="mb-6 pb-4 border-b-2 border-gray-800 flex items-center justify-between">
          <h2 className="font-serif text-4xl">Annual Long-running Projects</h2>
          <Button variant="ghost" size="sm" onClick={() => navigateToPage(1)}>
            <BookOpen className="h-4 w-4 mr-2" />
            Index
          </Button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Shift + P on a selected daily bullet to create a project page block.
        </p>

        <div className="space-y-2 mb-6">
          {longProjects.length === 0 && (
            <p className="text-gray-400">No long-running projects yet.</p>
          )}
          {longProjects.map((project) => {
            const firstProjectPage = pages.find(
              p => p.type === 'longTaskProject' && p.projectId === project.id
            );
            const done = longProjectSubtasks.filter(s => s.projectId === project.id && s.completed).length;
            const total = longProjectSubtasks.filter(s => s.projectId === project.id).length;
            return (
              <button
                key={project.id}
                onClick={() => {
                  setSelectedProjectId(project.id);
                  if (firstProjectPage) navigateToPage(firstProjectPage.id);
                }}
                className={`block w-full text-left p-2 rounded ${
                  selectedProjectId === project.id ? 'bg-amber-100' : 'hover:bg-gray-100'
                }`}
              >
                <span>{project.title}</span>
                <span className="float-right text-gray-500">
                  {firstProjectPage?.id} · {done}/{total}
                </span>
              </button>
            );
          })}
        </div>
      </>
    );
  };

  const renderLongTaskProject = (page: Page) => {
    const project = longProjects.find(p => p.id === page.projectId);
    if (!project) return <div className="text-gray-400">Project not found.</div>;

    const projectPages = pages.filter(p => p.type === 'longTaskProject' && p.projectId === project.id);
    const pageIndex = Math.max(0, projectPages.findIndex(p => p.id === page.id));
    const allSubtasks = longProjectSubtasks.filter(s => s.projectId === project.id);
    const visibleSubtasks = allSubtasks.slice(
      pageIndex * ITEMS_PER_PAGE,
      (pageIndex + 1) * ITEMS_PER_PAGE
    );
    const completedCount = allSubtasks.filter(s => s.completed).length;
    const progress = allSubtasks.length === 0 ? 0 : Math.round((completedCount / allSubtasks.length) * 100);
    const longIndexPage = pages.find(p => p.type === 'longTaskIndex');

    return (
      <>
        <div className="mb-6 pb-4 border-b-2 border-gray-800 flex items-center justify-between">
          <h2 className="font-serif text-4xl">{project.title}</h2>
          <div className="flex gap-2">
            {longIndexPage && (
              <Button variant="ghost" size="sm" onClick={() => navigateToPage(longIndexPage.id)}>
                <BookOpen className="h-4 w-4 mr-2" />
                Projects
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => navigateToPage(1)}>
              <BookOpen className="h-4 w-4 mr-2" />
              Index
            </Button>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Created {project.createdDate} · Progress {completedCount}/{allSubtasks.length} ({progress}%)
        </p>

        <div className="space-y-2 mb-4">
          {visibleSubtasks.map(subtask => (
            <div
              key={subtask.id}
              className={`flex items-start gap-3 p-2 rounded ${subtask.completed ? 'bg-green-50' : 'hover:bg-gray-50'}`}
            >
              <button
                onClick={() => toggleProjectSubtask(subtask.id)}
                className="font-mono text-lg mt-0.5"
              >
                {subtask.completed ? '✕' : '○'}
              </button>
              <span className={`flex-1 ${subtask.completed ? 'line-through text-gray-500' : ''}`}>
                {subtask.text}
                {subtask.plannedDate && (
                  <button
                    className="ml-2 text-xs text-blue-600 hover:underline"
                    onClick={() => jumpToDailyDate(subtask.plannedDate!)}
                  >
                    ({subtask.plannedDate})
                  </button>
                )}
              </span>
            </div>
          ))}
          {visibleSubtasks.length === 0 && (
            <p className="text-gray-400">No subtasks on this page.</p>
          )}
        </div>

        <div className="space-y-2">
          <Input
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            placeholder="Add subtask..."
            onKeyDown={(e) => e.key === 'Enter' && addSubtaskToProject(project.id)}
            className="bg-transparent border-b-2 border-gray-300 rounded-none"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => addSubtaskToProject(project.id)}>
              Add subtask
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => attachSelectedBulletToProject(project.id)}
            >
              Link selected daily bullet
            </Button>
          </div>
        </div>
      </>
    );
  };

  const renderMonthlyIndex = (page: Page) => {
    const month = page.month!;
    const goalsPage = pages.find(p => p.type === 'monthlyGoals' && p.month === month);
    const eventsPage = pages.find(p => p.type === 'monthlyEvents' && p.month === month);

    return (
      <>
        <div className="mb-6 pb-4 border-b-2 border-gray-800 flex items-center justify-between">
          <h2 className="font-serif text-4xl">{page.title}</h2>
          <Button variant="ghost" size="sm" onClick={() => navigateToPage(1)}>
            <BookOpen className="h-4 w-4 mr-2" />
            Index
          </Button>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => navigateToPage(goalsPage?.id || 1)}
            className="block w-full text-left hover:bg-gray-100 p-2 rounded text-lg"
          >
            <span>Goals</span>
            <span className="float-right text-gray-500">{goalsPage?.id}</span>
          </button>
          <button
            onClick={() => navigateToPage(eventsPage?.id || 1)}
            className="block w-full text-left hover:bg-gray-100 p-2 rounded text-lg"
          >
            <span>Events</span>
            <span className="float-right text-gray-500">{eventsPage?.id}</span>
          </button>

          <div className="pt-4 border-t border-gray-300">
            <h3 className="font-serif text-xl mb-3">Daily Pages</h3>
            <div className="space-y-1">
              {page.dailyPageRefs?.map((ref, idx) => (
                <button
                  key={idx}
                  onClick={() => navigateToPage(ref.pageNum)}
                  className="block w-full text-left hover:bg-gray-100 p-1 rounded text-sm"
                >
                  <span>{ref.title}</span>
                  <span className="float-right text-gray-500">{ref.pageNum}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderYearlyGoals = (page: Page, category: 'tasks' | 'interested') => {
    const goals = yearlyGoals.filter(g => g.category === category);
    const pagesForType = pages.filter(p => p.type === page.type);
    const pageIndex = Math.max(0, pagesForType.findIndex(p => p.id === page.id));
    const visibleGoals = goals.slice(pageIndex * ITEMS_PER_PAGE, (pageIndex + 1) * ITEMS_PER_PAGE);
    const title = category === 'tasks' ? 'Annual Goals - Tasks' : 'Annual Goals - Interested';

    return (
      <>
        <div className="mb-6 pb-4 border-b-2 border-gray-800 flex items-center justify-between">
          <h2 className="font-serif text-4xl">{title}</h2>
          <Button variant="ghost" size="sm" onClick={() => navigateToPage(1)}>
            <BookOpen className="h-4 w-4 mr-2" />
            Index
          </Button>
        </div>

        <div className="space-y-2 mb-6">
          {visibleGoals.map(goal => (
            <div
              key={goal.id}
              className={`flex items-start gap-3 group cursor-pointer p-2 rounded ${
                selectedBulletId === goal.id ? 'bg-amber-100' : 'hover:bg-gray-50'
              }`}
              onClick={() => setSelectedBulletId(goal.id)}
            >
              <span className="font-mono text-lg select-none mt-0.5">
                {goal.completed ? '✕' : '○'}
              </span>
              <span className={`flex-1 text-lg ${goal.completed ? 'line-through text-gray-400' : ''}`}>
                {goal.text}
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Input
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            placeholder={`Add ${category === 'tasks' ? 'task' : 'interest'}...`}
            onKeyDown={(e) => e.key === 'Enter' && addYearlyGoal(category)}
            className="bg-transparent border-b-2 border-gray-300 rounded-none text-lg"
          />
        </div>
      </>
    );
  };

  const renderYearlyEvents = (page: Page) => {
    const pagesForType = pages.filter(p => p.type === 'yearlyEvents');
    const pageIndex = Math.max(0, pagesForType.findIndex(p => p.id === page.id));
    const visibleEvents = yearlyEvents.slice(pageIndex * ITEMS_PER_PAGE, (pageIndex + 1) * ITEMS_PER_PAGE);
    return (
    <>
      <div className="mb-6 pb-4 border-b-2 border-gray-800 flex items-center justify-between">
        <h2 className="font-serif text-4xl">Annual Events</h2>
        <Button variant="ghost" size="sm" onClick={() => navigateToPage(1)}>
          <BookOpen className="h-4 w-4 mr-2" />
          Index
        </Button>
      </div>

      <div className="space-y-2 mb-6">
        {visibleEvents.map(event => (
          <div
            key={event.id}
            className={`flex items-start gap-3 group cursor-pointer p-2 rounded ${
              selectedBulletId === event.id ? 'bg-amber-100' : 'hover:bg-gray-50'
            }`}
            onClick={() => setSelectedBulletId(event.id)}
          >
            <span className="font-mono text-lg select-none mt-0.5">○</span>
            <span className="flex-1 text-lg">
              {event.text}
              {event.month !== undefined && (
                <span className="ml-2 text-sm text-gray-500">({MONTHS[event.month]})</span>
              )}
            </span>
          </div>
        ))}
      </div>

      <Input
        value={newItemText}
        onChange={(e) => setNewItemText(e.target.value)}
        placeholder="Add yearly event..."
        onKeyDown={(e) => e.key === 'Enter' && addYearlyEvent()}
        className="bg-transparent border-b-2 border-gray-300 rounded-none text-lg"
      />
    </>
    );
  };

  const renderMonthlyGoals = (page: Page) => {
    const month = page.month!;
    const allGoals = monthlyGoals[month] || [];
    const monthGoalPages = pages.filter(p => p.type === 'monthlyGoals' && p.month === month);
    const pageIndex = Math.max(0, monthGoalPages.findIndex(p => p.id === page.id));
    const goals = allGoals.slice(pageIndex * ITEMS_PER_PAGE, (pageIndex + 1) * ITEMS_PER_PAGE);
    const tasksGoals = goals.filter(g => g.category === 'tasks');
    const interestedGoals = goals.filter(g => g.category === 'interested');

    return (
      <>
        <div className="mb-6 pb-4 border-b-2 border-gray-800 flex items-center justify-between">
          <h2 className="font-serif text-4xl">{MONTHS[month]} - Goals</h2>
          <Button variant="ghost" size="sm" onClick={() => navigateToPage(1)}>
            <BookOpen className="h-4 w-4 mr-2" />
            Index
          </Button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="font-serif text-2xl mb-3">Tasks</h3>
            <div className="space-y-2 mb-4">
              {tasksGoals.map(goal => (
                <div
                  key={goal.id}
                  className={`flex items-start gap-3 group cursor-pointer p-2 rounded ${
                    selectedBulletId === goal.id ? 'bg-amber-100' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedBulletId(goal.id)}
                >
                  <span className="font-mono text-lg select-none mt-0.5">
                    {goal.completed ? '✕' : '○'}
                  </span>
                  <span className={`flex-1 ${goal.completed ? 'line-through text-gray-400' : ''}`}>
                    {goal.text}
                  </span>
                </div>
              ))}
            </div>
            <Input
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder="Add task goal..."
              onKeyDown={(e) => e.key === 'Enter' && addMonthlyGoal(month, 'tasks')}
              className="bg-transparent border-b border-gray-300 rounded-none"
            />
          </div>

          <div>
            <h3 className="font-serif text-2xl mb-3">Interested</h3>
            <div className="space-y-2 mb-4">
              {interestedGoals.map(goal => (
                <div
                  key={goal.id}
                  className={`flex items-start gap-3 group cursor-pointer p-2 rounded ${
                    selectedBulletId === goal.id ? 'bg-amber-100' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedBulletId(goal.id)}
                >
                  <span className="font-mono text-lg select-none mt-0.5">
                    {goal.completed ? '✕' : '○'}
                  </span>
                  <span className={`flex-1 ${goal.completed ? 'line-through text-gray-400' : ''}`}>
                    {goal.text}
                  </span>
                </div>
              ))}
            </div>
            <Input
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder="Add interest goal..."
              onKeyDown={(e) => e.key === 'Enter' && addMonthlyGoal(month, 'interested')}
              className="bg-transparent border-b border-gray-300 rounded-none"
            />
          </div>
        </div>
      </>
    );
  };

  const renderMonthlyEvents = (page: Page) => {
    const month = page.month!;
    const allEvents = monthlyEvents[month] || [];
    const monthEventPages = pages.filter(p => p.type === 'monthlyEvents' && p.month === month);
    const pageIndex = Math.max(0, monthEventPages.findIndex(p => p.id === page.id));
    const events = allEvents.slice(pageIndex * ITEMS_PER_PAGE, (pageIndex + 1) * ITEMS_PER_PAGE);

    return (
      <>
        <div className="mb-6 pb-4 border-b-2 border-gray-800 flex items-center justify-between">
          <h2 className="font-serif text-4xl">{MONTHS[month]} - Events</h2>
          <Button variant="ghost" size="sm" onClick={() => navigateToPage(1)}>
            <BookOpen className="h-4 w-4 mr-2" />
            Index
          </Button>
        </div>

        <div className="space-y-2 mb-6">
          {events.map(event => (
            <div
              key={event.id}
              className={`flex items-start gap-3 group cursor-pointer p-2 rounded ${
                selectedBulletId === event.id ? 'bg-amber-100' : 'hover:bg-gray-50'
              }`}
              onClick={() => setSelectedBulletId(event.id)}
            >
              <span className="font-mono text-lg select-none mt-0.5">○</span>
              <span className="flex-1">{event.text}</span>
            </div>
          ))}
        </div>

        <Input
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          placeholder="Add monthly event (auto-adds to yearly)..."
          onKeyDown={(e) => e.key === 'Enter' && addMonthlyEvent(month)}
          className="bg-transparent border-b-2 border-gray-300 rounded-none"
        />
      </>
    );
  };

  const renderDailyPage = (page: Page) => {
    const dates = page.dates || [];
    const primaryDate = dates[0] || '';
    const dailyDraft = primaryDate ? (dailyDraftByDate[primaryDate] || '') : '';
    const allBullets = dates.flatMap(date =>
      (dailyBullets[date] || []).map(b => ({ ...b, date }))
    );
    const sameDatePages = pages.filter(
      p => p.type === 'daily' && JSON.stringify(p.dates || []) === JSON.stringify(dates)
    );
    const dailyPageIndex = Math.max(0, sameDatePages.findIndex(p => p.id === page.id));
    const visibleBullets = allBullets.slice(
      dailyPageIndex * ITEMS_PER_PAGE,
      (dailyPageIndex + 1) * ITEMS_PER_PAGE
    );
    const selectedBulletOnThisPage =
      !!selectedBulletId && dates.some(date => (dailyBullets[date] || []).some(b => b.id === selectedBulletId));

    // Find month index page
    const month = page.month;
    const monthIndexPage = month !== undefined ? pages.find(p => p.type === 'monthlyIndex' && p.month === month) : null;

    return (
      <>
        <div className="mb-6 pb-4 border-b-2 border-gray-800 flex items-center justify-between">
          <h2 className="font-serif text-4xl">{page.title}</h2>
          <div className="flex gap-2">
            {monthIndexPage && (
              <Button variant="ghost" size="sm" onClick={() => navigateToPage(monthIndexPage.id)}>
                <BookOpen className="h-4 w-4 mr-2" />
                {MONTHS[month!]}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => navigateToPage(1)}>
              <BookOpen className="h-4 w-4 mr-2" />
              Index
            </Button>
          </div>
        </div>

        <div
          className="space-y-1 mb-6"
          onDragOver={handleDragOver}
          onDrop={() => dates[0] && handleDrop(dates[0])}
        >
          {visibleBullets.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No entries yet</p>
          ) : (
            visibleBullets.map(bullet => renderBulletItem(bullet, dates.length > 1))
          )}
          {draggedBullet && dates[0] >= today && (
            <div className="p-4 border-2 border-dashed border-amber-400 rounded bg-amber-50 text-center text-sm text-gray-600">
              Drop deferred task here
            </div>
          )}
        </div>

        {isAddingNote && selectedBulletId && selectedBulletOnThisPage ? (
          <div className="space-y-2 p-3 bg-amber-50 border-2 border-amber-200 rounded">
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note..."
              className="bg-white"
              autoFocus
            />
            <div className="flex gap-2">
              <Button onClick={addNote} size="sm">Add Note</Button>
              <Button onClick={() => { setIsAddingNote(false); setNoteText(''); }} size="sm" variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        ) : dates.includes(today) || dates.some(d => d > today) ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={dailyDraft}
                onChange={(e) => primaryDate && setDailyDraftByDate(prev => ({ ...prev, [primaryDate]: e.target.value }))}
                placeholder="Add entry..."
                className="bg-transparent border-b-2 border-gray-300 rounded-none"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => addDailyBullet(primaryDate, 'task', dailyDraft)} size="sm" variant="outline">
                • Task
              </Button>
              <Button onClick={() => addDailyBullet(primaryDate, 'event', dailyDraft)} size="sm" variant="outline">
                ○ Event
              </Button>
              <Button onClick={() => addDailyBullet(primaryDate, 'note', dailyDraft)} size="sm" variant="outline">
                − Note
              </Button>
            </div>
          </div>
        ) : null}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 to-orange-100 p-8 flex items-center justify-center relative">
      <div className="relative w-full max-w-[1800px]">
        <div className={`relative bg-gradient-to-r from-amber-900 to-amber-800 rounded-3xl shadow-2xl p-16 transition-all duration-600 ${
          isFlipping ? (flipDirection === 'next' ? 'flip-next' : 'flip-prev') : ''
        }`}>
          <div className="grid grid-cols-2 gap-0 relative">
            {/* Left Page */}
            <div className="relative bg-amber-50 p-16 min-h-[900px] border-r-2 border-amber-200 dotted-bg">
              <div className="relative z-10">
                {renderPageContent(currentPage)}
              </div>
              <div className="absolute bottom-12 right-12 text-base text-gray-500 font-serif">
                {currentPage?.id || '—'}
              </div>
            </div>

            {/* Right Page */}
            <div className="relative bg-amber-50 p-16 min-h-[900px] dotted-bg">
              <div className="relative z-10">
                {renderPageContent(nextPage)}
              </div>
              <div className="absolute bottom-12 right-12 text-base text-gray-500 font-serif">
                {nextPage?.id || '—'}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="absolute top-1/2 -translate-y-1/2 left-4 right-4 z-40 flex justify-between pointer-events-none">
            <Button
              onClick={() => navigateToPage(Math.max(1, currentPageNumber - 2))}
              disabled={currentPageNumber <= 1}
              size="lg"
              variant="ghost"
              className="pointer-events-auto bg-amber-900/90 text-white hover:bg-amber-800 disabled:opacity-20 rounded-full h-14 w-14"
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            <Button
              onClick={() => navigateToPage(currentPageNumber + 2)}
              disabled={!pages[currentPageNumber + 1]}
              size="lg"
              variant="ghost"
              className="pointer-events-auto bg-amber-900/90 text-white hover:bg-amber-800 disabled:opacity-20 rounded-full h-14 w-14"
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </div>
        </div>

        {/* Bookmark Ribbons */}
        <div className="absolute top-0 right-8 h-full flex items-start pt-8 gap-2 pointer-events-none z-30">
          {/* Deferred Bookmark */}
          <div className="relative pointer-events-auto">
            <button
              onClick={() => setShowBookmarks(showBookmarks === 'deferred' ? false : 'deferred')}
              className="bg-orange-600 text-white px-4 py-6 rounded-b-lg shadow-lg hover:bg-orange-700 transition-colors flex flex-col items-center gap-2"
            >
              <Bookmark className="h-6 w-6" />
              <span className="text-xs font-bold">D</span>
              <span className="text-xs">{deferredBullets.length}</span>
            </button>

            {showBookmarks === 'deferred' && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border-2 border-orange-300 p-4 max-h-96 overflow-y-auto z-50">
                <h3 className="font-serif text-xl mb-3">Deferred Tasks</h3>
                <p className="text-xs text-gray-500 mb-3">Drag to future dates</p>

                <div className="space-y-1">
                  {deferredBullets.length === 0 ? (
                    <p className="text-gray-400 text-sm">No deferred tasks</p>
                  ) : (
                    deferredBullets.map(bullet => (
                      <div
                        key={bullet.id}
                        className="text-sm p-2 hover:bg-gray-50 rounded cursor-move border border-gray-200"
                        draggable
                        onDragStart={() => bullet.date && handleDragStart(bullet, bullet.date)}
                      >
                        <span className="font-mono mr-2">{'>'}</span>
                        {bullet.text}
                        {bullet.date && (
                          <span className="ml-2 text-xs text-gray-500">
                            from {format(new Date(bullet.date), 'MMM d')}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Scheduled Bookmark */}
          <div className="relative pointer-events-auto">
            <button
              onClick={() => setShowBookmarks(showBookmarks === 'scheduled' ? false : 'scheduled')}
              className="bg-blue-600 text-white px-4 py-6 rounded-b-lg shadow-lg hover:bg-blue-700 transition-colors flex flex-col items-center gap-2"
            >
              <Bookmark className="h-6 w-6" />
              <span className="text-xs font-bold">S</span>
              <span className="text-xs">{scheduledBullets.length}</span>
            </button>

            {showBookmarks === 'scheduled' && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border-2 border-blue-300 p-4 max-h-96 overflow-y-auto z-50">
                <h3 className="font-serif text-xl mb-3">Scheduled Tasks</h3>

                <div className="space-y-1">
                  {scheduledBullets.length === 0 ? (
                    <p className="text-gray-400 text-sm">No scheduled tasks</p>
                  ) : (
                    scheduledBullets.map(bullet => (
                      <div key={bullet.id} className="text-sm p-2 hover:bg-gray-50 rounded cursor-pointer border border-gray-200">
                        <span className="font-mono mr-2">{'<'}</span>
                        {bullet.text}
                        {bullet.scheduledDate && (
                          <span className="ml-2 text-xs text-blue-600 font-semibold">
                            → {format(new Date(bullet.scheduledDate), 'MMM d')}
                            {bullet.scheduledTime && ` ${bullet.scheduledTime}`}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent className="bg-amber-50 border-2 border-gray-800">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Schedule Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block mb-2 font-semibold">Date</label>
              <Calendar
                mode="single"
                selected={scheduleDate}
                onSelect={setScheduleDate}
                className="rounded-md border"
              />
            </div>
            <div>
              <label className="block mb-2 font-semibold">Time (optional)</label>
              <Input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleScheduleConfirm} className="flex-1">
                Schedule
              </Button>
              <Button
                onClick={() => {
                  setShowScheduleModal(false);
                  setScheduleDate(undefined);
                  setScheduleTime('');
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
        .dotted-bg {
          background-image: radial-gradient(circle, #d1d5db 2px, transparent 2px);
          background-size: 28px 28px;
        }

        @keyframes flipNext {
          0% {
            transform: perspective(2000px) rotateY(0deg);
          }
          50% {
            transform: perspective(2000px) rotateY(-15deg);
          }
          100% {
            transform: perspective(2000px) rotateY(0deg);
          }
        }

        @keyframes flipPrev {
          0% {
            transform: perspective(2000px) rotateY(0deg);
          }
          50% {
            transform: perspective(2000px) rotateY(15deg);
          }
          100% {
            transform: perspective(2000px) rotateY(0deg);
          }
        }

        .flip-next {
          animation: flipNext 0.6s ease-in-out;
        }

        .flip-prev {
          animation: flipPrev 0.6s ease-in-out;
        }
      `}</style>
    </div>
  );
}
