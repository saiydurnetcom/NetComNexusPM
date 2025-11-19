# PWA Widget Guide

## Overview

NexusPM is now a full Progressive Web App (PWA) with a resizable time tracker widget that can be opened in a popup window.

## Installing the App as PWA

### Desktop (Chrome/Edge)

1. Open the app in your browser
2. Look for the install icon in the address bar (or go to Menu → Install app)
3. Click "Install" to add it to your desktop
4. The app will open in a standalone window

### Mobile

- **iOS (Safari)**: Tap Share → Add to Home Screen
- **Android (Chrome)**: Tap Menu → Install app or Add to Home Screen

## Using the Time Tracker Widget

### Opening the Widget

1. Click "Time Tracker Widget" in the sidebar
2. The widget opens in a resizable popup window
3. The window is positioned in the top-right corner by default

### Widget Features

- **Resizable**: Drag the corners or edges to resize
- **Task Selection**: Search and select tasks to track
- **Real-time Timer**: See elapsed time update every second
- **Minimize**: Click the X button to minimize (if opened in popup)

### Keeping Widget on Top

Web browsers don't allow JavaScript to force windows to stay on top for security reasons. However, you can use these methods:

#### Windows

1. **PowerToys Always on Top** (Recommended)
   - Install Microsoft PowerToys
   - Press `Win + Ctrl + T` while the widget window is focused
   - The window will stay on top of all other windows

2. **Third-party Tools**
   - DeskPins: Free tool to pin any window on top
   - Always on Top: Simple utility for window management

#### macOS

1. **Afloat** (Third-party)
   - Install Afloat via Homebrew or download
   - Right-click window title bar → Keep Afloat

2. **Window Management Apps**
   - Rectangle: Window management with "Keep on Top" feature
   - Magnet: Similar window management tool

#### Linux

- **wmctrl**: Command-line tool
  ```bash
  wmctrl -r "TimeTrackerWidget" -b add,above
  ```
- **Devil's Pie**: Window matching tool
- **Compiz**: Window manager with "Always on Top" plugin

### Browser Limitations

- Popup windows can be blocked by browser settings
- Some browsers may restrict window positioning
- Always-on-top requires OS-level tools (not available in web APIs)

## Widget Window Settings

The widget opens with these settings:
- **Width**: 420px
- **Height**: 600px
- **Position**: Top-right corner
- **Resizable**: Yes
- **Scrollbars**: No
- **Toolbar/Menubar**: Hidden

You can resize and reposition the window as needed.

## Troubleshooting

### Widget Won't Open

- Check if popups are blocked in your browser
- Allow popups for your domain
- Try clicking the button again

### Widget Opens in New Tab Instead of Popup

- Browser may be blocking popup windows
- Check browser settings for popup permissions
- Some browsers require user interaction to open popups

### Can't Keep Widget on Top

- Use OS-level tools (see "Keeping Widget on Top" section)
- Web browsers cannot force windows to stay on top
- Consider using the widget in a separate browser window and using OS tools

## Tips

1. **Multiple Monitors**: Open the widget on a secondary monitor
2. **Window Size**: Resize to your preferred dimensions
3. **Position**: Drag the window to your preferred location
4. **Keyboard Shortcuts**: Use OS shortcuts to manage windows
5. **PWA Mode**: Install the app as PWA for better window management

## Technical Details

- Widget opens using `window.open()` with specific dimensions
- Window features: `resizable=yes,scrollbars=no,toolbar=no`
- Position calculated based on screen size
- Widget is a separate React route (`/time-tracker-widget`)
- All data syncs in real-time with the main app

