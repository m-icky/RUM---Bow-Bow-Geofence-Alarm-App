# 🐾 Rum - Location-Based Geofence Alarm App Design Specification

Welcome to the comprehensive design specification for **Rum**, a modern, location-based geofence alarm and mobile transit companion application designed to alert travelers, commuters, and adventurers when they enter a designated geographic perimeter boundary. 

Originally named after **Rum**, a friendly brown Dachshund mascot, the app has evolved to feature multiple customizable pet companions, real-time background GPS tracking, a multi-geofence management engine, an offline audio engine, and a flexible theme design system with custom hex palette building.

---

## 1. Executive Summary & Core Value Proposition

- **The Problem:** Commuters on buses, trains, or car rides frequently miss their stops due to sleeping, working, or reading. Traditional time-based alarms are ineffective when transit schedules shift, traffic delays occur, or routes change.
- **The Solution:** A location-aware geofence alarm that monitors user movement and triggers high-priority alerts only when physically entering the destination perimeter, regardless of traffic or transit timing.
- **Multi-Pet Mascot Companions ("Rum & Friends"):** Pet companions act as the app's visual identity and travel buddies. They accompany the user on their trip, keep "watch" on the map, provide progress updates, and bark/alert when arriving at the stop.
- **Frictionless & Privacy-First Experience:** No sign-up, no login, no accounts, and no data tracking. The app works fully offline and stores all settings and geofences locally on-device.

---

## 2. Companion System & Mascot Design ("Rum & Friends")

The mascot system brings emotional connection and playful micro-interactions to travel tracking. Users can select from 5 distinct companions and customize their name:

### 🐶 Companion Types & Personalities

| Species | Default Name | Sound Signature | Treat Item | Emoji | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Dog** | Rum | *"Bow-Bow!"* | Meaty Bone / Steak | 🐶 | Friendly Dachshund who keeps his ears open and barks playfully. |
| **Cat** | Luna | *"Meow-Meow!"* | Juicy Fish | 🐱 | Alert feline companion watching coordinates with sharp eyes. |
| **Rabbit** | Hop | *"Thump-Thump!"* | Crunchy Carrot | 🐰 | Energetic buddy who thumps when approaching the stop. |
| **Bird** | Pip | *"Tweet-Tweet!"* | Bag of Seeds | 🐦 | High-flying companion watching the route from above. |
| **Fish** | Bubbles | *"Glub-Glub!"* | Bowl of Flakes | 🫧 | Calm aquatic friend swimming along the trip progress bar. |

### 🎭 Animation & Application States

1. **Sleeping/Resting Mode (Idle / No Active Alarm):**
   - Companion is curled up sleeping on the home banner or map card.
   - *Dialogue:* *"No active alarms right now. Set one on the map so I can guard your trip! 🐾"*
2. **Watching/Running Mode (Armed & Active Travel):**
   - Companion sits alertly or enters a running animation cycle.
   - Mini mascot slides along the linear progress track on the Tracking screen as the user approaches the geofence center.
   - *Dialogue:* *"I'm watching X active alarms! I'll alert you with a 'Bow-Bow!' when close!"*
3. **Triggered/Barking Mode (Perimeter Entered):**
   - Companion sit-barks, wags tail, and displays audio waveform ripples on the Ringing screen.
   - *Dialogue:* *"Woof! Woof! We have arrived! Wake up!"*
4. **Interactive Playground & Touch Feedback (Settings Screen):**
   - Tapping the mascot triggers haptic feedback (`expo-haptics`) and cycles through 55+ interactive chatter phrases.
   - Mascot is wrapped in a `PanResponder` animated container allowing users to drag the companion around the screen.
   - **Treat Feeding (UPI Integration):** Interactive buttons allow users to "Feed a treat" (₹10 snack / ₹50 feast) via Google Pay / UPI.

---

## 3. UI/UX Architecture & Screen Specifications

The application consists of 6 primary screens connected via a floating animated bottom navigation tab bar:

```
                          ┌──────────────────────────┐
                          │     App Entry Controller  │
                          └────────────┬─────────────┘
                                       │
            ┌──────────────┬───────────┼───────────┬──────────────┐
            ▼              ▼           ▼           ▼              ▼
     ┌────────────┐ ┌────────────┐ ┌────────┐ ┌──────────┐ ┌────────────┐
     │  Home (🏠) │ │  Map (🗺️)  │ │Track(🚀)│ │Sounds(🔊)│ │Settings(⚙️)│
     └─────┬──────┘ └────────────┘ └────────┘ └──────────┘ └────────────┘
           │
           ▼ (Alarm Triggered)
     ┌────────────┐
     │Ringing (🔔)│
     └────────────┘
```

