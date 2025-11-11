# Desktop Time Tracker Widget Setup Guide

## Overview

NexusPM now supports a desktop widget for time tracking that can be installed as a Progressive Web App (PWA). This allows you to track time without keeping the full browser open.

## Features

- **Compact Time Tracker Widget**: A minimal, focused interface for time tracking
- **Real-time Timer Display**: Shows elapsed time with live updates
- **Quick Start Tasks**: Fast access to your most recent tasks
- **Minimized Mode**: Collapse to a small floating widget
- **Standalone Window**: Install as a PWA for a native app-like experience

## Installation Instructions

### Option 1: Install as PWA (Recommended)

1. **Open the Time Tracker Widget**:
   - Navigate to: `https://your-app-url.com/time-tracker-widget`
   - Or use the shortcut from the main app

2. **Install the PWA**:
   - **Chrome/Edge**: Click the install icon in the address bar (or go to Menu → Install app)
   - **Firefox**: Menu → More Tools → Install Site as App
   - **Safari**: File → Add to Dock (on macOS)

3. **Launch the Widget**:
   - The app will open in a standalone window
   - You can resize it to your preferred size
   - It will appear in your applications list

### Option 2: Use as Browser Tab

1. Open `/time-tracker-widget` in a separate browser tab
2. Keep the tab open while working
3. The timer will continue running even if you switch tabs

## Using the Widget

### Starting a Timer

1. Click on any task in the "Quick Start" section
2. The timer will start immediately
3. The elapsed time will display in real-time

### Stopping a Timer

1. Click the "Stop Timer" button
2. The time entry will be automatically saved
3. You'll see a confirmation toast

### Minimized Mode

1. Click the "X" button in the top-right to minimize
2. The widget will collapse to a small floating window
3. Click the clock icon to expand again

### Viewing Full App

- Click "Open Full App →" at the bottom to open the main application in a new tab

## Tips

- **Keep it Small**: Resize the widget window to a compact size (e.g., 400x600px)
- **Always On Top**: Use your OS window management to keep it visible
- **Multiple Monitors**: Place the widget on a secondary monitor
- **Keyboard Shortcuts**: Use browser shortcuts (Ctrl/Cmd + T) to quickly access

## Troubleshooting

### Widget Not Installing

- Make sure you're using a modern browser (Chrome, Edge, Firefox, Safari)
- Check that HTTPS is enabled (required for PWA)
- Try clearing browser cache and retrying

### Timer Not Updating

- Refresh the widget page
- Check your internet connection
- Ensure you're logged in to the app

### Tasks Not Showing

- Make sure you have active tasks in the main app
- Refresh the widget to sync with the latest data

## Technical Details

- The widget uses the same authentication as the main app
- All time entries are synced in real-time
- The widget works offline (with limited functionality)
- Data is stored in Supabase and synced when online

