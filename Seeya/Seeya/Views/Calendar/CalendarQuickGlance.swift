import SwiftUI

struct CalendarQuickGlance: View {
    let upcomingTrips: [UpcomingTripInfo]
    let onTripTap: (UpcomingTripInfo) -> Void

    var body: some View {
        if !upcomingTrips.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                // Header
                HStack {
                    Image(systemName: "airplane.departure")
                        .font(.system(size: 14))
                        .foregroundStyle(Color.seeyaPurple)
                    Text("Upcoming Trips")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Color.seeyaTextPrimary)
                    Spacer()
                }
                .padding(.horizontal)
                .padding(.top, 12)

                // Trip list
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(upcomingTrips) { trip in
                            UpcomingTripCard(trip: trip) {
                                onTripTap(trip)
                            }
                        }
                    }
                    .padding(.horizontal)
                    .padding(.bottom, 12)
                }
            }
            .background(Color.seeyaCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
        }
    }
}

struct UpcomingTripCard: View {
    let trip: UpcomingTripInfo
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 6) {
                // Countdown badge
                Text(countdownText(trip.daysUntil))
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(countdownColor(trip.daysUntil))
                    .clipShape(Capsule())

                // Trip name
                Text(trip.name)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(Color.seeyaTextPrimary)
                    .lineLimit(1)

                // Date range
                Text(trip.dateRange)
                    .font(.caption)
                    .foregroundStyle(Color.seeyaTextSecondary)

                // Destination
                if let destination = trip.destination {
                    HStack(spacing: 4) {
                        Image(systemName: "mappin")
                            .font(.system(size: 10))
                        Text(destination)
                            .lineLimit(1)
                    }
                    .font(.caption)
                    .foregroundStyle(Color.seeyaTextTertiary)
                }
            }
            .padding(12)
            .frame(width: 140, alignment: .leading)
            .background(Color.seeyaSurface)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
        .buttonStyle(.plain)
    }

    private func countdownText(_ days: Int) -> String {
        switch days {
        case 0: return "Today!"
        case 1: return "Tomorrow"
        default: return "In \(days) days"
        }
    }

    private func countdownColor(_ days: Int) -> Color {
        switch days {
        case 0...3: return .red
        case 4...7: return .orange
        default: return .seeyaPurple
        }
    }
}

#Preview {
    VStack(spacing: 16) {
        CalendarQuickGlance(
            upcomingTrips: [
                UpcomingTripInfo(
                    id: UUID(),
                    name: "Colorado Ski Trip",
                    destination: "Aspen, CO",
                    startDate: Date().addingTimeInterval(86400 * 12),
                    endDate: Date().addingTimeInterval(86400 * 19),
                    daysUntil: 12
                ),
                UpcomingTripInfo(
                    id: UUID(),
                    name: "Beach Getaway",
                    destination: "Miami, FL",
                    startDate: Date().addingTimeInterval(86400 * 20),
                    endDate: Date().addingTimeInterval(86400 * 25),
                    daysUntil: 20
                ),
                UpcomingTripInfo(
                    id: UUID(),
                    name: "Weekend Trip",
                    destination: "Austin, TX",
                    startDate: Date().addingTimeInterval(86400 * 2),
                    endDate: Date().addingTimeInterval(86400 * 4),
                    daysUntil: 2
                )
            ],
            onTripTap: { _ in }
        )
    }
    .padding()
    .background(Color.seeyaBackground)
}
