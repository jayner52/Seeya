import SwiftUI

// MARK: - Brand Colors
extension Color {
    // Primary design system colors - Updated to match spec
    static let seeyaPrimary = Color(red: 0.99, green: 0.93, blue: 0.17)     // #FCEE2C Yellow - Primary CTA
    static let seeyaSecondary = Color(red: 0.85, green: 0.76, blue: 0.96)   // #D8C3F4 Lavender
    static let seeyaBackground = Color(red: 0.98, green: 0.97, blue: 0.95)  // Warm cream (kept)
    static let seeyaCardBackground = Color(red: 0.96, green: 0.96, blue: 0.93) // #F6F4EE Beige
    static let seeyaSurface = Color(red: 0.96, green: 0.95, blue: 0.93)     // Subtle surface for backgrounds
    static let seeyaPurple = Color(red: 0.5, green: 0.3, blue: 0.7)         // Legacy brand purple
    static let seeyaAccent = Color.black                                     // Secondary buttons
    static let seeyaBorder = Color(red: 0.91, green: 0.89, blue: 0.85)      // #E7E2DA Warm gray border
    static let seeyaSecondaryText = Color(red: 0.5, green: 0.5, blue: 0.5)
    static let seeyaSuccess = Color.green
    static let seeyaWarning = Color.orange
    static let seeyaError = Color.red

    // Text hierarchy
    static let seeyaTextPrimary = Color.primary
    static let seeyaTextSecondary = Color(red: 0.4, green: 0.4, blue: 0.4)  // #666666
    static let seeyaTextTertiary = Color(red: 0.6, green: 0.6, blue: 0.6)

    // Foreground for yellow buttons (dark text)
    static let seeyaForeground = Color(red: 0.1, green: 0.1, blue: 0.1)     // #1A1A1A

    // Continent Colors - 7 unique colors
    static let continentEurope = Color(red: 0.2, green: 0.4, blue: 0.7)       // Blue
    static let continentAsia = Color(red: 0.8, green: 0.3, blue: 0.3)         // Red
    static let continentNorthAmerica = Color(red: 0.3, green: 0.6, blue: 0.4) // Green
    static let continentSouthAmerica = Color(red: 0.9, green: 0.6, blue: 0.2) // Orange
    static let continentAfrica = Color(red: 0.7, green: 0.5, blue: 0.2)       // Gold/Brown
    static let continentOceania = Color(red: 0.4, green: 0.7, blue: 0.8)      // Teal
    static let continentAntarctica = Color(red: 0.5, green: 0.6, blue: 0.8)   // Ice blue

    /// Returns a unique color for each continent
    static func forContinent(_ continentName: String) -> Color {
        switch continentName.lowercased() {
        case "europe":
            return .continentEurope
        case "asia":
            return .continentAsia
        case "north america":
            return .continentNorthAmerica
        case "south america":
            return .continentSouthAmerica
        case "africa":
            return .continentAfrica
        case "oceania", "australia":
            return .continentOceania
        case "antarctica":
            return .continentAntarctica
        default:
            return .seeyaTextSecondary
        }
    }

    /// Returns a unique SF Symbol icon for each continent
    static func iconForContinent(_ continentName: String) -> String {
        switch continentName.lowercased() {
        case "europe":
            return "building.columns.fill"  // Classical architecture
        case "asia":
            return "mountain.2.fill"  // Mountains
        case "north america":
            return "triangle.fill"  // Mountain/triangle shape
        case "south america":
            return "wind"  // Swirl/wind
        case "africa":
            return "sun.max.fill"  // Sun
        case "oceania", "australia":
            return "water.waves"  // Waves
        case "antarctica":
            return "snowflake"  // Snowflake
        default:
            return "globe"
        }
    }
}

// MARK: - Typography System
struct SeeyaTypography {
    // Display (Serif - for trip names, headings with personality)
    // Using Apple's New York font (system serif) - closest to Playfair Display
    // To use Playfair Display later, bundle the fonts and change to:
    // Font.custom("PlayfairDisplay-Bold", size: 24)
    static let displayLarge = Font.system(size: 24, weight: .bold, design: .serif)
    static let displayMedium = Font.system(size: 20, weight: .semibold, design: .serif)
    static let displaySmall = Font.system(size: 18, weight: .medium, design: .serif)

