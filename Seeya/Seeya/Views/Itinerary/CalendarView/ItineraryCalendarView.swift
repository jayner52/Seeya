import SwiftUI

struct ItineraryCalendarView: View {
    @Bindable var viewModel: TripPackViewModel
    let trip: Trip

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 2), count: 7)
    private let weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    var body: some View {
        VStack(spacing: 16) {
            // Generate calendar for each month in the trip
            ForEach(monthsInTrip, id: \.self) { monthDate in
                CalendarMonthView(
                    monthDate: monthDate,
                    trip: trip,
                    viewModel: viewModel
                )
            }
        }
    }

    /// Get all unique months that the trip spans
    private var monthsInTrip: [Date] {
        guard let startDate = trip.startDate, let endDate = trip.endDate else {
            return [Date()]
        }

        let calendar = Calendar.current
        var months: [Date] = []
        var currentMonth = calendar.date(from: calendar.dateComponents([.year, .month], from: startDate))!

        let endMonth = calendar.date(from: calendar.dateComponents([.year, .month], from: endDate))!

        while currentMonth <= endMonth {
            months.append(currentMonth)
            guard let nextMonth = calendar.date(byAdding: .month, value: 1, to: currentMonth) else { break }
            currentMonth = nextMonth
        }

        return months
    }
}

// MARK: - Calendar Month View

struct CalendarMonthView: View {
    let monthDate: Date
    let trip: Trip
    @Bindable var viewModel: TripPackViewModel

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 2), count: 7)
    private let weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Month Header
            CalendarMonthHeader(monthDate: monthDate)

            // Weekday Headers
            LazyVGrid(columns: columns, spacing: 2) {
                ForEach(weekdays, id: \.self) { day in
                    Text(day)
                        .font(.caption2)
                        .fontWeight(.medium)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity)
                }
            }

            // Location Bars + Calendar Grid
            ZStack(alignment: .top) {
                // Calendar Grid
                VStack(spacing: 0) {
                    // Location bars area (reserve space)
                    locationBarsSection
                        .padding(.bottom, 4)

                    // Day cells
                    LazyVGrid(columns: columns, spacing: 2) {
                        ForEach(daysInMonth, id: \.self) { day in
                            CalendarDayCell(
                                date: day.date,
                                isInTripRange: day.isInTripRange,
                                isCurrentMonth: day.isCurrentMonth,
                                events: day.isInTripRange ? viewModel.sortedTripBits(for: day.date) : []
                            )
                        }
                    }
                }
            }
        }
        .padding()
        .background(Color.seeyaCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
    }

    // MARK: - Location Bars Section

    @ViewBuilder
    private var locationBarsSection: some View {
        if let locations = trip.locations, !locations.isEmpty {
            VStack(spacing: 4) {
                ForEach(locationSpans, id: \.location.id) { span in
                    LocationBar(
                        location: span.location,
                        startColumn: span.startColumn,
                        endColumn: span.endColumn,
                        color: span.color,
                        totalColumns: 7
                    )
                }
            }
        }
    }

    // MARK: - Computed Properties

    private struct DayInfo: Hashable {
        let date: Date
        let isInTripRange: Bool
        let isCurrentMonth: Bool
    }

    private var daysInMonth: [DayInfo] {
        let calendar = Calendar.current

        // Get the first day of the month
        let components = calendar.dateComponents([.year, .month], from: monthDate)
        guard let firstOfMonth = calendar.date(from: components),
              let range = calendar.range(of: .day, in: .month, for: monthDate) else {
            return []
        }

        // Get the weekday of the first day (0 = Sunday in our grid)
        let firstWeekday = calendar.component(.weekday, from: firstOfMonth) - 1

        var days: [DayInfo] = []

        // Add empty days for padding before the first day
        for i in 0..<firstWeekday {
            if let paddingDate = calendar.date(byAdding: .day, value: -(firstWeekday - i), to: firstOfMonth) {
                days.append(DayInfo(date: paddingDate, isInTripRange: false, isCurrentMonth: false))
            }
        }

        // Add all days of the month
        for day in range {
            if let date = calendar.date(byAdding: .day, value: day - 1, to: firstOfMonth) {
                let isInRange = isDateInTripRange(date)
                days.append(DayInfo(date: date, isInTripRange: isInRange, isCurrentMonth: true))
            }
        }

        // Pad the end to complete the last week
        let remainder = days.count % 7
        if remainder > 0 {
            let paddingNeeded = 7 - remainder
            if let lastDay = days.last?.date {
                for i in 1...paddingNeeded {
                    if let paddingDate = calendar.date(byAdding: .day, value: i, to: lastDay) {
                        days.append(DayInfo(date: paddingDate, isInTripRange: false, isCurrentMonth: false))
                    }
                }
            }
        }

        return days
    }

    private func isDateInTripRange(_ date: Date) -> Bool {
        guard let startDate = trip.startDate, let endDate = trip.endDate else {
            return false
        }
        let calendar = Calendar.current
        let dayStart = calendar.startOfDay(for: date)
        let tripStart = calendar.startOfDay(for: startDate)
        let tripEnd = calendar.startOfDay(for: endDate)

        return dayStart >= tripStart && dayStart <= tripEnd
    }

    // MARK: - Location Spans

    private struct LocationSpan {
        let location: TripLocation
        let startColumn: Int
        let endColumn: Int
        let color: Color
    }

    private var locationSpans: [LocationSpan] {
        guard let locations = trip.locations, !locations.isEmpty else { return [] }

        let sortedLocations = locations.sorted { $0.orderIndex < $1.orderIndex }

        var spans: [LocationSpan] = []
        let colors: [Color] = [.blue, .green, .orange, .purple, .pink, .teal]

        // For now, simplified: show each location as a colored bar
        // In a real implementation, you'd calculate which dates each location covers
        for (index, location) in sortedLocations.enumerated() {
            let color = colors[index % colors.count]

            // Simplified: show location bar spanning full width
            // You could enhance this to show actual date ranges per location
            spans.append(LocationSpan(
                location: location,
                startColumn: 0,
                endColumn: 6,
                color: color
            ))
        }

        return spans
    }
}

#Preview {
    ScrollView {
        ItineraryCalendarView(
            viewModel: TripPackViewModel(tripId: UUID()),
            trip: Trip(
                id: UUID(),
                userId: UUID(),
                name: "Mexico Trip",
                description: nil,
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
    }
    .background(Color.seeyaBackground)
}
