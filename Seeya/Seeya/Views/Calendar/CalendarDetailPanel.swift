import SwiftUI

struct CalendarDetailPanel: View {
    let selectedDate: Date
    let trips: [CalendarTrip]
    let onTripTap: (CalendarTrip) -> Void
    let onCreateTrip: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Selected date header
            Text(selectedDate, format: .dateTime.weekday(.wide).month().day())
                .font(.headline)
                .foregroundStyle(Color.seeyaTextSecondary)

            if trips.isEmpty {
                emptyState
            } else {
                // Trip cards
                ScrollView {
                    VStack(spacing: 12) {
                        ForEach(trips) { trip in
                            TripDetailCard(trip: trip) {
                                onTripTap(trip)
                            }
                        }
                    }
                }
            }

            Spacer()

            // Quick action
            Button(action: onCreateTrip) {
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
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            if let date = selectedDate {
                CalendarDetailPanel(
                    selectedDate: date,
                    trips: viewModel.trips(for: date),
                    onTripTap: { trip in
                        viewModel.selectedTrip = trip
                    },
                    onCreateTrip: {
                        // TODO: Navigate to create trip with pre-filled date
                        dismiss()
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
                    onTripTap: { trip in
                        viewModel.selectedTrip = trip
                    },
                    onCreateTrip: {
                        // TODO: Navigate to create trip with pre-filled date
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
        .background(Color.seeyaCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
    }
}

#Preview {
    CalendarDetailPanel(
        selectedDate: Date(),
        trips: [],
        onTripTap: { _ in },
        onCreateTrip: {}
    )
    .background(Color.seeyaBackground)
}
