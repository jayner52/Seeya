import SwiftUI

struct CalendarView: View {
    @State private var viewModel = CalendarViewModel()
    @State private var scrollToTodayTrigger = false
    var navigationState: AppNavigationState?

    var body: some View {
        NavigationStack {
            GeometryReader { geometry in
                let isCompact = geometry.size.width < 700

                if isCompact {
                    compactLayout
                } else {
                    regularLayout
                }
            }
            .background(Color.seeyaBackground)
            .navigationTitle("Calendar")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    MonthTitleButton(dateText: viewModel.monthTitleText) {
                        viewModel.showMonthPicker = true
                    }
                }
            }
            .task {
                await viewModel.fetchAllData()
            }
            .refreshable {
                await viewModel.fetchAllData()
            }
            .sheet(isPresented: $viewModel.showMonthPicker) {
                MonthPickerView(selectedDate: $viewModel.currentDate)
            }
            .sheet(isPresented: $viewModel.showDetailSheet) {
                CalendarDetailSheet(
                    selectedDate: $viewModel.selectedDate,
                    viewModel: viewModel,
                    onNavigateToTrip: { tripId in
                        viewModel.showDetailSheet = false
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                            navigationState?.navigateToTrip(tripId)
                        }
                    }
                )
            }
            .sheet(item: $viewModel.selectedTrip) { trip in
                TripPopoverView(trip: trip, viewModel: viewModel)
            }
            .sheet(isPresented: $viewModel.showCreateTripSheet, onDismiss: {
                Task {
                    await viewModel.fetchAllData()
                }
            }) {
                CreateTripFromCalendarSheet(
                    startDate: viewModel.createTripStartDate,
                    onDismiss: {}
                )
            }
        }
    }

    // MARK: - Compact Layout (iPhone)

    private var compactLayout: some View {
        VStack(spacing: 0) {
            // Header with controls
            CalendarHeaderCompact(viewModel: viewModel) {
                scrollToTodayTrigger.toggle()
            }

            ScrollView {
                VStack(spacing: SeeyaSpacing.md) {
                    // Quick glance card showing upcoming trips with countdown
                    if !viewModel.upcomingTrips.isEmpty {
                        CalendarQuickGlance(upcomingTrips: viewModel.upcomingTrips) { trip in
                            // Navigate to trip by selecting it
                            if let calendarTrip = viewModel.userTrips.first(where: { $0.id == trip.id }) {
                                viewModel.selectedTrip = calendarTrip
                            }
                        }
                        .padding(.horizontal)
                    }

                    CalendarGridView(viewModel: viewModel, scrollToTodayTrigger: scrollToTodayTrigger)
                        .padding(.horizontal)
                }
                .padding(.vertical)
            }

            // Travel pals bar at bottom - always visible when pals exist
            if !viewModel.travelPals.isEmpty {
                Divider()
                TravelPalsBar(viewModel: viewModel)
            }
        }
    }

    // MARK: - Regular Layout (iPad)

    private var regularLayout: some View {
        VStack(spacing: 0) {
            // Header
            CalendarHeaderRegular(viewModel: viewModel) {
                scrollToTodayTrigger.toggle()
            }
            .padding(.horizontal)
            .padding(.top, SeeyaSpacing.sm)

            HStack(alignment: .top, spacing: SeeyaSpacing.lg) {
                // Main calendar
                CalendarGridView(viewModel: viewModel, scrollToTodayTrigger: scrollToTodayTrigger)

                // Right sidebar - detail panel
                CalendarDetailSidePanel(
                    selectedDate: viewModel.selectedDate,
                    viewModel: viewModel
                )
                .frame(width: 320)
            }
            .padding()

            // Travel pals bar at bottom
            if !viewModel.travelPals.isEmpty {
                Divider()
                TravelPalsBar(viewModel: viewModel)
            }
        }
    }
}

// MARK: - Compact Header (iPhone)

