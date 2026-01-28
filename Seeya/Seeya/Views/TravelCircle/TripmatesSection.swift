import SwiftUI

struct TripmatesSection: View {
    let tripmates: [Profile]
    let sentRequestIds: Set<UUID>
    let onAddAsPal: (Profile) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.sm) {
            SectionHeader(
                title: "Tripmates",
                icon: "airplane",
                count: tripmates.count
            )

            TravelCircleInfoBox()

            if tripmates.isEmpty {
                emptyState
            } else {
                VStack(spacing: 0) {
                    ForEach(tripmates) { tripmate in
                        TripmateRow(
                            profile: tripmate,
                            isPending: sentRequestIds.contains(tripmate.id),
                            onAddAsPal: { onAddAsPal(tripmate) }
                        )

                        if tripmate.id != tripmates.last?.id {
                            Divider()
                                .padding(.leading, 44 + SeeyaSpacing.sm)
                        }
                    }
                }
                .padding(SeeyaSpacing.sm)
                .seeyaCard()
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: SeeyaSpacing.sm) {
            Image(systemName: "airplane")
                .font(.system(size: 40))
                .foregroundStyle(.tertiary)
            Text("No tripmates yet")
                .font(SeeyaTypography.bodyMedium)
                .foregroundStyle(Color.seeyaTextSecondary)
            Text("Tripmates appear after you travel with others")
                .font(SeeyaTypography.caption)
                .foregroundStyle(Color.seeyaTextTertiary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, SeeyaSpacing.xl)
        .seeyaCard()
    }
}

#Preview("With Tripmates") {
    TripmatesSection(
        tripmates: [
            Profile(id: UUID(), username: "traveler1", fullName: "Jane Traveler", avatarUrl: nil, bio: nil, homeCity: nil, homeCityPlaceId: nil, onboardingCompleted: true, createdAt: nil, updatedAt: nil),
            Profile(id: UUID(), username: "explorer2", fullName: "John Explorer", avatarUrl: nil, bio: nil, homeCity: nil, homeCityPlaceId: nil, onboardingCompleted: true, createdAt: nil, updatedAt: nil)
        ],
        sentRequestIds: [],
        onAddAsPal: { _ in }
    )
    .padding()
    .background(Color.seeyaBackground)
}

#Preview("Empty") {
    TripmatesSection(
        tripmates: [],
        sentRequestIds: [],
        onAddAsPal: { _ in }
    )
    .padding()
    .background(Color.seeyaBackground)
}
