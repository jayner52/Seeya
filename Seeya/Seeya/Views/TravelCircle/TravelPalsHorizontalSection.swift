import SwiftUI

struct TravelPalsHorizontalSection: View {
    let travelPals: [Profile]
    let onAddPalTapped: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.sm) {
            SectionHeader(
                title: "Travel Pals",
                icon: "person.2.fill",
                count: travelPals.count,
                action: onAddPalTapped,
                actionIcon: "plus"
            )

            if travelPals.isEmpty {
                emptyState
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: SeeyaSpacing.sm) {
                        ForEach(travelPals) { pal in
                            TravelCircleCard(profile: pal)
                        }
                    }
                    .padding(.horizontal, 1) // Account for shadow clipping
                }
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: SeeyaSpacing.sm) {
            Image(systemName: "person.2")
                .font(.system(size: 40))
                .foregroundStyle(.tertiary)
            Text("No travel pals yet")
                .font(SeeyaTypography.bodyMedium)
                .foregroundStyle(Color.seeyaTextSecondary)
            Text("Add friends to share trips and recommendations")
                .font(SeeyaTypography.caption)
                .foregroundStyle(Color.seeyaTextTertiary)
                .multilineTextAlignment(.center)

            Button {
                onAddPalTapped()
            } label: {
                Label("Add Travel Pal", systemImage: "plus")
                    .font(SeeyaTypography.labelMedium)
            }
            .buttonStyle(SeeyaSecondaryButtonStyle())
            .padding(.top, SeeyaSpacing.xs)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, SeeyaSpacing.xl)
        .seeyaCard()
    }
}

#Preview("With Pals") {
    TravelPalsHorizontalSection(
        travelPals: [
            Profile(id: UUID(), username: "ashley", fullName: "Ashley Chin", avatarUrl: nil, bio: nil, homeCity: nil, homeCityPlaceId: nil, onboardingCompleted: true, createdAt: nil, updatedAt: nil),
            Profile(id: UUID(), username: "shayan", fullName: "Shayan M", avatarUrl: nil, bio: nil, homeCity: nil, homeCityPlaceId: nil, onboardingCompleted: true, createdAt: nil, updatedAt: nil),
            Profile(id: UUID(), username: "christian", fullName: "Christian P", avatarUrl: nil, bio: nil, homeCity: nil, homeCityPlaceId: nil, onboardingCompleted: true, createdAt: nil, updatedAt: nil)
        ],
        onAddPalTapped: {}
    )
    .padding()
    .background(Color.seeyaBackground)
}

#Preview("Empty") {
    TravelPalsHorizontalSection(
        travelPals: [],
        onAddPalTapped: {}
    )
    .padding()
    .background(Color.seeyaBackground)
}
