import Foundation
import Supabase

@Observable
@MainActor
final class NotificationViewModel {
    var notifications: [AppNotification] = []
    var unreadCount: Int = 0
    var isLoading = false
    var error: String?

    func fetchNotifications() async {
        do {
            let session = try await SupabaseService.shared.client.auth.session
            let userId = session.user.id

            isLoading = notifications.isEmpty
            let fetched = try await NotificationService.shared.fetchNotifications(userId: userId)
            notifications = fetched
            unreadCount = fetched.filter { !$0.isRead }.count
            isLoading = false
        } catch {
            print("❌ [NotificationVM] Error fetching notifications: \(error)")
            self.error = error.localizedDescription
            isLoading = false
        }
    }

    func fetchUnreadCount() async {
        do {
            let session = try await SupabaseService.shared.client.auth.session
            unreadCount = try await NotificationService.shared.fetchUnreadCount(userId: session.user.id)
        } catch {
            print("❌ [NotificationVM] Error fetching unread count: \(error)")
        }
    }

    func markAsRead(_ notification: AppNotification) async {
        guard !notification.isRead else { return }

        // Optimistic update
        if let index = notifications.firstIndex(where: { $0.id == notification.id }) {
            notifications[index].isRead = true
            unreadCount = max(0, unreadCount - 1)
        }

        do {
            try await NotificationService.shared.markAsRead(notificationId: notification.id)
        } catch {
            // Revert on failure
            if let index = notifications.firstIndex(where: { $0.id == notification.id }) {
                notifications[index].isRead = false
                unreadCount += 1
            }
        }
    }

    func markAllAsRead() async {
        let previousNotifications = notifications
        let previousCount = unreadCount

        // Optimistic update
        for i in notifications.indices {
            notifications[i].isRead = true
        }
        unreadCount = 0

        do {
            let session = try await SupabaseService.shared.client.auth.session
            try await NotificationService.shared.markAllAsRead(userId: session.user.id)
        } catch {
            // Revert on failure
            notifications = previousNotifications
            unreadCount = previousCount
        }
    }

    // MARK: - Grouped by Date

    var todayNotifications: [AppNotification] {
        notifications.filter { isToday($0.createdAt) }
    }

    var yesterdayNotifications: [AppNotification] {
        notifications.filter { isYesterday($0.createdAt) }
    }

    var earlierNotifications: [AppNotification] {
        notifications.filter { !isToday($0.createdAt) && !isYesterday($0.createdAt) }
    }

    private func isToday(_ date: Date?) -> Bool {
        guard let date else { return false }
        return Calendar.current.isDateInToday(date)
    }

    private func isYesterday(_ date: Date?) -> Bool {
        guard let date else { return false }
        return Calendar.current.isDateInYesterday(date)
    }
}
