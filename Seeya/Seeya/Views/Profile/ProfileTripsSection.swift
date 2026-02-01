import SwiftUI

struct ProfileTripsSection: View {
    let upcomingTrips: [Trip]
    let pastTrips: [Trip]
    @Bindable var tripsViewModel: TripsViewModel

    @State private var selectedTab = 0

    private let columns = [
        GridItem(.flexible(), spacing: SeeyaSpacing.sm),
        GridItem(.flexible(), spacing: SeeyaSpacing.sm)
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.sm) {
            // Header with icon and count
            SectionHeader(title: "Upcoming Trips", icon: "suitcase.fill", count: upcomingTrips.count)

            let trips = upcomingTrips

            if trips.isEmpty {
                // Empty state
                VStack(spacing: SeeyaSpacing.sm) {
                    Image(systemName: "airplane")
                        .font(.system(size: 40))
                        .foregroundStyle(.tertiary)
                    Text("No upcoming trips")
                        .font(SeeyaTypography.bodyMedium)
                        .foregroundStyle(Color.seeyaTextSecondary)
                    Text("Start planning your next adventure!")
                        .font(SeeyaTypography.caption)
                        .foregroundStyle(Color.seeyaTextTertiary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, SeeyaSpacing.xl)
                .seeyaCard()
            } else {
                LazyVGrid(columns: columns, spacing: SeeyaSpacing.sm) {
                    ForEach(trips, id: \.id) { trip in
                        NavigationLink {
                            TripDetailView(viewModel: tripsViewModel, trip: trip)
                        } label: {
                            ProfileTripCard(trip: trip)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }

            // Past trips section
            if !pastTrips.isEmpty {
                SectionHeader(title: "Past Trips", icon: "clock.arrow.circlepath", count: pastTrips.count)
                    .padding(.top, SeeyaSpacing.xs)

                LazyVGrid(columns: columns, spacing: SeeyaSpacing.sm) {
                    ForEach(pastTrips, id: \.id) { trip in
                        NavigationLink {
                            TripDetailView(viewModel: tripsViewModel, trip: trip)
                        } label: {
                            ProfileTripCard(trip: trip)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }
}

struct ProfileTripCard: View {
    let trip: Trip

    var body: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.xs) {
            // Trip name with emoji (if available)
            Text(trip.name)
                .font(SeeyaTypography.headlineSmall)
                .lineLimit(2)
                .multilineTextAlignment(.leading)

            Spacer()

            // Location with icon
            HStack(spacing: SeeyaSpacing.xs) {
                Image(systemName: "mappin")
                    .font(.system(size: SeeyaIconSize.small))
                    .foregroundStyle(Color.seeyaTextSecondary)
                Text(trip.destination)
                    .font(SeeyaTypography.caption)
                    .foregroundStyle(Color.seeyaTextSecondary)
                    .lineLimit(1)
            }

            // Date with icon
            HStack(spacing: SeeyaSpacing.xs) {
                Image(systemName: "calendar")
                    .font(.system(size: SeeyaIconSize.small))
                    .foregroundStyle(Color.seeyaTextSecondary)
                Text(trip.dateRangeText)
                    .font(SeeyaTypography.caption)
                    .foregroundStyle(Color.seeyaTextSecondary)
            }
        }
        .frame(maxWidth: .infinity, minHeight: 100, alignment: .leading)
        .padding(SeeyaSpacing.md)
        .seeyaCard()
    }
}

#Preview {
    NavigationStack {
        ProfileTripsSection(
            upcomingTrips: [],
            pastTrips: [],
            tripsViewModel: TripsViewModel()
        )
        .padding()
    }
}
