import SwiftUI

struct CalendarQuickGlance: View {
    let nextTrip: UpcomingTripInfo?
    let onTripTap: () -> Void

    var body: some View {
        if let trip = nextTrip {
            Button(action: onTripTap) {
                HStack(spacing: 12) {
                    // Trip icon
                    ZStack {
                        Circle()
                            .fill(Color.seeyaPurple.opacity(0.1))
                            .frame(width: 44, height: 44)
                        Image(systemName: "airplane.departure")
                            .font(.system(size: 18))
                            .foregroundStyle(Color.seeyaPurple)
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        Text("Next: \(trip.name)")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(Color.seeyaTextPrimary)
                            .lineLimit(1)

                        HStack(spacing: 8) {
                            Text(countdownText(trip.daysUntil))
                                .font(.caption.weight(.medium))
                                .foregroundStyle(countdownColor(trip.daysUntil))

                            Text("\u{2022}")
                                .foregroundStyle(Color.seeyaTextTertiary)

                            Text(trip.dateRange)
                                .font(.caption)
                                .foregroundStyle(Color.seeyaTextSecondary)
                        }

                        if let destination = trip.destination {
                            Text(destination)
                                .font(.caption)
                                .foregroundStyle(Color.seeyaTextTertiary)
                                .lineLimit(1)
                        }
                    }

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Color.seeyaTextTertiary)
                }
                .padding()
                .background(Color.seeyaCardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
            }
            .buttonStyle(.plain)
        }
    }

    private func countdownText(_ days: Int) -> String {
        switch days {
        case 0: return "Today!"
        case 1: return "Tomorrow"
        default: return "\(days) days"
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
            nextTrip: UpcomingTripInfo(
                id: UUID(),
                name: "Colorado Ski Trip",
                destination: "Aspen, CO",
                startDate: Date().addingTimeInterval(86400 * 12),
                endDate: Date().addingTimeInterval(86400 * 19),
                daysUntil: 12
            ),
            onTripTap: {}
        )

        CalendarQuickGlance(
            nextTrip: UpcomingTripInfo(
                id: UUID(),
                name: "Beach Getaway",
                destination: "Miami, FL",
                startDate: Date().addingTimeInterval(86400 * 2),
                endDate: Date().addingTimeInterval(86400 * 5),
                daysUntil: 2
            ),
            onTripTap: {}
        )

        CalendarQuickGlance(
            nextTrip: UpcomingTripInfo(
                id: UUID(),
                name: "Weekend Trip",
                destination: nil,
                startDate: Date(),
                endDate: Date().addingTimeInterval(86400 * 2),
                daysUntil: 0
            ),
            onTripTap: {}
        )
    }
    .padding()
    .background(Color.seeyaBackground)
}
