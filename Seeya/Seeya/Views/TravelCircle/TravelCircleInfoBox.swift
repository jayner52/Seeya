import SwiftUI

struct TravelCircleInfoBox: View {
    @State private var isExpanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.sm) {
            Button {
                withAnimation(.easeInOut(duration: 0.2)) {
                    isExpanded.toggle()
                }
            } label: {
                HStack(spacing: SeeyaSpacing.xs) {
                    Image(systemName: "info.circle.fill")
                        .font(.system(size: SeeyaIconSize.medium))
                        .foregroundStyle(Color.seeyaPurple)

                    Text("What's the difference?")
                        .font(SeeyaTypography.labelMedium)
                        .foregroundStyle(Color.seeyaTextPrimary)

                    Spacer()

                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: SeeyaIconSize.small))
                        .foregroundStyle(Color.seeyaTextSecondary)
                }
            }
            .buttonStyle(.plain)

            if isExpanded {
                VStack(alignment: .leading, spacing: SeeyaSpacing.sm) {
                    InfoRow(
                        icon: "person.2.fill",
                        title: "Travel Pals",
                        description: "Friends you've added. They can see your trips, calendar, and recommendations."
                    )

                    InfoRow(
                        icon: "airplane",
                        title: "Tripmates",
                        description: "People from past trips who aren't friends yet. They can only see shared recommendations from trips you both attended."
                    )
                }
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .padding(SeeyaSpacing.md)
        .background(Color.seeyaPurple.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

private struct InfoRow: View {
    let icon: String
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: SeeyaSpacing.sm) {
            Image(systemName: icon)
                .font(.system(size: SeeyaIconSize.small))
                .foregroundStyle(Color.seeyaPurple)
                .frame(width: 20)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(SeeyaTypography.labelMedium)
                    .foregroundStyle(Color.seeyaTextPrimary)

                Text(description)
                    .font(SeeyaTypography.caption)
                    .foregroundStyle(Color.seeyaTextSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}

#Preview {
    VStack {
        TravelCircleInfoBox()
    }
    .padding()
    .background(Color.seeyaBackground)
}
