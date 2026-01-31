import SwiftUI

struct AIRecommendationsSheet: View {
    @Environment(\.dismiss) private var dismiss

    let trip: Trip
    let onAddRecommendation: (String, String?, RecommendationCategory) async -> Bool

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

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Category Tabs
                categoryTabs

                // Filters Toggle
                filtersSection

                // Content
                contentArea
            }
            .background(Color.seeyaBackground)
            .navigationTitle("AI Recommendations")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Done") {
                        dismiss()
                    }
                }

                if let recs = cache[selectedCategory], !recs.isEmpty {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button {
                            refreshCurrentCategory()
                        } label: {
                            Image(systemName: "arrow.clockwise")
                        }
                        .disabled(isLoading)
                    }
                }
            }
            .task {
                // Auto-generate first category on open
                if cache[selectedCategory] == nil {
                    await generateRecommendations(for: selectedCategory)
                }
            }
        }
    }

    // MARK: - Category Tabs

    private var categoryTabs: some View {
        HStack(spacing: SeeyaSpacing.xxs) {
            ForEach(AIService.RecommendationCategory.allCases, id: \.self) { category in
                categoryTab(for: category)
            }
        }
        .padding(.horizontal, SeeyaSpacing.md)
        .padding(.vertical, SeeyaSpacing.sm)
        .background(Color.seeyaSurface)
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
        VStack(spacing: SeeyaSpacing.sm) {
            // Filter toggle button
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

                // Destination
                HStack(spacing: 4) {
                    if let flag = trip.locations?.first?.flagEmoji {
                        Text(flag)
                    }
                    Text(trip.destination)
                        .font(SeeyaTypography.labelSmall)
                        .foregroundStyle(Color.seeyaTextSecondary)
                }
            }
            .padding(.horizontal, SeeyaSpacing.md)
            .padding(.top, SeeyaSpacing.xs)

            // Filter panel
            if showFilters {
                filterPanel
                    .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
    }

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
        .padding(.horizontal, SeeyaSpacing.md)
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

            TextField("Neighborhood", text: Binding(
                get: { restaurantFilters.neighborhood ?? "" },
                set: { restaurantFilters.neighborhood = $0.isEmpty ? nil : $0 }
            ))
            .textFieldStyle(.roundedBorder)
            .font(SeeyaTypography.bodySmall)
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

            TextField("Neighborhood", text: Binding(
                get: { stayFilters.neighborhood ?? "" },
                set: { stayFilters.neighborhood = $0.isEmpty ? nil : $0 }
            ))
            .textFieldStyle(.roundedBorder)
            .font(SeeyaTypography.bodySmall)
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
            if isLoading {
                loadingView
            } else if let error = errors[selectedCategory] {
                errorView(error)
            } else if let recs = cache[selectedCategory], !recs.isEmpty {
                recommendationsList(recs)
            } else {
                emptyStateView
            }
        }
    }

    private var loadingView: some View {
        VStack(spacing: SeeyaSpacing.lg) {
            Spacer()

            VStack(spacing: SeeyaSpacing.md) {
                Image(systemName: "sparkles")
                    .font(.system(size: 48))
                    .foregroundStyle(Color.seeyaPurple)
                    .symbolEffect(.pulse)

                Text("Finding \(selectedCategory.displayName.lowercased())...")
                    .font(SeeyaTypography.headlineSmall)
                    .foregroundStyle(Color.seeyaTextPrimary)

                Text("AI is searching for the best options in \(trip.destination)")
                    .font(SeeyaTypography.bodySmall)
                    .foregroundStyle(Color.seeyaTextSecondary)
                    .multilineTextAlignment(.center)

                ProgressView()
                    .padding(.top, SeeyaSpacing.sm)
            }
            .padding(.horizontal, SeeyaSpacing.xl)

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func errorView(_ error: String) -> some View {
        VStack(spacing: SeeyaSpacing.lg) {
            Spacer()

            VStack(spacing: SeeyaSpacing.md) {
                Image(systemName: "exclamationmark.triangle")
                    .font(.system(size: 48))
                    .foregroundStyle(.orange)

                Text("Couldn't get recommendations")
                    .font(SeeyaTypography.headlineSmall)
                    .foregroundStyle(Color.seeyaTextPrimary)

                Text(error)
                    .font(SeeyaTypography.bodySmall)
                    .foregroundStyle(Color.seeyaTextSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)

                Button {
                    Task {
                        await generateRecommendations(for: selectedCategory, forceRefresh: true)
                    }
                } label: {
                    Label("Try Again", systemImage: "arrow.clockwise")
                }
                .buttonStyle(SeeyaPrimaryButtonStyle())
                .padding(.top, SeeyaSpacing.md)
            }

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var emptyStateView: some View {
        VStack(spacing: SeeyaSpacing.lg) {
            Spacer()

            VStack(spacing: SeeyaSpacing.md) {
                Image(systemName: selectedCategory.icon)
                    .font(.system(size: 48))
                    .foregroundStyle(categoryColor(for: selectedCategory))

                Text("Get \(selectedCategory.displayName) Recommendations")
                    .font(SeeyaTypography.headlineSmall)
                    .foregroundStyle(Color.seeyaTextPrimary)

                Text(categoryDescription)
                    .font(SeeyaTypography.bodySmall)
                    .foregroundStyle(Color.seeyaTextSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)

                Button {
                    Task {
                        await generateRecommendations(for: selectedCategory)
                    }
                } label: {
                    Label("Get Suggestions", systemImage: "sparkles")
                }
                .buttonStyle(SeeyaPrimaryButtonStyle())
                .padding(.top, SeeyaSpacing.md)
            }

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var categoryDescription: String {
        switch selectedCategory {
        case .restaurant: return "Discover the best restaurants and local dining spots."
        case .activity: return "Find unique activities and experiences."
        case .stay: return "Get accommodation suggestions for your trip."
        case .tip: return "Get practical travel tips and local insights."
        }
    }

    private func recommendationsList(_ recommendations: [AIService.AIRecommendation]) -> some View {
        ScrollView {
            LazyVStack(spacing: SeeyaSpacing.sm) {
                ForEach(recommendations) { recommendation in
                    AIRecommendationCard(
                        recommendation: recommendation,
                        color: categoryColor(for: selectedCategory),
                        isAdded: addedIds.contains(recommendation.id),
                        onAdd: {
                            addRecommendation(recommendation)
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
                .padding(.vertical, SeeyaSpacing.lg)
            }
            .padding(.horizontal, SeeyaSpacing.md)
            .padding(.vertical, SeeyaSpacing.sm)
        }
    }

    // MARK: - Actions

    private func selectCategory(_ category: AIService.RecommendationCategory) {
        selectedCategory = category
        showFilters = false
        // Don't auto-generate - user must click "Get Suggestions" button
    }

    private func generateRecommendations(for category: AIService.RecommendationCategory, forceRefresh: Bool = false) async {
        guard !isLoading else { return }

        // Don't regenerate if we have cached results (unless forced)
        if !forceRefresh && cache[category] != nil {
            return
        }

        isLoading = true
        errors[category] = nil

        do {
            let filters = currentFilters(for: category)
            let response = try await AIService.shared.generateCategoryRecommendations(
                destination: trip.destination,
                category: category,
                count: 4,
                filters: filters,
                tripDates: (trip.startDate, trip.endDate)
            )
            cache[category] = response.recommendations
        } catch {
            errors[category] = error.localizedDescription
        }

        isLoading = false
    }

    private func refreshCurrentCategory() {
        cache[selectedCategory] = nil
        Task {
            await generateRecommendations(for: selectedCategory, forceRefresh: true)
        }
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

    private func addRecommendation(_ item: AIService.AIRecommendation) {
        Task {
            let description = item.tips != nil
                ? "\(item.description)\n\nTip: \(item.tips!)"
                : item.description

            let category: RecommendationCategory = {
                switch selectedCategory {
                case .restaurant: return .restaurant
                case .activity: return .activity
                case .stay: return .stay
                case .tip: return .tip
                }
            }()

            let success = await onAddRecommendation(item.title, description, category)
            if success {
                addedIds.insert(item.id)
            }
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

// MARK: - AI Recommendation Card

private struct AIRecommendationCard: View {
    let recommendation: AIService.AIRecommendation
    let color: Color
    let isAdded: Bool
    let onAdd: () -> Void

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
                    onAdd()
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
    AIRecommendationsSheet(
        trip: Trip(
            id: UUID(),
            userId: UUID(),
            name: "Japan Adventure",
            description: nil,
            startDate: Date(),
            endDate: Date().addingTimeInterval(7 * 24 * 60 * 60),
            isFlexible: false,
            visibility: .fullDetails,
            isPast: false,
            createdAt: Date(),
            updatedAt: Date(),
            locations: nil,
            participants: nil,
            owner: nil,
            recommendations: nil,
            tripTypes: nil
        ),
        onAddRecommendation: { _, _, _ in true }
    )
}
