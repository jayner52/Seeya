import SwiftUI

struct CalendarMonthHeader: View {
    let monthDate: Date

    private var monthYearText: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        return formatter.string(from: monthDate)
    }

    var body: some View {
        HStack {
            Text(monthYearText)
                .font(.title2)
                .fontWeight(.bold)

            Spacer()
        }
    }
}

#Preview {
    CalendarMonthHeader(monthDate: Date())
        .padding()
}
