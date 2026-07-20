# Rum - Location-Based Alarm App Design Specification

Welcome to the design specification for **Rum**, a modern, location-based alarm mobile application designed to alert travelers, commuters, and adventurers when they enter a specific geographic boundary. Named after **Rum**, a friendly brown Dachshund mascot, the app combines reliable background location tracking with premium, customizable aesthetics and animations to provide a stress-free travel experience.

---

## 1. Executive Summary & Core Value Proposition

- **The Problem:** Commuters on buses, trains, or car rides frequently miss their stops due to sleeping, working, or reading. Traditional time-based alarms are useless when schedules shift, traffic occurs, or transit delays arise.
- **The Solution:** A location-based geofence alarm that wakes or alerts the user only when they physically approach their destination, regardless of timing.
- **Mascot mascot ("Rum"):** The brown Dachshund mascot acts as the app's visual identity, walking with the user on their journey, keeping "watch" on the map, and barking playfully to alert them when they arrive.
- **Frictionless Experience:** No sign-up, no login, no accounts, and no data tracking. The app works fully offline and respects user privacy.

---

## 2. Mascot Integration: "Rum" the Dachshund

Rum is not just a static image; he is the user's travel companion. His appearance and behavior change based on the application state:

1. **Sleeping/Resting Mode (Idle/No Alarm Set):**
   - Rum is curled up sleeping at the top or bottom of the dashboard.
   - Text indicator: *"I'm resting. Set a destination and I'll keep watch!"*
2. **Alert/Watching Mode (Alarm Armed & Active):**
   - Rum wakes up, sits, and raises his ears. His tail wags slowly as coordinates update.
   - During active travel, a small icon of Rum moves along a progress track indicating proximity to the destination.
   - Text indicator: *"Keeping my ears open! We are X km away from your stop."*
3. **Barking Mode (Alarm Triggered):**
   - Rum sits up, wags his tail rapidly, and "barks" (visual speech bubbles and sound).
   - Text indicator: *"Woof! Woof! We have arrived! Wake up!"*
4. **Interactive Tricks (Easter Eggs):**
   - Tapping Rum causes him to wag his tail, roll over, or do a happy bounce.

---

## 3. UI/UX Flow & Wireframes Description

### Screen 1: Splash Screen
- **Visuals:** Centered high-definition logo ([rum.png](file:///home/naveen/Downloads/Rum/rum.png)) nested in a smooth circular frame. Rum the Mascot does a quick stretch and run cycle below the logo.
- **Transition:** Scale-up bounce, followed by a screen slide-up reveal of the Map Dashboard.

### Screen 2: Dashboard & Map Setup (Home)
- **Upper Panel (60% Viewport):**
  - Interactive map (Leaflet-based in web prototype, Mapbox/Google Maps on mobile).
  - Search bar to type a destination.
  - A draggable "Pin" representing the destination.
  - A translucent red circular perimeter overlay around the destination representing the geofence boundary.
- **Lower Panel (40% Viewport):**
  - **Mascot Alert Card:** Glassmorphism overlay card hosting Rum and his status dialogue.
  - **Perimeter Range Slider:** A custom track slider to adjust the geofence radius from `100 meters` to `5 kilometers`.
  - **Sound Config & Theme Icons:** Quick-access shortcuts to sound library and appearance configurations.
  - **Action Button:** Large floating action button: `Arm Alarm` (pulsing subtle gold border).

### Screen 3: Commute / Tracking Mode
- **Visuals:** Map scales down slightly; tracking dashboard gains focus.
- **Metrics Displayed:**
  - Remaining Distance (meters / kilometers).
  - Current speed & estimated time of arrival (ETA).
- **Interactive Proximity Progress Bar:** A linear track where a mini-Rum Dachshund runs from left to right as the user approaches the geofence center.
- **Primary Control:** A prominent `Disarm` button (accent red) to cancel tracking at any time.

### Screen 4: Alarm Triggered Screen
- **Visuals:** High-contrast pulsing colored screen matching the selected theme. 
- **Animation:** Rum appears in the center, animated barking with audio waveforms expanding from his collar.
- **Controls:**
  - **Snooze (5 Mins):** A medium button that temporarily silence the alarm, increasing the geofence size or timing.
  - **Dismiss Alarm:** A massive, easily accessible bottom swipe or button to fully deactivate the alert.

---

## 4. Design Systems & Theme Palettes

The app supports custom colors and themes to fit any lighting situation or personal taste. The default theme is inspired by the brown coat of the Dachshund.

### Preset Themes Table

| Theme Name | Primary Accent | Secondary Accent | Background (Dark) | Card & Surface | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Classic Cocoa** (Default) | `#8D5B4C` | `#E09F67` | `#1F1715` | `rgba(45,34,30,0.7)` | Warm, chocolatey brown tones reminiscent of Rum. |
| **Midnight Cyber** | `#00F0FF` | `#FF007F` | `#0A0A12` | `rgba(20,20,35,0.7)` | High-contrast neon blue and pink over deep cosmic black. |
| **Emerald Forest** | `#2ECC71` | `#F1C40F` | `#0F1A15` | `rgba(24,38,32,0.7)` | Organic forest green with bright gold accents. |
| **Sunset Violet** | `#8E44AD` | `#E67E22` | `#1A0F21` | `rgba(38,24,45,0.7)` | Royal purple with warm tangerine details. |

---

## 5. Technical Implementation Guidelines for Mobile Developers

For developers building the native app on iOS or Android, the following strategies are crucial:

### A. Geofencing & Background Location Services
- **iOS (Swift):** 
  - Utilize `CLLocationManager` with `startMonitoring(for: CLRegion)`.
  - Request `always` location permissions (`NSLocationAlwaysAndWhenInUseUsageDescription`).
  - Enable background modes: `Location updates` and `Background processing` in `Info.plist`.
- **Android (Kotlin):**
  - Implement `GeofencingClient` from Google Play Services.
  - Request `ACCESS_FINE_LOCATION` and `ACCESS_BACKGROUND_LOCATION`.
  - Create a foreground service (`ForegroundService`) with notification channel to ensure the system does not kill the process during deep sleep cycles (Doze mode).

### B. Background Audio Playback
- To ensure the alarm rings even if the screen is locked or another app is open:
  - **iOS:** Configure `AVAudioSession` category to `.playback` with option `.mixWithOthers` or custom alarm channels.
  - **Android:** Request audio focus with `AudioAttributes.USAGE_ALARM` and play sounds through the alarm channel to bypass system silent toggles if configured.

### C. Persistent Storage
- Use lightweight on-device stores:
  - **iOS:** `UserDefaults` or SwiftData.
  - **Android:** `Preferences DataStore` or Room.
  - *No Remote Database:* Since there's no sign-in, store coordinates, custom radii, user themes, and sound file paths locally.

---

## 6. Motion Design & Micro-Animations

- **Geofence Radius Adjustment:** The red circle on the map expands and contracts with a rubber-band spring easing when the range slider is dragged.
- **Theme Transitions:** When selecting a new theme, color variables morph smoothly over a `400ms` duration using CSS/Native transitions.
- **Ringing Wave Pulse:** Large, soft radial circles ripple outward from the center Mascot avatar to visually project the sound of the alarm.
- **Progress Tracking:** Standard progress bars feel rigid. Rum slides across the screen using a customized sprite or keyframe sequence that wiggles his tail while in motion.
