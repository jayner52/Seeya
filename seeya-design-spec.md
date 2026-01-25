# Seeya iOS App - Design Specification for Claude Code

## Overview
Seeya (formerly Roamwyth) is a private travel network for friends. Users can create trips, invite friends, share recommendations, and see where their friends are traveling.

## Design Style
- Clean, minimal aesthetic with warm cream/beige backgrounds
- Rounded corners on cards and buttons
- Purple accent color for the logo/branding
- Black primary buttons
- Soft shadows on cards
- Sans-serif typography

## Database Schema (Supabase)

### Enums
- `visibility_level`: only_me, busy_only, dates_only, location_only, full_details
- `participation_status`: invited, confirmed, declined
- `recommendation_category`: restaurant, activity, stay, tip
- `friendship_status`: pending, accepted, declined

### Tables
1. **profiles**: id, username, full_name, avatar_url, bio, created_at, updated_at
2. **trips**: id, owner_id, name, destination, start_date, end_date, visibility, description, created_at, updated_at
3. **trip_participants**: id, trip_id, user_id, status, invited_at, responded_at
4. **trip_recommendations**: id, trip_id, user_id, title, description, category, created_at
5. **friendships**: id, requester_id, addressee_id, status, created_at, updated_at

## App Screens

### 1. Authentication
- **Login Screen**
  - Logo at top (purple circle with "roamwyth" text)
  - "Welcome back" heading
  - "Continue with Google" button
  - "or continue with email" divider
  - Sign In / Sign Up tab toggle
  - Email input field
  - Password input field
  - Black "Sign In" button
  - Terms of Service / Privacy Policy links
  - "Log in as Jayne" demo button at bottom
  - Tagline: "A private travel network for real friends"

### 2. Main Tab Bar
Three tabs at bottom:
- **Trips** (airplane icon) - Main trips list
- **Friends** (people icon) - Friends list and requests
- **Profile** (person icon) - User profile and settings

### 3. Trips List Screen (Home)
- Header: "My Trips" with + button to create new trip
- **Trip Cards** showing:
  - Destination name (large text)
  - Date range (e.g., "Jun 15 - Jun 22, 2026")
  - Trip name
  - Participant avatars (small circles)
  - Participant count text (e.g., "3 friends going")
  - Visibility indicator if not full_details
- Sections:
  - "Upcoming Trips" - trips starting soon
  - "Past Trips" - completed trips
- Pull to refresh
- Empty state: "No trips yet. Create your first trip!"

### 4. Create Trip Screen
- Modal/sheet presentation
- Form fields:
  - Trip Name (text input)
  - Destination (text input, could use location autocomplete)
  - Start Date (date picker)
  - End Date (date picker)
  - Description (multiline text, optional)
  - Visibility picker:
    - "Only me" - Private
    - "Show I'm busy" - Friends see you're traveling
    - "Show dates" - Friends see when
    - "Show destination" - Friends see where
    - "Full details" - Friends see everything
- "Create Trip" button
- Cancel button in nav bar

### 5. Trip Detail Screen
- Header with trip name and destination
- Date range prominently displayed
- Description (if any)
- Owner badge if current user owns the trip

- **Participants Section**
  - "Who's Going" header with invite button (+)
  - List of participants with:
    - Avatar
    - Name
    - Status badge (Organizer / Confirmed / Invited / Declined)
  - Invite friends sheet when + tapped

- **Recommendations Section**
  - "Recommendations" header with add button (+)
  - Category filter pills: All, Restaurants, Activities, Stays, Tips
  - Recommendation cards:
    - Category icon
    - Title
    - Description (truncated)
    - Added by (user name)
  - Empty state: "No recommendations yet. Add the first one!"

- **Actions** (if owner):
  - Edit trip
  - Delete trip (with confirmation)

### 6. Add Recommendation Sheet
- Category picker (Restaurant, Activity, Stay, Tip)
- Title input
- Description input (optional)
- "Add Recommendation" button

### 7. Invite Friends Sheet
- Search bar to filter friends
- List of friends with:
  - Avatar
  - Name
  - Checkmark if already invited/confirmed
- "Send Invites" button

### 8. Trip Invitation View
- Shows when user has pending invitations
- Trip details preview
- "I'm Going!" button (confirms)
- "Can't Make It" button (declines)

### 9. Friends Screen
- **Pending Requests Section** (if any)
  - Friend request cards with Accept/Decline buttons
- **Friends List**
  - Search bar
  - List of friends with:
    - Avatar
    - Name
    - Username
  - Tap to view friend's profile
- **Add Friend** button
  - Search by username
  - Send friend request

### 10. Profile Screen
- User avatar (large, editable)
- Full name
- Username
- Bio
- Stats: X trips, X friends
- "Edit Profile" button
- "Sign Out" button (red text)
- Settings link

## Key User Flows

### Creating a Trip
1. Tap + on Trips screen
2. Fill in trip details
3. Tap Create
4. Redirected to Trip Detail
5. Tap + on Participants to invite friends
6. Select friends and send invites

### Responding to Invitation
1. See invitation in Trips list (highlighted card)
2. Tap to view details
3. Tap "I'm Going!" or "Can't Make It"
4. If confirmed, trip appears in regular list

### Adding Recommendation
1. Open trip detail
2. Scroll to Recommendations
3. Tap +
4. Select category
5. Enter title and description
6. Tap Add

### Adding Friend
1. Go to Friends tab
2. Tap Add Friend
3. Search username
4. Tap Send Request
5. Wait for acceptance

## SwiftUI Implementation Notes

### Navigation
- Use NavigationStack for drill-down
- Use .sheet() for modals (Create Trip, Add Recommendation)
- TabView for main navigation

### Data Flow
- Use @Observable ViewModels
- SupabaseService.shared.client for all API calls
- Async/await for network requests
- @MainActor for UI updates

### Styling
- Create a custom Color extension for brand colors
- Use .clipShape(RoundedRectangle(cornerRadius: 12)) for cards
- Light shadow: .shadow(color: .black.opacity(0.05), radius: 5, y: 2)

### Supabase Queries
```swift
// Fetch user's trips (owned + participating)
let trips = try await supabase
    .from("trips")
    .select("*, trip_participants(*)")
    .or("owner_id.eq.\(userId),trip_participants.user_id.eq.\(userId)")
    .execute()

// Fetch trip with participants and recommendations
let trip = try await supabase
    .from("trips")
    .select("*, trip_participants(*, user:profiles(*)), trip_recommendations(*, user:profiles(*))")
    .eq("id", tripId)
    .single()
    .execute()

// Create trip
let newTrip = try await supabase
    .from("trips")
    .insert(CreateTrip(...))
    .select()
    .single()
    .execute()

// Invite participant
let participant = try await supabase
    .from("trip_participants")
    .insert(InviteParticipant(tripId: tripId, userId: friendId))
    .execute()

// Update participation status
try await supabase
    .from("trip_participants")
    .update(["status": "confirmed", "responded_at": Date()])
    .eq("id", participantId)
    .execute()
```
