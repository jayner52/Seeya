import SwiftUI

struct PalChip: View {
    let pal: TravelPalWithTrips
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 6) {
                AvatarView(
                    name: pal.profile.fullName,
                    avatarUrl: pal.profile.avatarUrl,
                    size: 28
                )
                .overlay(
                    Circle()
                        .strokeBorder(pal.color, lineWidth: 2)
                )
                .grayscale(pal.isEnabled ? 0 : 1)
                .opacity(pal.isEnabled ? 1 : 0.5)

                if pal.isEnabled {
                    Text(firstName)
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(Color.seeyaTextPrimary)
                }
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 6)
            .background(pal.isEnabled ? pal.color.opacity(0.15) : Color(.systemGray6))
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(pal.profile.fullName), \(pal.tripCount) trips, \(pal.isEnabled ? "showing" : "hidden")")
        .accessibilityHint("Double tap to \(pal.isEnabled ? "hide" : "show") this pal's trips")
    }

    private var firstName: String {
        pal.profile.fullName.split(separator: " ").first.map(String.init) ?? pal.profile.fullName
    }
}

// MARK: - Filter Chip (for "All" toggle)

struct CalendarFilterChip: View {
    let label: String
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            Text(label)
                .font(.subheadline.weight(.medium))
                .foregroundStyle(isSelected ? .white : Color.seeyaTextSecondary)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(isSelected ? Color.seeyaPurple : Color(.systemGray6))
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    VStack(spacing: 20) {
        HStack(spacing: 8) {
            CalendarFilterChip(label: "All", isSelected: true, onTap: {})
            CalendarFilterChip(label: "All", isSelected: false, onTap: {})
        }

        HStack(spacing: 8) {
            PalChip(
                pal: TravelPalWithTrips(
                    id: UUID(),
                    profile: Profile(
                        id: UUID(),
                        username: nil,
                        fullName: "Sarah Smith",
                        avatarUrl: nil,
                        bio: nil,
                        homeCity: nil,
                        homeCityPlaceId: nil,
                        onboardingCompleted: nil,
                        createdAt: nil,
                        updatedAt: nil
                    ),
                    tripCount: 3,
                    color: CalendarViewModel.palColors[0],
                    isEnabled: true
                ),
                onTap: {}
            )

            PalChip(
                pal: TravelPalWithTrips(
                    id: UUID(),
                    profile: Profile(
                        id: UUID(),
                        username: nil,
                        fullName: "Mike Johnson",
                        avatarUrl: nil,
                        bio: nil,
                        homeCity: nil,
                        homeCityPlaceId: nil,
                        onboardingCompleted: nil,
                        createdAt: nil,
                        updatedAt: nil
                    ),
                    tripCount: 2,
                    color: CalendarViewModel.palColors[1],
                    isEnabled: false
                ),
                onTap: {}
            )
        }
    }
    .padding()
    .background(Color.seeyaBackground)
}
