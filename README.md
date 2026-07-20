# 🐾 RUM - Bow-Bow Geofence Alarm App

RUM is a premium, real-time multi-geofence location alert app built using React Native and Expo. It plays offline alarms (like dog barks, radars, or chimes) when the user travels inside designated perimeter boundaries.

---

## 🌟 Key Features

### 📍 Multi-Geofence Alarm CRUD Management
* **Simultaneous Tracking**: Supports adding and monitoring **multiple armed geofence zones** at once.
* **Persistent Storage**: Saved alarms are stored locally and restored on app launch using `AsyncStorage`.
* **Map Overlays**: Active alarms are displayed with distinct translucent boundary zones on the map.
* **CRUD Deck Control**: Modify (edit names/radii), delete, or toggle alarms directly from the bottom collapsible sliding card.
* **Tap-to-Zoom Focus**: Clicking any item in the armed list centers and focuses the map viewport onto that specific coordinate location.

### 🔍 Auto-Suggestion Search (Nominatim API)
* **India-Strict Geocoding**: Search queries are restricted strictly to India (`countrycodes=in`) using the OpenStreetMap Nominatim engine.
* **South Indian Prioritization**: Automatically prioritizes and bubbles up Kerala, Tamil Nadu, and Karnataka states' addresses to the top of the search suggestions.
* **Fuzzy Spelling Corrections**: Dynamic phonetic search allows queries to resolve correctly even with minor spelling typos (e.g. searching "trvndrm" yields Trivandrum).
* **Clear Inputs**: Tap the `x` clear icon inside the focused search boxes to wipe text and automatically restore standard place presets.

### 🏃 Real-Time Background Tracker & Map Controls
* **Live GPS Tracking**: Uses high-accuracy hardware listeners (`Location.watchPositionAsync` in `App.js`) to continuously evaluate user movement.
* **Top-Right Map Focus Toggles**: Three floating buttons to center/zoom the map on:
  * 📍 Destination coordinates (orange icon)
  * 🟢 Starting coordinates (green circle)
  * 🌐 Device Live GPS location (blue target icon)
* **Safety Layout Padding**: Dynamic status bar offset prevents notched phone screens (iOS or Android) from overlapping search inputs.

### 🔊 Offline Synthesized Sounds
* Resolves CDN 403 request blockages by bundling synthesized audio files (`bark.wav`, `radar.wav`, `chimes.wav`, `breeze.wav`) offline directly inside `assets/sounds/`, played natively with Expo AV.

---

## 🛠️ Development & Local Execution

### Prerequisites
Ensure you have Node.js and NPM installed on your machine.

### Setup Instructions
1. Clone or navigate to the project directory:
   ```bash
   cd /home/naveen/Downloads/Rum
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```

### Running Locally
Run the local dev bundler using Expo:
```bash
npx expo start --clear
```
* Press **`a`** to test on an Android emulator (if configured).
* Scan the console's **QR Code** using the **Expo Go** application on your physical iOS or Android device.

---

## 📦 Compiling the APK (EAS Cloud Build)

To build a standalone, installable `.apk` package for your mobile phone:

1. **Log in to your Expo account** (create a free account at [expo.dev](https://expo.dev) if needed):
   ```bash
   npx eas-cli login
   ```
2. **Build the APK**:
   ```bash
   npx eas-cli build -p android --profile preview
   ```
3. Scan the generated QR Code or open the download link printed in your terminal console to download and install **`Rum.apk`**!
