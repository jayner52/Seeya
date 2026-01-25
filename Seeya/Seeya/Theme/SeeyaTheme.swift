import SwiftUI

// MARK: - Brand Colors
extension Color {
    static let seeyaBackground = Color(red: 0.98, green: 0.97, blue: 0.95) // Warm cream
    static let seeyaCardBackground = Color.white
    static let seeyaPurple = Color(red: 0.5, green: 0.3, blue: 0.7) // Brand purple
    static let seeyaAccent = Color.black // Primary buttons
    static let seeyaSecondaryText = Color(red: 0.5, green: 0.5, blue: 0.5)
    static let seeyaSuccess = Color.green
    static let seeyaWarning = Color.orange
    static let seeyaError = Color.red
}

// MARK: - Card Style
struct SeeyaCardStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(Color.seeyaCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
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
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(isEnabled ? Color.seeyaAccent : Color.gray)
            .clipShape(RoundedRectangle(cornerRadius: 10))
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
            .background(Color.seeyaAccent.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 8))
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
                .foregroundStyle(isSelected ? .white : .primary)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(isSelected ? Color.seeyaAccent : Color.gray.opacity(0.1))
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
            .foregroundStyle(.white)
            .frame(width: size, height: size)
            .background(Color.seeyaPurple)
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
    var action: (() -> Void)? = nil
    var actionIcon: String = "plus"

    var body: some View {
        HStack {
            Text(title)
                .font(.headline)

            Spacer()

            if let action = action {
                Button(action: action) {
                    Image(systemName: actionIcon)
                        .font(.body)
                        .foregroundStyle(Color.seeyaPurple)
                }
            }
        }
    }
}
