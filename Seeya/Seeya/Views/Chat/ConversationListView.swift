import SwiftUI
import Supabase

struct ConversationListView: View {
    @State private var conversations: [ConversationPreview] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var searchText = ""

    var filteredConversations: [ConversationPreview] {
        if searchText.isEmpty {
            return conversations
        }
        return conversations.filter { conversation in
            conversation.trip.name.localizedCaseInsensitiveContains(searchText)
                || conversation.trip.destination.localizedCaseInsensitiveContains(searchText)
        }
    }

    var body: some View {
        NavigationStack {
            Group {
                if isLoading && conversations.isEmpty {
                    loadingState
                } else if conversations.isEmpty {
                    emptyState
                } else {
                    conversationList
                }
            }
            .background(Color.seeyaBackground)
            .navigationTitle("Messages")
            .searchable(text: $searchText, prompt: "Search trips...")
            .refreshable {
                await loadConversations()
            }
        }
        .task {
            await loadConversations()
        }
    }

    // MARK: - Loading State

    private var loadingState: some View {
        VStack {
            Spacer()
            ProgressView()
                .scaleEffect(1.2)
            Text("Loading conversations...")
                .font(SeeyaTypography.bodySmall)
                .foregroundStyle(.secondary)
                .padding(.top, SeeyaSpacing.xs)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Empty State

    private var emptyState: some View {
        EmptyStateView(
            icon: "bubble.left.and.bubble.right",
            title: "No Conversations",
            message: "Chat with your travel companions! Conversations appear here for trips you're part of."
        )
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Conversation List

    private var conversationList: some View {
        List {
            ForEach(filteredConversations) { conversation in
                NavigationLink {
                    TripChatView(
                        tripId: conversation.trip.id,
                        tripName: conversation.trip.name
                    )
                } label: {
                    ConversationRow(conversation: conversation)
                }
                .listRowBackground(Color.seeyaCardBackground)
                .listRowSeparator(.hidden)
                .listRowInsets(EdgeInsets(
                    top: SeeyaSpacing.xxs,
                    leading: SeeyaSpacing.md,
                    bottom: SeeyaSpacing.xxs,
                    trailing: SeeyaSpacing.md
                ))
            }
        }
        .listStyle(.plain)
    }

    // MARK: - Load Conversations

    private func loadConversations() async {
        isLoading = true
        errorMessage = nil

        do {
            let userId = try await ChatService.shared.getCurrentUserId()

            // Fetch trips the user owns
            let ownedTrips: [Trip] = try await SupabaseService.shared.client
                .from("trips")
                .select("*, trip_locations(*, cities(*, countries(*))), trip_participants(*, profiles:profiles!trip_participants_user_id_fkey(*))")
                .eq("user_id", value: userId.uuidString)
                .execute()
                .value

            // Fetch trips the user participates in
            let participatingTrips: [Trip] = try await SupabaseService.shared.client
                .from("trips")
                .select("*, trip_locations(*, cities(*, countries(*))), trip_participants!inner(*, profiles:profiles!trip_participants_user_id_fkey(*))")
                .eq("trip_participants.user_id", value: userId.uuidString)
                .neq("user_id", value: userId.uuidString)
                .execute()
                .value

            // Combine and deduplicate
            var allTrips = ownedTrips
            for trip in participatingTrips {
                if !allTrips.contains(where: { $0.id == trip.id }) {
                    allTrips.append(trip)
                }
            }

            guard !allTrips.isEmpty else {
                conversations = []
                isLoading = false
                return
            }

            let tripIds = allTrips.map { $0.id }

            // Fetch last messages and unread counts in parallel
            async let lastMessagesTask = ChatService.shared.fetchLastMessages(tripIds: tripIds)
            async let unreadCountsTask = ChatService.shared.fetchUnreadCounts(tripIds: tripIds)

            let lastMessages = try await lastMessagesTask
            let unreadCounts = try await unreadCountsTask

            // Build conversation previews
            var previews: [ConversationPreview] = allTrips.map { trip in
                ConversationPreview(
                    trip: trip,
                    lastMessage: lastMessages[trip.id],
                    unreadCount: unreadCounts[trip.id] ?? 0
                )
            }

            // Sort: trips with most recent messages first, then trips without messages
            previews.sort { a, b in
                let dateA = a.lastMessageDate ?? .distantPast
                let dateB = b.lastMessageDate ?? .distantPast
                return dateA > dateB
            }

            conversations = previews
            print("[ConversationListView] Loaded \(conversations.count) conversations")
        } catch {
            print("[ConversationListView] Error loading conversations: \(error)")
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}

// MARK: - Conversation Row

private struct ConversationRow: View {
    let conversation: ConversationPreview

    var body: some View {
        HStack(spacing: SeeyaSpacing.sm) {
            // Trip icon / flag
            tripIcon

            // Text content
            VStack(alignment: .leading, spacing: SeeyaSpacing.xxs) {
                // Trip name + time
                HStack {
                    Text(conversation.trip.name)
                        .font(SeeyaTypography.headlineSmall)
                        .foregroundStyle(.primary)
                        .lineLimit(1)

                    Spacer()

                    if let date = conversation.lastMessageDate {
                        Text(relativeTime(date))
                            .font(SeeyaTypography.captionSmall)
                            .foregroundStyle(.tertiary)
                    }
                }

                // Last message preview + unread badge
                HStack {
                    Text(conversation.lastMessageText)
                        .font(SeeyaTypography.bodySmall)
                        .foregroundStyle(
                            conversation.unreadCount > 0
                                ? Color.primary
                                : Color.seeyaTextTertiary
                        )
                        .fontWeight(conversation.unreadCount > 0 ? .medium : .regular)
                        .lineLimit(2)

                    Spacer()

                    if conversation.unreadCount > 0 {
                        unreadBadge
                    }
                }
            }
        }
        .padding(.vertical, SeeyaSpacing.xs)
    }

    // MARK: - Trip Icon

    private var tripIcon: some View {
        ZStack {
            if let flag = conversation.trip.locations?.first?.flagEmoji {
                Text(flag)
                    .font(.title2)
                    .frame(width: 48, height: 48)
                    .background(Color.seeyaCardBackground)
                    .clipShape(Circle())
            } else {
                Image(systemName: "airplane")
                    .font(.system(size: SeeyaIconSize.medium))
                    .foregroundStyle(Color.seeyaPurple)
                    .frame(width: 48, height: 48)
                    .background(Color.seeyaPurple.opacity(0.1))
                    .clipShape(Circle())
            }
        }
    }

    // MARK: - Unread Badge

    private var unreadBadge: some View {
        Text(conversation.unreadCount > 99 ? "99+" : "\(conversation.unreadCount)")
            .font(SeeyaTypography.captionSmall)
            .fontWeight(.bold)
            .foregroundStyle(.white)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(Color.seeyaPurple)
            .clipShape(Capsule())
    }

    // MARK: - Relative Time

    private func relativeTime(_ date: Date) -> String {
        let calendar = Calendar.current
        let now = Date()
        let interval = now.timeIntervalSince(date)

        if interval < 60 {
            return "Now"
        } else if interval < 3600 {
            let minutes = Int(interval / 60)
            return "\(minutes)m"
        } else if calendar.isDateInToday(date) {
            let formatter = DateFormatter()
            formatter.dateFormat = "h:mm a"
            return formatter.string(from: date)
        } else if calendar.isDateInYesterday(date) {
            return "Yesterday"
        } else if interval < 7 * 24 * 3600 {
            let formatter = DateFormatter()
            formatter.dateFormat = "EEE"
            return formatter.string(from: date)
        } else {
            let formatter = DateFormatter()
            formatter.dateFormat = "MMM d"
            return formatter.string(from: date)
        }
    }
}

// MARK: - Preview

#Preview {
    ConversationListView()
}
