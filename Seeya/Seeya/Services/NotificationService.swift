import Foundation
import Supabase

actor NotificationService {
    static let shared = NotificationService()

    private init() {}

    // MARK: - Fetch Notifications

    func fetchNotifications(userId: UUID, limit: Int = 50) async throws -> [AppNotification] {
        let response: [AppNotification] = try await SupabaseService.shared.client
            .from("notifications")
            .select("""
                *,
                from_user:profiles!notifications_from_user_id_fkey (id, full_name, avatar_url),
                trips!notifications_trip_id_fkey (id, name)
            """)
            .eq("user_id", value: userId.uuidString)
            .order("created_at", ascending: false)
            .limit(limit)
            .execute()
            .value

        return response
    }

    // MARK: - Unread Count

    func fetchUnreadCount(userId: UUID) async throws -> Int {
        let response = try await SupabaseService.shared.client
            .from("notifications")
            .select("id", head: true, count: .exact)
            .eq("user_id", value: userId.uuidString)
            .eq("is_read", value: false)
            .execute()

        return response.count ?? 0
    }

    // MARK: - Mark as Read

    func markAsRead(notificationId: UUID) async throws {
        try await SupabaseService.shared.client
            .from("notifications")
            .update(["is_read": true])
            .eq("id", value: notificationId.uuidString)
            .execute()
    }

    func markAllAsRead(userId: UUID) async throws {
        try await SupabaseService.shared.client
            .from("notifications")
            .update(["is_read": true])
            .eq("user_id", value: userId.uuidString)
            .eq("is_read", value: false)
            .execute()
    }
}
