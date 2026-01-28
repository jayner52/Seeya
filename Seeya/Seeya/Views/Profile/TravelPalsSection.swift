import SwiftUI

struct TravelPalsSection: View {
    let friends: [Profile]

    private let columns = [
        GridItem(.flexible(), spacing: SeeyaSpacing.sm),
        GridItem(.flexible(), spacing: SeeyaSpacing.sm),
        GridItem(.flexible(), spacing: SeeyaSpacing.sm),
        GridItem(.flexible(), spacing: SeeyaSpacing.sm)
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.sm) {
            // Header with count
            SectionHeader(title: "Travel Pals", icon: "person.2.fill", count: friends.count)

            if friends.isEmpty {
                // Empty state
                VStack(spacing: SeeyaSpacing.sm) {
                    Image(systemName: "person.2")
                        .font(.system(size: 40))
                        .foregroundStyle(.tertiary)
                    Text("No travel pals yet")
                        .font(SeeyaTypography.bodyMedium)
                        .foregroundStyle(Color.seeyaTextSecondary)
                    Text("Connect with friends to plan trips together")
                        .font(SeeyaTypography.caption)
                        .foregroundStyle(Color.seeyaTextTertiary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, SeeyaSpacing.xl)
                .seeyaCard()
            } else {
                // Grid of travel pals
                LazyVGrid(columns: columns, spacing: SeeyaSpacing.sm) {
                    ForEach(friends, id: \.id) { friend in
                        TravelPalCard(profile: friend)
                    }
                }
            }
        }
    }
}

struct TravelPalCard: View {
    let profile: Profile

    var body: some View {
        VStack(spacing: SeeyaSpacing.xs) {
            AvatarView(
                name: profile.fullName,
                avatarUrl: profile.avatarUrl,
                size: 48
            )

            VStack(spacing: 2) {
                Text(profile.fullName)
                    .font(SeeyaTypography.labelMedium)
                    .lineLimit(1)
                    .multilineTextAlignment(.center)

                if let username = profile.username {
                    Text("@\(username)")
                        .font(SeeyaTypography.captionSmall)
                        .foregroundStyle(Color.seeyaTextSecondary)
                        .lineLimit(1)
                }
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, SeeyaSpacing.sm)
        .padding(.horizontal, SeeyaSpacing.xxs)
        .seeyaCard()
    }
}

#Preview {
    TravelPalsSection(friends: [
        Profile(id: UUID(), username: "ashleychin", fullName: "Ashley Chin", avatarUrl: nil, bio: nil, homeCity: nil, homeCityPlaceId: nil, onboardingCompleted: true, createdAt: nil, updatedAt: nil),
        Profile(id: UUID(), username: "christianpaekau", fullName: "CP", avatarUrl: nil, bio: nil, homeCity: nil, homeCityPlaceId: nil, onboardingCompleted: true, createdAt: nil, updatedAt: nil),
        Profile(id: UUID(), username: "lovable_judges", fullName: "She Builds", avatarUrl: nil, bio: nil, homeCity: nil, homeCityPlaceId: nil, onboardingCompleted: true, createdAt: nil, updatedAt: nil),
        Profile(id: UUID(), username: "Test123", fullName: "Test123", avatarUrl: nil, bio: nil, homeCity: nil, homeCityPlaceId: nil, onboardingCompleted: true, createdAt: nil, updatedAt: nil),
        Profile(id: UUID(), username: "shayanmirzazadeh", fullName: "Shayan Mirzazadeh", avatarUrl: nil, bio: nil, homeCity: nil, homeCityPlaceId: nil, onboardingCompleted: true, createdAt: nil, updatedAt: nil),
        Profile(id: UUID(), username: "ianroberts", fullName: "Ian Roberts", avatarUrl: nil, bio: nil, homeCity: nil, homeCityPlaceId: nil, onboardingCompleted: true, createdAt: nil, updatedAt: nil)
    ])
    .padding()
}