---

### Screen 1: Home Dashboard (`HomeScreen.js`)
- **Header Card:** Greeting widget displaying companion state, active GPS status indicator, and dynamic speech bubble dialogue.
- **Quick Stats Overview:** Grid cards showing Active Alarms count, Total Saved Alarms, and Companion Guardian state.
- **Multi-Geofence Alarm Deck:** Card list displaying saved alarms with real-time Haversine distance calculate, perimeter size, coordinates, and active/paused badges.
- **CRUD Operations:**
  - **Edit Modal:** Modify destination name, adjust geofence radius slider (100m to 5km), or jump to location picker.
  - **Pause/Activate Toggle:** Quickly pause monitoring without deleting the geofence.
  - **Map Focus Jump:** Tap "Map" to open the map directly centered on the alarm's target coordinates.

---

### Screen 2: Map & Destination Setup (`DashboardScreen.js`)
- **Upper Panel (Interactive Map):**
  - Interactive map view (`react-native-maps` on mobile, Leaflet/WebView fallback on web).
  - Draggable destination pin with translucent circular geofence boundary overlay.
  - **Map Focus Floating Action Buttons:**
    - 📍 Target destination focus
    - 🟢 Trip starting point focus
    - 🌐 Live device GPS location focus
- **Search Bar & Geocoding (Nominatim API):**
  - Real-time address lookups with India-strict filtering (`countrycodes=in`).
  - Prioritizes South Indian states (Kerala, Tamil Nadu, Karnataka).
  - Fuzzy spelling correction and instant clear button (`x`).
  - Preset shortcuts for airports, major railway stations, and bus terminals.
- **Lower Panel (Geofence Deck):**
  - Distance metrics (Start-to-Destination distance in km).
  - Range Slider to adjust geofence radius from `100 meters` to `5 kilometers`.
  - Primary `Arm Alarm` CTA button with pulsing glow animations.

---

### Screen 3: Live Commute Tracker (`TrackingScreen.js`)
- **Metrics Panel:** Large high-contrast displays for:
  - Remaining Distance (meters / kilometers).
  - Live Travel Speed (km/h).
  - Estimated Time of Arrival (ETA).
- **Proximity Progress Bar:** Linear progress bar featuring a mini pet companion icon running from start (0%) to destination (100%).
- **Map Viewport:** Auto-zoomed map keeping both the device location and destination boundary in view.
- **Primary Control:** Prominent `Disarm Alarm` button to cancel tracking.

---

### Screen 4: Alarm Triggered / Ringing Screen (`RingingScreen.js`)
- **Visuals:** Full-screen high-contrast alert matching current theme colors with radial wave animations pulsing from the mascot avatar.
- **Audio & Haptics:** Continuous audio alarm playback (`expo-audio`) with repeating heavy vibration patterns.
- **Controls:**
  - **Snooze (5 Mins):** Temporarily mutes the alarm and expands the perimeter threshold by 500m.
  - **Dismiss / Arrived:** Full swipe or button to disarm the alarm and return to the dashboard.

---

### Screen 5: Sound Selector & Audio Config (`SoundsScreen.js`)
- **Tone Selector:** Card list featuring synthesized built-in alarm tones:
  - *Playful Bark* 🐶
  - *Digital Radar* 📡
  - *Melodic Chimes* 🔔
  - *Siren Pulse* 🚨
- **Custom Audio Uploader:** Integrated file picker (`expo-document-picker`) supporting MP3, WAV, and AAC uploads up to 5MB.
- **Volume Control:** Slider to adjust alarm playback volume (0% to 100%).
- **Preview Button:** Instant audio test playback button with active tone configuration.

---

### Screen 6: Theme & Companion Settings (`SettingsScreen.js`)
- **Theme Carousel:** Horizontal scroll view with theme card previews (swatch dots, light/dark badge, active checkmark).
- **Custom Hex Palette Builder:** Hex code text inputs (`Primary` & `Accent`) with live color indicators and an interactive 70-color swatch modal picker.
- **Companion Selector:** Horizontal pet card selector (Dog, Cat, Rabbit, Bird, Fish).
- **Companion Name Input:** Custom text input to personalize pet name.
- **Treat Feeding Section:** UPI integration card to send ₹10 / ₹50 treat contributions to `naveentmadhu-1@okicici`.
- **Interactive Mascot Area:** Draggable mascot widget with speech bubble chatter and haptic touch feedback.
- **Developer Footer:** GitHub profile button linked to `github.com/m-icky`.

