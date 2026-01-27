import SwiftUI

struct DayCellView: View {
    let date: Date
    let isCurrentMonth: Bool
    let isSelected: Bool
    let trips: [CalendarTrip]
    let onTap: () -> Void

    private let calendar = Calendar.current

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 4) {
                Text("\(calendar.component(.day, from: date))")
                    .font(.callout)
                    .fontWeight(isToday ? .semibold : .regular)
                    .foregroundStyle(dayTextColor)

                // Trip dots (max 3)
                if !trips.isEmpty {
                    HStack(spacing: 3) {
                        ForEach(Array(trips.prefix(3).enumerated()), id: \.element.id) { _, trip in
                            Circle()
                                .fill(trip.color)
                                .frame(width: 6, height: 6)
                        }
                    }
                } else {
                    // Spacer to maintain consistent height
                    Spacer()
                        .frame(height: 6)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(backgroundStyle)
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .strokeBorder(isSelected ? Color.seeyaPurple : Color.clear, lineWidth: 2)
            )
        }
        .buttonStyle(.plain)
        .frame(minWidth: 44, minHeight: 44) // Ensure 44pt touch target
    }

    private var isToday: Bool {
        calendar.isDateInToday(date)
    }

    private var dayTextColor: Color {
        if !isCurrentMonth {
            return Color.seeyaTextTertiary
        }
        if isToday {
            return Color.seeyaPurple
        }
        return Color.seeyaTextPrimary
    }

    @ViewBuilder
    private var backgroundStyle: some View {
        if isToday {
            Color.seeyaPurple.opacity(0.1)
        } else if isSelected {
            Color.seeyaPurple.opacity(0.05)
        } else if !isCurrentMonth {
            Color.seeyaSurface.opacity(0.3)
        } else {
            Color.clear
        }
    }
}

// MARK: - Compact Day Cell (for 6/12 month views)

struct CompactDayCellView: View {
    let date: Date
    let isCurrentMonth: Bool
    let hasTrips: Bool

    private let calendar = Calendar.current

    var body: some View {
        VStack(spacing: 2) {
            Text("\(calendar.component(.day, from: date))")
                .font(.caption2)
                .foregroundStyle(dayTextColor)

            if hasTrips {
                Circle()
                    .fill(Color.seeyaPurple)
                    .frame(width: 4, height: 4)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 4)
        .background(isToday ? Color.seeyaPurple.opacity(0.1) : Color.clear)
        .clipShape(RoundedRectangle(cornerRadius: 4))
    }

    private var isToday: Bool {
        calendar.isDateInToday(date)
    }

    private var dayTextColor: Color {
        if !isCurrentMonth {
            return Color.seeyaTextTertiary
        }
        if isToday {
            return Color.seeyaPurple
        }
        return Color.seeyaTextPrimary
    }
}

#Preview {
    VStack(spacing: 20) {
        DayCellView(
            date: Date(),
            isCurrentMonth: true,
            isSelected: false,
            trips: [],
            onTap: {}
        )

        DayCellView(
            date: Date(),
            isCurrentMonth: true,
            isSelected: true,
            trips: [],
            onTap: {}
        )

        CompactDayCellView(
            date: Date(),
            isCurrentMonth: true,
            hasTrips: true
        )
    }
    .padding()
}
