import SwiftUI

struct EventPill: View {
    let tripBit: TripBit

    var body: some View {
        HStack(spacing: 2) {
            Image(systemName: tripBit.category.icon)
                .font(.system(size: 8))

            Text(tripBit.title)
                .font(.system(size: 9))
                .fontWeight(.medium)
                .lineLimit(1)
        }
        .padding(.horizontal, 4)
        .padding(.vertical, 2)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(tripBit.category.color.opacity(0.2))
        .foregroundStyle(tripBit.category.color)
        .clipShape(RoundedRectangle(cornerRadius: 3))
    }
}

// MARK: - Event Pill Variant for List View (larger)

struct EventPillLarge: View {
    let tripBit: TripBit

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: tripBit.category.icon)
                .font(.caption2)

            Text(tripBit.title)
                .font(.caption)
                .fontWeight(.medium)
                .lineLimit(1)

            Spacer()

            if !tripBit.formattedTime.isEmpty {
                Text(tripBit.formattedTime)
                    .font(.caption2)
                    .foregroundStyle(tripBit.category.color.opacity(0.8))
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
        .background(tripBit.category.color.opacity(0.15))
        .foregroundStyle(tripBit.category.color)
        .clipShape(RoundedRectangle(cornerRadius: 6))
    }
}

#Preview {
    VStack(spacing: 8) {
        Text("Small Pills (Calendar)")
            .font(.caption)
            .foregroundStyle(.secondary)

        HStack {
            EventPill(tripBit: TripBit(
                id: UUID(),
                tripId: UUID(),
                createdBy: UUID(),
                category: .flight,
                title: "Flight to Mexico City"
            ))

            EventPill(tripBit: TripBit(
                id: UUID(),
                tripId: UUID(),
                createdBy: UUID(),
                category: .stay,
                title: "Four Seasons Hotel Mexico City"
            ))
        }

        EventPill(tripBit: TripBit(
            id: UUID(),
            tripId: UUID(),
            createdBy: UUID(),
            category: .activity,
            title: "Birthday Dinner"
        ))

        EventPill(tripBit: TripBit(
            id: UUID(),
            tripId: UUID(),
            createdBy: UUID(),
            category: .reservation,
            title: "Post Wedding Brunch"
        ))

        EventPill(tripBit: TripBit(
            id: UUID(),
            tripId: UUID(),
            createdBy: UUID(),
            category: .car,
            title: "Rental Car: Mexico City to Playa"
        ))

        Divider()

        Text("Large Pills (List View)")
            .font(.caption)
            .foregroundStyle(.secondary)

        EventPillLarge(tripBit: TripBit(
            id: UUID(),
            tripId: UUID(),
            createdBy: UUID(),
            category: .flight,
            title: "Flight to Mexico City",
            startDatetime: Date()
        ))

        EventPillLarge(tripBit: TripBit(
            id: UUID(),
            tripId: UUID(),
            createdBy: UUID(),
            category: .activity,
            title: "Chichen Itza Tour",
            startDatetime: Date()
        ))
    }
    .padding()
    .frame(width: 200)
}
