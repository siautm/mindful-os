# Mindful OS - Personal Planning Dashboard

A lightweight, all-in-one personal productivity and wellness dashboard for students and professionals. Built with React, TypeScript, and Tailwind CSS.

## 🌟 Overview

Mindful OS helps you manage your academic, personal, and wellness life in one place. It combines scheduling, task management, focus timers, finance tracking, health tracking, and more - all stored locally in your browser with no backend required.

## 📦 Installation & Setup

### Prerequisites
- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** or **pnpm** (comes with Node.js)
- A modern web browser (Chrome, Firefox, Safari, or Edge)

### Step 1: Download the Project
```bash
# If you have the project as a zip file, extract it
unzip mindful-os.zip
cd mindful-os

# Or if cloning from a repository
git clone <repository-url>
cd mindful-os
```

### Step 2: Install Dependencies
```bash
# Using npm
npm install

# OR using pnpm (faster)
pnpm install
```

This will install all required packages including:
- React, React Router, TypeScript
- Tailwind CSS v4
- Recharts (for charts)
- Motion (for animations)
- Lucide React (for icons)
- PapaParse (for CSV import/export)
- Sonner (for toast notifications)

### Step 3: Start Development Server
```bash
# Using npm
npm run dev

# OR using pnpm
pnpm dev
```

The app will start at **http://localhost:5173** (or another port if 5173 is busy)

### Step 4: Open in Browser
1. Open your browser
2. Navigate to `http://localhost:5173`
3. You should see the Mindful OS dashboard!

### Building for Production
```bash
# Create optimized production build
npm run build

# OR
pnpm build

# Preview production build locally
npm run preview
# OR
pnpm preview
```

The build output will be in the `/dist` folder.

### Deploying the App
Since Mindful OS is a static site with no backend:
1. Build the project: `npm run build`
2. Deploy the `/dist` folder to:
   - **Netlify**: Drag and drop the dist folder
   - **Vercel**: Connect your repository or upload dist folder
   - **GitHub Pages**: Push dist folder to gh-pages branch
   - **Any static hosting service**

## 🎯 Key Features

### 1. **Dashboard** 
The central hub showing:
- Task completion progress
- Today's focus time
- Current balance
- Today's scheduled classes
- Upcoming events (next 7 days)
- Motivational quotes (randomizable)
- Study tips for time management
- Smart task suggestions
- Quick action buttons

### 2. **Timetable** 📅
Manage your weekly course schedule with three views:
- **Grid View**: Traditional weekly timetable with time slots (8 AM - 6 PM)
  - Color-coded courses
  - Shows Monday-Friday
  - Visual layout like a school timetable
- **Full Schedule View**: Combined courses + tasks + events
  - Shows all activities for each day
  - Automatically includes tasks due that day
  - Displays events scheduled for that day
- **Courses Only View**: Simple list of courses by day
  - Edit and delete courses
  - View course details

**Features:**
- Add courses manually with form
- Import courses from CSV file
- Export timetable to CSV
- Fields: Course name, code, day, start time, end time, location, instructor

**CSV Format:**
```
courseName,courseCode,day,startTime,endTime,location,instructor
Introduction to Psychology,PSY101,Monday,09:00,10:30,Room 301,Dr. Smith
```

### 3. **Tasks** ✅
Smart task management with priority scoring:
- Create tasks with title, description, and due date
- **Auto-calculated priority score** based on:
  - Urgency (time until deadline)
  - Importance (user-set level 1-5)
  - Formula: `Priority = Importance × (1 + 1/daysUntilDue)`
- Mark tasks as complete
- View by: All, Active (incomplete), or Completed
- Delete tasks
- AI-style suggestions for which tasks to tackle next

### 4. **Focus Timer** ⏱️
Pomodoro-style timer with task integration:
- **Task Selection**: Link timer sessions to specific tasks
- **Preset Times**: 
  - 25 min (Pomodoro)
  - 45 min (Deep Work)
  - 5 min (Short Break)
  - 15 min (Long Break)
- **Custom Time**: Create and edit your own presets
- Timer controls: Start, Pause, Reset
- Session complete sound alert
- Tracks total focus time per day
- All sessions logged to localStorage

### 5. **Finance** 💰
Track income and expenses:
- Add transactions with:
  - Type (income/expense)
  - Amount
  - Category
  - Description
  - Date
