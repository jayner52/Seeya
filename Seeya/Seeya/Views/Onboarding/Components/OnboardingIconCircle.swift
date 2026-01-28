import SwiftUI

struct OnboardingIconCircle: View {
    let icon: String
    var backgroundColor: Color = .seeyaPurple
    var iconColor: Color = .white
    var size: Size = .large

    enum Size {
        case small
        case large

        var circleSize: CGFloat {
            switch self {
            case .small: return 48
            case .large: return 80
            }
        }

        var iconSize: CGFloat {
            switch self {
            case .small: return 20
            case .large: return 36
            }
        }
    }

    var body: some View {
        ZStack {
            Circle()
                .fill(backgroundColor)
                .frame(width: size.circleSize, height: size.circleSize)

            Image(systemName: icon)
                .font(.system(size: size.iconSize, weight: .medium))
                .foregroundStyle(iconColor)
        }
    }
}

#Preview {
    VStack(spacing: 20) {
        OnboardingIconCircle(icon: "airplane", backgroundColor: .seeyaPurple)
        OnboardingIconCircle(icon: "house.fill", backgroundColor: Color(red: 0.96, green: 0.84, blue: 0.28))
        OnboardingIconCircle(icon: "globe", backgroundColor: Color(red: 0.96, green: 0.84, blue: 0.28))
        OnboardingIconCircle(icon: "mappin.and.ellipse", backgroundColor: .seeyaPurple)
        OnboardingIconCircle(icon: "star.fill", backgroundColor: Color(red: 0.96, green: 0.84, blue: 0.28))

        HStack(spacing: 16) {
            OnboardingIconCircle(icon: "airplane", size: .small)
            OnboardingIconCircle(icon: "house.fill", backgroundColor: Color(red: 0.96, green: 0.84, blue: 0.28), size: .small)
        }
    }
    .padding()
}
