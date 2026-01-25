import SwiftUI

struct TripSummaryCard: View {
    let trip: Trip

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Trip Title & Description
            if let description = trip.description, !description.isEmpty {
                Text(description)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .italic()
            }

            // Destinations
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: "mappin.and.ellipse")
                    .font(.body)
                    .foregroundStyle(Color.seeyaPurple)
                    .frame(width: 24)

                VStack(alignment: .leading, spacing: 4) {
                    Text("DESTINATIONS")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(.secondary)

                    if let locations = trip.locations, !locations.isEmpty {
                        DestinationsFlowView(locations: locations.sorted { $0.orderIndex < $1.orderIndex })
                    } else {
                        Text("Destination TBD")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            Divider()

            // Dates
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: "calendar")
                    .font(.body)
                    .foregroundStyle(Color.seeyaPurple)
                    .frame(width: 24)

                VStack(alignment: .leading, spacing: 4) {
                    Text("DATES")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(.secondary)

                    Text(trip.fullDateRangeText)
                        .font(.subheadline)

                    Text(trip.tripDurationText)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.seeyaCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
    }
}

// MARK: - Destinations Flow View

struct DestinationsFlowView: View {
    let locations: [TripLocation]

    var body: some View {
        FlowLayout(spacing: 8) {
            ForEach(Array(locations.enumerated()), id: \.element.id) { index, location in
                HStack(spacing: 4) {
                    if index > 0 {
                        Image(systemName: "arrow.right")
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }

                    HStack(spacing: 4) {
                        if let flag = location.flagEmoji {
                            Text(flag)
                                .font(.caption)
                        }
                        Text(location.displayName)
                            .font(.subheadline)
                    }
                }
            }
        }
    }
}

#Preview {
    VStack {
        TripSummaryCard(
            trip: Trip(
                id: UUID(),
                userId: UUID(),
                name: "Mexico Adventure",
                description: "A Mexico multilegged trip",
                startDate: Date(),
                endDate: Date().addingTimeInterval(14 * 24 * 60 * 60),
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

        Spacer()
    }
    .background(Color.seeyaBackground)
}
