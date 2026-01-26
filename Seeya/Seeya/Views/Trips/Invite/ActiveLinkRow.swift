import SwiftUI

struct ActiveLinkRow: View {
    let link: TripInviteLink
    let onCopy: () -> Void
    let onDelete: () -> Void

    @State private var showDeleteConfirmation = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                // Link code
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Image(systemName: "link")
                            .font(.subheadline)
                            .foregroundStyle(Color.seeyaPurple)

                        Text(link.code)
                            .font(.system(.subheadline, design: .monospaced))
                            .fontWeight(.medium)

                        // Expired badge
                        if link.isExpired {
                            Text("Expired")
                                .font(SeeyaTypography.captionSmall)
                                .foregroundStyle(.red)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.red.opacity(0.1))
                                .clipShape(Capsule())
                        }
                    }

                    // Details
                    HStack(spacing: 12) {
                        // Coverage
                        HStack(spacing: 4) {
                            Image(systemName: link.isFullTrip ? "globe" : "mappin")
                                .font(.caption2)
                            Text(link.isFullTrip ? "Full trip" : "\(link.locationIds?.count ?? 0) legs")
                                .font(SeeyaTypography.caption)
                        }
                        .foregroundStyle(.secondary)

                        // Usage count
                        HStack(spacing: 4) {
                            Image(systemName: "person.2")
                                .font(.caption2)
                            Text("\(link.usageCount) used")
                                .font(SeeyaTypography.caption)
                        }
                        .foregroundStyle(.secondary)

                        // Expiration
                        if let expiresAt = link.expiresAt {
                            HStack(spacing: 4) {
                                Image(systemName: "clock")
                                    .font(.caption2)
                                Text(formatExpiration(expiresAt))
                                    .font(SeeyaTypography.caption)
                            }
                            .foregroundStyle(link.isExpired ? .red : .secondary)
                        }
                    }
                }

                Spacer()

                // Actions
                HStack(spacing: 8) {
                    // Copy button
                    Button(action: onCopy) {
                        Image(systemName: "doc.on.doc")
                            .font(.body)
                            .foregroundStyle(Color.seeyaPurple)
                            .frame(width: 36, height: 36)
                            .background(Color.seeyaPurple.opacity(0.1))
                            .clipShape(Circle())
                    }
                    .disabled(link.isExpired)
                    .opacity(link.isExpired ? 0.5 : 1)

                    // Delete button
                    Button {
                        showDeleteConfirmation = true
                    } label: {
                        Image(systemName: "trash")
                            .font(.body)
                            .foregroundStyle(.red)
                            .frame(width: 36, height: 36)
                            .background(Color.red.opacity(0.1))
                            .clipShape(Circle())
                    }
                }
            }
        }
        .padding()
        .confirmationDialog(
            "Delete Link",
            isPresented: $showDeleteConfirmation,
            titleVisibility: .visible
        ) {
            Button("Delete", role: .destructive) {
                onDelete()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Are you sure you want to delete this invite link? Anyone with this link will no longer be able to join.")
        }
    }

    // MARK: - Helpers

    private func formatExpiration(_ date: Date) -> String {
        if date < Date() {
            return "Expired"
        }

        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

#Preview {
    VStack {
        ActiveLinkRow(
            link: TripInviteLink(
                tripId: UUID(),
                createdBy: UUID(),
                code: "ABC12345",
                expiresAt: Date().addingTimeInterval(7 * 24 * 60 * 60),
                locationIds: nil,
                usageCount: 3
            ),
            onCopy: {},
            onDelete: {}
        )

        ActiveLinkRow(
            link: TripInviteLink(
                tripId: UUID(),
                createdBy: UUID(),
                code: "XYZ98765",
                expiresAt: Date().addingTimeInterval(-1),
                locationIds: [UUID(), UUID()],
                usageCount: 5
            ),
            onCopy: {},
            onDelete: {}
        )
    }
    .padding()
    .background(Color.seeyaBackground)
}