- Auto-calculated summary:
  - Total income
  - Total expenses
  - Current balance
- Filter by: All, Income, or Expenses
- Import from CSV
- Export to CSV

**CSV Format:**
```
type,amount,category,description,date
expense,45.50,Food,Lunch,2024-03-01
income,1000,Salary,Monthly pay,2024-03-01
```

### 6. **Analytics** 📊
Visual data insights with time period filters:
- **Time Periods**: Daily, Weekly, Monthly, Yearly, Total
- **Charts**:
  - **Focus Time Chart**: Track study sessions over time (line chart)
  - **Task Completion Chart**: Completed vs incomplete tasks (pie chart)
  - **Expense Breakdown**: Spending by category (bar chart)
- Built with Recharts library
- Auto-aggregates data based on selected time period

### 7. **Events** 🎉
Record and track personal events:
- Add events with:
  - Title
  - Category (meeting, social, academic, personal, other)
  - Date
  - Start and end times
  - Location
  - Description
- View events in card layout
- Automatically appears in Timetable's "Full Schedule" view
- Delete events

### 8. **Ideas** 💡
Quick note-taking for thoughts and ideas:
- Add ideas with title and description
- Simple list view
- Delete ideas
- Great for brainstorming and capturing thoughts

### 9. **Check-In** ❤️
Daily mood and wellness tracking:
- **Mood Selection**: Track your emotional state (happy, good, neutral, stressed, tired)
- **Energy Level**: Rate your energy from 1-5
- **Daily Intention**: Set your focus for the day
- **Gratitude Journal**: Record what you're grateful for
- **Notes**: Add additional reflections
- **Streak Tracking**: Maintains your check-in streak count
- **History View**: Browse past check-ins
- **Dashboard Integration**: Quick check-in button on dashboard

### 10. **Wellness** 🌱
Comprehensive health and wellness tracking with 5 modules:

**Sleep Tracking 😴:**
- Log bed time and wake time
- Auto-calculates sleep duration
- Rate sleep quality (1-5 stars)
- Add notes about sleep
- View sleep history
- See average duration and quality stats

**Meditation Timer & Tracker 🧘:**
- Built-in meditation timer with presets (5, 10, 15 min)
- Play/Pause/Resume controls
- Beautiful animated timer display
- Auto-logs completed sessions
- Manual session logging
- Types: Mindfulness, Breathing, Guided, Body Scan, Other
- Track total meditation minutes and sessions

**Exercise Tracking 💪:**
- Log workouts with type (Cardio, Strength, Yoga, Sports, Walking, Other)
- Record duration and intensity (Light, Moderate, Intense)
- Optional calorie tracking
- Add workout notes
- View total exercise time, sessions, and calories burned

**Food & Calorie Tracking 🍎:**
- Log daily meals and snacks
- Record food name and calorie count
- Add meal notes
- Track total daily calories
- View food history

**Weight Tracking ⚖️:**
- Log body weight (kg)
- Track weight over time
- Add notes about measurements
- See latest weight in stats
- Monitor progress

**Wellness Dashboard:**
- Overview cards showing stats for all 5 wellness areas
- Color-coded tabs for easy navigation
- Comprehensive history for all entries

### 11. **Brain Break** 🎮
Interactive minigames for mental breaks:

**Memory Match Game:**
- Watch a sequence of colored blocks
- Repeat the sequence from memory
- Sequences get longer each round
- Tests memory and concentration
- Score: +10 points per level

**Reaction Speed Game:**
- Wait for the button to turn green
- Click as fast as possible
- Measures reaction time in milliseconds
- Don't click too early!
- Score based on speed

**Features:**
- High score tracking (saved locally)
- Clean, animated interface
- Perfect for 2-5 minute study breaks

## 🏗️ Technical Architecture

### Tech Stack
- **Frontend**: React 18 with TypeScript
- **Routing**: React Router v6 (Data mode)
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts
- **CSV**: PapaParse
- **Animations**: Motion (Framer Motion)
- **Icons**: Lucide React
- **Build**: Vite

