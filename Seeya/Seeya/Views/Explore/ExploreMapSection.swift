import SwiftUI
import MapKit

struct ExploreMapSection: View {
    let recommendations: [SharedRecommendation]
    @Binding var isExpanded: Bool

    @State private var selectedRecommendation: SharedRecommendation?
    @State private var cameraPosition: MapCameraPosition = .automatic

    var body: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.sm) {
            // Header
            HStack {
                SectionHeader(
                    title: "Explore on Map",
                    icon: "map"
                )

                Spacer()

                if !recommendations.isEmpty {
                    Button {
                        withAnimation {
                            isExpanded.toggle()
                        }
                    } label: {
                        Image(systemName: isExpanded ? "arrow.down.right.and.arrow.up.left" : "arrow.up.left.and.arrow.down.right")
                            .font(.system(size: SeeyaIconSize.medium))
                            .foregroundStyle(Color.seeyaPurple)
                    }
                }
            }

            if recommendations.isEmpty {
                emptyState
            } else {
                // Map
                Map(position: $cameraPosition, selection: $selectedRecommendation) {
                    ForEach(recommendations) { rec in
                        if let lat = rec.latitude, let lng = rec.longitude {
                            Annotation(rec.title, coordinate: CLLocationCoordinate2D(latitude: lat, longitude: lng), anchor: .bottom) {
                                MapMarkerView(recommendation: rec, isSelected: selectedRecommendation?.id == rec.id)
                            }
                            .tag(rec)
                        }
                    }
                }
                .mapStyle(.standard(elevation: .realistic))
                .frame(height: isExpanded ? 400 : 200)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.seeyaSurface, lineWidth: 1)
                )

                // Legend
                legendView

                // Selected recommendation preview
                if let selected = selectedRecommendation {
                    selectedPreview(for: selected)
                }
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: SeeyaSpacing.md) {
            // Globe illustration
            ZStack {
                Circle()
                    .fill(Color.seeyaPurple.opacity(0.1))
                    .frame(width: 80, height: 80)

                Image(systemName: "globe.americas.fill")
                    .font(.system(size: 40))
                    .foregroundStyle(Color.seeyaPurple.opacity(0.6))
            }

            VStack(spacing: SeeyaSpacing.xxs) {
                Text("Your map awaits")
                    .font(SeeyaTypography.headlineSmall)
                    .foregroundStyle(Color.seeyaTextPrimary)

                Text("Recommendations from your travel circle will appear here on the map")
                    .font(SeeyaTypography.caption)
                    .foregroundStyle(Color.seeyaTextSecondary)
                    .multilineTextAlignment(.center)
            }

            // Legend preview
            legendView
                .opacity(0.5)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, SeeyaSpacing.xl)
        .background(Color.seeyaSurface.opacity(0.5))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private var legendView: some View {
        HStack(spacing: SeeyaSpacing.md) {
            ForEach(RecommendationCategory.allCases, id: \.self) { category in
                HStack(spacing: SeeyaSpacing.xxs) {
                    Circle()
                        .fill(categoryColor(for: category))
                        .frame(width: 8, height: 8)
                    Text(category.displayName)
                        .font(SeeyaTypography.captionSmall)
                        .foregroundStyle(Color.seeyaTextTertiary)
                }
            }
        }
    }

    private func selectedPreview(for recommendation: SharedRecommendation) -> some View {
        HStack(spacing: SeeyaSpacing.sm) {
            // Category indicator
            Circle()
                .fill(categoryColor(for: recommendation.category))
                .frame(width: 12, height: 12)

            VStack(alignment: .leading, spacing: 2) {
                Text(recommendation.title)
                    .font(SeeyaTypography.labelMedium)
                    .foregroundStyle(Color.seeyaTextPrimary)

                Text(recommendation.locationDisplay)
                    .font(SeeyaTypography.caption)
                    .foregroundStyle(Color.seeyaTextSecondary)
            }

            Spacer()

            Button {
                selectedRecommendation = nil
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .foregroundStyle(Color.seeyaTextTertiary)
            }
        }
        .padding(SeeyaSpacing.sm)
        .background(Color.seeyaCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private func categoryColor(for category: RecommendationCategory) -> Color {
        switch category {
        case .restaurant: return .orange
        case .activity: return .green
        case .stay: return .blue
        case .tip: return Color(red: 0.85, green: 0.65, blue: 0.0)
        }
    }
}

// MARK: - Map Marker View

private struct MapMarkerView: View {
    let recommendation: SharedRecommendation
    let isSelected: Bool

    var body: some View {
        VStack(spacing: 0) {
            ZStack {
                Circle()
                    .fill(markerColor)
                    .frame(width: isSelected ? 36 : 28, height: isSelected ? 36 : 28)
                    .shadow(color: markerColor.opacity(0.3), radius: 4)

                Image(systemName: recommendation.category.icon)
                    .font(.system(size: isSelected ? 16 : 12))
                    .foregroundStyle(.white)
            }

            // Arrow pointing down
            Triangle()
                .fill(markerColor)
                .frame(width: 10, height: 6)
        }
        .animation(.spring(response: 0.3), value: isSelected)
    }

    private var markerColor: Color {
        switch recommendation.category {
        case .restaurant: return .orange
        case .activity: return .green
        case .stay: return .blue
        case .tip: return Color(red: 0.85, green: 0.65, blue: 0.0)
        }
    }
}

// MARK: - Triangle Shape

private struct Triangle: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.midX, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.minX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
        path.closeSubpath()
        return path
    }
}

#Preview {
    ExploreMapSection(
        recommendations: [],
        isExpanded: .constant(false)
    )
    .padding()
}
