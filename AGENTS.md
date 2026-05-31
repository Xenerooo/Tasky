# Tasky — Agent Instructions

Read **Expo v56 exact docs** at https://docs.expo.dev/versions/v56.0.0/ before writing code. Expo v56 has breaking changes from earlier versions.

## Commands
- `npm start` — start Metro for development build (QR → dev client app)
- `npm run android` / `npm run ios` — native builds via EAS dev client
- `npm run web` — web preview
- No lint, test, or typecheck scripts exist. `tsc` uses `expo/tsconfig.base` with `strict: true`.

## Architecture

### Database (`src/database/database.ts`)
- SQLite via `expo-sqlite`, lazy singleton (`getDatabase()` call on first access).
- **All PKs are UUIDv4 strings** (generated via `expo-crypto.randomUUID()`). No auto-increment IDs.
- **Soft deletes only** — set `is_deleted = 1`, never issue `DELETE`.
- Every table has `created_at`, `updated_at`, `is_synced`, `is_deleted` columns for future sync.
- Schema includes a `global_timeline` VIEW (recreated on boot with `DROP VIEW IF EXISTS`).
- `notification_ids` column on `tasks` is added via `ALTER TABLE` migration (gracefully ignored if exists).
- Seed data (`seed.ts`) runs on every boot but skips if any `grouped_tasks` rows exist.

### Navigation (`src/navigation/AppNavigator.tsx`)
- **3 bottom tabs**: Home (Dashboard), Calendar, Timeline.
- **Stack screens**: Workspace, TaskDetail, TaskForm, NoteForm, NoteDetail, Inbox, Settings.
- Tab colors are dynamic from theme context.

### Notifications (`src/services/notifications.ts`)
- Two daily reminders per task with due date: 9:00 AM and 8:00 PM, from `reminderDays` before due date through due date.
- `cancelForTask()` receives JSON array of notification IDs stored in `tasks.notification_ids`.
- Only active on physical devices (no-op in Expo Go in some environments).

### Theme (`src/theme/themes.ts`)
- Three themes: `light`, `dark`, `nika` (pastel pink). Stored in `useSettings` via AsyncStorage.
- Custom fonts: **Amarillo** (headings/display) and **SourceSerif4** (body text). Loaded from `assets/fonts/` at boot.
- Fonts are **optional** — app proceeds even if they fail to load.

### Settings (`src/hooks/useSettings.tsx`)
- Persisted to `@react-native-async-storage/async-storage` under key `tasky_settings`.
- Defaults: `reminderDays: 3`, `notificationsEnabled: true`, `vibrate: true`, `highPriority: true`, `theme: 'light'`.

### Build
- **New Architecture enabled** (Fabric/TurboModules) for both Android and iOS via `expo-build-properties` plugin in `app.json`.
- EAS builds: `development` (dev client), `preview` (internal), `production` (auto-increment version).
- Metro config disables `unstable_enablePackageExports` (common compatibility workaround).

### Native rebuild required when
- Adding/upgrading/replacing any npm package with `android/` or `ios/` directories (native code)
- Adding, removing, or upgrading any `expo-*` package
- Adding, removing, or modifying any entry in `app.json`'s `plugins` array
- Changing `app.json` native-bound properties: `name`, `slug`, `version`, `orientation`, `icon`, `splash`, `userInterfaceStyle`, `android.package`, `ios.bundleIdentifier`, or platform-specific config sections
- Changing adaptive icon assets (`android.adaptiveIcon`) in `app.json`
- Modifying `expo-build-properties` plugin options (e.g., `newArchEnabled`, compile SDK, deployment target)
- Modifying `eas.json` build profiles or CLI settings
- Modifying `metro.config.js`
- Running `npx expo prebuild` (regenerates native project folders)

**No rebuild needed** for pure JS/TS changes (components, screens, hooks, styles, utilities, fonts loaded via `expo-font`, images loaded via `require()`) — just restart Metro or reload the app.

**Before installing any package or modifying native config (`app.json`, `eas.json`, `metro.config.js`), check the rules above and warn the user if a native rebuild will be required.**
