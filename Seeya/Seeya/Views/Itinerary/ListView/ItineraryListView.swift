import SwiftUI

struct ItineraryListView: View {
    @Bindable var viewModel: TripPackViewModel
    let trip: Trip

    var body: some View {
        VStack(spacing: 16) {
            if viewModel.tripBitsByDate.isEmpty {
                emptyStateView
            } else {
                ForEach(trip.allDatesInTrip, id: \.self) { date in
                    ItineraryDaySection(
                        date: date,
                        tripBits: viewModel.sortedTripBits(for: date),
                        trip: trip,
                        onTripBitTap: { tripBit in
                            viewModel.selectTripBit(tripBit)
                        }
                    )
                }
            }
        }
    }

    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "calendar.badge.exclamationmark")
                .font(.system(size: 48))
                .foregroundStyle(.tertiary)

            VStack(spacing: 4) {
                Text("No Events Yet")
                    .font(.headline)

                Text("Add flights, stays, and activities to see them here.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(40)
        .frame(maxWidth: .infinity)
        .background(Color.seeyaCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
    }
}

// MARK: - Itinerary Day Section

struct ItineraryDaySection: View {
    let date: Date
    let tripBits: [TripBit]
    let trip: Trip
    let onTripBitTap: (TripBit) -> Void

    private var isToday: Bool {
        Calendar.current.isDateInToday(date)
    }

    private var dayOfTrip: Int? {
        guard let startDate = trip.startDate else { return nil }
        let calendar = Calendar.current
        let days = calendar.dateComponents([.day], from: calendar.startOfDay(for: startDate), to: calendar.startOfDay(for: date)).day
        return (days ?? 0) + 1
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Day Header
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 8) {
                        Text(formattedDate)
                            .font(.headline)

                        if isToday {
                            Text("TODAY")
                                .font(.caption2)
                                .fontWeight(.bold)
                                .foregroundStyle(.white)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.seeyaPurple)
                                .clipShape(Capsule())
                        }
                    }

                    if let day = dayOfTrip {
                        Text("Day \(day)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                // Event count badge
                if !tripBits.isEmpty {
                    Text("\(tripBits.count) event\(tripBits.count == 1 ? "" : "s")")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            // Events or Empty State
            if tripBits.isEmpty {
                HStack {
                    Image(systemName: "sun.max")
                        .foregroundStyle(.tertiary)
                    Text("Free day")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(.systemGray6).opacity(0.5))
                .clipShape(RoundedRectangle(cornerRadius: 8))
            } else {
                // Timeline of events
                VStack(spacing: 0) {
                    ForEach(Array(tripBits.enumerated()), id: \.element.id) { index, tripBit in
                        ItineraryEventRow(
                            tripBit: tripBit,
                            isFirst: index == 0,
                            isLast: index == tripBits.count - 1,
                            onTap: { onTripBitTap(tripBit) }
                        )
                    }
                }
                .background(Color.seeyaCardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
            }
        }
    }

    private var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE, MMMM d"
        return formatter.string(from: date)
    }
}

// MARK: - Itinerary Event Row

struct ItineraryEventRow: View {
    let tripBit: TripBit
    let isFirst: Bool
    let isLast: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(alignment: .top, spacing: 12) {
                // Timeline indicator
                VStack(spacing: 0) {
                    // Top line
                    Rectangle()
                        .fill(isFirst ? Color.clear : Color(.systemGray4))
                        .frame(width: 2, height: 12)

                    // Category dot
                    Circle()
                        .fill(tripBit.category.color)
                        .frame(width: 12, height: 12)
                        .overlay(
                            Image(systemName: tripBit.category.icon)
                                .font(.system(size: 6))
                                .foregroundStyle(.white)
                        )

                    // Bottom line
                    Rectangle()
                        .fill(isLast ? Color.clear : Color(.systemGray4))
                        .frame(width: 2)
                }
                .frame(width: 12)

                // Event Content
                VStack(alignment: .leading, spacing: 4) {
                    // Time
                    if !tripBit.formattedTime.isEmpty {
                        Text(tripBit.formattedTime)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    // Title
                    Text(tripBit.title)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(.primary)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)

                    // Category & Status
                    HStack(spacing: 8) {
                        // Category badge
                        HStack(spacing: 4) {
                            Image(systemName: tripBit.category.icon)
                                .font(.caption2)
                            Text(tripBit.category.displayName)
                                .font(.caption2)
                        }
                        .foregroundStyle(tripBit.category.color)

                        // Status badge if not confirmed
                        if tripBit.displayStatus != .confirmed {
                            StatusBadge(
                                text: tripBit.displayStatus.displayName,
                                color: tripBit.displayStatus.color
                            )
                        }

                        // Travelers
                        Text(tripBit.assignedTravelerNames)
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }

                    // Location if available
                    if let location = tripBit.location {
                        HStack(spacing: 4) {
                            Image(systemName: "mappin")
                                .font(.caption2)
                            Text(location.displayName)
                                .font(.caption)
                        }
                        .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                // Chevron
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
            .padding()
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)

        if !isLast {
            Divider()
                .padding(.leading, 36)
        }
    }
}

#Preview {
    ScrollView {
        ItineraryListView(
            viewModel: TripPackViewModel(tripId: UUID()),
            trip: Trip(
                id: UUID(),
                userId: UUID(),
                name: "Mexico Trip",
                description: nil,
                startDate: Date(),
                endDate: Date().addingTimeInterval(7 * 24 * 60 * 60),
                isFlexible: false,
                visibility: .fullDetails,
                isPast: false,
                createdAt: Date(),
                updatedAt: Date(),
                locations: nil,
                participants: nil,
                owner: nil,
                recommendations: nil,
                tripTypes: nil
            )
        )
        .padding()
    }
    .background(Color.seeyaBackground)
}
