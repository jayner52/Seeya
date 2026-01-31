import SwiftUI
import Supabase

/// Sheet for selecting which trip to add an AI recommendation to
struct AddToTripSheet: View {
    @Environment(\.dismiss) private var dismiss

    let recommendation: AIService.AIRecommendation
    let onAdd: (Trip) async -> Bool

    @State private var trips: [Trip] = []
    @State private var selectedTrip: Trip?
    @State private var isLoading = true
    @State private var isAdding = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Recommendation preview
                recommendationPreview
                    .padding(SeeyaSpacing.md)
                    .background(Color.seeyaSurface)

                // Trip list
                tripsList
            }
            .background(Color.seeyaBackground)
            .navigationTitle("Add to Trip")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    if selectedTrip != nil {
                        Button {
                            addToSelectedTrip()
                        } label: {
                            if isAdding {
                                ProgressView()
                                    .tint(.white)
                            } else {
                                Text("Add")
                                    .fontWeight(.semibold)
                            }
                        }
                        .disabled(isAdding)
                    }
                }
            }
            .task {
                await fetchTrips()
            }
        }
    }

    // MARK: - Recommendation Preview

    private var recommendationPreview: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.xs) {
            Text("Adding:")
                .font(SeeyaTypography.caption)
                .foregroundStyle(Color.seeyaTextSecondary)

            HStack(spacing: SeeyaSpacing.sm) {
                Image(systemName: categoryIcon)
                    .font(.title3)
                    .foregroundStyle(categoryColor)
                    .frame(width: 32, height: 32)
                    .background(categoryColor.opacity(0.15))
                    .clipShape(Circle())

                VStack(alignment: .leading, spacing: 2) {
                    Text(recommendation.title)
                        .font(SeeyaTypography.labelMedium)
                        .fontWeight(.semibold)
                        .foregroundStyle(Color.seeyaTextPrimary)
                        .lineLimit(1)

                    Text(recommendation.category.capitalized)
                        .font(SeeyaTypography.caption)
                        .foregroundStyle(Color.seeyaTextSecondary)
                }
            }
        }
    }

    private var categoryIcon: String {
        switch recommendation.category.lowercased() {
        case "restaurant": return "fork.knife"
        case "activity": return "figure.hiking"
        case "stay": return "bed.double"
        case "tip": return "lightbulb"
        default: return "star"
        }
    }

    private var categoryColor: Color {
        switch recommendation.category.lowercased() {
        case "restaurant": return .orange
        case "activity": return .green
        case "stay": return .blue
        case "tip": return Color(red: 0.85, green: 0.65, blue: 0.0)
        default: return .purple
        }
    }

    // MARK: - Trips List

    private var tripsList: some View {
        Group {
            if isLoading {
                loadingView
            } else if trips.isEmpty {
                emptyView
            } else {
                ScrollView {
                    LazyVStack(spacing: SeeyaSpacing.sm) {
                        ForEach(trips) { trip in
                            tripRow(trip)
                        }
                    }
                    .padding(SeeyaSpacing.md)
                }
            }
        }
    }

    private var loadingView: some View {
        VStack {
            Spacer()
            ProgressView()
                .scaleEffect(1.2)
            Spacer()
        }
    }

    private var emptyView: some View {
        VStack(spacing: SeeyaSpacing.md) {
            Spacer()

            Image(systemName: "airplane.circle")
                .font(.system(size: 48))
                .foregroundStyle(Color.seeyaTextTertiary)

            Text("No upcoming trips")
                .font(SeeyaTypography.headlineSmall)
                .foregroundStyle(Color.seeyaTextPrimary)

            Text("Create a trip first to add this recommendation.")
                .font(SeeyaTypography.bodySmall)
                .foregroundStyle(Color.seeyaTextSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, SeeyaSpacing.xl)

            Spacer()
        }
    }

    private func tripRow(_ trip: Trip) -> some View {
        let isSelected = selectedTrip?.id == trip.id

        return Button {
            selectedTrip = trip
        } label: {
            HStack(spacing: SeeyaSpacing.sm) {
                VStack(alignment: .leading, spacing: SeeyaSpacing.xxs) {
                    Text(trip.name)
                        .font(SeeyaTypography.labelMedium)
                        .fontWeight(.semibold)
                        .foregroundStyle(Color.seeyaTextPrimary)
                        .lineLimit(1)

                    HStack(spacing: SeeyaSpacing.xs) {
                        if let flag = trip.locations?.first?.flagEmoji {
                            Text(flag)
                                .font(.caption)
                        }
                        Text(trip.destination)
                            .font(SeeyaTypography.bodySmall)
                            .foregroundStyle(Color.seeyaTextSecondary)
                            .lineLimit(1)
                    }

                    if trip.hasDates {
                        HStack(spacing: 4) {
                            Image(systemName: "calendar")
                                .font(.caption2)
                            Text(trip.dateRangeText)
                                .font(SeeyaTypography.caption)
                        }
                        .foregroundStyle(Color.seeyaTextTertiary)
                    }
                }

                Spacer()

                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.title2)
                        .foregroundStyle(Color.seeyaPurple)
                }
            }
            .padding(SeeyaSpacing.md)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.seeyaCardBackground)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(isSelected ? Color.seeyaPurple : Color.clear, lineWidth: 2)
                    )
            )
        }
        .buttonStyle(.plain)
    }

    // MARK: - Actions

    private func fetchTrips() async {
        isLoading = true

        do {
            let session = try await SupabaseService.shared.client.auth.session
            let userId = session.user.id

            // Fetch trips where user is owner
            let ownedTrips: [Trip] = try await SupabaseService.shared.client
                .from("trips")
                .select("*, trip_locations(*, cities(*, countries(*)))")
                .eq("user_id", value: userId.uuidString)
                .execute()
                .value

            // Fetch trips where user is a participant
            let participatingTrips: [Trip] = try await SupabaseService.shared.client
                .from("trips")
                .select("*, trip_locations(*, cities(*, countries(*))), trip_participants!inner(*)")
                .eq("trip_participants.user_id", value: userId.uuidString)
                .neq("user_id", value: userId.uuidString)
                .execute()
                .value

            // Combine and deduplicate
            var allTrips = ownedTrips
            for trip in participatingTrips {
                if !allTrips.contains(where: { $0.id == trip.id }) {
                    allTrips.append(trip)
                }
            }

            // Filter to upcoming/current trips only
            let now = Date()
            trips = allTrips.filter { trip in
                // Include trips without end dates
                guard let endDate = trip.endDate else { return true }
                // Include trips that haven't ended
                return endDate >= now
            }
            .sorted { ($0.startDate ?? .distantFuture) < ($1.startDate ?? .distantFuture) }

            print("✅ [AddToTripSheet] Fetched \(trips.count) upcoming trips")
        } catch {
            print("❌ [AddToTripSheet] Error fetching trips: \(error)")
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    private func addToSelectedTrip() {
        guard let trip = selectedTrip else { return }

        isAdding = true

        Task {
            let success = await onAdd(trip)

            await MainActor.run {
                isAdding = false
                if success {
                    dismiss()
                }
            }
        }
    }
}

#Preview {
    AddToTripSheet(
        recommendation: AIService.AIRecommendation(
            title: "Senso-ji Temple",
            description: "Tokyo's oldest and most significant Buddhist temple",
            category: "activity",
            tips: "Go early morning to avoid crowds",
            estimatedCost: "Free",
            bestTimeToVisit: "Morning"
        ),
        onAdd: { _ in true }
    )
}