    // Headings (System sans-serif - SF Pro)
    static let headlineLarge = Font.system(size: 20, weight: .semibold)
    static let headlineMedium = Font.system(size: 17, weight: .semibold)
    static let headlineSmall = Font.system(size: 15, weight: .semibold)

    // Body (System sans-serif)
    static let bodyLarge = Font.system(size: 17, weight: .regular)
    static let bodyMedium = Font.system(size: 15, weight: .regular)
    static let bodySmall = Font.system(size: 13, weight: .regular)

    // Labels & Captions
    static let labelLarge = Font.system(size: 14, weight: .medium)
    static let labelMedium = Font.system(size: 12, weight: .medium)
    static let labelSmall = Font.system(size: 11, weight: .medium)
    static let caption = Font.system(size: 12, weight: .regular)
    static let captionSmall = Font.system(size: 10, weight: .regular)
}

// MARK: - Border Radius
struct SeeyaRadius {
    static let base: CGFloat = 16
    static let button: CGFloat = 14
    static let input: CGFloat = 12
    static let card: CGFloat = 16
    static let pill: CGFloat = 9999
}

// MARK: - Spacing Scale
struct SeeyaSpacing {
    static let xxs: CGFloat = 4
    static let xs: CGFloat = 8
    static let sm: CGFloat = 12
    static let md: CGFloat = 16
    static let lg: CGFloat = 24
    static let xl: CGFloat = 32
    static let xxl: CGFloat = 48
}

// MARK: - Icon Sizes
struct SeeyaIconSize {
    static let small: CGFloat = 14
    static let medium: CGFloat = 18
    static let large: CGFloat = 24
    static let xlarge: CGFloat = 32
}

// MARK: - Card Style
struct SeeyaCardStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(Color.seeyaCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: SeeyaRadius.card))
            .shadow(color: .black.opacity(0.1), radius: 15, x: 0, y: 8)
    }
}

extension View {
    func seeyaCard() -> some View {
        modifier(SeeyaCardStyle())
    }
}

// MARK: - Primary Button Style
struct SeeyaPrimaryButtonStyle: ButtonStyle {
    var isEnabled: Bool = true

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .foregroundStyle(Color.seeyaForeground)  // Dark text on yellow
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(isEnabled ? Color.seeyaPrimary : Color.gray)
            .clipShape(RoundedRectangle(cornerRadius: SeeyaRadius.button))
            .opacity(configuration.isPressed ? 0.8 : 1.0)
    }
}

// MARK: - Secondary Button Style
struct SeeyaSecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline)
            .fontWeight(.medium)
            .foregroundStyle(Color.seeyaAccent)
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(Color.seeyaSecondary)
            .clipShape(RoundedRectangle(cornerRadius: SeeyaRadius.button))
            .opacity(configuration.isPressed ? 0.7 : 1.0)
    }
}

// MARK: - Status Badge
struct StatusBadge: View {
    let text: String
    let color: Color

    var body: some View {
        Text(text)
            .font(.caption)
            .fontWeight(.medium)
            .foregroundStyle(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(color.opacity(0.15))
            .clipShape(Capsule())
    }
}

// MARK: - Category Pill
struct CategoryPill: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline)
                .fontWeight(isSelected ? .semibold : .regular)
                .foregroundStyle(isSelected ? Color.seeyaForeground : .primary)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(isSelected ? Color.seeyaPrimary : Color.gray.opacity(0.1))
                .clipShape(Capsule())
        }
    }
}

// MARK: - Avatar View
struct AvatarView: View {
    let name: String
    let avatarUrl: String?
    let size: CGFloat
    var showBorder: Bool = false

    var body: some View {
        Group {
            if let avatarUrl = avatarUrl, let url = URL(string: avatarUrl) {
                AsyncImage(url: url) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    initialsView
                }
            } else {
                initialsView
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .overlay(
            Circle()
                .stroke(showBorder ? Color.white : Color.clear, lineWidth: 2)
        )
    }

    private var initialsView: some View {
        Text(initials)
            .font(.system(size: size * 0.4, weight: .medium))
            .foregroundStyle(Color.seeyaForeground)
            .frame(width: size, height: size)
            .background(Color.seeyaPrimary)
    }

    private var initials: String {
        let parts = name.split(separator: " ")
        if parts.count >= 2 {
            return "\(parts[0].prefix(1))\(parts[1].prefix(1))".uppercased()
        }
        return String(name.prefix(2)).uppercased()
    }
}

// MARK: - Stacked Avatars
struct StackedAvatarsView: View {
    let participants: [TripParticipant]
    let maxVisible: Int
    let size: CGFloat

