import SwiftUI

struct TravelCircleCard: View {
    let profile: Profile
    var avatarSize: CGFloat = 56
    var onTap: (() -> Void)? = nil

    var body: some View {
        Button {
            onTap?()
        } label: {
            VStack(spacing: SeeyaSpacing.xs) {
                AvatarView(
                    name: profile.fullName,
                    avatarUrl: profile.avatarUrl,
                    size: avatarSize
                )

                VStack(spacing: 2) {
                    Text(profile.fullName)
                        .font(SeeyaTypography.labelMedium)
                        .foregroundStyle(Color.seeyaTextPrimary)
                        .lineLimit(1)
                        .multilineTextAlignment(.center)

                    if let username = profile.username {
                        Text("@\(username)")
                            .font(SeeyaTypography.caption)
                            .foregroundStyle(Color.seeyaTextSecondary)
                            .lineLimit(1)
                    }
                }
            }
            .frame(width: 80)
            .padding(.vertical, SeeyaSpacing.sm)
            .padding(.horizontal, SeeyaSpacing.xs)
            .seeyaCard()
        }
        .buttonStyle(.plain)
        .disabled(onTap == nil)
    }
}

#Preview {
    HStack {
        TravelCircleCard(
            profile: Profile(
                id: UUID(),
                username: "ashleychin",
                fullName: "Ashley Chin",
                avatarUrl: nil,
                bio: nil,
                homeCity: nil,
                homeCityPlaceId: nil,
                onboardingCompleted: true,
                createdAt: nil,
                updatedAt: nil
            )
        )
        TravelCircleCard(
            profile: Profile(
                id: UUID(),
                username: "shayan",
                fullName: "Shayan Mirzazadeh",
                avatarUrl: nil,
                bio: nil,
                homeCity: nil,
                homeCityPlaceId: nil,
                onboardingCompleted: true,
                createdAt: nil,
                updatedAt: nil
            )
        )
    }
    .padding()
    .background(Color.seeyaBackground)
}
