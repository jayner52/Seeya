import SwiftUI

struct PendingRequestsView: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var viewModel: TravelCircleViewModel

    @State private var processingRequestId: UUID?

    var body: some View {
        NavigationStack {
            List {
                if !viewModel.pendingRequests.isEmpty {
                    incomingRequestsSection
                }

                if !viewModel.sentRequests.isEmpty {
                    sentRequestsSection
                }

                if viewModel.pendingRequests.isEmpty && viewModel.sentRequests.isEmpty {
                    emptyState
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Friend Requests")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }

    private var incomingRequestsSection: some View {
        Section {
            ForEach(viewModel.pendingRequests) { request in
                if let requester = request.requester {
                    IncomingRequestRow(
                        profile: requester,
                        isProcessing: processingRequestId == request.id,
                        onAccept: { acceptRequest(request) },
                        onDecline: { declineRequest(request) }
                    )
                }
            }
        } header: {
            Text("Incoming Requests")
        }
    }

    private var sentRequestsSection: some View {
        Section {
            ForEach(viewModel.sentRequests) { request in
                if let addressee = request.addressee {
                    SentRequestRow(profile: addressee)
                }
            }
        } header: {
            Text("Sent Requests")
        } footer: {
            Text("Waiting for response")
        }
    }

    private var emptyState: some View {
        Section {
            VStack(spacing: SeeyaSpacing.md) {
                Image(systemName: "bell.slash")
                    .font(.system(size: 40))
                    .foregroundStyle(.tertiary)

                Text("No pending requests")
                    .font(SeeyaTypography.bodyMedium)
                    .foregroundStyle(Color.seeyaTextSecondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, SeeyaSpacing.xl)
        }
    }

    private func acceptRequest(_ request: Friendship) {
        processingRequestId = request.id

        Task {
            _ = await viewModel.acceptRequest(request)
            processingRequestId = nil
        }
    }

    private func declineRequest(_ request: Friendship) {
        processingRequestId = request.id

        Task {
            _ = await viewModel.declineRequest(request)
            processingRequestId = nil
        }
    }
}

private struct IncomingRequestRow: View {
    let profile: Profile
    let isProcessing: Bool
    let onAccept: () -> Void
    let onDecline: () -> Void

    var body: some View {
        HStack(spacing: SeeyaSpacing.sm) {
            AvatarView(
                name: profile.fullName,
                avatarUrl: profile.avatarUrl,
                size: 44
            )

            VStack(alignment: .leading, spacing: 2) {
                Text(profile.fullName)
                    .font(SeeyaTypography.bodyMedium)
                    .foregroundStyle(Color.seeyaTextPrimary)

                if let username = profile.username {
                    Text("@\(username)")
                        .font(SeeyaTypography.caption)
                        .foregroundStyle(Color.seeyaTextSecondary)
                }
            }

            Spacer()

            if isProcessing {
                ProgressView()
                    .scaleEffect(0.8)
            } else {
                HStack(spacing: SeeyaSpacing.xs) {
                    Button {
                        onDecline()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: SeeyaIconSize.medium, weight: .semibold))
                            .foregroundStyle(.red)
                            .padding(SeeyaSpacing.xs)
                            .background(Color.red.opacity(0.1))
                            .clipShape(Circle())
                    }
                    .buttonStyle(.plain)

                    Button {
                        onAccept()
                    } label: {
                        Image(systemName: "checkmark")
                            .font(.system(size: SeeyaIconSize.medium, weight: .semibold))
                            .foregroundStyle(Color.seeyaSuccess)
                            .padding(SeeyaSpacing.xs)
                            .background(Color.seeyaSuccess.opacity(0.1))
                            .clipShape(Circle())
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .contentShape(Rectangle())
    }
}

private struct SentRequestRow: View {
    let profile: Profile

    var body: some View {
        HStack(spacing: SeeyaSpacing.sm) {
            AvatarView(
                name: profile.fullName,
                avatarUrl: profile.avatarUrl,
                size: 44
            )

            VStack(alignment: .leading, spacing: 2) {
                Text(profile.fullName)
                    .font(SeeyaTypography.bodyMedium)
                    .foregroundStyle(Color.seeyaTextPrimary)

                if let username = profile.username {
                    Text("@\(username)")
                        .font(SeeyaTypography.caption)
                        .foregroundStyle(Color.seeyaTextSecondary)
                }
            }

            Spacer()

            Text("Pending")
                .font(SeeyaTypography.caption)
                .foregroundStyle(Color.seeyaTextSecondary)
                .padding(.horizontal, SeeyaSpacing.xs)
                .padding(.vertical, SeeyaSpacing.xxs)
                .background(Color(.systemGray6))
                .clipShape(Capsule())
        }
        .contentShape(Rectangle())
    }
}

#Preview {
    PendingRequestsView(viewModel: TravelCircleViewModel())
}
