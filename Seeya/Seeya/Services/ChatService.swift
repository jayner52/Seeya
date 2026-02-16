import Foundation
import Supabase
import Realtime

/// Service for trip group chat operations using Supabase
actor ChatService {
    static let shared = ChatService()

    private let client = SupabaseService.shared.client

    private init() {}

    // MARK: - Fetch Messages

    /// Fetches all messages for a trip, ordered chronologically, with sender profiles joined.
    func fetchMessages(tripId: UUID) async throws -> [ChatMessage] {
        let messages: [ChatMessage] = try await client
            .from("trip_messages")
            .select("*, profiles:profiles!trip_messages_user_id_fkey(*)")
            .eq("trip_id", value: tripId.uuidString)
            .order("created_at", ascending: true)
            .execute()
            .value

        return messages
    }

    // MARK: - Send Message

    /// Sends a new chat message and returns the created message with sender profile.
    func sendMessage(tripId: UUID, content: String) async throws -> ChatMessage {
        let session = try await client.auth.session
        let userId = session.user.id

        let newMessage = CreateChatMessage(
            tripId: tripId,
            userId: userId,
            content: content
        )

        let created: ChatMessage = try await client
            .from("trip_messages")
            .insert(newMessage)
            .select("*, profiles:profiles!trip_messages_user_id_fkey(*)")
            .single()
            .execute()
            .value

        return created
    }

    // MARK: - Delete Message

    /// Deletes a message by its ID. RLS policies enforce that only the author can delete.
    func deleteMessage(messageId: UUID) async throws {
        try await client
            .from("trip_messages")
            .delete()
            .eq("id", value: messageId.uuidString)
            .execute()
    }

    // MARK: - Mark as Read

    /// Upserts the current user's last-read timestamp for a trip chat.
    func markAsRead(tripId: UUID) async throws {
        let session = try await client.auth.session
        let userId = session.user.id

        let readRecord = UpsertChatRead(
            userId: userId,
            tripId: tripId,
            lastReadAt: Date()
        )

        try await client
            .from("trip_chat_reads")
            .upsert(readRecord, onConflict: "user_id,trip_id")
            .execute()
    }

    // MARK: - Unread Counts

    /// Fetches unread message counts for a set of trip IDs.
    /// Compares each trip's message timestamps against the user's last-read timestamp.
    func fetchUnreadCounts(tripIds: [UUID]) async throws -> [UUID: Int] {
        guard !tripIds.isEmpty else { return [:] }

        let session = try await client.auth.session
        let userId = session.user.id

        // Fetch user's read timestamps for these trips
        let reads: [ChatRead] = try await client
            .from("trip_chat_reads")
            .select()
            .eq("user_id", value: userId.uuidString)
            .in("trip_id", values: tripIds.map { $0.uuidString })
            .execute()
            .value

        let readMap = Dictionary(uniqueKeysWithValues: reads.map { ($0.tripId, $0.lastReadAt) })

        var unreadCounts: [UUID: Int] = [:]

        for tripId in tripIds {
            if let lastRead = readMap[tripId] {
                // Count messages after last-read timestamp
                let formatter = ISO8601DateFormatter()
                formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                let lastReadString = formatter.string(from: lastRead)

                struct CountResult: Decodable {
                    let count: Int

                    enum CodingKeys: String, CodingKey {
                        case count
                    }

                    init(from decoder: Decoder) throws {
                        let container = try decoder.container(keyedBy: CodingKeys.self)
                        // Supabase returns count as an integer or string depending on context
                        if let intVal = try? container.decode(Int.self, forKey: .count) {
                            count = intVal
                        } else if let strVal = try? container.decode(String.self, forKey: .count),
                                  let parsed = Int(strVal) {
                            count = parsed
                        } else {
                            count = 0
                        }
                    }
                }

                // Use head:true with count to get just the count without row data
                let messages: [ChatMessage] = try await client
                    .from("trip_messages")
                    .select("id")
                    .eq("trip_id", value: tripId.uuidString)
                    .gt("created_at", value: lastReadString)
                    .neq("user_id", value: userId.uuidString)
                    .execute()
                    .value

                unreadCounts[tripId] = messages.count
            } else {
                // No read record: count all messages from other users
                let messages: [ChatMessage] = try await client
                    .from("trip_messages")
                    .select("id, trip_id, user_id, content")
                    .eq("trip_id", value: tripId.uuidString)
                    .neq("user_id", value: userId.uuidString)
                    .execute()
                    .value

                unreadCounts[tripId] = messages.count
            }
        }

        return unreadCounts
    }

    // MARK: - Fetch Last Messages

    /// Fetches the most recent message for each of the given trip IDs.
    func fetchLastMessages(tripIds: [UUID]) async throws -> [UUID: ChatMessage] {
        guard !tripIds.isEmpty else { return [:] }

        var lastMessages: [UUID: ChatMessage] = [:]

        for tripId in tripIds {
            let messages: [ChatMessage] = try await client
                .from("trip_messages")
                .select("*, profiles:profiles!trip_messages_user_id_fkey(*)")
                .eq("trip_id", value: tripId.uuidString)
                .order("created_at", ascending: false)
                .limit(1)
                .execute()
                .value

            if let lastMessage = messages.first {
                lastMessages[tripId] = lastMessage
            }
        }

        return lastMessages
    }

    // MARK: - Current User ID

    /// Returns the currently authenticated user's ID.
    func getCurrentUserId() async throws -> UUID {
        let session = try await client.auth.session
        return session.user.id
    }
}

// MARK: - Errors

enum ChatServiceError: Error, LocalizedError {
    case notAuthenticated
    case messageSendFailed
    case fetchFailed

    var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "You must be signed in to use chat"
        case .messageSendFailed:
            return "Failed to send message"
        case .fetchFailed:
            return "Failed to load messages"
        }
    }
}
