# 🐾 RUM - Bow-Bow Geofence Alarm App

**RUM** is a premium, real-time location-based geofence alarm and transit companion application built with **React Native** and **Expo (SDK 54)**. Designed for commuters, travelers, and adventurers, RUM ensures you never miss a stop on buses, trains, or road trips by playing customizable offline alarms as you approach your destination perimeter.

With customizable pet companions (dogs, cats, rabbits, birds, fish), background location tracking, multi-geofence management, a custom theme design system, and offline synthesized audio, RUM delivers a smooth and delightful travel experience.

---

## ✨ Key Features

### 📍 Multi-Geofence Management & CRUD
* **Simultaneous Active Zones**: Monitor multiple armed geofence zones simultaneously.
* **Interactive Radius Adjustment**: Adjust perimeter boundaries dynamically from 100 meters up to 5 kilometers using intuitive range sliders.
* **Persistent Storage**: Saved alarm zones, radii, and user preferences are safely stored locally using `@react-native-async-storage/async-storage`.
* **Map & List Integration**: Active geofences display translucent perimeter rings on the map. Easily toggle pause/active states, edit boundaries, or delete alarms from the Home dashboard.
* **Tap-to-Focus Map Jump**: Select any alarm from your saved list to immediately center and focus the map on its exact coordinates.

### 🔍 Auto-Suggestion Search & India Geocoding (Nominatim API)
* **Smart Geocoding Engine**: Real-time address lookups powered by OpenStreetMap's Nominatim engine.
* **India-Strict Filtering**: Restricts query results (`countrycodes=in`) with top priority given to South Indian states (Kerala, Tamil Nadu, Karnataka).
* **Fuzzy Spelling Correction**: Phonetic matching resolves minor spelling errors or typos automatically (e.g., searching `"trvndrm"` finds Trivandrum).
* **Preset Destination Shortcuts**: Quick-select popular travel hubs, train stations, and airports with a single tap.

### 🐶 Customizable Pet Companion ("Rum" & Friends)
* **5 Unique Companions**: Choose your traveling buddy — **Dog (Rum the Dachshund)**, **Cat**, **Rabbit**, **Bird**, or **Fish**.
* **Custom Buddy Name**: Rename your companion to anything you like.
* **Dynamic Animations & States**: Companions change states based on travel progress: *Idle/Resting*, *Running/Watching*, *Barking/Alerting*, or *Draggable/Interactive* on the Settings page.
* **Sound & Phrase Personality**: Each pet companion features custom sound signatures ("Bow-Bow", "Meow-Meow", "Thump-Thump", "Tweet-Tweet", "Glub-Glub") and interactive chatter.
* **Treat Feeding (UPI Integration)**: Support the developer and treat your companion via Google Pay / UPI.

### 🏃 Background Location Tracker & 2-Stage Notifications
* **Foreground & Background GPS Services**: Built using `expo-location` and `expo-task-manager` to track movement even when the screen is locked or the app is minimized.
* **Persistent Foreground Notification**: Displays an active status notification bar while monitoring armed zones.
* **Stage 1 — Approaching Warning (2km)**: Triggers an early warning notification when you enter within 2km of your boundary so you can gather your belongings.
* **Stage 2 — Perimeter Alert**: Triggers a high-priority alarm notification and full-screen ringing UI with continuous audio and vibration patterns when entering the destination perimeter.

### 🔊 Offline Audio & Custom Sound Support
* **Bundled Offline Sounds**: Uses synthesized audio files (`bark.wav`, `radar.wav`, `chimes.wav`, `breeze.wav`) bundled directly in `assets/sounds/` with `expo-audio`.
* **Custom Audio Upload**: Pick and load custom MP3, WAV, or AAC audio files from your device using `expo-document-picker`.
* **Volume Slider & Audio Tester**: In-app volume control and instant tone preview testing.

### 🎨 Themes & Custom Hex Palette Builder
* **Preset Themes**:
  * 🤎 **Classic Cocoa** (Default warm Dachshund brown)
  * ☀️ **Daylight** (Clean light theme)
  * 🌌 **Midnight Cyber** (High-contrast dark neon)
  * 🌲 **Emerald Forest** (Organic forest green)
  * 🌆 **Sunset Violet** (Deep purple and tangerine)
* **Custom Hex Palette Builder**: Select custom Primary and Accent colors using hex inputs or an interactive 70-color swatch modal palette.

---

## 📱 App Screens Overview

