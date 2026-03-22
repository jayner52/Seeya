import SwiftUI

struct NotificationCenterView: View {
    @State private var viewModel = NotificationViewModel()
    var onNavigateToTrip: ((UUID) -> Void)?
    var onNavigateToCircle: (() -> Void)?

    var body: some View {
        ScrollView {
            VStack(spacing: SeeyaSpacing.lg) {
                // Header
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Notifications")
                            .font(SeeyaTypography.displayMedium)

                        if viewModel.unreadCount > 0 {
                            Text("\(viewModel.unreadCount) unread")
                                .font(SeeyaTypography.caption)
                                .foregroundStyle(.secondary)
                        }
                    }

                    Spacer()

                    if viewModel.unreadCount > 0 {
                        Button {
                            Task { await viewModel.markAllAsRead() }
                        } label: {
                            Label("Mark all read", systemImage: "checkmark.circle")
                                .font(.subheadline)
                        }
                    }
                }
                .padding(.horizontal)

                if viewModel.isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, minHeight: 200)
                } else if viewModel.notifications.isEmpty {
                    emptyState
                } else {
                    // Grouped notifications
                    if !viewModel.todayNotifications.isEmpty {
                        notificationSection(title: "Today", notifications: viewModel.todayNotifications)
                    }
                    if !viewModel.yesterdayNotifications.isEmpty {
                        notificationSection(title: "Yesterday", notifications: viewModel.yesterdayNotifications)
                    }
                    if !viewModel.earlierNotifications.isEmpty {
                        notificationSection(title: "Earlier", notifications: viewModel.earlierNotifications)
                    }
                }
            }
            .padding(.vertical)
        }
        .background(Color.seeyaBackground)
        .task {
            await viewModel.fetchNotifications()
        }
        .refreshable {
            await viewModel.fetchNotifications()
        }
    }

    // MARK: - Section

    private func notificationSection(title: String, notifications: [AppNotification]) -> some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.sm) {
            Text(title)
                .font(SeeyaTypography.labelMedium)
                .foregroundStyle(.secondary)
                .padding(.horizontal)

            VStack(spacing: 0) {
                ForEach(notifications) { notification in
                    NotificationRow(notification: notification) {
                        Task { await viewModel.markAsRead(notification) }
                        handleNotificationTap(notification)
                    }

                    if notification.id != notifications.last?.id {
                        Divider()
                            .padding(.leading, 60)
                    }
                }
            }
            .background(Color.seeyaCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: SeeyaRadius.card))
            .padding(.horizontal)
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: SeeyaSpacing.md) {
            Image(systemName: "bell.slash")
                .font(.system(size: 48))
                .foregroundStyle(Color(.systemGray3))

            Text("No notifications yet")
                .font(SeeyaTypography.headlineSmall)

            Text("You'll see updates about trips, friends, and messages here")
                .font(SeeyaTypography.bodyLarge)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, SeeyaSpacing.xl)
        .padding(.vertical, 60)
    }

    // MARK: - Navigation

    private func handleNotificationTap(_ notification: AppNotification) {
        switch notification.type {
        case .tripInvite, .tripAccepted, .tripDeclined, .tripMaybe,
             .tripMessage, .tripResource, .tripRecommendation,
             .tripTripbit, .tripUpdated, .joinRequest, .tripbitParticipantAdded, .friendTrip:
            if let tripId = notification.tripId {
                onNavigateToTrip?(tripId)
            }
        case .friendRequest, .friendAccepted:
            onNavigateToCircle?()
        }
    }
}

// MARK: - Notification Row

struct NotificationRow: View {
    let notification: AppNotification
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(alignment: .top, spacing: SeeyaSpacing.sm) {
                // Icon
                Image(systemName: notification.type.iconName)
                    .font(.system(size: 18))
                    .foregroundStyle(notification.isRead ? .secondary : Color.seeyaPurple)
                    .frame(width: 40, height: 40)
                    .background(
                        Circle()
                            .fill(notification.isRead ? Color(.systemGray6) : Color.seeyaPurple.opacity(0.1))
                    )

                // Content
                VStack(alignment: .leading, spacing: 2) {
                    Text(notification.title)
                        .font(notification.isRead ? SeeyaTypography.bodyLarge : SeeyaTypography.bodyMedium)
                        .foregroundStyle(Color.seeyaTextPrimary)

                    if let message = notification.message {
                        Text(message)
                            .font(SeeyaTypography.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(2)
                    }

                    if let createdAt = notification.createdAt {
                        Text(createdAt, style: .relative)
                            .font(.caption2)
                            .foregroundStyle(Color(.systemGray3))
                    }
                }

                Spacer()

                // Unread dot
                if !notification.isRead {
                    Circle()
                        .fill(Color.seeyaPurple)
                        .frame(width: 8, height: 8)
                        .padding(.top, 6)
                }
            }
            .padding(SeeyaSpacing.md)
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    NotificationCenterView()
}
