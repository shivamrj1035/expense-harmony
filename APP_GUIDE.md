# SpendWise: App Overview & Mobile Transition Roadmap

SpendWise is a premium, minimal, and high-performance personal finance management tool designed for the modern user. It combines seamless expense tracking with investment analysis (Stocks & Mutual Funds) in a sleek "Gen-Z" aesthetic.

---

### 2. Tech Stack (Mobile App)
To achieve a **fully working system** with live notifications and shared logic, use:
- **Core**: React Native with **Expo (SDK 51+)**
- **Routing**: `expo-router` (File-based, identical to Next.js)
- **UI Architecture**: **NativeWind (v4)** for Tailwind CSS styling
- **Animations**: `react-native-reanimated` (for premium feel)
- **Authentication**: `@clerk/clerk-expo` (Seamless sync with Web)
- **State Management**: **TanStack Query (v5)** for server-state caching
- **Live Notifications**: `expo-notifications` via **Expo Push Notification Service**
- **Backend Bridge**: Existing Next.js API routes (used as a Headless Backend)

---

## 📱 Pages & Screens Breakdown

### Web Screens (Current)
| Screen | Path | Key Functionality |
| :--- | :--- | :--- |
| **Landing** | `/` | Hero section, feature showcase, login toggle. |
| **Dashboard** | `/dashboard` | Monthly summary charts, recent activity, investment overview. |
| **Expenses** | `/expenses` | Full transaction list, search, filter, and "Add Expense" dialog. |
| **Stocks** | `/stocks` | Portfolio performance, stock list, and real-time (mocked/sync) data. |
| **Mutual Funds**| `/mutual-funds` | Fund tracking, sheet upload integration, performance metrics. |
| **Categories** | `/categories` | Custom category management with icons and budget colors. |
| **Settings** | `/settings` | Profile info, theme selection, and display toggles for investments. |

---

## 🛠 Mobile App Transition Roadmap

### Step 1: Framework Choice
- **Recommendation**: **Expo Managed Workflow**.
- **Why**: Fastest way to implement **Live Notifications** and **Clerk Auth** without complex native configurations.

### Step 2: Live Notification Architecture
- **Service**: Use `expo-notifications`.
- **Implementation**: 
    1. Capture the `ExpoPushToken` upon login.
    2. Store this token in the Supabase `User` table via an API call.
    3. Trigger notifications from the backend (or a Supabase edge function) when an expense is added or a budget is exceeded.

### Step 3: Clerk Sync
- Use Clerk's `<ClerkProvider />` at the root of the mobile app.
- Ensure the Mobile and Web apps share the **same Clerk Instance** to allow users to log in with one account on all devices.

---

## 🤖 Instructions for AI Agent (Mobile Development)

*Copy and paste these instructions to an AI Agent to build the mobile app from scratch:*

### Phase 1: Foundation & Setup
1. "Initialize a new Expo project: `npx create-expo-app@latest -t tabs`."
2. "Install core dependencies: `expo-router`, `nativewind`, `lucide-react-native`, `react-native-reanimated`, `@tanstack/react-query`, and `expo-notifications`."
3. "Configure Tailwind for React Native via NativeWind to match the web's brand colors."

### Phase 2: Fully Working Auth (Clerk)
1. "Install `@clerk/clerk-expo` and `expo-secure-store` for session persistence."
2. "Wrap the app in `ClerkProvider` and build a login/signup flow that matches the web's sleek aesthetic."
3. "Ensure the `userId` matches the web app's database entries to keep data in sync."

### Phase 3: Live Notification System
1. "Configure `expo-notifications` handlers to display alerts even when the app is in the background."
2. "Write a hook `usePushNotifications` that requests permission and registers the device token to our Supabase backend."
3. "Implement a test notification feature that triggers when a user creates a high-value expense."

### Phase 4: Core UI & Data Sync
1. "Recreate the Dashboard using `FlatList` for performance and `Recharts` equivalent (like `react-native-wagmi-charts` or `victory-native`) for mobile analytics."
2. "Integrate API calls to the existing Next.js backend to Fetch/Create expenses, ensuring the mobile app is a live window into the web's data."

### Phase 5: Premium Polish
1. "Add haptic feedback on every expense entry for a tactile experience."
2. "Use `expo-blur` behind navigation headers to maintain the high-end Glassmorphism of the web app."