struct CalendarHeaderCompact: View {
    @Bindable var viewModel: CalendarViewModel
    var onTodayTapped: () -> Void = {}

    var body: some View {
        HStack(spacing: SeeyaSpacing.sm) {
            Button {
                onTodayTapped()
            } label: {
                HStack(spacing: 4) {
                    Image(systemName: "location.fill")
                        .font(.caption)
                    Text("Today")
                }
                .font(.subheadline.weight(.medium))
                .foregroundStyle(Color.seeyaPurple)
            }

            Spacer()

            // View mode picker with column-based options
            Picker("View", selection: $viewModel.viewMode) {
                ForEach(CalendarViewMode.allCases, id: \.self) { mode in
                    Text(mode.rawValue).tag(mode)
                }
            }
            .pickerStyle(.segmented)
            .frame(width: 180)
        }
        .padding(.horizontal)
        .padding(.vertical, SeeyaSpacing.xs)
        .background(Color.seeyaCardBackground)
    }
}

// MARK: - Regular Header (iPad)

struct CalendarHeaderRegular: View {
    @Bindable var viewModel: CalendarViewModel
    var onTodayTapped: () -> Void = {}

    var body: some View {
        HStack(spacing: SeeyaSpacing.md) {
            Button("Today") {
                withAnimation {
                    onTodayTapped()
                }
            }
            .font(.subheadline.weight(.medium))
            .foregroundStyle(Color.seeyaPurple)
            .padding(.horizontal, SeeyaSpacing.sm)
            .padding(.vertical, SeeyaSpacing.xs)
            .background(Color.seeyaSurface)
            .clipShape(RoundedRectangle(cornerRadius: 8))

            Text(viewModel.dateRangeText)
                .font(SeeyaTypography.bodyMedium)
                .foregroundStyle(Color.seeyaTextSecondary)

            Spacer()

            // View mode picker
            Picker("View", selection: $viewModel.viewMode) {
                ForEach(CalendarViewMode.allCases, id: \.self) { mode in
                    Text(mode.rawValue).tag(mode)
                }
            }
            .pickerStyle(.segmented)
            .frame(width: 180)
        }
    }
}

// MARK: - Trip Popover (kept from original)

struct TripPopoverView: View {
    let trip: CalendarTrip
    @Bindable var viewModel: CalendarViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(spacing: SeeyaSpacing.md) {
                // Color indicator
                RoundedRectangle(cornerRadius: 4)
                    .fill(trip.color)
                    .frame(height: 8)
                    .padding(.horizontal, SeeyaSpacing.md)

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
                                size: 32
                            )
                            Text("\(trip.owner.fullName)'s trip")
                                .font(SeeyaTypography.bodySmall)
                                .foregroundStyle(Color.seeyaTextSecondary)
                        }
                    }

                    // Role badge
                    TripRoleBadge(role: trip.role, color: trip.color)

                    Spacer()

                    // View trip button (not for viewing role)
                    if trip.role != .viewing && trip.visibility != .busyOnly {
                        NavigationLink(destination: Text("Trip Details")) {
                            HStack {
                                Text("View Trip")
                                Image(systemName: "arrow.right")
                            }
                            .font(SeeyaTypography.headlineSmall)
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, SeeyaSpacing.md)
                            .background(Color.seeyaAccent)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                    }
                }
                .padding(.horizontal, SeeyaSpacing.md)
            }
            .padding(.vertical, SeeyaSpacing.md)
            .navigationTitle("Trip Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
        .presentationDetents([.medium])
        .presentationDragIndicator(.visible)
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

// MARK: - Create Trip From Calendar

struct CreateTripFromCalendarSheet: View {
    let startDate: Date?
    let onDismiss: () -> Void

    @State private var viewModel = TripsViewModel()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        CreateTripView(viewModel: viewModel, initialStartDate: startDate)
    }
}

// MARK: - Preview

#Preview {
    CalendarView()
}
