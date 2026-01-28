import SwiftUI

struct ProfileStatsRow: View {
    let tripCount: Int
    let recommendationCount: Int
    let countriesCount: Int
    let citiesCount: Int

    private let stats: [(icon: String, label: String)] = [
        ("airplane", "Trips"),
        ("star.fill", "Recs"),
        ("flag.fill", "Countries"),
        ("building.2.fill", "Cities")
    ]

    var body: some View {
        HStack(spacing: 0) {
            StatBox(icon: "airplane", count: tripCount, label: "Trips")
            VerticalDivider(height: 32, color: Color(.systemGray5))
            StatBox(icon: "star.fill", count: recommendationCount, label: "Recs")
            VerticalDivider(height: 32, color: Color(.systemGray5))
            StatBox(icon: "flag.fill", count: countriesCount, label: "Countries")
            VerticalDivider(height: 32, color: Color(.systemGray5))
            StatBox(icon: "building.2.fill", count: citiesCount, label: "Cities")
        }
        .seeyaCard()
    }
}

struct StatBox: View {
    let icon: String
    let count: Int
    let label: String

    var body: some View {
        VStack(spacing: SeeyaSpacing.xs) {
            Image(systemName: icon)
                .font(.system(size: SeeyaIconSize.large))
                .foregroundStyle(Color.seeyaPurple)

            Text("\(count)")
                .font(SeeyaTypography.headlineLarge)
                .fontWeight(.bold)

            Text(label)
                .font(SeeyaTypography.caption)
                .foregroundStyle(Color.seeyaTextSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, SeeyaSpacing.md)
    }
}

#Preview {
    ProfileStatsRow(
        tripCount: 12,
        recommendationCount: 45,
        countriesCount: 8,
        citiesCount: 23
    )
    .padding()
}
