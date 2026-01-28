# Seeya Web App & Invite Service

A full-featured web application with marketing website, built with Next.js 14 (App Router). Includes trip preview, invite acceptance, authentication, and a complete marketing site.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js 14 (App Router)                      │
├─────────────────────────────────────────────────────────────────┤
│  (marketing)          │  (auth)           │  (app)              │
│  ─────────────        │  ─────            │  ─────              │
│  / (homepage)         │  /login           │  /trips             │
│  /features            │  /signup          │  /trips/[id]        │
│  /about               │                   │  /circle            │
│  /download            │                   │  /profile           │
├───────────────────────┼───────────────────┼─────────────────────┤
│  /invite/[code]       │  API Routes (/api/*)                    │
│  (public + auth flow) │  invites, auth callback                 │
├─────────────────────────────────────────────────────────────────┤
│                    Supabase (shared with iOS)                    │
│           PostgreSQL  │  Auth  │  Storage  │  Realtime          │
└─────────────────────────────────────────────────────────────────┘
```

## Features

### Phase 1: Trip Preview & Invite Acceptance ✅
- Rich trip preview with destinations, dates, and participants
- Accept invites on web with login/signup flow
- Deep link support for iOS app

### Phase 2: Marketing Website ✅
- Homepage with hero, features, and CTAs
- Features page with detailed breakdowns
- About page
- Download page with platform options

### Phase 3: Core Trip Management ✅
- Trips list view
- Trip detail with itinerary
- Protected routes with authentication

### Phase 4: Social Features (Placeholder) ✅
- Travel Circle page
- Profile page

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI | Custom components |
| State (client) | Zustand |
| State (server) | TanStack Query |
| Auth | Supabase Auth + @supabase/ssr |
| Forms | React Hook Form + Zod |
| Icons | Lucide React |
| Dates | date-fns |

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_STORE_URL=https://apps.apple.com/app/seeya/id123456789
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the marketing site.

### 4. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

## Routes

### Public Routes
- `/` - Marketing homepage
- `/features` - Features page
- `/about` - About page
- `/download` - Download page
- `/invite/[code]` - Invite preview and accept

### Auth Routes
- `/login` - Sign in
- `/signup` - Create account

### Protected Routes (require authentication)
- `/trips` - Trips list
- `/trips/[id]` - Trip detail
- `/circle` - Travel circle
- `/profile` - User profile

### API Routes
- `GET /api/invites/[code]` - Get invite details
- `POST /api/invites/accept` - Accept invite
- `GET /api/auth/callback` - OAuth callback

## Universal Links (iOS)

### Configure in `public/.well-known/apple-app-site-association`:
- Replace `TEAMID` with your Apple Developer Team ID
- Replace `com.seeya.app` with your bundle identifier

### In Xcode:
1. Add "Associated Domains" capability
2. Add domain: `applinks:seeya-invite.vercel.app`

## File Structure

```
seeya-invite/
├── app/
│   ├── (marketing)/       # Public marketing pages
│   ├── (auth)/            # Login/signup
│   ├── (app)/             # Protected app pages
│   ├── invite/[code]/     # Invite flow
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   ├── providers.tsx      # QueryClient, Auth context
│   └── globals.css        # Tailwind + theme
├── components/
│   ├── ui/                # Base components
│   ├── marketing/         # Marketing components
│   └── invite/            # Invite components
├── lib/
│   ├── supabase/          # Supabase clients
│   ├── api/               # API helpers
│   └── utils/             # Utilities
├── stores/                # Zustand stores
├── types/                 # TypeScript types
├── middleware.ts          # Auth protection
└── tailwind.config.ts     # Tailwind config
```

## Testing

### Phase 1 Testing
1. Open `/invite/TESTCODE` - see trip preview
2. Click "Accept Invite" - redirected to login if not authenticated
3. Login/signup - complete auth flow
4. Accept invite - confirmed, redirected to trip detail

### General Testing
- Run `npm run dev` and test all routes
- Test auth flow end-to-end
- Test on mobile browser (responsive)
- Verify `apple-app-site-association` still served correctly

## Migration Notes

- Legacy `pages/` directory kept for backward compatibility during transition
- Existing `.well-known/apple-app-site-association` preserved in `public/`
- Both App Router and Pages Router work simultaneously
