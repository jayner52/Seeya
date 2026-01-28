import SwiftUI

struct CalendarGridView: View {
    @Bindable var viewModel: CalendarViewModel
    var scrollToTodayTrigger: Bool = false

    var body: some View {
        if viewModel.isLoading {
            VStack {
                ProgressView()
                    .scaleEffect(1.2)
                Text("Loading calendar...")
                    .font(SeeyaTypography.bodyMedium)
                    .foregroundStyle(Color.seeyaTextSecondary)
                    .padding(.top, SeeyaSpacing.sm)
            }
            .frame(maxWidth: .infinity, minHeight: 300)
        } else {
            ScrollViewReader { proxy in
                LazyVGrid(columns: gridColumns, spacing: SeeyaSpacing.md) {
                    ForEach(viewModel.monthsToDisplay, id: \.self) { month in
                        CalendarGridMonthView(month: month, viewModel: viewModel)
                            .id(month)
                    }
                }
                .onAppear {
                    // Scroll to current month on appear
                    let calendar = Calendar.current
                    let currentMonth = calendar.startOfMonth(for: Date())
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                        withAnimation(.none) {
                            proxy.scrollTo(currentMonth, anchor: .top)
                        }
                    }
                }
                .onChange(of: scrollToTodayTrigger) { _, _ in
                    let calendar = Calendar.current
                    let currentMonth = calendar.startOfMonth(for: Date())
                    withAnimation {
                        proxy.scrollTo(currentMonth, anchor: .top)
                    }
                }
            }
        }
    }

    private var gridColumns: [GridItem] {
        let count = viewModel.viewMode.columnCount
        return Array(repeating: GridItem(.flexible(), spacing: SeeyaSpacing.md), count: count)
    }
}

// MARK: - Calendar Month View

struct CalendarGridMonthView: View {
    let month: Date
    @Bindable var viewModel: CalendarViewModel

    private let calendar = Calendar.current
    private let weekdays = ["S", "M", "T", "W", "T", "F", "S"]

    var body: some View {
        VStack(spacing: 0) {
            // Month header
            HStack {
                Text(monthYearString)
                    .font(viewModel.viewMode.isExtraCompact ? .system(size: 10, weight: .medium) : (viewModel.viewMode.isCompact ? SeeyaTypography.labelMedium : SeeyaTypography.headlineSmall))
                    .foregroundStyle(Color.seeyaTextPrimary)
                Spacer()
            }
            .padding(.horizontal, viewModel.viewMode.isExtraCompact ? SeeyaSpacing.xs : SeeyaSpacing.sm)
            .padding(.vertical, viewModel.viewMode.isExtraCompact ? 4 : SeeyaSpacing.xs)
            .background(Color.seeyaSurface)

            // Weekday headers
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 7), spacing: 0) {
                ForEach(weekdays, id: \.self) { day in
                    Text(day)
                        .font(viewModel.viewMode.isExtraCompact ? .system(size: 7) : (viewModel.viewMode.isCompact ? SeeyaTypography.captionSmall : SeeyaTypography.caption))
                        .foregroundStyle(Color.seeyaTextSecondary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, viewModel.viewMode.isExtraCompact ? 2 : SeeyaSpacing.xxs)
                }
            }
            .background(Color.seeyaSurface.opacity(0.5))

            // Days grid
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 7), spacing: viewModel.viewMode.isExtraCompact ? 1 : (viewModel.viewMode.isCompact ? 2 : 4)) {
                ForEach(daysInMonth, id: \.self) { day in
                    if viewModel.viewMode.isCompact {
                        CompactDayCellView(
                            date: day.date,
                            isCurrentMonth: day.isCurrentMonth,
                            hasTrips: !viewModel.trips(for: day.date).isEmpty,
                            isExtraCompact: viewModel.viewMode.isExtraCompact,
                            onTap: {
                                viewModel.selectDate(day.date)
                            }
                        )
                    } else {
                        DayCellView(
                            date: day.date,
                            isCurrentMonth: day.isCurrentMonth,
                            isSelected: isDateSelected(day.date),
                            trips: viewModel.trips(for: day.date),
                            onTap: {
                                viewModel.selectDate(day.date)
                            }
                        )
                    }
                }
            }
            .padding(.horizontal, viewModel.viewMode.isCompact ? 2 : SeeyaSpacing.xs)
            .padding(.vertical, viewModel.viewMode.isCompact ? 4 : SeeyaSpacing.xs)
        }
        .frame(minHeight: viewModel.viewMode.isExtraCompact ? 180 : (viewModel.viewMode.isCompact ? 260 : nil)) // Ensure uniform height for compact views
        .background(Color.seeyaCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
    }

    private var monthYearString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = viewModel.viewMode.isCompact ? "MMM yyyy" : "MMMM yyyy"
        return formatter.string(from: month)
    }

    private func isDateSelected(_ date: Date) -> Bool {
        guard let selectedDate = viewModel.selectedDate else { return false }
        return calendar.isDate(date, inSameDayAs: selectedDate)
    }

    private var daysInMonth: [CalendarGridDay] {
        // Always generate exactly 42 days (6 weeks) for uniform month card heights
        let monthStart = calendar.startOfMonth(for: month)
        let firstWeekday = calendar.component(.weekday, from: monthStart)

        // Calculate offset to start from Sunday of the first week
        let adjustedOffset = (firstWeekday - calendar.firstWeekday + 7) % 7

        guard let startDate = calendar.date(byAdding: .day, value: -adjustedOffset, to: monthStart) else {
            return []
        }

        // Always generate exactly 42 days (6 weeks × 7 days)
        return (0..<42).compactMap { offset in
            guard let date = calendar.date(byAdding: .day, value: offset, to: startDate) else { return nil }
            let isCurrentMonth = calendar.isDate(date, equalTo: month, toGranularity: .month)
            return CalendarGridDay(date: date, isCurrentMonth: isCurrentMonth)
        }
    }
}

struct CalendarGridDay: Hashable {
    let date: Date
    let isCurrentMonth: Bool
}

#Preview {
    ScrollView {
        CalendarGridView(viewModel: CalendarViewModel())
            .padding()
    }
    .background(Color.seeyaBackground)
}
