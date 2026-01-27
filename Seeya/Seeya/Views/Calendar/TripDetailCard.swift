import SwiftUI

struct TripDetailCard: View {
    let trip: CalendarTrip
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                // Color accent bar
                RoundedRectangle(cornerRadius: 2)
                    .fill(trip.color)
                    .frame(width: 4, height: 50)

                VStack(alignment: .leading, spacing: 4) {
                    Text(trip.name)
                        .font(.headline)
                        .foregroundStyle(Color.seeyaTextPrimary)
                        .lineLimit(1)

                    Text(dateRangeText)
                        .font(.subheadline)
                        .foregroundStyle(Color.seeyaTextSecondary)

                    if let destination = trip.destination, trip.visibility != .datesOnly && trip.visibility != .busyOnly {
                        Label(destination, systemImage: "mappin")
                            .font(.caption)
                            .foregroundStyle(Color.seeyaTextSecondary)
                            .lineLimit(1)
                    }
                }

                Spacer()

                // Owner avatar (for shared trips)
                if trip.role != .owner {
                    AvatarView(
                        name: trip.owner.fullName,
                        avatarUrl: trip.owner.avatarUrl,
                        size: 32
                    )
                }

                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(Color.seeyaTextTertiary)
            }
            .padding()
            .background(Color(.systemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
        }
        .buttonStyle(.plain)
    }

    private var dateRangeText: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"

        let startStr = formatter.string(from: trip.startDate)
        let endStr = formatter.string(from: trip.endDate)

        let calendar = Calendar.current
        if calendar.isDate(trip.startDate, equalTo: trip.endDate, toGranularity: .day) {
            return startStr
        }

        return "\(startStr) - \(endStr)"
    }
}

// MARK: - Role Badge

struct TripRoleBadge: View {
    let role: TripRole
    let color: Color

    var body: some View {
        Text(roleText)
            .font(.caption)
            .fontWeight(.medium)
            .foregroundStyle(role == .viewing ? Color.seeyaTextSecondary : .black.opacity(0.7))
            .padding(.horizontal, SeeyaSpacing.sm)
            .padding(.vertical, SeeyaSpacing.xxs)
            .background(color.opacity(0.3))
            .clipShape(Capsule())
    }

    private var roleText: String {
        switch role {
        case .owner: return "Your trip"
        case .accepted: return "Accepted"
        case .invited: return "Invited"
        case .viewing: return "Viewing"
        }
    }
}

#Preview {
    VStack(spacing: 16) {
        TripDetailCard(
            trip: CalendarTrip(
                id: UUID(),
                name: "Colorado Ski Trip",
                startDate: Date(),
                endDate: Date().addingTimeInterval(86400 * 7),
                destination: "Aspen, Colorado",
                owner: Profile(
                    id: UUID(),
                    username: nil,
                    fullName: "John Doe",
                    avatarUrl: nil,
                    bio: nil,
                    homeCity: nil,
                    homeCityPlaceId: nil,
                    onboardingCompleted: nil,
                    createdAt: nil,
                    updatedAt: nil
                ),
                role: .owner,
                color: CalendarViewModel.legendColors.yourTrips,
                visibility: .fullDetails
            ),
            onTap: {}
        )

        TripDetailCard(
            trip: CalendarTrip(
                id: UUID(),
                name: "Beach Vacation",
                startDate: Date(),
                endDate: Date().addingTimeInterval(86400 * 5),
                destination: "Miami, Florida",
                owner: Profile(
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
                role: .accepted,
                color: CalendarViewModel.legendColors.accepted,
                visibility: .fullDetails
            ),
            onTap: {}
        )
    }
    .padding()
    .background(Color.seeyaBackground)
}
