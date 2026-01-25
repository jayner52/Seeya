import SwiftUI

struct CalendarDayCell: View {
    let date: Date
    let isInTripRange: Bool
    let isCurrentMonth: Bool
    let events: [TripBit]

    private let maxVisibleEvents = 3

    private var dayNumber: Int {
        Calendar.current.component(.day, from: date)
    }

    private var isToday: Bool {
        Calendar.current.isDateInToday(date)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            // Day Number
            HStack {
                Text("\(dayNumber)")
                    .font(.caption)
                    .fontWeight(isToday ? .bold : .regular)
                    .foregroundStyle(dayNumberColor)
                    .frame(width: 20, height: 20)
                    .background(isToday ? Color.seeyaPurple : Color.clear)
                    .clipShape(Circle())

                Spacer()
            }

            // Event Pills
            if !events.isEmpty && isInTripRange {
                VStack(alignment: .leading, spacing: 2) {
                    ForEach(Array(events.prefix(maxVisibleEvents))) { event in
                        EventPill(tripBit: event)
                    }

                    if events.count > maxVisibleEvents {
                        Text("+\(events.count - maxVisibleEvents) more")
                            .font(.system(size: 9))
                            .foregroundStyle(.secondary)
                            .padding(.leading, 2)
                    }
                }
            }

            Spacer(minLength: 0)
        }
        .frame(minHeight: 80)
        .padding(4)
        .background(backgroundColor)
        .clipShape(RoundedRectangle(cornerRadius: 4))
    }

    private var dayNumberColor: Color {
        if isToday {
            return .white
        }
        if !isCurrentMonth {
            return Color(.tertiaryLabel)
        }
        if isInTripRange {
            return Color(.label)
        }
        return Color(.secondaryLabel)
    }

    private var backgroundColor: Color {
        if !isCurrentMonth {
            return Color(.systemGray6).opacity(0.3)
        }
        if isInTripRange {
            return Color.seeyaPurple.opacity(0.05)
        }
        return Color(.systemGray6).opacity(0.5)
    }
}

#Preview {
    HStack(spacing: 4) {
        // Day outside trip range
        CalendarDayCell(
            date: Date(),
            isInTripRange: false,
            isCurrentMonth: true,
            events: []
        )

        // Day in trip range with events
        CalendarDayCell(
            date: Date(),
            isInTripRange: true,
            isCurrentMonth: true,
            events: [
                TripBit(
                    id: UUID(),
                    tripId: UUID(),
                    createdBy: UUID(),
                    category: .flight,
                    title: "Flight to Mexico"
                ),
                TripBit(
                    id: UUID(),
                    tripId: UUID(),
                    createdBy: UUID(),
                    category: .stay,
                    title: "Four Seasons Hotel"
                )
            ]
        )

        // Day not in current month
        CalendarDayCell(
            date: Date().addingTimeInterval(-30 * 24 * 60 * 60),
            isInTripRange: false,
            isCurrentMonth: false,
            events: []
        )
    }
    .frame(height: 100)
    .padding()
}