| Screen | Description |
| :--- | :--- |
| **🏠 Home** | Dashboard displaying active alarms, companion status widget, stats overview, multi-geofence list, and edit modals. |
| **🗺️ Map (Dashboard)** | Full-screen interactive map, location search bar with auto-suggestions, pin placement, perimeter slider, and quick focus toggles. |
| **🚀 Tracking** | Real-time commute monitor displaying remaining distance, live speed, ETA, disarm controls, and a mini companion progress animation bar. |
| **🔔 Ringing** | Triggered alert screen featuring animated mascot barks, expanding waveforms, Snooze (5 min), and Disarm controls. |
| **🔊 Sounds** | Audio tone selection, custom sound file uploader, volume controls, and sound preview button. |
| **⚙️ Settings** | Theme carousel, custom hex color picker, companion selector & naming, treat feeding, mascot tip toggles, interactive mascot playground, and developer profile links. |

---

## 🛠️ Technology Stack

* **Framework**: [React Native](https://reactnative.dev/) (v0.81.5) with [React 19](https://react.dev/)
* **Platform & Tooling**: [Expo SDK 54](https://expo.dev/)
* **Navigation & UI**: Custom Animated Tab Bar (`react-native-reanimated`, `expo-haptics`)
* **Maps & Geocoding**: `react-native-maps`, OpenStreetMap Nominatim API
* **Location & Background Tasks**: `expo-location`, `expo-task-manager`
* **Notifications**: `expo-notifications`
* **Audio Playback**: `expo-audio` & `expo-document-picker`
* **Storage**: `@react-native-async-storage/async-storage`

---

## 📂 Project Structure

```
Rum/
├── assets/
│   └── sounds/              # Synthesized offline audio files (bark.wav, radar.wav, etc.)
├── src/
│   ├── components/
│   │   ├── AnimatedTabBar.js # Bottom floating tab bar with animations & haptics
│   │   ├── AppHeader.js      # Reusable app header component
│   │   ├── MascotRum.js      # SVG/Animated Mascot Companion component (Dog, Cat, Rabbit, etc.)
│   │   └── ThemeContext.js   # Theme design tokens, dark/light modes & custom palette builder
│   ├── screens/
│   │   ├── DashboardScreen.js # Interactive Map & Destination Search screen
│   │   ├── HomeScreen.js      # Geofence overview, stats & alarm deck
│   │   ├── RingingScreen.js   # Triggered alarm modal with snooze & disarm
│   │   ├── SettingsScreen.js  # Theme, companion, custom colors & options screen
│   │   ├── SoundsScreen.js    # Sound selector, custom audio upload & volume
│   │   └── TrackingScreen.js  # Live tracking dashboard with mini-mascot progress
│   └── tasks/
│       └── BackgroundGeofenceTask.js # Expo TaskManager background location tracking
├── App.js                   # Main application controller & navigator
├── app.json                 # Expo project configuration
├── package.json             # App dependencies & scripts
└── README.md                # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
* [Node.js](https://nodejs.org/) (v18 or higher recommended)
* [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
* [Expo Go](https://expo.dev/client) app on your mobile device (iOS or Android) for testing.

### Setup Instructions

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/m-icky/RUM---Bow-Bow-Geofence-Alarm-App.git
   cd RUM---Bow-Bow-Geofence-Alarm-App
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start the Expo Development Server**:
   ```bash
   npx expo start --clear
   ```

4. **Run on Device or Emulator**:
   * Scan the terminal **QR Code** using **Expo Go** on Android or the Camera app on iOS.
   * Press **`a`** to open on an Android Emulator.
   * Press **`w`** to open in a Web browser.

---

## 📦 Building Standalone APK (EAS Build)

To build a standalone `.apk` file for Android:

1. **Install EAS CLI and Log In**:
   ```bash
   npm install -g eas-cli
   npx eas-cli login
   ```

2. **Run Android Build Profile**:
   ```bash
   npx eas-cli build -p android --profile preview
   ```

3. Download the finished `.apk` file directly to your phone via the generated URL / QR code in your terminal.

---

## 👨‍💻 Developer & Credits

* **Developer**: m-icky ([GitHub Profile](https://github.com/m-icky))
* **Repository**: [RUM - Bow-Bow Geofence Alarm App](https://github.com/m-icky/RUM---Bow-Bow-Geofence-Alarm-App)

---

*Made with ❤️ for stress-free journeys!* 🐾
