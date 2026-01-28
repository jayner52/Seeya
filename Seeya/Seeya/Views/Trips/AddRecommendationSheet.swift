import SwiftUI

struct AddRecommendationSheet: View {
    @Environment(\.dismiss) private var dismiss

    let tripId: UUID
    let tripLocations: [TripLocation]
    let onAdd: (String, String?, RecommendationCategory, UUID?, String?, Double?, Double?) async -> Bool

    @State private var title = ""
    @State private var description = ""
    @State private var tips = ""
    @State private var category: RecommendationCategory = .restaurant
    @State private var selectedLocationId: UUID?

    // Places autocomplete
    @State private var placeSearchText = ""
    @State private var placePredictions: [PlacePrediction] = []
    @State private var selectedPlace: PlacePrediction?
    @State private var placeDetails: PlaceDetails?
    @State private var isSearchingPlaces = false
    @State private var showPlaceSuggestions = false

    @State private var isSaving = false
    @State private var errorMessage: String?

    // Prefill data (when adding from Explore)
    var prefillTitle: String?
    var prefillDescription: String?
    var prefillCategory: RecommendationCategory?

    private var isValid: Bool {
        !title.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: SeeyaSpacing.lg) {
                    // Category Selection
                    categorySection

                    // Location within trip (if multiple)
                    if tripLocations.count > 1 {
                        tripLocationSection
                    }

                    // Place Search
                    placeSearchSection

                    // Title & Description
                    detailsSection

                    // Tips (optional)
                    tipsSection

                    // Error message
                    if let error = errorMessage {
                        Text(error)
                            .font(SeeyaTypography.caption)
                            .foregroundStyle(.red)
                            .padding(.horizontal)
                    }
                }
                .padding()
            }
            .background(Color.seeyaBackground)
            .navigationTitle("Add Recommendation")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        addRecommendation()
                    }
                    .fontWeight(.semibold)
                    .disabled(!isValid || isSaving)
                }
            }
            .onAppear {
                applyPrefill()
            }
        }
    }

    // MARK: - Category Section

    private var categorySection: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.sm) {
            Text("What are you recommending?")
                .font(SeeyaTypography.headlineSmall)
                .foregroundStyle(Color.seeyaTextPrimary)

            HStack(spacing: SeeyaSpacing.sm) {
                ForEach(RecommendationCategory.allCases, id: \.self) { cat in
                    CategoryButton(
                        category: cat,
                        isSelected: category == cat,
                        onTap: { category = cat }
                    )
                }
            }
        }
    }

    // MARK: - Trip Location Section

    private var tripLocationSection: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.sm) {
            Text("Which location?")
                .font(SeeyaTypography.headlineSmall)
                .foregroundStyle(Color.seeyaTextPrimary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: SeeyaSpacing.xs) {
                    // All locations option
                    LocationChip(
                        name: "All Locations",
                        isSelected: selectedLocationId == nil,
                        onTap: { selectedLocationId = nil }
                    )

                    ForEach(tripLocations) { location in
                        LocationChip(
                            name: location.displayName,
                            isSelected: selectedLocationId == location.id,
                            onTap: { selectedLocationId = location.id }
                        )
                    }
                }
            }
        }
    }

    // MARK: - Place Search Section

    private var placeSearchSection: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.sm) {
            Text("Place name")
                .font(SeeyaTypography.headlineSmall)
                .foregroundStyle(Color.seeyaTextPrimary)

            VStack(spacing: 0) {
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(Color.seeyaTextTertiary)

                    TextField("Search for a place...", text: $placeSearchText)
                        .font(SeeyaTypography.bodyMedium)
                        .onChange(of: placeSearchText) { _, newValue in
                            searchPlaces(query: newValue)
                        }
                        .onSubmit {
                            // Use the search text as title if no place selected
                            if selectedPlace == nil && !placeSearchText.isEmpty {
                                title = placeSearchText
                            }
                        }

                    if isSearchingPlaces {
                        ProgressView()
                            .scaleEffect(0.8)
                    } else if selectedPlace != nil {
                        Button {
                            clearPlaceSelection()
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundStyle(Color.seeyaTextTertiary)
                        }
                    }
                }
                .padding(SeeyaSpacing.sm)
                .background(Color.seeyaCardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 10))

                // Place suggestions
                if showPlaceSuggestions && !placePredictions.isEmpty {
                    VStack(spacing: 0) {
                        ForEach(placePredictions) { prediction in
                            Button {
                                selectPlace(prediction)
                            } label: {
                                HStack {
                                    Image(systemName: "mappin.circle.fill")
                                        .foregroundStyle(Color.seeyaPurple)

                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(prediction.mainText)
                                            .font(SeeyaTypography.labelMedium)
                                            .foregroundStyle(Color.seeyaTextPrimary)

                                        if !prediction.secondaryText.isEmpty {
                                            Text(prediction.secondaryText)
                                                .font(SeeyaTypography.caption)
                                                .foregroundStyle(Color.seeyaTextSecondary)
                                        }
                                    }

                                    Spacer()
                                }
                                .padding(SeeyaSpacing.sm)
                            }

                            if prediction.id != placePredictions.last?.id {
                                Divider()
                            }
                        }
                    }
                    .background(Color.seeyaCardBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .shadow(color: .black.opacity(0.1), radius: 5, y: 2)
                }
            }

            // Selected place badge
            if let place = selectedPlace {
                HStack(spacing: SeeyaSpacing.xs) {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(.green)

                    Text(place.fullText)
                        .font(SeeyaTypography.caption)
                        .foregroundStyle(Color.seeyaTextSecondary)
                }
            }
        }
    }

    // MARK: - Details Section

    private var detailsSection: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.sm) {
            Text("Details")
                .font(SeeyaTypography.headlineSmall)
                .foregroundStyle(Color.seeyaTextPrimary)

            VStack(spacing: SeeyaSpacing.sm) {
                TextField("Title", text: $title)
                    .font(SeeyaTypography.bodyMedium)
                    .padding(SeeyaSpacing.sm)
                    .background(Color.seeyaCardBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 10))

                TextField("Description (optional)", text: $description, axis: .vertical)
                    .font(SeeyaTypography.bodyMedium)
                    .lineLimit(3...6)
                    .padding(SeeyaSpacing.sm)
                    .background(Color.seeyaCardBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
    }

    // MARK: - Tips Section

    private var tipsSection: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.sm) {
            HStack {
                Image(systemName: "lightbulb.fill")
                    .foregroundStyle(.orange)
                Text("Pro tip (optional)")
                    .font(SeeyaTypography.headlineSmall)
                    .foregroundStyle(Color.seeyaTextPrimary)
            }

            TextField("Share your insider tip...", text: $tips, axis: .vertical)
                .font(SeeyaTypography.bodyMedium)
                .lineLimit(2...4)
                .padding(SeeyaSpacing.sm)
                .background(Color.seeyaCardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    // MARK: - Actions

    private func applyPrefill() {
        if let prefillTitle { title = prefillTitle }
        if let prefillDescription { description = prefillDescription }
        if let prefillCategory { category = prefillCategory }
    }

    private func searchPlaces(query: String) {
        guard query.count >= 2 else {
            placePredictions = []
            showPlaceSuggestions = false
            return
        }

        isSearchingPlaces = true
        showPlaceSuggestions = true

        Task {
            do {
                // Search for establishments (restaurants, activities, etc.)
                let predictions = try await PlacesService.shared.autocomplete(query: query)
                await MainActor.run {
                    placePredictions = predictions
                    isSearchingPlaces = false
                }
            } catch {
                await MainActor.run {
                    placePredictions = []
                    isSearchingPlaces = false
                }
            }
        }
    }

    private func selectPlace(_ prediction: PlacePrediction) {
        selectedPlace = prediction
        placeSearchText = prediction.mainText
        title = prediction.mainText
        showPlaceSuggestions = false

        // Fetch place details for coordinates
        Task {
            do {
                let details = try await PlacesService.shared.getPlaceDetails(placeId: prediction.id)
                await MainActor.run {
                    placeDetails = details
                }
            } catch {
                print("❌ Error fetching place details: \(error)")
            }
        }
    }

    private func clearPlaceSelection() {
        selectedPlace = nil
        placeDetails = nil
        placeSearchText = ""
        showPlaceSuggestions = false
    }

    private func addRecommendation() {
        isSaving = true
        errorMessage = nil

        Task {
            let success = await onAdd(
                title.trimmingCharacters(in: .whitespaces),
                description.isEmpty ? nil : description,
                category,
                selectedLocationId,
                selectedPlace?.id ?? placeDetails?.placeId,
                placeDetails?.latitude,
                placeDetails?.longitude
            )

            await MainActor.run {
                isSaving = false
                if success {
                    dismiss()
                } else {
                    errorMessage = "Failed to add recommendation. Please try again."
                }
            }
        }
    }
}

// MARK: - Category Button

private struct CategoryButton: View {
    let category: RecommendationCategory
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: SeeyaSpacing.xs) {
                Image(systemName: category.icon)
                    .font(.system(size: 24))

                Text(category.displayName)
                    .font(SeeyaTypography.labelSmall)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, SeeyaSpacing.md)
            .foregroundStyle(isSelected ? .white : categoryColor)
            .background(isSelected ? categoryColor : categoryColor.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    private var categoryColor: Color {
        switch category {
        case .restaurant: return .orange
        case .activity: return .green
        case .stay: return .blue
        case .tip: return Color(red: 0.85, green: 0.65, blue: 0.0)
        }
    }
}

// MARK: - Location Chip

private struct LocationChip: View {
    let name: String
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            Text(name)
                .font(SeeyaTypography.labelMedium)
                .foregroundStyle(isSelected ? .white : Color.seeyaTextPrimary)
                .padding(.horizontal, SeeyaSpacing.sm)
                .padding(.vertical, SeeyaSpacing.xs)
                .background(isSelected ? Color.seeyaPurple : Color.seeyaSurface)
                .clipShape(Capsule())
        }
    }
}

#Preview {
    AddRecommendationSheet(
        tripId: UUID(),
        tripLocations: [],
        onAdd: { _, _, _, _, _, _, _ in true }
    )
}
