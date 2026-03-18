## DietFit: Personalized Diet Recommender for Health and Wellness Goals

DietFit is a context-aware diet recommendation/search system that helps adults improve their diet towards wellness goals while keeping changes realistic by using user’s current diet as a baseline. This system provides proactive suggestions without a search query, as well as search for specific health benefits, using conceptual ranking based on goal fit, constraints, and user feedback.

---

### Requirements

- **Node.js**: v18+ (LTS recommended)
- **npm**: installed with Node
- **Android Studio + Android SDK** (optional, for Android emulator)
  - SDK location set to `ANDROID_HOME` (for example `D:\Dev\android\sdk`)
  - `platform-tools`, `emulator`, and `tools` added to `PATH`
- **Expo Go** app on a physical phone (optional)

Install project dependencies:

```bash
cd dietfit
npm install
```

### Running the backend API

From `dietfit`:

```bash
node server.js
```

The API listens on **http://localhost:3000** and exposes:

- `GET /search?q=query`
- `GET /recipe/:id`
- `GET /recipes?limit=15`

This server must be running for the app’s search and recipe pages to work.

### Running the app

In another terminal, from `dietfit`:

```bash
npm start
```

This opens the Expo dev menu. From there, press:

- **w** — open in web browser
- **a** — open on Android emulator (requires AVD configured in Android Studio)
- **i** — open on iOS simulator

You can also run a specific platform directly:

```bash
npm run web       # web only
npm run android   # Android only
npm run ios       # iOS only
```

### Running on a physical device (Expo Go)

1. Ensure **phone and PC are on the same Wi‑Fi**.
2. Create a `.env` file in `dietfit` (optional but recommended):

   ```env
   EXPO_PUBLIC_API_URL=http://YOUR_PC_IP:3000
   ```

   Replace `YOUR_PC_IP` with your machine’s IPv4 address (e.g. `192.168.1.100`).
3. Start the API: `node server.js`
4. Start Expo: `npx expo start`
5. Open **Expo Go** on your phone and scan the QR code from the terminal or Dev Tools.

### Troubleshooting

- If the emulator or device is stuck on “Loading…”:
  - Confirm `node server.js` is running.
  - Try reloading the app (`r` in the Expo terminal) or restarting the emulator / Expo Go.
- If API calls fail on a physical device:
  - Double‑check `EXPO_PUBLIC_API_URL` and that both devices share the same network.
  - Verify that firewall rules allow access to ports **3000** (API) and **8081** (Expo dev server).