### Project Structure
```
/src
  /app
    /components
      /ui              # Reusable UI components (Button, Card, Dialog, etc.)
      MainLayout.tsx   # Main app layout with sidebar
    /pages
      Dashboard.tsx    # Home dashboard
      Timetable.tsx    # Course schedule
      Tasks.tsx        # Task manager
      FocusTimer.tsx   # Pomodoro timer
      Finance.tsx      # Money tracker
      Analytics.tsx    # Data visualization
      Events.tsx       # Event calendar
      Ideas.tsx        # Note taking
      Minigame.tsx     # Brain break games
    /lib
      storage.ts       # LocalStorage management
    routes.tsx         # App routing config
    App.tsx           # Root component
  /styles
    theme.css         # Design tokens & theme
    fonts.css         # Font imports
    global.css        # Global styles
```

## 💾 Data Storage

All data is stored in **browser localStorage** - no backend required!

### Storage Keys:
- `mindful-tasks` - Task list
- `mindful-timetable` - Course schedule
- `mindful-finance` - Financial transactions
- `mindful-journal` - Journal entries (deprecated)
- `mindful-focus-sessions` - Focus timer history
- `mindful-events` - Event list
- `mindful-ideas` - Ideas/notes
- `mindful-focus-presets` - Custom timer presets
- `mindful-checkin` - Daily check-in entries
- `mindful_sleep` - Sleep tracking entries
- `mindful_meditation` - Meditation session logs
- `mindful_exercise` - Exercise activity logs
- `mindful_food` - Food and calorie entries
- `mindful_weight` - Weight tracking entries
- `minigame-highscore` - Game high score

### Data Models:

**Task:**
```typescript
{
  id: string;
  title: string;
  description: string;
  dueDate: string; // ISO date
  importance: number; // 1-5
  priority: number; // Auto-calculated
  completed: boolean;
}
```

**TimetableEntry:**
```typescript
{
  id: string;
  courseName: string;
  courseCode: string;
  day: string; // Monday-Sunday
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  location: string;
  instructor: string;
}
```

**FinanceEntry:**
```typescript
{
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
  date: string; // ISO date
}
```

**EventEntry:**
```typescript
{
  id: string;
  title: string;
  category: string;
  date: string; // ISO date
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  location: string;
  description: string;
}
```

**FocusSession:**
```typescript
{
  id: string;
  duration: number; // minutes
  date: string; // ISO date
  taskId?: string; // Optional linked task
}
```

## 🎨 Design System

