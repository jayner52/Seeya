import SwiftUI

struct TripmateRow: View {
    let profile: Profile
    let isPending: Bool
    let onAddAsPal: () -> Void

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

            if isPending {
                Text("Pending")
                    .font(SeeyaTypography.caption)
                    .foregroundStyle(Color.seeyaTextSecondary)
                    .padding(.horizontal, SeeyaSpacing.xs)
                    .padding(.vertical, SeeyaSpacing.xxs)
                    .background(Color(.systemGray6))
                    .clipShape(Capsule())
            } else {
                Button {
                    onAddAsPal()
                } label: {
                    Text("Add as Pal")
                        .font(SeeyaTypography.labelMedium)
                        .foregroundStyle(Color.seeyaPurple)
                        .padding(.horizontal, SeeyaSpacing.sm)
                        .padding(.vertical, SeeyaSpacing.xs)
                        .background(Color.seeyaPurple.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.vertical, SeeyaSpacing.xs)
    }
}

#Preview {
    VStack(spacing: 0) {
        TripmateRow(
            profile: Profile(
                id: UUID(),
                username: "traveler123",
                fullName: "Jane Traveler",
                avatarUrl: nil,
                bio: nil,
                homeCity: nil,
                homeCityPlaceId: nil,
                onboardingCompleted: true,
                createdAt: nil,
                updatedAt: nil
            ),
            isPending: false,
            onAddAsPal: {}
        )
        Divider()
        TripmateRow(
            profile: Profile(
                id: UUID(),
                username: "explorer",
                fullName: "John Explorer",
                avatarUrl: nil,
                bio: nil,
                homeCity: nil,
                homeCityPlaceId: nil,
                onboardingCompleted: true,
                createdAt: nil,
                updatedAt: nil
            ),
            isPending: true,
            onAddAsPal: {}
        )
    }
    .padding()
    .background(Color.seeyaBackground)
}
