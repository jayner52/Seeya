import SwiftUI

struct TripBitCard: View {
    let tripBit: TripBit
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 12) {
                // Header row
                HStack(spacing: 12) {
                    // Category icon
                    categoryIcon

                    // Title and datetime
                    VStack(alignment: .leading, spacing: 4) {
                        Text(tripBit.title)
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundStyle(.primary)
                            .lineLimit(1)

                        Text(tripBit.formattedDateTime)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    // Status badge
                    StatusBadge(
                        text: tripBit.displayStatus.displayName,
                        color: tripBit.displayStatus.color
                    )
                }

                // Category-specific details
                categoryDetails

                // Footer row
                HStack {
                    // Travelers
                    travelerAvatars

                    Spacer()

                    // Confirmation number if present
                    if let confirmNumber = tripBit.details?.confirmationNumber {
                        Text(confirmNumber)
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundStyle(.secondary)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color(.systemGray6))
                            .clipShape(RoundedRectangle(cornerRadius: 4))
                    }
                }

                // Notes if present
                if let notes = tripBit.notes, !notes.isEmpty {
                    Text(notes)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                        .padding(.top, 4)
                }
            }
            .padding()
            .background(Color.seeyaCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Category Icon

    private var categoryIcon: some View {
        Image(systemName: tripBit.category.icon)
            .font(.title3)
            .foregroundStyle(tripBit.category.color)
            .frame(width: 40, height: 40)
            .background(tripBit.category.color.opacity(0.15))
            .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    // MARK: - Category Details

    @ViewBuilder
    private var categoryDetails: some View {
        switch tripBit.category {
        case .flight:
            flightDetails
        case .stay:
            stayDetails
        case .car:
            carDetails
        case .activity:
            activityDetails
        case .transport:
            transportDetails
        case .money:
            moneyDetails
        case .reservation:
            reservationDetails
        case .document:
            documentDetails
        case .photos:
            photosDetails
        case .other:
            otherDetails
        }
    }

    private var flightDetails: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let airline = tripBit.details?.airline,
               let flightNumber = tripBit.details?.flightNumber {
                Text("\(airline) \(flightNumber)")
                    .font(.caption)
                    .fontWeight(.medium)
            }

            if let departure = tripBit.details?.departureAirport,
               let arrival = tripBit.details?.arrivalAirport {
                HStack(spacing: 8) {
                    Text(departure)
                        .font(.headline)
                    Image(systemName: "arrow.right")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(arrival)
                        .font(.headline)
                }
            }

            if let terminal = tripBit.details?.terminal,
               let gate = tripBit.details?.gate {
                Text("Terminal \(terminal) \u{2022} Gate \(gate)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var stayDetails: some View {
        VStack(alignment: .leading, spacing: 4) {
            if let propertyName = tripBit.details?.propertyName {
                Text(propertyName)
                    .font(.caption)
                    .fontWeight(.medium)
            }

            if let address = tripBit.details?.address {
                Text(address)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            if let checkIn = tripBit.details?.checkInTime,
               let checkOut = tripBit.details?.checkOutTime {
                Text("Check-in: \(checkIn) \u{2022} Check-out: \(checkOut)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var carDetails: some View {
        VStack(alignment: .leading, spacing: 4) {
            if let company = tripBit.details?.rentalCompany {
                Text(company)
                    .font(.caption)
                    .fontWeight(.medium)
            }

            if let vehicleType = tripBit.details?.vehicleType {
                Text(vehicleType)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if let pickup = tripBit.details?.pickupLocation {
                HStack(spacing: 4) {
                    Image(systemName: "mappin.circle.fill")
                        .font(.caption2)
                    Text(pickup)
                        .lineLimit(1)
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }
        }
    }

    private var activityDetails: some View {
        VStack(alignment: .leading, spacing: 4) {
            if let venue = tripBit.details?.venueName {
                Text(venue)
                    .font(.caption)
                    .fontWeight(.medium)
            }

            if let duration = tripBit.details?.duration {
                Text("Duration: \(duration)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if let meetingPoint = tripBit.details?.meetingPoint {
                HStack(spacing: 4) {
                    Image(systemName: "mappin.circle.fill")
                        .font(.caption2)
                    Text(meetingPoint)
                        .lineLimit(1)
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }
        }
    }

    private var transportDetails: some View {
        VStack(alignment: .leading, spacing: 4) {
            if let transportType = tripBit.details?.transportType,
               let op = tripBit.details?.transportOperator {
                Text("\(transportType) \u{2022} \(op)")
                    .font(.caption)
                    .fontWeight(.medium)
            }

            if let departure = tripBit.details?.departureStation,
               let arrival = tripBit.details?.arrivalStation {
                HStack(spacing: 8) {
                    Text(departure)
                        .font(.subheadline)
                        .fontWeight(.medium)
                    Image(systemName: "arrow.right")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(arrival)
                        .font(.subheadline)
                        .fontWeight(.medium)
                }
            }

            if let platform = tripBit.details?.platform {
                Text("Platform \(platform)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var moneyDetails: some View {
        VStack(alignment: .leading, spacing: 4) {
            if let type = tripBit.details?.moneyType {
                Text(type.capitalized)
                    .font(.caption)
                    .fontWeight(.medium)
            }

            if let amount = tripBit.details?.amount,
               let currency = tripBit.details?.currency {
                Text("\(currency) \(String(format: "%.2f", amount))")
                    .font(.title3)
                    .fontWeight(.semibold)
            }
        }
    }

    private var reservationDetails: some View {
        VStack(alignment: .leading, spacing: 4) {
            if let venue = tripBit.details?.venueName {
                Text(venue)
                    .font(.caption)
                    .fontWeight(.medium)
            }

            HStack(spacing: 12) {
                if let time = tripBit.details?.reservationTime {
                    Label(time, systemImage: "clock")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                if let partySize = tripBit.details?.partySize {
                    Label("\(partySize) guests", systemImage: "person.2")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    private var documentDetails: some View {
        VStack(alignment: .leading, spacing: 4) {
            if let docType = tripBit.details?.documentType {
                Text(docType)
                    .font(.caption)
                    .fontWeight(.medium)
            }

            if let holder = tripBit.details?.holderName {
                Text(holder)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if let expiry = tripBit.details?.expiryDate {
                Text("Expires: \(expiry)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var photosDetails: some View {
        VStack(alignment: .leading, spacing: 4) {
            if let albumName = tripBit.details?.albumName {
                Text(albumName)
                    .font(.caption)
                    .fontWeight(.medium)
            }

            if let count = tripBit.details?.photoCount {
                Text("\(count) photos")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var otherDetails: some View {
        VStack(alignment: .leading, spacing: 4) {
            if let customType = tripBit.details?.customType {
                Text(customType)
                    .font(.caption)
                    .fontWeight(.medium)
            }

            if let desc = tripBit.details?.customDescription {
                Text(desc)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
        }
    }

    // MARK: - Traveler Avatars

    private var travelerAvatars: some View {
        HStack(spacing: 4) {
            if let travelers = tripBit.travelers, !travelers.isEmpty {
                if travelers.first?.appliesToAll == true {
                    Label("Everyone", systemImage: "person.3.fill")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                } else {
                    TripBitTravelerAvatars(travelers: travelers)
                }
            } else {
                Label("Everyone", systemImage: "person.3.fill")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

// MARK: - Traveler Avatars Component

struct TripBitTravelerAvatars: View {
    let travelers: [TripBitTraveler]
    let maxVisible: Int
    let size: CGFloat

    init(travelers: [TripBitTraveler], maxVisible: Int = 3, size: CGFloat = 24) {
        self.travelers = travelers
        self.maxVisible = maxVisible
        self.size = size
    }

    var body: some View {
        HStack(spacing: -(size * 0.3)) {
            ForEach(Array(travelers.prefix(maxVisible).enumerated()), id: \.element.id) { index, traveler in
                if let user = traveler.user {
                    AvatarView(name: user.fullName, avatarUrl: user.avatarUrl, size: size, showBorder: true)
                        .zIndex(Double(maxVisible - index))
                }
            }

            if travelers.count > maxVisible {
                Text("+\(travelers.count - maxVisible)")
                    .font(.caption2)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)
                    .frame(width: size, height: size)
                    .background(Color(.systemGray5))
                    .clipShape(Circle())
                    .overlay(Circle().stroke(Color.white, lineWidth: 2))
            }
        }
    }
}

#Preview {
    ScrollView {
        VStack(spacing: 12) {
            TripBitCard(
                tripBit: TripBit(
                    id: UUID(),
                    tripId: UUID(),
                    createdBy: UUID(),
                    category: .flight,
                    title: "Flight to Paris",
                    status: .confirmed,
                    startDatetime: Date(),
                    endDatetime: nil
                )
            ) {
                print("Tapped")
            }

            TripBitCard(
                tripBit: TripBit(
                    id: UUID(),
                    tripId: UUID(),
                    createdBy: UUID(),
                    category: .stay,
                    title: "Hotel Marais",
                    status: .pending,
                    startDatetime: Date(),
                    endDatetime: Date().addingTimeInterval(3 * 24 * 60 * 60)
                )
            ) {
                print("Tapped")
            }
        }
        .padding()
    }
    .background(Color.seeyaBackground)
}
