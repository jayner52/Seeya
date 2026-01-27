import SwiftUI

struct MonthPickerView: View {
    @Binding var selectedDate: Date
    @Environment(\.dismiss) private var dismiss

    @State private var selectedMonth: Int
    @State private var selectedYear: Int

    private let months = Calendar.current.monthSymbols
    private let calendar = Calendar.current

    // Allow selection from 2 years ago to 5 years in the future
    private var years: [Int] {
        let currentYear = calendar.component(.year, from: Date())
        return Array((currentYear - 2)...(currentYear + 5))
    }

    init(selectedDate: Binding<Date>) {
        self._selectedDate = selectedDate
        let calendar = Calendar.current
        self._selectedMonth = State(initialValue: calendar.component(.month, from: selectedDate.wrappedValue))
        self._selectedYear = State(initialValue: calendar.component(.year, from: selectedDate.wrappedValue))
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Wheel pickers
                HStack(spacing: 0) {
                    Picker("Month", selection: $selectedMonth) {
                        ForEach(1...12, id: \.self) { month in
                            Text(months[month - 1])
                                .tag(month)
                        }
                    }
                    .pickerStyle(.wheel)

                    Picker("Year", selection: $selectedYear) {
                        ForEach(years, id: \.self) { year in
                            Text(String(year))
                                .tag(year)
                        }
                    }
                    .pickerStyle(.wheel)
                    .frame(width: 100)
                }
                .padding()

                Spacer()
            }
            .navigationTitle("Select Month")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        applySelection()
                        dismiss()
                    }
                    .fontWeight(.semibold)
                }
            }
        }
        .presentationDetents([.height(300)])
        .presentationDragIndicator(.visible)
    }

    private func applySelection() {
        var components = DateComponents()
        components.year = selectedYear
        components.month = selectedMonth
        components.day = 1

        if let date = calendar.date(from: components) {
            selectedDate = date
        }
    }
}

// MARK: - Month Title Button

struct MonthTitleButton: View {
    let dateText: String
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 4) {
                Text(dateText)
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(Color.seeyaTextPrimary)

                Image(systemName: "chevron.down")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(Color.seeyaTextSecondary)
            }
        }
        .accessibilityLabel("Current month: \(dateText)")
        .accessibilityHint("Double tap to select a different month")
    }
}

#Preview {
    struct PreviewWrapper: View {
        @State private var date = Date()
        @State private var showPicker = true

        var body: some View {
            VStack {
                MonthTitleButton(dateText: "January 2026") {
                    showPicker = true
                }
            }
            .sheet(isPresented: $showPicker) {
                MonthPickerView(selectedDate: $date)
            }
        }
    }

    return PreviewWrapper()
}