    init(participants: [TripParticipant], maxVisible: Int = 3, size: CGFloat = 28) {
        self.participants = participants
        self.maxVisible = maxVisible
        self.size = size
    }

    var body: some View {
        HStack(spacing: -(size * 0.3)) {
            ForEach(Array(participants.prefix(maxVisible).enumerated()), id: \.element.id) { index, participant in
                if let user = participant.user {
                    AvatarView(name: user.fullName, avatarUrl: user.avatarUrl, size: size, showBorder: true)
                        .zIndex(Double(maxVisible - index))
                }
            }

            if participants.count > maxVisible {
                Text("+\(participants.count - maxVisible)")
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

// MARK: - Empty State View
struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String
    var buttonTitle: String? = nil
    var buttonAction: (() -> Void)? = nil

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 56))
                .foregroundStyle(.tertiary)

            Text(title)
                .font(.title3)
                .fontWeight(.semibold)

            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            if let buttonTitle = buttonTitle, let action = buttonAction {
                Button(action: action) {
                    Label(buttonTitle, systemImage: "plus")
                }
                .buttonStyle(SeeyaSecondaryButtonStyle())
                .padding(.top, 8)
            }
        }
        .padding(32)
    }
}

// MARK: - Section Header
struct SectionHeader: View {
    let title: String
    var icon: String? = nil
    var count: Int? = nil
    var action: (() -> Void)? = nil
    var actionIcon: String = "plus"

    var body: some View {
        HStack(spacing: SeeyaSpacing.xs) {
            if let icon = icon {
                Image(systemName: icon)
                    .font(.system(size: SeeyaIconSize.medium))
                    .foregroundStyle(Color.seeyaPrimary)
            }

            Text(title)
                .font(SeeyaTypography.headlineMedium)

            if let count = count {
                Text("(\(count))")
                    .font(SeeyaTypography.headlineMedium)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            if let action = action {
                Button(action: action) {
                    Image(systemName: actionIcon)
                        .font(.system(size: SeeyaIconSize.medium))
                        .foregroundStyle(Color.seeyaPrimary)
                }
            }
        }
    }
}

// MARK: - Standardized Icon View
struct SeeyaIcon: View {
    let systemName: String
    var size: CGFloat = SeeyaIconSize.medium
    var color: Color = .seeyaPrimary

    var body: some View {
        Image(systemName: systemName)
            .font(.system(size: size))
            .foregroundStyle(color)
    }
}

// MARK: - Filter Icon Button (for wanderlist, etc.)
struct FilterIconButton: View {
    let icon: String
    let label: String
    let isSelected: Bool
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: SeeyaSpacing.xxs) {
                Image(systemName: icon)
                    .font(.system(size: SeeyaIconSize.small))
                Text(label)
                    .font(SeeyaTypography.captionSmall)
            }
            .foregroundStyle(isSelected ? .white : color)
            .padding(.horizontal, SeeyaSpacing.xs)
            .padding(.vertical, SeeyaSpacing.xxs)
            .background(isSelected ? color : color.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 6))
        }
    }
}

// MARK: - Count Badge
struct CountBadge: View {
    let count: Int
    var color: Color = .seeyaPrimary
    var size: CountBadgeSize = .medium

    enum CountBadgeSize {
        case small, medium, large

        var font: Font {
            switch self {
            case .small: return SeeyaTypography.captionSmall
            case .medium: return SeeyaTypography.caption
            case .large: return SeeyaTypography.labelMedium
            }
        }

        var padding: CGFloat {
            switch self {
            case .small: return SeeyaSpacing.xxs
            case .medium: return SeeyaSpacing.xs
            case .large: return SeeyaSpacing.sm
            }
        }
    }

    var body: some View {
        Text("\(count)")
            .font(size.font)
            .foregroundStyle(color)
            .padding(.horizontal, size.padding)
            .padding(.vertical, size.padding / 2)
            .background(color.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 4))
    }
}

// MARK: - Vertical Divider
struct VerticalDivider: View {
    var height: CGFloat = 24
    var color: Color = Color(.systemGray4)

    var body: some View {
        Rectangle()
            .fill(color)
            .frame(width: 1, height: height)
    }
}
