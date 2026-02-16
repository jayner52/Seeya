import Foundation
import Supabase
import Realtime

@Observable
@MainActor
final class ChatViewModel {
    var messages: [ChatMessage] = []
    var isLoading = false
    var isSending = false
    var errorMessage: String?
    var currentUserId: UUID?

    private let tripId: UUID
    nonisolated(unsafe) private var realtimeChannel: RealtimeChannelV2?

    init(tripId: UUID) {
        self.tripId = tripId
    }

    deinit {
        let channel = realtimeChannel
        Task { @MainActor in
            if let channel {
                await SupabaseService.shared.client.realtimeV2.removeChannel(channel)
            }
        }
    }

    // MARK: - Fetch Messages

    func fetchMessages() async {
        isLoading = true
        errorMessage = nil

        do {
            currentUserId = try await ChatService.shared.getCurrentUserId()
            messages = try await ChatService.shared.fetchMessages(tripId: tripId)

            // Mark as read when messages are fetched
            try? await ChatService.shared.markAsRead(tripId: tripId)

            print("[ChatViewModel] Fetched \(messages.count) messages for trip \(tripId)")
        } catch {
            print("[ChatViewModel] Error fetching messages: \(error)")
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: - Send Message

    func sendMessage(content: String) async {
        let trimmed = content.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        isSending = true
        errorMessage = nil

        do {
            let message = try await ChatService.shared.sendMessage(tripId: tripId, content: trimmed)
            // Only append if realtime hasn't already delivered it
            if !messages.contains(where: { $0.id == message.id }) {
                messages.append(message)
            }
            print("[ChatViewModel] Sent message: \(message.id)")
        } catch {
            print("[ChatViewModel] Error sending message: \(error)")
            errorMessage = "Failed to send message"
        }

        isSending = false
    }

    // MARK: - Delete Message

    func deleteMessage(_ message: ChatMessage) async {
        do {
            try await ChatService.shared.deleteMessage(messageId: message.id)
            messages.removeAll { $0.id == message.id }
            print("[ChatViewModel] Deleted message: \(message.id)")
        } catch {
            print("[ChatViewModel] Error deleting message: \(error)")
            errorMessage = "Failed to delete message"
        }
    }

    // MARK: - Mark as Read

    func markAsRead() async {
        try? await ChatService.shared.markAsRead(tripId: tripId)
    }

    // MARK: - Realtime Subscription

    func subscribeToMessages() async {
        // Remove existing channel if any
        if let existing = realtimeChannel {
            await SupabaseService.shared.client.realtimeV2.removeChannel(existing)
        }

        let channel = SupabaseService.shared.client.realtimeV2.channel("trip-chat-\(tripId.uuidString)")

        let insertions = channel.postgresChange(
            InsertAction.self,
            schema: "public",
            table: "trip_messages",
            filter: "trip_id=eq.\(tripId.uuidString)"
        )

        let deletions = channel.postgresChange(
            DeleteAction.self,
            schema: "public",
            table: "trip_messages",
            filter: "trip_id=eq.\(tripId.uuidString)"
        )

        self.realtimeChannel = channel

        await channel.subscribe()

        // Listen for inserts in a background task
        Task { [weak self] in
            for await insertion in insertions {
                guard let self = self else { return }
                await self.handleInsert(insertion)
            }
        }

        // Listen for deletes in a background task
        Task { [weak self] in
            for await deletion in deletions {
                guard let self = self else { return }
                await self.handleDelete(deletion)
            }
        }

        print("[ChatViewModel] Subscribed to realtime for trip \(tripId)")
    }

    private func handleInsert(_ action: InsertAction) async {
        do {
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            let record = action.record
            let data = try JSONSerialization.data(withJSONObject: record)
            var message = try decoder.decode(ChatMessage.self, from: data)

            // Fetch sender profile if not included in the realtime payload
            if message.sender == nil {
                let profiles: [Profile] = try await SupabaseService.shared.client
                    .from("profiles")
                    .select()
                    .eq("id", value: message.userId.uuidString)
                    .limit(1)
                    .execute()
                    .value
                message.sender = profiles.first
            }

            // Only append if not already in the list (e.g., from optimistic send)
            if !messages.contains(where: { $0.id == message.id }) {
                messages.append(message)
            }

            // Mark as read since user is viewing the chat
            try? await ChatService.shared.markAsRead(tripId: tripId)
        } catch {
            print("[ChatViewModel] Error handling realtime insert: \(error)")
        }
    }

    private func handleDelete(_ action: DeleteAction) async {
        let oldRecord = action.oldRecord
        if let idString = oldRecord["id"] as? String,
           let messageId = UUID(uuidString: idString) {
            messages.removeAll { $0.id == messageId }
        }
    }

    // MARK: - Unsubscribe

    func unsubscribe() async {
        if let channel = realtimeChannel {
            await SupabaseService.shared.client.realtimeV2.removeChannel(channel)
            realtimeChannel = nil
            print("[ChatViewModel] Unsubscribed from realtime for trip \(tripId)")
        }
    }
}
