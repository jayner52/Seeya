import SwiftUI
import Supabase

/// AI recommendations section for Explore page with destination search
struct ExploreAISection: View {
    @State private var destination = ""
    @State private var isSearching = false
    @State private var hasSearched = false

    @State private var selectedCategory: AIService.RecommendationCategory = .restaurant
    @State private var isLoading = false
    @State private var cache: [AIService.RecommendationCategory: [AIService.AIRecommendation]] = [:]
    @State private var errors: [AIService.RecommendationCategory: String] = [:]
    @State private var addedIds: Set<UUID> = []

    // Filters per category
    @State private var restaurantFilters = AIService.RestaurantFilters()
    @State private var activityFilters = AIService.ActivityFilters()
    @State private var stayFilters = AIService.StayFilters()
    @State private var tipFilters = AIService.TipFilters()
    @State private var showFilters = false

    // Add to trip
    @State private var selectedRecommendation: AIService.AIRecommendation?
    @State private var showAddToTripSheet = false
    @State private var successMessage: String?

    var body: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.md) {
            // Header
            sectionHeader

            // Destination Search
            destinationSearchBar

            // Show content only after searching
            if hasSearched && !destination.isEmpty {
                // Category Tabs
                categoryTabs

                // Filters Toggle (when results exist)
                if cache[selectedCategory] != nil {
                    filtersSection
                }

                // Content
                contentArea
            } else if !hasSearched {
                // Empty state - encourage search
                emptyPrompt
            }
        }
        .sheet(isPresented: $showAddToTripSheet) {
            if let rec = selectedRecommendation {
                AddToTripSheet(
                    recommendation: rec,
                    onAdd: { trip in
                        await addRecommendationToTrip(rec, trip: trip)
                    }
                )
            }
        }
        .overlay(alignment: .bottom) {
            if let message = successMessage {
                successToast(message)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .animation(.spring(response: 0.3), value: successMessage)
    }

    // MARK: - Header

    private var sectionHeader: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.xxs) {
            HStack(spacing: SeeyaSpacing.xs) {
                Image(systemName: "sparkles")
                    .foregroundStyle(Color.seeyaPurple)
                Text("AI Recommendations")
                    .font(SeeyaTypography.headlineMedium)
                    .foregroundStyle(Color.seeyaTextPrimary)
            }

            Text("Search any destination for personalized travel tips")
                .font(SeeyaTypography.bodySmall)
                .foregroundStyle(Color.seeyaTextSecondary)
        }
    }

    // MARK: - Destination Search

    private var destinationSearchBar: some View {
        HStack(spacing: SeeyaSpacing.sm) {
            HStack(spacing: SeeyaSpacing.xs) {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(Color.seeyaTextTertiary)

                TextField("Where are you going?", text: $destination)
                    .font(SeeyaTypography.bodyMedium)
                    .submitLabel(.search)
                    .onSubmit {
                        searchDestination()
                    }

                if !destination.isEmpty {
                    Button {
                        clearSearch()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(Color.seeyaTextTertiary)
                    }
                }
            }
            .padding(.horizontal, SeeyaSpacing.sm)
            .padding(.vertical, SeeyaSpacing.sm)
            .background(Color.seeyaSurface)
            .clipShape(RoundedRectangle(cornerRadius: 10))

            Button {
                searchDestination()
            } label: {
                Image(systemName: "arrow.right.circle.fill")
                    .font(.title2)
                    .foregroundStyle(destination.isEmpty ? Color.seeyaTextTertiary : Color.seeyaPurple)
            }
            .disabled(destination.isEmpty)
        }
    }

    // MARK: - Empty Prompt

    private var emptyPrompt: some View {
        VStack(spacing: SeeyaSpacing.md) {
            Image(systemName: "globe.americas.fill")
                .font(.system(size: 48))
                .foregroundStyle(Color.seeyaPurple.opacity(0.5))

            Text("Enter a destination to get AI-powered recommendations")
                .font(SeeyaTypography.bodyMedium)
                .foregroundStyle(Color.seeyaTextSecondary)
                .multilineTextAlignment(.center)

            // Quick suggestions
            Text("Try:")
                .font(SeeyaTypography.caption)
                .foregroundStyle(Color.seeyaTextTertiary)

            HStack(spacing: SeeyaSpacing.xs) {
                quickDestinationChip("Tokyo")
                quickDestinationChip("Paris")
                quickDestinationChip("Bali")
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, SeeyaSpacing.xl)
    }

    private func quickDestinationChip(_ name: String) -> some View {
        Button {
            destination = name
            searchDestination()
        } label: {
            Text(name)
                .font(SeeyaTypography.labelSmall)
                .foregroundStyle(Color.seeyaPurple)
                .padding(.horizontal, SeeyaSpacing.sm)
                .padding(.vertical, SeeyaSpacing.xs)
                .background(Color.seeyaPurple.opacity(0.1))
                .clipShape(Capsule())
        }
    }

    // MARK: - Category Tabs

    private var categoryTabs: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: SeeyaSpacing.xxs) {
                ForEach(AIService.RecommendationCategory.allCases, id: \.self) { category in
                    categoryTab(for: category)
                }
            }
            .padding(.horizontal, 1)
        }
    }

    private func categoryTab(for category: AIService.RecommendationCategory) -> some View {
        let isSelected = selectedCategory == category
        let hasResults = (cache[category]?.count ?? 0) > 0

        return Button {
            selectCategory(category)
        } label: {
            HStack(spacing: 4) {
                Image(systemName: category.icon)
                    .font(.caption)
                Text(category.displayName)
                    .font(SeeyaTypography.labelSmall)
                if hasResults {
                    Text("\(cache[category]?.count ?? 0)")
                        .font(.caption2)
                        .fontWeight(.medium)
                        .padding(.horizontal, 4)
                        .padding(.vertical, 2)
                        .background(isSelected ? Color.white.opacity(0.2) : Color.seeyaPurple.opacity(0.1))
                        .clipShape(Capsule())
                }
            }
            .foregroundStyle(isSelected ? .white : Color.seeyaTextSecondary)
            .padding(.horizontal, SeeyaSpacing.sm)
            .padding(.vertical, SeeyaSpacing.xs)
            .background(isSelected ? Color.seeyaPurple : Color.seeyaBackground)
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
    }

    // MARK: - Filters Section

    private var filtersSection: some View {
        HStack {
            Button {
                withAnimation(.spring(response: 0.3)) {
                    showFilters.toggle()
                }
            } label: {
                HStack(spacing: SeeyaSpacing.xxs) {
                    Image(systemName: "slider.horizontal.3")
                        .font(.caption)
                    Text("Filters")
                        .font(SeeyaTypography.labelSmall)
                    if hasActiveFilters {
                        Circle()
                            .fill(Color.seeyaPurple)
                            .frame(width: 6, height: 6)
                    }
                }
                .foregroundStyle(showFilters || hasActiveFilters ? Color.seeyaPurple : Color.seeyaTextSecondary)
                .padding(.horizontal, SeeyaSpacing.sm)
                .padding(.vertical, SeeyaSpacing.xs)
                .background(showFilters || hasActiveFilters ? Color.seeyaPurple.opacity(0.1) : Color.seeyaBackground)
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }

            if hasActiveFilters {
                Button {
                    clearFilters()
                } label: {
                    HStack(spacing: 2) {
                        Image(systemName: "xmark")
                            .font(.caption2)
                        Text("Clear")
                            .font(SeeyaTypography.caption)
                    }
                    .foregroundStyle(Color.seeyaTextSecondary)
                }
            }

            Spacer()
        }
    }

    private var hasActiveFilters: Bool {
        switch selectedCategory {
        case .restaurant: return !restaurantFilters.isEmpty
        case .activity: return !activityFilters.isEmpty
        case .stay: return !stayFilters.isEmpty
        case .tip: return !tipFilters.isEmpty
        }
    }

    // MARK: - Content Area

    private var contentArea: some View {
        Group {
            if showFilters {
                filterPanel
            }

            if isLoading {
                loadingView
            } else if let error = errors[selectedCategory] {
                errorView(error)
            } else if let recs = cache[selectedCategory], !recs.isEmpty {
                recommendationsList(recs)
            } else {
                generatePrompt
            }
        }
    }

    private var loadingView: some View {
        VStack(spacing: SeeyaSpacing.md) {
            Image(systemName: "sparkles")
                .font(.system(size: 32))
                .foregroundStyle(Color.seeyaPurple)
                .symbolEffect(.pulse)

            Text("Finding \(selectedCategory.displayName.lowercased())...")
                .font(SeeyaTypography.bodySmall)
                .foregroundStyle(Color.seeyaTextSecondary)

            ProgressView()
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, SeeyaSpacing.xl)
    }

    private func errorView(_ error: String) -> some View {
        VStack(spacing: SeeyaSpacing.md) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 32))
                .foregroundStyle(.orange)

            Text("Couldn't get recommendations")
                .font(SeeyaTypography.labelMedium)
                .foregroundStyle(Color.seeyaTextPrimary)

            Text(error)
                .font(SeeyaTypography.bodySmall)
                .foregroundStyle(Color.seeyaTextSecondary)
                .multilineTextAlignment(.center)

            Button {
                Task {
                    await generateRecommendations(for: selectedCategory, forceRefresh: true)
                }
            } label: {
                Label("Try Again", systemImage: "arrow.clockwise")
            }
            .buttonStyle(SeeyaSecondaryButtonStyle())
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, SeeyaSpacing.lg)
    }

    private var generatePrompt: some View {
        VStack(spacing: SeeyaSpacing.md) {
            Image(systemName: selectedCategory.icon)
                .font(.system(size: 32))
                .foregroundStyle(categoryColor(for: selectedCategory))

            Text("Get \(selectedCategory.displayName)")
                .font(SeeyaTypography.labelMedium)
                .foregroundStyle(Color.seeyaTextPrimary)

            Button {
                Task {
                    await generateRecommendations(for: selectedCategory)
                }
            } label: {
                Label("Generate", systemImage: "sparkles")
            }
            .buttonStyle(SeeyaPrimaryButtonStyle())
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, SeeyaSpacing.lg)
    }

    private func recommendationsList(_ recommendations: [AIService.AIRecommendation]) -> some View {
        VStack(spacing: SeeyaSpacing.sm) {
            ForEach(recommendations) { recommendation in
                ExploreAIRecommendationCard(
                    recommendation: recommendation,
                    color: categoryColor(for: selectedCategory),
                    isAdded: addedIds.contains(recommendation.id),
                    onAddToTrip: {
                        selectedRecommendation = recommendation
                        showAddToTripSheet = true
                    }
                )
            }

            // Footer
            HStack {
                Image(systemName: "sparkles")
                    .font(.caption)
                Text("Generated by AI. Verify details before booking.")
                    .font(SeeyaTypography.caption)
            }
            .foregroundStyle(Color.seeyaTextTertiary)
            .padding(.top, SeeyaSpacing.sm)
        }
    }

    // MARK: - Filter Panel

    private var filterPanel: some View {
        VStack(spacing: SeeyaSpacing.sm) {
            Group {
                switch selectedCategory {
                case .restaurant:
                    restaurantFilterPanel
                case .activity:
                    activityFilterPanel
                case .stay:
                    stayFilterPanel
                case .tip:
                    tipFilterPanel
                }
            }

            HStack {
                Spacer()
                Button("Apply Filters") {
                    applyFilters()
                }
                .font(SeeyaTypography.labelSmall)
                .foregroundStyle(.white)
                .padding(.horizontal, SeeyaSpacing.md)
                .padding(.vertical, SeeyaSpacing.xs)
                .background(Color.seeyaPurple)
                .clipShape(Capsule())
            }
        }
        .padding(SeeyaSpacing.md)
        .background(Color.seeyaCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private var restaurantFilterPanel: some View {
        VStack(spacing: SeeyaSpacing.sm) {
            HStack {
                filterPicker(
                    title: "Cuisine",
                    selection: Binding(
                        get: { restaurantFilters.cuisine ?? "" },
                        set: { restaurantFilters.cuisine = $0.isEmpty ? nil : $0 }
                    ),
                    options: ["", "Italian", "Japanese", "Mexican", "Thai", "Indian", "French", "Chinese", "Mediterranean", "American", "Korean", "Vietnamese", "Local"]
                )

                filterPicker(
                    title: "Meal",
                    selection: Binding(
                        get: { restaurantFilters.mealType ?? "" },
                        set: { restaurantFilters.mealType = $0.isEmpty ? nil : $0 }
                    ),
                    options: ["", "breakfast", "brunch", "lunch", "dinner", "late-night"]
                )
            }

            HStack {
                filterPicker(
                    title: "Price",
                    selection: Binding(
                        get: { restaurantFilters.priceRange ?? "" },
                        set: { restaurantFilters.priceRange = $0.isEmpty ? nil : $0 }
                    ),
                    options: ["", "$", "$$", "$$$", "$$$$"]
                )

                filterPicker(
                    title: "Vibe",
                    selection: Binding(
                        get: { restaurantFilters.vibe ?? "" },
                        set: { restaurantFilters.vibe = $0.isEmpty ? nil : $0 }
                    ),
                    options: ["", "romantic", "casual", "family", "trendy", "traditional"]
                )
            }
        }
    }

    private var activityFilterPanel: some View {
        VStack(spacing: SeeyaSpacing.sm) {
            HStack {
                filterPicker(
                    title: "Type",
                    selection: Binding(
                        get: { activityFilters.type ?? "" },
                        set: { activityFilters.type = $0.isEmpty ? nil : $0 }
                    ),
                    options: ["", "outdoor", "cultural", "nightlife", "tours", "shopping", "wellness"]
                )

                filterPicker(
                    title: "Duration",
                    selection: Binding(
                        get: { activityFilters.duration ?? "" },
                        set: { activityFilters.duration = $0.isEmpty ? nil : $0 }
                    ),
                    options: ["", "quick", "half-day", "full-day"]
                )
            }

            Toggle("Kid-friendly", isOn: Binding(
                get: { activityFilters.kidFriendly ?? false },
                set: { activityFilters.kidFriendly = $0 ? true : nil }
            ))
            .font(SeeyaTypography.bodySmall)
        }
    }

    private var stayFilterPanel: some View {
        VStack(spacing: SeeyaSpacing.sm) {
            HStack {
                filterPicker(
                    title: "Type",
                    selection: Binding(
                        get: { stayFilters.propertyType ?? "" },
                        set: { stayFilters.propertyType = $0.isEmpty ? nil : $0 }
                    ),
                    options: ["", "hotel", "boutique", "airbnb", "hostel", "resort"]
                )

                filterPicker(
                    title: "Price",
                    selection: Binding(
                        get: { stayFilters.priceRange ?? "" },
                        set: { stayFilters.priceRange = $0.isEmpty ? nil : $0 }
                    ),
                    options: ["", "$", "$$", "$$$", "$$$$"]
                )
            }
        }
    }

    private var tipFilterPanel: some View {
        filterPicker(
            title: "Topic",
            selection: Binding(
                get: { tipFilters.topic ?? "" },
                set: { tipFilters.topic = $0.isEmpty ? nil : $0 }
            ),
            options: ["", "transport", "safety", "culture", "money", "packing", "local-customs", "food", "language"]
        )
    }

    private func filterPicker(title: String, selection: Binding<String>, options: [String]) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(SeeyaTypography.caption)
                .foregroundStyle(Color.seeyaTextSecondary)
            Picker(title, selection: selection) {
                ForEach(options, id: \.self) { option in
                    Text(option.isEmpty ? "Any" : option.capitalized)
                        .tag(option)
                }
            }
            .pickerStyle(.menu)
            .tint(Color.seeyaPurple)
        }
    }

    // MARK: - Success Toast

    private func successToast(_ message: String) -> some View {
        HStack(spacing: SeeyaSpacing.xs) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(.white)
            Text(message)
                .font(SeeyaTypography.labelSmall)
                .foregroundStyle(.white)
        }
        .padding(.horizontal, SeeyaSpacing.md)
        .padding(.vertical, SeeyaSpacing.sm)
        .background(Color.green)
        .clipShape(Capsule())
        .shadow(color: .black.opacity(0.2), radius: 8, y: 4)
        .padding(.bottom, SeeyaSpacing.lg)
    }

    // MARK: - Actions

    private func searchDestination() {
        guard !destination.isEmpty else { return }

        hasSearched = true
        cache = [:] // Clear cache for new destination
        errors = [:]
        addedIds = []

        Task {
            await generateRecommendations(for: selectedCategory)
        }
    }

    private func clearSearch() {
        destination = ""
        hasSearched = false
        cache = [:]
        errors = [:]
    }

    private func selectCategory(_ category: AIService.RecommendationCategory) {
        selectedCategory = category
        showFilters = false

        // Auto-generate if no cached results
        if cache[category] == nil && errors[category] == nil && hasSearched {
            Task {
                await generateRecommendations(for: category)
            }
        }
    }

    private func generateRecommendations(for category: AIService.RecommendationCategory, forceRefresh: Bool = false) async {
        guard !isLoading else { return }
        guard !destination.isEmpty else { return }

        if !forceRefresh && cache[category] != nil {
            return
        }

        isLoading = true
        errors[category] = nil

        do {
            let filters = currentFilters(for: category)
            let response = try await AIService.shared.generateCategoryRecommendations(
                destination: destination,
                category: category,
                count: 4,
                filters: filters,
                tripDates: nil
            )
            cache[category] = response.recommendations
        } catch {
            errors[category] = error.localizedDescription
        }

        isLoading = false
    }

    private func currentFilters(for category: AIService.RecommendationCategory) -> AIService.CategoryFilters? {
        switch category {
        case .restaurant:
            return restaurantFilters.isEmpty ? nil : .restaurant(restaurantFilters)
        case .activity:
            return activityFilters.isEmpty ? nil : .activity(activityFilters)
        case .stay:
            return stayFilters.isEmpty ? nil : .stay(stayFilters)
        case .tip:
            return tipFilters.isEmpty ? nil : .tip(tipFilters)
        }
    }

    private func applyFilters() {
        showFilters = false
        cache[selectedCategory] = nil
        Task {
            await generateRecommendations(for: selectedCategory, forceRefresh: true)
        }
    }

    private func clearFilters() {
        switch selectedCategory {
        case .restaurant: restaurantFilters = AIService.RestaurantFilters()
        case .activity: activityFilters = AIService.ActivityFilters()
        case .stay: stayFilters = AIService.StayFilters()
        case .tip: tipFilters = AIService.TipFilters()
        }
        cache[selectedCategory] = nil
        Task {
            await generateRecommendations(for: selectedCategory, forceRefresh: true)
        }
    }

    private func addRecommendationToTrip(_ recommendation: AIService.AIRecommendation, trip: Trip) async -> Bool {
        do {
            let session = try await SupabaseService.shared.client.auth.session
            let userId = session.user.id

            // Map recommendation category to TripBit category
            let tripBitCategory: TripBitCategory = {
                switch recommendation.category.lowercased() {
                case "restaurant": return .reservation
                case "activity": return .activity
                case "stay": return .stay
                case "tip": return .other
                default: return .other
                }
            }()

            // Build notes
            var notesParts: [String] = []
            notesParts.append(recommendation.description)
            if let tips = recommendation.tips {
                notesParts.append("Tip: \(tips)")
            }
            if let cost = recommendation.estimatedCost {
                notesParts.append("Estimated cost: \(cost)")
            }
            if let time = recommendation.bestTimeToVisit {
                notesParts.append("Best time: \(time)")
            }

            let tripBit = CreateTripBit(
                tripId: trip.id,
                createdBy: userId,
                category: tripBitCategory,
                title: recommendation.title,
                status: .pending,
                startDatetime: nil,
                endDatetime: nil,
                locationId: nil,
                notes: notesParts.joined(separator: "\n\n"),
                orderIndex: nil
            )

            try await SupabaseService.shared.client
                .from("trip_bits")
                .insert(tripBit)
                .execute()

            await MainActor.run {
                addedIds.insert(recommendation.id)
                successMessage = "Added to \(trip.name)"

                // Hide toast after 3 seconds
                Task {
                    try? await Task.sleep(nanoseconds: 3_000_000_000)
                    await MainActor.run {
                        successMessage = nil
                    }
                }
            }

            print("✅ [ExploreAISection] Added recommendation to trip \(trip.name)")
            return true
        } catch {
            print("❌ [ExploreAISection] Error adding to trip: \(error)")
            return false
        }
    }

    private func categoryColor(for category: AIService.RecommendationCategory) -> Color {
        switch category {
        case .restaurant: return .orange
        case .activity: return .green
        case .stay: return .blue
        case .tip: return Color(red: 0.85, green: 0.65, blue: 0.0)
        }
    }
}

