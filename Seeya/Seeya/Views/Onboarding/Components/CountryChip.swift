import SwiftUI

struct CountryChip: View {
    let country: Country
    let isSelected: Bool
    let action: () -> Void

    private let selectedBorderColor = Color(red: 0.96, green: 0.84, blue: 0.28) // Yellow

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Text(country.flagEmoji ?? "")
                    .font(.system(size: 16))

                Text(country.name)
                    .font(SeeyaTypography.labelMedium)
                    .foregroundStyle(Color.seeyaTextPrimary)
                    .lineLimit(1)

                if isSelected {
                    Image(systemName: "checkmark")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(selectedBorderColor)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color.seeyaCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(isSelected ? selectedBorderColor : Color.clear, lineWidth: 2)
            )
        }
        .buttonStyle(.plain)
    }
}

struct CountryAddChip: View {
    let country: Country
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Text(country.flagEmoji ?? "")
                    .font(.system(size: 16))

                Text(country.name)
                    .font(SeeyaTypography.labelMedium)
                    .foregroundStyle(Color.seeyaTextPrimary)
                    .lineLimit(1)

                if isSelected {
                    Image(systemName: "checkmark")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(.green)
                } else {
                    Image(systemName: "plus")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(Color.seeyaTextSecondary)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(isSelected ? Color.green.opacity(0.1) : Color.seeyaCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(isSelected ? Color.green : Color.gray.opacity(0.2), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

struct CountryRemovableChip: View {
    let country: Country
    let onRemove: () -> Void

    var body: some View {
        HStack(spacing: 6) {
            Text(country.flagEmoji ?? "")
                .font(.system(size: 16))

            Text(country.name)
                .font(SeeyaTypography.labelMedium)
                .foregroundStyle(Color.seeyaTextPrimary)
                .lineLimit(1)

            Button(action: onRemove) {
                Image(systemName: "xmark")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(Color.seeyaTextSecondary)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color.seeyaPurple.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

#Preview {
    let sampleCountry = Country(
        id: UUID(),
        name: "France",
        code: "FR",
        flagEmoji: "🇫🇷",
        continentId: nil,
        createdAt: nil,
        continent: nil
    )

    VStack(spacing: 16) {
        HStack {
            CountryChip(country: sampleCountry, isSelected: false, action: {})
            CountryChip(country: sampleCountry, isSelected: true, action: {})
        }

        HStack {
            CountryAddChip(country: sampleCountry, isSelected: false, action: {})
            CountryAddChip(country: sampleCountry, isSelected: true, action: {})
        }

        CountryRemovableChip(country: sampleCountry, onRemove: {})
    }
    .padding()
    .background(Color.seeyaBackground)
}
