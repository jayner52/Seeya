import SwiftUI

struct CalendarDetailPanel: View {
    let selectedDate: Date
    let trips: [CalendarTrip]
    let onCreateTrip: (Date) -> Void
    var onViewFullTrip: ((UUID) -> Void)? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Selected date header
            Text(selectedDate, format: .dateTime.weekday(.wide).month().day())
                .font(.headline)
                .foregroundStyle(Color.seeyaTextSecondary)

            if trips.isEmpty {
                emptyState
            } else {
                // Trip cards with navigation
                ScrollView {
                    VStack(spacing: 12) {
                        ForEach(trips) { trip in
                            NavigationLink(destination: CalendarTripDetailView(trip: trip, onViewFullTrip: onViewFullTrip)) {
                                TripDetailCardRow(trip: trip)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }

            Spacer()

            // Quick action
            Button {
                onCreateTrip(selectedDate)
            } label: {
                Label("Plan a Trip", systemImage: "plus")
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Color.seeyaPurple)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
        .padding()
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "calendar.badge.plus")
                .font(.system(size: 40))
                .foregroundStyle(Color.seeyaTextTertiary)

            Text("No trips on this day")
                .font(.subheadline)
                .foregroundStyle(Color.seeyaTextSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.vertical, SeeyaSpacing.xl)
    }
}

// MARK: - Bottom Sheet Wrapper (for iPhone)

struct CalendarDetailSheet: View {
    @Binding var selectedDate: Date?
    @Bindable var viewModel: CalendarViewModel
    var onNavigateToTrip: ((UUID) -> Void)?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            if let date = selectedDate {
                CalendarDetailPanel(
                    selectedDate: date,
                    trips: viewModel.trips(for: date),
                    onCreateTrip: { startDate in
                        dismiss()
                        // Slight delay to allow sheet to dismiss before showing new one
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                            viewModel.createTripStartDate = startDate
                            viewModel.showCreateTripSheet = true
                        }
                    },
                    onViewFullTrip: { tripId in
                        dismiss()
                        onNavigateToTrip?(tripId)
                    }
                )
                .navigationTitle("Trips")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Done") {
                            dismiss()
                        }
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }
}

// MARK: - Side Panel Wrapper (for iPad)

struct CalendarDetailSidePanel: View {
    let selectedDate: Date?
    @Bindable var viewModel: CalendarViewModel

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 0) {
                // Header
                HStack {
                    Text("Selected Day")
                        .font(SeeyaTypography.headlineSmall)
                        .foregroundStyle(Color.seeyaTextPrimary)
                    Spacer()
                }
                .padding(.horizontal, SeeyaSpacing.md)
                .padding(.vertical, SeeyaSpacing.sm)

                Divider()

                if let date = selectedDate {
                    CalendarDetailPanel(
                        selectedDate: date,
                        trips: viewModel.trips(for: date),
                        onCreateTrip: { startDate in
                            viewModel.createTripStartDate = startDate
                            viewModel.showCreateTripSheet = true
                        }
                    )
                } else {
                    VStack(spacing: 12) {
                        Image(systemName: "hand.tap")
                            .font(.system(size: 40))
                            .foregroundStyle(Color.seeyaTextTertiary)

                        Text("Tap a day to see trips")
                            .font(.subheadline)
                            .foregroundStyle(Color.seeyaTextSecondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .padding()
                }
            }
        }
        .background(Color.seeyaCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
    }
}

// MARK: - Trip Detail Card Row (for NavigationLink)

struct TripDetailCardRow: View {
    let trip: CalendarTrip

    var body: some View {
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

// MARK: - Calendar Trip Detail View

struct CalendarTripDetailView: View {
    let trip: CalendarTrip
    var onViewFullTrip: ((UUID) -> Void)? = nil
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ScrollView {
            VStack(spacing: SeeyaSpacing.md) {
                // Color indicator
                RoundedRectangle(cornerRadius: 4)
                    .fill(trip.color)
                    .frame(height: 8)

                VStack(alignment: .leading, spacing: SeeyaSpacing.md) {
                    // Trip name
                    Text(trip.name)
                        .font(SeeyaTypography.headlineLarge)
                        .foregroundStyle(Color.seeyaTextPrimary)

                    // Destination
                    if let destination = trip.destination, trip.visibility != .datesOnly {
                        HStack(spacing: SeeyaSpacing.xs) {
                            Image(systemName: "mappin.circle.fill")
                                .foregroundStyle(Color.seeyaPurple)
                            Text(destination)
                                .font(SeeyaTypography.bodyMedium)
                                .foregroundStyle(Color.seeyaTextSecondary)
                        }
                    }

                    // Dates
                    if trip.visibility != .locationOnly {
                        HStack(spacing: SeeyaSpacing.xs) {
                            Image(systemName: "calendar")
                                .foregroundStyle(Color.seeyaPurple)
                            Text(dateRangeText)
                                .font(SeeyaTypography.bodyMedium)
                                .foregroundStyle(Color.seeyaTextSecondary)
                        }
                    }

                    // Owner info (for shared trips)
                    if trip.role != .owner {
                        Divider()

                        HStack(spacing: SeeyaSpacing.sm) {
                            AvatarView(
                                name: trip.owner.fullName,
                                avatarUrl: trip.owner.avatarUrl,
                                size: 40
                            )
                            VStack(alignment: .leading) {
                                Text(trip.owner.fullName)
                                    .font(SeeyaTypography.bodyMedium)
                                    .foregroundStyle(Color.seeyaTextPrimary)
                                Text("Trip organizer")
                                    .font(SeeyaTypography.caption)
                                    .foregroundStyle(Color.seeyaTextSecondary)
                            }
                        }
                    }

                    // Role badge
                    TripRoleBadge(role: trip.role, color: trip.color)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, SeeyaSpacing.md)
            }
            .padding(.vertical, SeeyaSpacing.md)
        }
        .navigationTitle("Trip Details")
        .navigationBarTitleDisplayMode(.inline)
        .safeAreaInset(edge: .bottom) {
            // View trip button (not for viewing role)
            if trip.role != .viewing && trip.visibility != .busyOnly {
                VStack(spacing: 8) {
                    Button {
                        onViewFullTrip?(trip.id)
                    } label: {
                        HStack {
                            Text("View Full Trip")
                            Image(systemName: "arrow.right")
                        }
                        .font(SeeyaTypography.headlineSmall)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, SeeyaSpacing.md)
                        .background(Color.seeyaAccent)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }

                    Text("Opens in Trips tab")
                        .font(.caption)
                        .foregroundStyle(Color.seeyaTextTertiary)
                }
                .padding()
                .background(Color.seeyaCardBackground)
            }
        }
    }

    private var dateRangeText: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        let yearFormatter = DateFormatter()
        yearFormatter.dateFormat = "yyyy"

        let startStr = formatter.string(from: trip.startDate)
        let endStr = formatter.string(from: trip.endDate)
        let year = yearFormatter.string(from: trip.endDate)

        return "\(startStr) - \(endStr), \(year)"
    }
}

#Preview {
    CalendarDetailPanel(
        selectedDate: Date(),
        trips: [],
        onCreateTrip: { _ in }
    )
    .background(Color.seeyaBackground)
}
