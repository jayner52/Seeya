import SwiftUI

struct ProfileHeaderView: View {
    let profile: Profile?
    let onEditTapped: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            // Edit button row
            HStack {
                Spacer()
                Button(action: onEditTapped) {
                    HStack(spacing: SeeyaSpacing.xxs) {
                        Image(systemName: "pencil")
                            .font(.system(size: SeeyaIconSize.small))
                        Text("Edit Profile")
                            .font(SeeyaTypography.caption)
                    }
                    .foregroundStyle(Color.seeyaTextSecondary)
                    .padding(.horizontal, SeeyaSpacing.sm)
                    .padding(.vertical, SeeyaSpacing.xs)
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                }
            }
            .padding(.bottom, SeeyaSpacing.sm)

            // Profile info row
            HStack(spacing: SeeyaSpacing.md) {
                // Avatar
                AvatarView(
                    name: profile?.fullName ?? "User",
                    avatarUrl: profile?.avatarUrl,
                    size: 80
                )

                // Name and details
                VStack(alignment: .leading, spacing: SeeyaSpacing.xs) {
                    Text(profile?.fullName ?? "User")
                        .font(SeeyaTypography.displayMedium)

                    if let username = profile?.username {
                        Text("@\(username)")
                            .font(SeeyaTypography.bodyMedium)
                            .foregroundStyle(Color.seeyaTextSecondary)
                    }

                    // Badges
                    HStack(spacing: SeeyaSpacing.xs) {
                        HStack(spacing: SeeyaSpacing.xxs) {
                            Image(systemName: "airplane")
                                .font(.system(size: SeeyaIconSize.small))
                            Text("Travel Pal")
                                .font(SeeyaTypography.caption)
                        }
                        .foregroundStyle(Color.seeyaPurple)
                        .padding(.horizontal, SeeyaSpacing.xs)
                        .padding(.vertical, SeeyaSpacing.xxs)
                        .background(Color.seeyaPurple.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 4))

                        if let createdAt = profile?.createdAt {
                            Text("Member since \(createdAt.formatted(.dateTime.month(.abbreviated).year()))")
                                .font(SeeyaTypography.caption)
                                .foregroundStyle(Color.seeyaTextSecondary)
                        }
                    }
                }

                Spacer()
            }
        }
        .padding(SeeyaSpacing.md)
        .background(Color.seeyaCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
    }
}

#Preview {
    ProfileHeaderView(
        profile: Profile(
            id: UUID(),
            username: "jayneingramroberts",
            fullName: "Jayne Ingram-Roberts",
            avatarUrl: nil,
            bio: "Love exploring new places!",
            homeCity: "San Francisco, CA",
            homeCityPlaceId: nil,
            onboardingCompleted: true,
            createdAt: Date(),
            updatedAt: nil
        ),
        onEditTapped: {}
    )
    .padding()
}