### Color Palette (Emerald/Teal Theme)
- **Primary**: Emerald green (#059669)
- **Secondary**: Teal (#0d9488)
- **Accent**: Cyan (#06b6d4)
- **Background**: Soft green gradients
- **Success**: Green
- **Warning**: Amber/Orange
- **Error**: Red

### UI Components
All built with Tailwind CSS and shadcn/ui patterns:
- **Card**: Content containers with header/content sections
- **Button**: Primary, outline, ghost variants
- **Dialog**: Modal overlays for forms
- **Input**: Text, number, date, time, textarea
- **Select**: Dropdown menus
- **Tabs**: Multi-view navigation
- **Label**: Form field labels

### Animations
- Hover effects on cards and buttons
- Scale transformations
- Gradient transitions
- Pulse animations for emphasis
- Motion animations for games

## 📖 How to Use

### Getting Started
1. Open the app - you'll see the Dashboard
2. Navigate using the sidebar
3. All data saves automatically to your browser

### Creating Your First Course
1. Go to **Timetable**
2. Click **"Add Class"**
3. Fill in: Course name, code, day, times, location, instructor
4. Click **"Add Class"**
5. View in Grid, Full Schedule, or Courses Only view

### Creating Your First Task
1. Go to **Tasks**
2. Click **"Add Task"**
3. Fill in: Title, description, due date, importance (1-5)
4. Priority auto-calculates!
5. Mark complete when done

### Starting a Focus Session
1. Go to **Focus Timer**
2. Optionally select a task to work on
3. Choose a preset time or create custom
4. Click **"Start"**
5. Focus until the timer completes!

### Tracking Expenses
1. Go to **Finance**
2. Click **"Add Entry"**
3. Select type (income/expense)
4. Enter amount, category, description, date
5. View balance update automatically

### Viewing Analytics
1. Go to **Analytics**
2. Select time period (Daily/Weekly/Monthly/Yearly/Total)
3. View three charts:
   - Focus time trends
   - Task completion status
   - Expense breakdown by category

### Taking a Brain Break
1. Go to **Brain Break**
2. Choose Memory Match or Reaction Speed
3. Play for 2-5 minutes
4. Return refreshed to studying!

## 🔧 Customization

### Custom Timer Presets
- Go to Focus Timer
- Click "Custom Time"
- Set duration and name
- Click "Save as Preset"
- Edit or delete anytime

### Expense Categories
Default categories: Food, Transport, Entertainment, Study, Bills, Shopping, Other
- Add custom categories when creating entries
- Categories auto-appear in analytics

### Event Categories
Options: Meeting, Social, Academic, Personal, Other

## 💡 Tips & Best Practices

### Task Management
- Set importance based on impact, not urgency
- Let the priority formula guide your daily focus
- Review tasks weekly
- Break large tasks into smaller ones

### Time Management
- Use 25-minute Pomodoro sessions for most work
- Take 5-minute breaks between sessions
- Take 15-minute break after 4 Pomodoros
- Link tasks to timer sessions for tracking

### Study Tips (Built-in)
- Use active recall over passive reading
- Study in short, focused bursts
- Get 7-9 hours of sleep
- Stay hydrated
- Review with spaced repetition
- Teach others to reinforce learning

### Financial Tracking
- Log expenses daily
- Categorize consistently
- Review monthly spending patterns
- Set budget goals

## 🚀 Advanced Features

### CSV Import/Export
- Timetable and Finance support CSV
- Bulk import your data
- Export for backup or analysis in Excel/Google Sheets

### Combined Schedule View
- Automatically merges courses, tasks (by due date), and events
- Shows complete daily schedule
- Color-coded by type

### Smart Suggestions
- Dashboard shows AI-style task recommendations
- Based on priority scores and deadlines
- Updates automatically as tasks change

### Motivational System
- Random quotes refresh daily
- Study tips rotate on demand
- Progress visualization on dashboard

## 🔒 Privacy & Data

- **100% Local**: All data stays in your browser
- **No Backend**: No servers, no databases, no accounts
- **No Tracking**: No analytics, no cookies, no data collection
- **Portable**: Export your data anytime with CSV
- **Secure**: Only you can access your data

### Data Backup
To backup your data:
1. Export Timetable to CSV
2. Export Finance to CSV
3. Browser localStorage can be backed up manually via dev tools
4. Or use browser export/import features

### Clear Data
To reset the app:
1. Open browser DevTools (F12)
2. Go to Application > Local Storage
3. Delete keys starting with "mindful-"
4. Refresh page

## 🐛 Troubleshooting

**Timer doesn't make sound:**
- Check browser permissions for audio
- Ensure volume is not muted

**Data disappeared:**
- Check if localStorage was cleared
- Ensure you're using the same browser
- Private/Incognito mode doesn't persist data

**CSV import not working:**
- Check CSV format matches documentation
- Ensure headers match exactly
- Remove empty rows

**Charts not showing:**
- Ensure you have data for the selected time period
- Try different time period filters
- Check browser console for errors

## 🎓 Use Cases

**For Students:**
- Manage class schedules
- Track assignments by priority
- Log study sessions
- Monitor spending
- Plan events and activities

**For Professionals:**
- Track work tasks
- Manage meetings
- Log billable hours
- Track business expenses
- Capture ideas on the go

**For Personal Productivity:**
- Build focus habits
- Track goals
- Manage personal projects
- Budget finances
- Take productive breaks

## 🌱 Future Enhancement Ideas

While not currently implemented, here are ideas for expansion:
- Dark mode toggle
- Calendar view for events
- Recurring tasks and events
- Goal setting module
- Habit tracker
- Note-taking with rich text
- File attachments
- Data sync across devices
- Mobile app version
- Customizable themes

## 📝 Version Info

- **Version**: 1.0.0
- **Last Updated**: March 2026
- **Browser Support**: Modern browsers (Chrome, Firefox, Safari, Edge)
- **Mobile**: Responsive design works on tablets and phones

## 🙏 Credits

Built with:
- React & TypeScript
- Tailwind CSS
- Recharts
- Motion (Framer Motion)
- Lucide Icons
- PapaParse
- Vite

---

**Made with 🌱 for mindful productivity**

For questions or issues, refer to this documentation or check the browser console for error messages.