---

## 4. Design Systems & Theme Palettes

The application features a flexible theme design system defined in [ThemeContext.js](file:///home/naveen/Downloads/Rum/src/components/ThemeContext.js):

### 🎨 Theme Presets Specification Table

| Theme Key | Theme Name | Primary (`dogPrimary`) | Accent (`accent`) | Background (`background`) | Surface Card (`surface`) | Mode |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `classic` | **Classic Cocoa** | `#8D5B4C` | `#E09F67` | `#1F1715` | `rgba(45,34,30,0.85)` | Dark |
| `daylight` | **Daylight** | `#2B5C8F` | `#E67E22` | `#F5F7FA` | `#FFFFFF` | Light (Default) |
| `cyber` | **Midnight Cyber** | `#00F0FF` | `#FF007F` | `#0A0A12` | `rgba(20,20,35,0.85)` | Dark Neon |
| `emerald` | **Emerald Forest** | `#2ECC71` | `#F1C40F` | `#0F1A15` | `rgba(24,38,32,0.85)` | Dark |
| `sunset` | **Sunset Violet** | `#8E44AD` | `#E67E22` | `#1A0F21` | `rgba(38,24,45,0.85)` | Dark |
| `custom` | **Custom Palette** | User-defined Hex | User-defined Hex | Derived Dark/Light | Derived Surface | Dynamic |

---

## 5. Technical Architecture & Data Flow

```
                     ┌────────────────────────────────┐
                     │    React Native / Expo App     │
                     └───────────────┬────────────────┘
                                     │
       ┌─────────────────────────────┼─────────────────────────────┐
       ▼                             ▼                             ▼
┌──────────────┐             ┌──────────────┐             ┌─────────────────┐
│ Async Storage│             │ Expo Location│             │  Expo Audio &   │
│  Persistence │             │ & TaskMgr    │             │  Notifications  │
└──────┬───────┘             └──────┬───────┘             └────────┬────────┘
       │                             │                             │
       │ Local State                 │ Background GPS              │ Sound & Alerts
       ▼                             ▼                             ▼
┌──────────────┐             ┌──────────────┐             ┌─────────────────┐
│ Saved Alarms │             │ 2km Warning  │             │ High Priority   │
│ & User Theme │             │ & Geofence BG│             │ Local Push & UI │
└──────────────┘             └──────────────┘             └─────────────────┘
```

### A. Background Location & Geofencing Engine
- **Task Manager Registration:** Defined in [BackgroundGeofenceTask.js](file:///home/naveen/Downloads/Rum/src/tasks/BackgroundGeofenceTask.js) using `TaskManager.defineTask(BACKGROUND_GEOFENCE_TASK)`.
- **Location Listener Settings:** `Location.startLocationUpdatesAsync` configured with:
  - Accuracy: `Location.Accuracy.Balanced`
  - Update Interval: Every 10 seconds or 30 meters moved
  - Foreground Service: Persistent notification status bar (*"🐾 Geofence Alarm Active"*)
- **2-Stage Distance Notification System:**
  - **Stage 1 (Approaching):** Triggers when distance $\le \text{radius} + 2000\text{m}$. Displays `"Almost there! 2km remaining"`.
  - **Stage 2 (Triggered):** Triggers when distance $\le \text{radius}$. Displays sticky max-priority notification `"WAKE UP! You've arrived!"` and launches `RingingScreen`.

### B. Geocoding & Distance Calculation
- **Haversine Formula:** Used for on-device spherical distance calculation:
  $$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1) \cdot \cos(\phi_2) \cdot \sin^2\left(\frac{\Delta \lambda}{2}\right)$$
  $$c = 2 \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1-a}\right)$$
  $$d = R \cdot c \quad (R = 6371000\text{ meters})$$

---

## 6. Motion Design & Micro-Animations

- **Spring Geofence Adjustment:** The red circle perimeter on the map expands and contracts smoothly when adjusting the radius slider.
- **Pulse Status Badges:** Active alarm indicators feature an infinite pulse animation loop (`Animated.loop`) scaling between `1.0` and `1.2`.
- **Ringing Waveform Waves:** Expanding radial circles project outward behind the mascot avatar on the Ringing screen.
- **Draggable Mascot:** Settings page mascot uses `PanResponder` and `Animated.ValueXY` for smooth drag-and-release interactions.
- **Haptic Tactile Feedback:** Integrated `expo-haptics` impacts (`Light`, `Medium`) on tab switches, mascot taps, and theme selections.

---

*Specification maintained by m-icky for RUM Geofence Alarm App.* 🐾
