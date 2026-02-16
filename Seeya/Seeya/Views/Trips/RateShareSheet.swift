import SwiftUI

struct RateShareSheet: View {
    @Environment(\.dismiss) private var dismiss

    let tripBit: TripBit
    let trip: Trip?

    @State private var rating: Int = 0
    @State private var tipsText: String = ""
    @State private var isSubmitting = false
    @State private var showSuccess = false
    @State private var errorMessage: String?

    // Map TripBitCategory to a display recommendation type
    private var recommendationCategoryName: String {
        switch tripBit.category {
        case .reservation: return "Restaurant"
        case .activity: return "Activity"
        case .stay: return "Stay"
        default: return "Tip"
        }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.seeyaBackground.ignoresSafeArea()

                if showSuccess {
                    successView
                } else {
                    formContent
                }
            }
            .navigationTitle("Rate & Share")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }

    // MARK: - Form Content

    private var formContent: some View {
        ScrollView {
            VStack(spacing: SeeyaSpacing.lg) {
                // Trip Bit Info Card
                tripBitInfoCard

                // Star Rating
                ratingSection

                // Tips / Review
                tipsSection

                // Error message
                if let errorMessage {
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .padding(.horizontal)
                }

                // Share Button
                Button {
                    submitShare()
                } label: {
                    HStack(spacing: SeeyaSpacing.xs) {
                        if isSubmitting {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Image(systemName: "square.and.arrow.up")
                        }
                        Text("Share to Profile")
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(rating > 0 ? Color.seeyaPurple : Color.gray)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: SeeyaRadius.button))
                }
                .disabled(rating == 0 || isSubmitting)
                .padding(.horizontal)
            }
            .padding(.vertical, SeeyaSpacing.md)
        }
    }

    // MARK: - Trip Bit Info Card

    private var tripBitInfoCard: some View {
        HStack(spacing: SeeyaSpacing.md) {
            Image(systemName: tripBit.category.icon)
                .font(.title2)
                .foregroundStyle(tripBit.category.color)
                .frame(width: 48, height: 48)
                .background(tripBit.category.color.opacity(0.15))
                .clipShape(RoundedRectangle(cornerRadius: 12))

            VStack(alignment: .leading, spacing: 4) {
                Text(tripBit.title)
                    .font(SeeyaTypography.headlineMedium)

                HStack(spacing: SeeyaSpacing.xs) {
                    StatusBadge(
                        text: recommendationCategoryName,
                        color: tripBit.category.color
                    )

                    if let destination = trip?.destination {
                        Text(destination)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            Spacer()
        }
        .padding()
        .background(Color.seeyaCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: SeeyaRadius.card))
        .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
        .padding(.horizontal)
    }

    // MARK: - Rating Section

    private var ratingSection: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.sm) {
            Text("Your Rating")
                .font(SeeyaTypography.headlineSmall)
                .padding(.horizontal)

            HStack(spacing: SeeyaSpacing.sm) {
                ForEach(1...5, id: \.self) { star in
                    Button {
                        withAnimation(.easeInOut(duration: 0.15)) {
                            rating = star
                        }
                    } label: {
                        Image(systemName: star <= rating ? "star.fill" : "star")
                            .font(.title)
                            .foregroundStyle(star <= rating ? .yellow : Color(.systemGray3))
                    }
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, SeeyaSpacing.sm)
            .background(Color.seeyaCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: SeeyaRadius.card))
            .padding(.horizontal)
        }
    }

    // MARK: - Tips Section

    private var tipsSection: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.sm) {
            Text("Tips & Review")
                .font(SeeyaTypography.headlineSmall)
                .padding(.horizontal)

            Text("Share advice for other travelers (optional)")
                .font(.caption)
                .foregroundStyle(.secondary)
                .padding(.horizontal)

            TextEditor(text: $tipsText)
                .frame(minHeight: 100)
                .padding(SeeyaSpacing.sm)
                .scrollContentBackground(.hidden)
                .background(Color.seeyaCardBackground)
                .clipShape(RoundedRectangle(cornerRadius: SeeyaRadius.input))
                .overlay(
                    RoundedRectangle(cornerRadius: SeeyaRadius.input)
                        .stroke(Color.seeyaBorder, lineWidth: 1)
                )
                .padding(.horizontal)
        }
    }

    // MARK: - Success View

    private var successView: some View {
        VStack(spacing: SeeyaSpacing.lg) {
            Spacer()

            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 72))
                .foregroundStyle(.green)

            Text("Shared!")
                .font(SeeyaTypography.displayMedium)

            Text("Your recommendation has been added to your profile.")
                .font(SeeyaTypography.bodyMedium)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, SeeyaSpacing.xl)

            Spacer()

            Button {
                dismiss()
            } label: {
                Text("Done")
                    .fontWeight(.semibold)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Color.seeyaPurple)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: SeeyaRadius.button))
            }
            .padding(.horizontal)
            .padding(.bottom, SeeyaSpacing.lg)
        }
    }

    // MARK: - Submit

    private func submitShare() {
        guard rating > 0 else { return }
        isSubmitting = true
        errorMessage = nil

        Task {
            do {
                _ = try await RecommendationService.shared.shareRecommendation(
                    tripBit: tripBit,
                    trip: trip,
                    rating: rating,
                    tips: tipsText.isEmpty ? nil : tipsText
                )

                withAnimation {
                    showSuccess = true
                }
            } catch {
                errorMessage = "Failed to share: \(error.localizedDescription)"
                print("[RateShareSheet] Error: \(error)")
            }
            isSubmitting = false
        }
    }
}

#Preview {
    RateShareSheet(
        tripBit: TripBit(
            id: UUID(),
            tripId: UUID(),
            createdBy: UUID(),
            category: .reservation,
            title: "La Maison Rose",
            status: .completed,
            startDatetime: Date()
        ),
        trip: Trip(
            id: UUID(),
            userId: UUID(),
            name: "Paris Trip",
            description: nil,
            startDate: Date(),
            endDate: Date(),
            isFlexible: false,
            visibility: .fullDetails,
            isPast: true,
            createdAt: Date(),
            updatedAt: Date(),
            locations: nil,
            participants: nil,
            owner: nil,
            recommendations: nil,
            tripTypes: nil
        )
    )
}
