import SwiftUI

struct LocationBar: View {
    let location: TripLocation
    let startColumn: Int
    let endColumn: Int
    let color: Color
    let totalColumns: Int

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "mappin.circle.fill")
                .font(.caption2)

            if let flag = location.flagEmoji {
                Text(flag)
                    .font(.caption2)
            }

            Text(location.displayName)
                .font(.caption2)
                .fontWeight(.medium)
                .lineLimit(1)

            Spacer()
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(color.opacity(0.2))
        .foregroundStyle(color)
        .clipShape(RoundedRectangle(cornerRadius: 4))
    }
}

// MARK: - Multi-day Location Bar (spans across calendar cells)

struct LocationBarSpanning: View {
    let location: TripLocation
    let color: Color
    let width: CGFloat

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "mappin.circle.fill")
                .font(.system(size: 10))

            if let flag = location.flagEmoji {
                Text(flag)
                    .font(.system(size: 10))
            }

            Text(location.displayName)
                .font(.system(size: 10))
                .fontWeight(.medium)
                .lineLimit(1)
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 3)
        .frame(width: width, alignment: .leading)
        .background(color.opacity(0.25))
        .foregroundStyle(color)
        .clipShape(RoundedRectangle(cornerRadius: 4))
    }
}

// MARK: - Location Legend (shows all locations with colors)

struct LocationLegend: View {
    let locations: [TripLocation]

    private let colors: [Color] = [.blue, .green, .orange, .purple, .pink, .teal, .cyan, .indigo]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Locations")
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundStyle(.secondary)

            ForEach(Array(locations.enumerated()), id: \.element.id) { index, location in
                HStack(spacing: 8) {
                    Circle()
                        .fill(colors[index % colors.count])
                        .frame(width: 8, height: 8)

                    if let flag = location.flagEmoji {
                        Text(flag)
                            .font(.caption)
                    }

                    Text(location.displayName)
                        .font(.caption)
                        .lineLimit(1)
                }
            }
        }
        .padding()
        .background(Color.seeyaCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

#Preview {
    VStack(spacing: 16) {
        LocationBar(
            location: TripLocation(
                id: UUID(),
                tripId: UUID(),
                countryId: nil,
                cityId: nil,
                customLocation: "Mexico City, CDMX, Mexico",
                orderIndex: 0,
                createdAt: nil,
                city: nil,
                country: nil
            ),
            startColumn: 0,
            endColumn: 3,
            color: .blue,
            totalColumns: 7
        )

        LocationBar(
            location: TripLocation(
                id: UUID(),
                tripId: UUID(),
                countryId: nil,
                cityId: nil,
                customLocation: "Playa del Carmen, Quintana Roo",
                orderIndex: 1,
                createdAt: nil,
                city: nil,
                country: nil
            ),
            startColumn: 3,
            endColumn: 5,
            color: .green,
            totalColumns: 7
        )

        LocationBar(
            location: TripLocation(
                id: UUID(),
                tripId: UUID(),
                countryId: nil,
                cityId: nil,
                customLocation: "Valladolid, Yucatan",
                orderIndex: 2,
                createdAt: nil,
                city: nil,
                country: nil
            ),
            startColumn: 5,
            endColumn: 6,
            color: .orange,
            totalColumns: 7
        )
    }
    .padding()
}