// MARK: - Explore AI Recommendation Card

private struct ExploreAIRecommendationCard: View {
    let recommendation: AIService.AIRecommendation
    let color: Color
    let isAdded: Bool
    let onAddToTrip: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.sm) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: SeeyaSpacing.xxs) {
                    Text(recommendation.title)
                        .font(SeeyaTypography.labelMedium)
                        .fontWeight(.semibold)
                        .foregroundStyle(Color.seeyaTextPrimary)

                    Text(recommendation.description)
                        .font(SeeyaTypography.bodySmall)
                        .foregroundStyle(Color.seeyaTextSecondary)
                        .lineLimit(3)
                }

                Spacer()

                Button {
                    onAddToTrip()
                } label: {
                    if isAdded {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.title3)
                            .foregroundStyle(.green)
                    } else {
                        Image(systemName: "plus.circle.fill")
                            .font(.title3)
                            .foregroundStyle(color)
                    }
                }
                .disabled(isAdded)
            }

            // Cost and time info
            HStack(spacing: SeeyaSpacing.md) {
                if let cost = recommendation.estimatedCost {
                    HStack(spacing: 2) {
                        Image(systemName: "dollarsign.circle")
                            .font(.caption2)
                        Text(cost)
                            .font(SeeyaTypography.caption)
                    }
                    .foregroundStyle(Color.seeyaTextTertiary)
                }

                if let time = recommendation.bestTimeToVisit {
                    HStack(spacing: 2) {
                        Image(systemName: "clock")
                            .font(.caption2)
                        Text(time)
                            .font(SeeyaTypography.caption)
                    }
                    .foregroundStyle(Color.seeyaTextTertiary)
                }
            }

            if let tips = recommendation.tips, !tips.isEmpty {
                HStack(alignment: .top, spacing: SeeyaSpacing.xxs) {
                    Image(systemName: "lightbulb.fill")
                        .font(.caption2)
                        .foregroundStyle(.orange)
                    Text(tips)
                        .font(SeeyaTypography.caption)
                        .foregroundStyle(Color.seeyaTextSecondary)
                        .lineLimit(2)
                }
                .padding(.top, 2)
            }
        }
        .padding(SeeyaSpacing.md)
        .background(Color.seeyaCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(isAdded ? Color.green.opacity(0.3) : Color.clear, lineWidth: 2)
        )
    }
}

#Preview {
    ScrollView {
        ExploreAISection()
            .padding()
    }
    .background(Color.seeyaBackground)
}
