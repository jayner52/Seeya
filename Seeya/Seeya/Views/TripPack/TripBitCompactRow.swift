import SwiftUI

struct TripBitCompactRow: View {
    let tripBit: TripBit
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                // Category icon
                Image(systemName: tripBit.category.icon)
                    .font(.body)
                    .foregroundStyle(tripBit.category.color)
                    .frame(width: 32, height: 32)
                    .background(tripBit.category.color.opacity(0.15))
                    .clipShape(RoundedRectangle(cornerRadius: 8))

                // Title and subtitle
                VStack(alignment: .leading, spacing: 2) {
                    Text(tripBit.title)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(.primary)
                        .lineLimit(1)

                    HStack(spacing: 4) {
                        Text(tripBit.formattedTime)
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        if let subtitle = compactSubtitle {
                            Text("\u{2022}")
                                .font(.caption)
                                .foregroundStyle(.tertiary)
                            Text(subtitle)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                        }
                    }
                }

                Spacer()

                // Status indicator
                Circle()
                    .fill(tripBit.displayStatus.color)
                    .frame(width: 8, height: 8)

                // Chevron
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Compact Subtitle

    private var compactSubtitle: String? {
        switch tripBit.category {
        case .flight:
            if let dep = tripBit.details?.departureAirport,
               let arr = tripBit.details?.arrivalAirport {
                return "\(dep) → \(arr)"
            }
            return tripBit.details?.airline

        case .stay:
            return tripBit.details?.propertyName ?? tripBit.details?.roomType

        case .car:
            return tripBit.details?.rentalCompany ?? tripBit.details?.vehicleType

        case .activity:
            return tripBit.details?.venueName ?? tripBit.details?.duration

        case .transport:
            if let dep = tripBit.details?.departureStation,
               let arr = tripBit.details?.arrivalStation {
                return "\(dep) → \(arr)"
            }
            return tripBit.details?.transportType

        case .money:
            if let amount = tripBit.details?.amount,
               let currency = tripBit.details?.currency {
                return "\(currency) \(String(format: "%.2f", amount))"
            }
            return tripBit.details?.moneyType

        case .reservation:
            return tripBit.details?.venueName

        case .document:
            return tripBit.details?.documentType

        case .photos:
            if let count = tripBit.details?.photoCount {
                return "\(count) photos"
            }
            return tripBit.details?.albumName

        case .other:
            return tripBit.details?.customType
        }
    }
}

#Preview {
    VStack(spacing: 0) {
        TripBitCompactRow(
            tripBit: TripBit(
                id: UUID(),
                tripId: UUID(),
                createdBy: UUID(),
                category: .flight,
                title: "Flight to Paris",
                status: .confirmed,
                startDatetime: Date()
            )
        ) {
            print("Tapped")
        }

        Divider()

        TripBitCompactRow(
            tripBit: TripBit(
                id: UUID(),
                tripId: UUID(),
                createdBy: UUID(),
                category: .stay,
                title: "Hotel Marais",
                status: .pending,
                startDatetime: Date()
            )
        ) {
            print("Tapped")
        }

        Divider()

        TripBitCompactRow(
            tripBit: TripBit(
                id: UUID(),
                tripId: UUID(),
                createdBy: UUID(),
                category: .activity,
                title: "Louvre Museum Tour",
                status: .confirmed,
                startDatetime: Date()
            )
        ) {
            print("Tapped")
        }
    }
    .background(Color.seeyaCardBackground)
    .clipShape(RoundedRectangle(cornerRadius: 12))
    .padding()
    .background(Color.seeyaBackground)
}
