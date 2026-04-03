# Mindful OS - Quick Setup Guide

This guide will help you get Mindful OS running on your laptop in minutes!

## 📥 Step 0: Download/Export Project from Figma Make

### Option A: Download as ZIP (Recommended)
1. In Figma Make, look for the **"Export"** or **"Download"** button (usually top-right)
2. Click **"Download as ZIP"** or **"Export Project"**
3. Save the ZIP file to your laptop (e.g., Downloads folder)
4. Extract/Unzip the file:
   - **Windows**: Right-click → Extract All
   - **Mac**: Double-click the ZIP file
   - **Linux**: Right-click → Extract Here
5. You now have a folder called `mindful-os` or similar

### Option B: Copy Project Files Manually
If no export button is available:
1. Use Figma's file browser to view all project files
2. Download individual files or use any available export feature
3. Maintain the folder structure as shown in Project Structure section

### Option C: Via GitHub (If Available)
1. If the project is on GitHub, copy the repository URL
2. Open terminal/command prompt
3. Run: `git clone <repository-url>`
4. Navigate into folder: `cd mindful-os`

---

## ⚡ Quick Start (5 Minutes)

### 1. Install Node.js

- Go to https://nodejs.org/
- Download and install the **LTS version** (v18 or higher)
- This includes npm (Node Package Manager)

### 2. Get the Project

```bash
# Extract the project folder
cd /path/to/mindful-os

# Or if you have a zip file
unzip mindful-os.zip
cd mindful-os
```

### 3. Install Dependencies

```bash
npm install
```

Wait for installation to complete (may take 2-3 minutes)

### 4. Start the App

```bash
npm run dev
```

### 5. Open in Browser

- Open your browser (Chrome, Firefox, Safari, or Edge)
- Go to: **http://localhost:5173**
- You should see the Mindful OS dashboard! 🎉

## 🔧 Common Issues & Solutions

### Issue: "npm: command not found"

**Solution:** Node.js is not installed or not in PATH

- Reinstall Node.js from nodejs.org
- Restart your terminal/command prompt

### Issue: "Port 5173 already in use"

**Solution:** Another app is using that port

- The app will automatically try port 5174, 5175, etc.
- Or manually specify: `npm run dev -- --port 3000`

### Issue: Dependencies fail to install

**Solution:**

```bash
# Clear npm cache
npm cache clean --force

# Try again
npm install
```

### Issue: White screen in browser

**Solution:**

- Check browser console for errors (F12)
- Clear browser cache
- Try a different browser
- Ensure Node.js version is 18+

## 📁 Project Structure

```
mindful-os/
├── src/                    # Source code
│   ├── app/               # Main app files
│   │   ├── pages/        # All pages (Dashboard, Tasks, etc.)
│   │   ├── components/   # Reusable UI components
│   │   └── lib/          # Storage & utilities
│   └── styles/           # CSS files
├── public/               # Static assets
├── package.json          # Dependencies list
└── README.md            # Full documentation
```

## 🚀 What's Next?

After setup, you can:

1. **Explore the Dashboard**
   - Click around to familiarize yourself
   - All data saves automatically

2. **Add Your First Task**
   - Go to Tasks → Add Task
   - Set importance and due date

3. **Create Your Timetable**
   - Go to Timetable → Add Class
   - Try the Grid View!

4. **Track Your Wellness**
   - Go to Check-In → Complete daily check-in
   - Go to Wellness → Log sleep, meditation, exercise

5. **Read the Full Documentation**
   - Check README.md for complete features
   - Learn about all 11 modules

## 💻 Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Check for errors
npm run type-check
```

## 🌐 Deploying Your App

Want to host Mindful OS online?

### Option 1: Netlify (Easiest)

1. Build: `npm run build`
2. Go to https://app.netlify.com/drop
3. Drag the `dist` folder
4. Done! You get a free URL

### Option 2: Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow prompts
4. Get your URL

### Option 3: GitHub Pages

1. Build: `npm run build`
2. Push `dist` folder to `gh-pages` branch
3. Enable GitHub Pages in repo settings

## 📦 Backing Up Your Data

Since all data is stored locally:

### Manual Backup

1. Open browser DevTools (F12)
2. Go to: Application → Local Storage
3. Copy all keys starting with "mindful-"
4. Save to a text file

### CSV Export (Partial)

- Timetable: Click "Export CSV"
- Finance: Click "Export CSV"
- Save these files regularly

## 🔄 Updating the App

If you receive an updated version:

```bash
# Pull new changes (if using git)
git pull

# Reinstall dependencies (if package.json changed)
npm install

# Restart dev server
npm run dev
```

Your localStorage data will persist!

## 💡 Tips for First-Time Users

1. **Start Small**
   - Add 2-3 tasks to get familiar
   - Add today's schedule to Timetable
   - Complete a Check-In

2. **Explore Gradually**
   - Try one module per day
   - Check the Dashboard each morning
   - Use Focus Timer for study sessions

3. **Build Habits**
   - Daily check-ins build streaks
   - Log expenses as they happen
   - Review Analytics weekly

4. **Customize**
   - Create custom Focus Timer presets
   - Set your preferred expense categories
   - Organize tasks by importance

## 🆘 Getting Help

1. **Check README.md** - Complete documentation
2. **Browser Console** - Press F12 to see error messages
3. **Try a Different Browser** - Sometimes helps with compatibility
4. **Clear Cache** - Fixes many UI issues

## 🎯 System Requirements

- **OS**: Windows, macOS, or Linux
- **Node.js**: v18 or higher
- **Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **RAM**: 2GB minimum
- **Storage**: 100MB for project files

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] Dashboard loads without errors
- [ ] Can navigate between pages via sidebar
- [ ] Can add a task
- [ ] Can add a timetable entry
- [ ] Can start Focus Timer
- [ ] Can add finance entry
- [ ] Can complete a Check-In
- [ ] Can log wellness activities
- [ ] Data persists after refresh

If all checked ✅, you're ready to use Mindful OS!

---

**Need More Help?** Check the full README.md for detailed documentation on every feature.

**Happy Planning! 🌱**