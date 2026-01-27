import SwiftUI

struct TravelPalsBar: View {
    @Bindable var viewModel: CalendarViewModel

    private var allSelected: Bool {
        !viewModel.travelPals.isEmpty && viewModel.travelPals.allSatisfy { $0.isEnabled }
    }

    private var noneSelected: Bool {
        viewModel.travelPals.allSatisfy { !$0.isEnabled }
    }

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                // "All" toggle
                CalendarFilterChip(label: "All", isSelected: allSelected) {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        if allSelected || !noneSelected {
                            viewModel.disableAllPals()
                        } else {
                            viewModel.enableAllPals()
                        }
                    }
                    // Haptic feedback
                    let generator = UIImpactFeedbackGenerator(style: .light)
                    generator.impactOccurred()
                }

                if !viewModel.travelPals.isEmpty {
                    Divider()
                        .frame(height: 24)

                    // Pal chips
                    ForEach(viewModel.travelPals, id: \.id) { pal in
                        PalChip(pal: pal) {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                viewModel.togglePal(pal.id)
                            }
                            // Haptic feedback
                            let generator = UIImpactFeedbackGenerator(style: .light)
                            generator.impactOccurred()
                        }
                    }
                }
            }
            .padding(.horizontal)
        }
        .frame(height: 52)
        .background(Color.seeyaCardBackground)
    }
}

// MARK: - Compact Travel Pals Bar (for bottom of screen)

struct TravelPalsBarCompact: View {
    @Bindable var viewModel: CalendarViewModel
    @State private var showExpanded = false

    var body: some View {
        VStack(spacing: 0) {
            // Toggle button
            Button {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                    showExpanded.toggle()
                }
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "person.2.fill")
                        .font(.system(size: 14))
                        .foregroundStyle(Color.seeyaPurple)

                    Text("Travel Pals")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(Color.seeyaTextPrimary)

                    if enabledCount > 0 {
                        Text("(\(enabledCount))")
                            .font(.subheadline)
                            .foregroundStyle(Color.seeyaTextSecondary)
                    }

                    Image(systemName: showExpanded ? "chevron.down" : "chevron.up")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(Color.seeyaTextSecondary)
                }
                .padding(.horizontal, SeeyaSpacing.md)
                .padding(.vertical, SeeyaSpacing.sm)
            }
            .buttonStyle(.plain)

            if showExpanded {
                Divider()
                TravelPalsBar(viewModel: viewModel)
            }
        }
        .background(Color.seeyaCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: showExpanded ? 0 : 12))
        .shadow(color: .black.opacity(0.05), radius: 5, y: -2)
    }

    private var enabledCount: Int {
        viewModel.travelPals.filter { $0.isEnabled }.count
    }
}

#Preview {
    VStack {
        Spacer()
        TravelPalsBar(viewModel: CalendarViewModel())
        Spacer()
        TravelPalsBarCompact(viewModel: CalendarViewModel())
    }
    .background(Color.seeyaBackground)
}
