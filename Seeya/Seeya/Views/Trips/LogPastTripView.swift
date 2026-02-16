import SwiftUI

// MARK: - Log Past Trip Step Enum

enum LogPastTripStep: Int, CaseIterable {
    case destinations = 0
    case details
    case recommendations

    var title: String {
        switch self {
        case .destinations: return "Destinations"
        case .details: return "Trip Details"
        case .recommendations: return "Recommendations"
        }
    }

    var subtitle: String {
        switch self {
        case .destinations: return "Where did you go?"
        case .details: return "When was the trip?"
        case .recommendations: return "Share your favorites"
        }
    }
}

// MARK: - Past Trip Date Mode

enum PastTripDateMode: String, CaseIterable {
    case specific = "Specific dates"
    case monthYear = "Month & Year"
    case skip = "Skip"
}

// MARK: - Local Recommendation Model

struct LocalRecommendation: Identifiable {
    let id = UUID()
    let title: String
    let category: RecommendationCategory
    let rating: Int
    let tips: String?
}

// MARK: - Log Past Trip View

struct LogPastTripView: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var viewModel: TripsViewModel

    // Wizard State
    @State private var currentStep: LogPastTripStep = .destinations
    @State private var isSaving = false
    @State private var showError = false
    @State private var errorText = ""

    // Step 1: Destinations
    @State private var destinations: [String] = []
    @State private var destinationInput = ""

    // Step 2: Details
    @State private var tripName = ""
    @State private var dateMode: PastTripDateMode = .specific
    @State private var startDate = Calendar.current.date(byAdding: .month, value: -1, to: Date()) ?? Date()
    @State private var endDate = Date()
    @State private var selectedMonth = Calendar.current.component(.month, from: Date())
    @State private var selectedYear = Calendar.current.component(.year, from: Date())

    // Step 3: Recommendations
    @State private var recTitle = ""
    @State private var recCategory: RecommendationCategory = .restaurant
    @State private var recRating: Int = 0
    @State private var recTips = ""
    @State private var localRecommendations: [LocalRecommendation] = []

    // Available months and years for picker
    private let monthNames = Calendar.current.monthSymbols
    private var yearRange: [Int] {
        let current = Calendar.current.component(.year, from: Date())
        return Array((current - 20)...current).reversed()
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Progress Indicator
                progressIndicator
                    .padding(.horizontal, 20)
                    .padding(.top, 12)

                // Content
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        // Step Header
                        Text(currentStep.subtitle)
                            .font(.title2)
                            .fontWeight(.bold)
                            .padding(.horizontal, 20)
                            .padding(.top, 24)

                        // Step Content
                        stepContent
                            .padding(.horizontal, 20)
                    }
                    .padding(.bottom, 100)
                }

                // Bottom Buttons
                bottomButtons
                    .padding(.horizontal, 20)
                    .padding(.vertical, 16)
                    .background(Color.seeyaBackground)
            }
            .background(Color.seeyaBackground)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundStyle(.primary)
                }

                ToolbarItem(placement: .principal) {
                    Text("Step \(currentStep.rawValue + 1) of \(LogPastTripStep.allCases.count)")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
            .alert("Failed to Save Trip", isPresented: $showError) {
                Button("OK", role: .cancel) { }
            } message: {
                Text(errorText)
            }
        }
    }

    // MARK: - Progress Indicator

    private var progressIndicator: some View {
        HStack(spacing: 8) {
            ForEach(LogPastTripStep.allCases, id: \.rawValue) { step in
                RoundedRectangle(cornerRadius: 2)
                    .fill(step.rawValue <= currentStep.rawValue ? Color.seeyaPurple : Color.gray.opacity(0.2))
                    .frame(height: 4)
            }
        }
    }

    // MARK: - Step Content

    @ViewBuilder
    private var stepContent: some View {
        switch currentStep {
        case .destinations:
            destinationsStep
        case .details:
            detailsStep
        case .recommendations:
            recommendationsStep
        }
    }

    // MARK: - Step 1: Destinations

    private var destinationsStep: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Input field
            HStack(spacing: 12) {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(.secondary)

                TextField("Enter a city name...", text: $destinationInput)
                    .textFieldStyle(.plain)
                    .autocorrectionDisabled()
                    .onSubmit {
                        addDestination()
                    }

                if !destinationInput.trimmingCharacters(in: .whitespaces).isEmpty {
                    Button {
                        addDestination()
                    } label: {
                        Text("Add")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundStyle(.white)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 6)
                            .background(Color.seeyaPurple)
                            .clipShape(Capsule())
                    }
                }
            }
            .padding(16)
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 12))

            // Destination chips
            if !destinations.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Your destinations")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    FlowLayout(spacing: 8) {
                        ForEach(Array(destinations.enumerated()), id: \.offset) { index, destination in
                            HStack(spacing: 6) {
                                Image(systemName: "mappin.circle.fill")
                                    .font(.caption)
                                    .foregroundStyle(Color.seeyaPurple)
                                Text(destination)
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                Button {
                                    destinations.remove(at: index)
                                } label: {
                                    Image(systemName: "xmark.circle.fill")
                                        .font(.caption)
                                        .foregroundStyle(.white.opacity(0.7))
                                }
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Color.seeyaPurple)
                            .foregroundStyle(.white)
                            .clipShape(Capsule())
                        }
                    }
                }
            }

            // Itinerary summary
            if destinations.count > 1 {
                VStack(alignment: .leading, spacing: 4) {
                    Text(destinations.joined(separator: " -> "))
                        .font(.subheadline)
                        .fontWeight(.medium)
                }
                .padding(16)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.seeyaPurple.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    private func addDestination() {
        let trimmed = destinationInput.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        destinations.append(trimmed)
        destinationInput = ""
    }

    // MARK: - Step 2: Details

    private var detailsStep: some View {
        VStack(alignment: .leading, spacing: 20) {
            // Trip Name
            VStack(alignment: .leading, spacing: 8) {
                Text("Trip name (optional)")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                TextField(autoGeneratedName, text: $tripName)
                    .font(.body)
                    .padding(16)
                    .background(Color.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }

            // Date Mode Picker
            VStack(alignment: .leading, spacing: 12) {
                Text("When was this trip?")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                HStack(spacing: 0) {
                    ForEach(PastTripDateMode.allCases, id: \.self) { mode in
                        Button {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                dateMode = mode
                            }
                        } label: {
                            Text(mode.rawValue)
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .padding(.vertical, 10)
                                .padding(.horizontal, 12)
                                .frame(maxWidth: .infinity)
                                .background(dateMode == mode ? Color.seeyaPurple : Color.clear)
                                .foregroundStyle(dateMode == mode ? .white : .primary)
                        }
                    }
                }
                .background(Color.gray.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }

            // Date Selection
            dateSelectionView
        }
    }

    @ViewBuilder
    private var dateSelectionView: some View {
        switch dateMode {
        case .specific:
            specificDatePickers
        case .monthYear:
            monthYearPickers
        case .skip:
            Text("No worries -- you can always add dates later.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(Color.seeyaPurple.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    private var specificDatePickers: some View {
        VStack(spacing: 16) {
            HStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Start date")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    DatePicker(
                        "",
                        selection: $startDate,
                        in: ...Date(),
                        displayedComponents: .date
                    )
                    .datePickerStyle(.compact)
                    .labelsHidden()
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                VStack(alignment: .leading, spacing: 4) {
                    Text("End date")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    DatePicker(
                        "",
                        selection: $endDate,
                        in: startDate...Date(),
                        displayedComponents: .date
                    )
                    .datePickerStyle(.compact)
                    .labelsHidden()
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(16)
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    private var monthYearPickers: some View {
        HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Month")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Picker("Month", selection: $selectedMonth) {
                    ForEach(1...12, id: \.self) { month in
                        Text(monthNames[month - 1]).tag(month)
                    }
                }
                .pickerStyle(.menu)
                .tint(Color.seeyaPurple)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            VStack(alignment: .leading, spacing: 4) {
                Text("Year")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Picker("Year", selection: $selectedYear) {
                    ForEach(yearRange, id: \.self) { year in
                        Text(String(year)).tag(year)
                    }
                }
                .pickerStyle(.menu)
                .tint(Color.seeyaPurple)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(16)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private var autoGeneratedName: String {
        if destinations.isEmpty {
            return "My Past Trip"
        } else if destinations.count == 1 {
            return "Trip to \(destinations[0])"
        } else {
            return "Trip to \(destinations[0]) & \(destinations[1])"
        }
    }

    // MARK: - Step 3: Recommendations

    private var recommendationsStep: some View {
        VStack(alignment: .leading, spacing: 20) {
            // Add Recommendation Form
            VStack(alignment: .leading, spacing: 12) {
                Text("Add a recommendation")
                    .font(.subheadline)
                    .fontWeight(.medium)

                // Place name
                TextField("Place name", text: $recTitle)
                    .font(.body)
                    .padding(16)
                    .background(Color.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))

                // Category picker
                HStack(spacing: 12) {
                    Text("Category")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Spacer()
                    Picker("Category", selection: $recCategory) {
                        ForEach(RecommendationCategory.allCases, id: \.self) { cat in
                            Text(cat.displayName).tag(cat)
                        }
                    }
                    .pickerStyle(.menu)
                    .tint(Color.seeyaPurple)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(Color.white)
                .clipShape(RoundedRectangle(cornerRadius: 12))

                // Star rating
                HStack(spacing: 12) {
                    Text("Rating")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Spacer()
                    HStack(spacing: 4) {
                        ForEach(1...5, id: \.self) { star in
                            Button {
                                recRating = star == recRating ? 0 : star
                            } label: {
                                Image(systemName: star <= recRating ? "star.fill" : "star")
                                    .font(.title3)
                                    .foregroundStyle(star <= recRating ? Color.yellow : Color.gray.opacity(0.4))
                            }
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(Color.white)
                .clipShape(RoundedRectangle(cornerRadius: 12))

                // Tips
                VStack(alignment: .leading, spacing: 4) {
                    Text("Tips (optional)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, 4)
                    TextEditor(text: $recTips)
                        .font(.body)
                        .frame(minHeight: 60, maxHeight: 100)
                        .padding(12)
                        .scrollContentBackground(.hidden)
                        .background(Color.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                // Add button
                Button {
                    addRecommendation()
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "plus.circle.fill")
                        Text("Add Recommendation")
                    }
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(recTitle.trimmingCharacters(in: .whitespaces).isEmpty ? Color.gray.opacity(0.3) : Color.seeyaPurple)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .disabled(recTitle.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            .padding(16)
            .background(Color.seeyaPurple.opacity(0.05))
            .clipShape(RoundedRectangle(cornerRadius: 16))

            // Added recommendations list
            if !localRecommendations.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Your recommendations (\(localRecommendations.count))")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    ForEach(localRecommendations) { rec in
                        recommendationCard(rec)
                    }
                }
            }

            if localRecommendations.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "star.bubble")
                        .font(.system(size: 36))
                        .foregroundStyle(.tertiary)
                    Text("No recommendations yet")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Text("Share your favorite spots so friends can discover them!")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 24)
            }
        }
    }

    private func recommendationCard(_ rec: LocalRecommendation) -> some View {
        HStack(spacing: 12) {
            // Category icon
            VStack {
                Image(systemName: categoryIcon(rec.category))
                    .font(.title3)
                    .foregroundStyle(Color.seeyaPurple)
            }
            .frame(width: 36, height: 36)
            .background(Color.seeyaPurple.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 8))

            VStack(alignment: .leading, spacing: 4) {
                Text(rec.title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(1)

                HStack(spacing: 8) {
                    // Category badge
                    Text(rec.category.displayName)
                        .font(.caption2)
                        .fontWeight(.medium)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color.seeyaPurple.opacity(0.15))
                        .foregroundStyle(Color.seeyaPurple)
                        .clipShape(Capsule())

                    // Stars
                    if rec.rating > 0 {
                        HStack(spacing: 1) {
                            ForEach(1...5, id: \.self) { star in
                                Image(systemName: star <= rec.rating ? "star.fill" : "star")
                                    .font(.caption2)
                                    .foregroundStyle(star <= rec.rating ? Color.yellow : Color.gray.opacity(0.3))
                            }
                        }
                    }
                }

                if let tips = rec.tips, !tips.isEmpty {
                    Text(tips)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
            }

            Spacer()

            // Remove button
            Button {
                localRecommendations.removeAll { $0.id == rec.id }
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .foregroundStyle(.tertiary)
                    .font(.title3)
            }
        }
        .padding(12)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func categoryIcon(_ category: RecommendationCategory) -> String {
        switch category {
        case .restaurant: return "fork.knife"
        case .activity: return "figure.hiking"
        case .stay: return "bed.double.fill"
        case .tip: return "lightbulb.fill"
        }
    }

    private func addRecommendation() {
        let trimmed = recTitle.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }

        let rec = LocalRecommendation(
            title: trimmed,
            category: recCategory,
            rating: recRating,
            tips: recTips.trimmingCharacters(in: .whitespaces).isEmpty ? nil : recTips.trimmingCharacters(in: .whitespaces)
        )
        localRecommendations.append(rec)

        // Reset form
        recTitle = ""
        recCategory = .restaurant
        recRating = 0
        recTips = ""
    }

    // MARK: - Bottom Buttons

    private var bottomButtons: some View {
        HStack(spacing: 12) {
            // Back button (not on first step)
            if currentStep != .destinations {
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        goToPreviousStep()
                    }
                } label: {
                    Text("Back")
                        .font(.headline)
                        .foregroundStyle(.primary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(Color.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.black, lineWidth: 1)
                        )
                }
            }

            // Next/Save button
            Button {
                if currentStep == .recommendations {
                    savePastTrip()
                } else {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        goToNextStep()
                    }
                }
            } label: {
                HStack(spacing: 8) {
                    if isSaving {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text(currentStep == .recommendations ? "Save Trip" : "Next")
                    }
                }
                .font(.headline)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(canProceed ? Color.seeyaPurple : Color.gray.opacity(0.3))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .disabled(!canProceed || isSaving)
        }
    }

    // MARK: - Navigation Logic

    private var canProceed: Bool {
        switch currentStep {
        case .destinations:
            return !destinations.isEmpty
        case .details:
            return true
        case .recommendations:
            return true
        }
    }

    private func goToNextStep() {
        if let nextStep = LogPastTripStep(rawValue: currentStep.rawValue + 1) {
            currentStep = nextStep
        }
    }

    private func goToPreviousStep() {
        if let prevStep = LogPastTripStep(rawValue: currentStep.rawValue - 1) {
            currentStep = prevStep
        }
    }

    // MARK: - Save Past Trip

    private func savePastTrip() {
        isSaving = true

        Task {
            let finalName = tripName.trimmingCharacters(in: .whitespaces).isEmpty
                ? autoGeneratedName
                : tripName.trimmingCharacters(in: .whitespaces)

            var finalStartDate: Date? = nil
            var finalEndDate: Date? = nil
            var isFlexible = false

            switch dateMode {
            case .specific:
                finalStartDate = startDate
                finalEndDate = endDate
            case .monthYear:
                // Create start/end of month
                var components = DateComponents()
                components.year = selectedYear
                components.month = selectedMonth
                components.day = 1
                if let monthStart = Calendar.current.date(from: components) {
                    finalStartDate = monthStart
                    // End of month
                    if let nextMonth = Calendar.current.date(byAdding: .month, value: 1, to: monthStart) {
                        finalEndDate = Calendar.current.date(byAdding: .day, value: -1, to: nextMonth)
                    }
                }
                isFlexible = true
            case .skip:
                isFlexible = true
            }

            let recs = localRecommendations.map { rec in
                TripsViewModel.PastTripRecommendation(
                    title: rec.title,
                    category: rec.category,
                    rating: rec.rating,
                    tips: rec.tips
                )
            }

            let trip = await viewModel.logPastTrip(
                name: finalName,
                startDate: finalStartDate,
                endDate: finalEndDate,
                isFlexible: isFlexible,
                destinations: destinations,
                recommendations: recs
            )

            if trip != nil {
                await MainActor.run {
                    isSaving = false
                    dismiss()
                }
            } else {
                let error = viewModel.errorMessage ?? "Unknown error occurred. Please try again."
                await MainActor.run {
                    isSaving = false
                    errorText = error
                    showError = true
                }
            }
        }
    }
}

// MARK: - Preview

#Preview {
    LogPastTripView(viewModel: TripsViewModel())
}
