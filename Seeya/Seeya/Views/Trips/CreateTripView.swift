import SwiftUI

// MARK: - Wizard Step Enum

enum CreateTripStep: Int, CaseIterable {
    case whereWhen = 0
    case vibe
    case name
    case who
    case privacy

    var title: String {
        switch self {
        case .whereWhen: return "Where & When"
        case .vibe: return "Vibe"
        case .name: return "Name"
        case .who: return "Who"
        case .privacy: return "Privacy"
        }
    }

    var subtitle: String {
        switch self {
        case .whereWhen: return "Where are you headed?"
        case .vibe: return "What's the vibe?"
        case .name: return "Give your trip a name"
        case .who: return "Who's coming along?"
        case .privacy: return "Who can see this trip?"
        }
    }
}

// MARK: - Date Mode Enum

enum DateMode: String, CaseIterable {
    case exact = "Exact dates"
    case flexible = "Flexible"
    case tbd = "TBD"

    var icon: String {
        switch self {
        case .exact: return "calendar"
        case .flexible: return "calendar.badge.clock"
        case .tbd: return "questionmark.circle"
        }
    }
}

// MARK: - Create Trip View (Wizard)

struct CreateTripView: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var viewModel: TripsViewModel

    // Wizard State
    @State private var currentStep: CreateTripStep = .whereWhen
    @State private var isCreating = false
    @State private var showError = false
    @State private var errorText = ""

    // Step 1: Where & When
    @State private var destinations: [TripsViewModel.TripDestination] = []
    @State private var dateMode: DateMode = .exact
    @State private var selectedMonth: Date? = nil

    // Step 2: Vibe
    @State private var selectedVibes: Set<TripNameGenerator.TripVibe> = []

    // Step 3: Name
    @State private var tripName = ""
    @State private var tripDescription = ""
    @State private var nameSuggestions: [String] = []
    @State private var isGeneratingNames = false

    // Step 4: Who
    @State private var selectedFriends: Set<UUID> = []

    // Step 5: Privacy
    @State private var visibility: VisibilityLevel = .fullDetails

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
                    Text("Step \(currentStep.rawValue + 1) of \(CreateTripStep.allCases.count)")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
            .task {
                await viewModel.fetchTripTypes()
                await viewModel.fetchFriends()
            }
            .onChange(of: destinations) { _, _ in
                updateNameSuggestions()
            }
            .onChange(of: selectedVibes) { _, _ in
                updateNameSuggestions()
            }
            .alert("Trip Creation Failed", isPresented: $showError) {
                Button("OK", role: .cancel) { }
            } message: {
                Text(errorText)
            }
        }
    }

    // MARK: - Progress Indicator

    private var progressIndicator: some View {
        HStack(spacing: 8) {
            ForEach(CreateTripStep.allCases, id: \.rawValue) { step in
                RoundedRectangle(cornerRadius: 2)
                    .fill(step.rawValue <= currentStep.rawValue ? Color.black : Color.gray.opacity(0.2))
                    .frame(height: 4)
            }
        }
    }

    // MARK: - Step Content

    @ViewBuilder
    private var stepContent: some View {
        switch currentStep {
        case .whereWhen:
            whereWhenStep
        case .vibe:
            vibeStep
        case .name:
            nameStep
        case .who:
            whoStep
        case .privacy:
            privacyStep
        }
    }

    // MARK: - Step 1: Where & When

    private var whereWhenStep: some View {
        VStack(alignment: .leading, spacing: 20) {
            // Date Mode Segmented Control
            dateModePicker

            // Date Selection Content based on mode
            dateSelectionContent

            // Destinations List
            VStack(alignment: .leading, spacing: 12) {
                ForEach(Array(destinations.enumerated()), id: \.element.id) { index, destination in
                    DestinationRowWithDates(
                        destination: binding(for: destination),
                        index: index + 1,
                        previousEndDate: index > 0 ? destinations[index - 1].endDate : nil,
                        dateMode: dateMode,
                        onRemove: {
                            destinations.removeAll { $0.id == destination.id }
                        }
                    )
                }

                // Add Destination Button
                Button {
                    // Will be handled by CityAutocompleteField
                } label: {
                    CityAutocompleteField(
                        viewModel: viewModel,
                        placeholder: destinations.isEmpty ? "Search for a city..." : "Add another stop...",
                        onSelect: { city, customLocation in
                            var startDate: Date? = nil
                            var endDate: Date? = nil

                            if dateMode == .exact {
                                if let lastDest = destinations.last, let lastEnd = lastDest.endDate {
                                    startDate = lastEnd
                                    endDate = Calendar.current.date(byAdding: .day, value: 3, to: lastEnd)
                                } else {
                                    startDate = Date()
                                    endDate = Calendar.current.date(byAdding: .day, value: 3, to: Date())
                                }
                            }

                            let destination = TripsViewModel.TripDestination(
                                city: city,
                                customLocation: customLocation,
                                startDate: startDate,
                                endDate: endDate
                            )
                            destinations.append(destination)
                        }
                    )
                }
                .buttonStyle(.plain)
            }

            // Itinerary Summary
            if !destinations.isEmpty {
                itinerarySummary
            }
        }
        .onChange(of: dateMode) { _, newMode in
            updateDatesForMode(newMode)
        }
    }

    // MARK: - Date Mode Picker

    private var dateModePicker: some View {
        HStack(spacing: 0) {
            ForEach(DateMode.allCases, id: \.self) { mode in
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        dateMode = mode
                    }
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: mode.icon)
                            .font(.caption)
                        Text(mode.rawValue)
                            .font(.subheadline)
                            .fontWeight(.medium)
                    }
                    .padding(.vertical, 10)
                    .padding(.horizontal, 12)
                    .frame(maxWidth: .infinity)
                    .background(dateMode == mode ? Color.black : Color.clear)
                    .foregroundStyle(dateMode == mode ? .white : .primary)
                }
            }
        }
        .background(Color.gray.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    // MARK: - Date Selection Content

    @ViewBuilder
    private var dateSelectionContent: some View {
        switch dateMode {
        case .exact:
            EmptyView() // Dates shown per-destination
        case .flexible:
            monthPickerGrid
        case .tbd:
            tbdMessage
        }
    }

    // MARK: - Month Picker Grid

    private var monthPickerGrid: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Pick a month")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            let currentYear = Calendar.current.component(.year, from: Date())
            let months = (0..<12).map { monthIndex -> Date in
                Calendar.current.date(from: DateComponents(year: currentYear, month: monthIndex + 1, day: 1)) ?? Date()
            }

            LazyVGrid(columns: [
                GridItem(.flexible(), spacing: 8),
                GridItem(.flexible(), spacing: 8),
                GridItem(.flexible(), spacing: 8),
                GridItem(.flexible(), spacing: 8)
            ], spacing: 8) {
                ForEach(months, id: \.self) { month in
                    MonthTile(
                        month: month,
                        isSelected: isMonthSelected(month),
                        action: { selectMonth(month) }
                    )
                }
            }
        }
        .padding(16)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func isMonthSelected(_ month: Date) -> Bool {
        guard let selected = selectedMonth else { return false }
        let cal = Calendar.current
        return cal.component(.month, from: selected) == cal.component(.month, from: month) &&
               cal.component(.year, from: selected) == cal.component(.year, from: month)
    }

    private func selectMonth(_ month: Date) {
        if isMonthSelected(month) {
            selectedMonth = nil
        } else {
            selectedMonth = month
        }
    }

    // MARK: - TBD Message

    private var tbdMessage: some View {
        Text("Dates will be determined later")
            .font(.subheadline)
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(Color.seeyaPurple.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Itinerary Summary

    private var itinerarySummary: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Your itinerary")
                .font(.caption)
                .foregroundStyle(.secondary)

            VStack(alignment: .leading, spacing: 4) {
                Text(destinations.map { $0.displayName }.joined(separator: " → "))
                    .font(.subheadline)
                    .fontWeight(.medium)

                Text(itineraryDateText)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.seeyaPurple.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private var itineraryDateText: String {
        switch dateMode {
        case .exact:
            if let start = tripStartDate, let end = tripEndDate {
                let formatter = DateFormatter()
                formatter.dateFormat = "MMM d"
                return "\(formatter.string(from: start)) - \(formatter.string(from: end))"
            }
            return "Select dates"
        case .flexible:
            if let month = selectedMonth {
                let formatter = DateFormatter()
                formatter.dateFormat = "MMMM yyyy"
                return formatter.string(from: month)
            }
            return "Select a month"
        case .tbd:
            return "Dates TBD"
        }
    }

    // MARK: - Update Dates for Mode

    private func updateDatesForMode(_ mode: DateMode) {
        switch mode {
        case .exact:
            // Set default dates for all destinations
            var currentDate = Date()
            for i in destinations.indices {
                destinations[i].startDate = currentDate
                let endDate = Calendar.current.date(byAdding: .day, value: 3, to: currentDate) ?? currentDate
                destinations[i].endDate = endDate
                currentDate = endDate
            }
        case .flexible, .tbd:
            // Clear specific dates
            for i in destinations.indices {
                destinations[i].startDate = nil
                destinations[i].endDate = nil
            }
        }
    }

    // Helper to create binding for destination
    private func binding(for destination: TripsViewModel.TripDestination) -> Binding<TripsViewModel.TripDestination> {
        guard let index = destinations.firstIndex(where: { $0.id == destination.id }) else {
            return .constant(destination)
        }
        return $destinations[index]
    }

    // Computed properties for trip dates
    private var tripStartDate: Date? {
        destinations.compactMap { $0.startDate }.min()
    }

    private var tripEndDate: Date? {
        destinations.compactMap { $0.endDate }.max()
    }

    // MARK: - Step 2: Vibe

    private var vibeStep: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Selected vibes chips
            if !selectedVibes.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(Array(selectedVibes), id: \.id) { vibe in
                            HStack(spacing: 4) {
                                Image(systemName: vibe.icon)
                                    .font(.caption)
                                Text(vibe.name)
                                    .font(.caption)
                                    .fontWeight(.medium)
                                Button {
                                    selectedVibes.remove(vibe)
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
                .padding(.bottom, 4)
            }

            LazyVGrid(columns: [
                GridItem(.flexible(), spacing: 12),
                GridItem(.flexible(), spacing: 12),
                GridItem(.flexible(), spacing: 12)
            ], spacing: 12) {
                ForEach(TripNameGenerator.tripVibes) { vibe in
                    VibeTile(
                        vibe: vibe,
                        isSelected: selectedVibes.contains(vibe)
                    ) {
                        if selectedVibes.contains(vibe) {
                            selectedVibes.remove(vibe)
                        } else {
                            selectedVibes.insert(vibe)
                        }
                    }
                }
            }

            Text("Select one or more vibes to get AI-powered name suggestions!")
                .font(.caption)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .center)
                .padding(.top, 8)
        }
    }

    // MARK: - Step 3: Name

    private var nameStep: some View {
        VStack(alignment: .leading, spacing: 20) {
            // Trip Name Input
            VStack(alignment: .leading, spacing: 8) {
                Text("Trip name")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                TextField("e.g., Summer in Paris", text: $tripName)
                    .font(.body)
                    .padding(16)
                    .background(Color.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }

            // AI Name Suggestions
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Image(systemName: "sparkles")
                        .foregroundStyle(Color.seeyaPurple)
                    Text("AI-powered suggestions")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    if isGeneratingNames {
                        ProgressView()
                            .scaleEffect(0.7)
                            .padding(.leading, 4)
                    }

                    Spacer()

                    // Regenerate button
                    Button {
                        generateAINames()
                    } label: {
                        Image(systemName: "arrow.clockwise")
                            .font(.caption)
                            .foregroundStyle(Color.seeyaPurple)
                    }
                    .disabled(isGeneratingNames)
                }

                if !nameSuggestions.isEmpty {
                    FlowLayout(spacing: 8) {
                        ForEach(nameSuggestions, id: \.self) { suggestion in
                            Button {
                                tripName = suggestion
                            } label: {
                                Text(suggestion)
                                    .font(.subheadline)
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 8)
                                    .background(tripName == suggestion ? Color.seeyaPurple : Color.white)
                                    .foregroundStyle(tripName == suggestion ? .white : .primary)
                                    .clipShape(Capsule())
                                    .overlay(
                                        Capsule()
                                            .stroke(Color.gray.opacity(0.2), lineWidth: tripName == suggestion ? 0 : 1)
                                    )
                            }
                        }
                    }
                } else if isGeneratingNames {
                    Text("Generating creative names...")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .padding(.vertical, 8)
                }
            }

            // Description
            VStack(alignment: .leading, spacing: 8) {
                Text("Description (optional)")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                TextField("Add notes or details...", text: $tripDescription, axis: .vertical)
                    .font(.body)
                    .lineLimit(3...6)
                    .padding(16)
                    .background(Color.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    // MARK: - Step 4: Who

    private var whoStep: some View {
        VStack(alignment: .leading, spacing: 16) {
            if viewModel.friends.isEmpty {
                VStack(spacing: 16) {
                    Image(systemName: "person.2")
                        .font(.system(size: 48))
                        .foregroundStyle(.tertiary)
                    Text("No friends yet")
                        .font(.headline)
                    Text("Add friends to invite them on trips")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 40)
            } else {
                ForEach(viewModel.friends) { friend in
                    FriendSelectionRow(
                        friend: friend,
                        isSelected: selectedFriends.contains(friend.id)
                    ) {
                        if selectedFriends.contains(friend.id) {
                            selectedFriends.remove(friend.id)
                        } else {
                            selectedFriends.insert(friend.id)
                        }
                    }
                }
            }

            if !selectedFriends.isEmpty {
                Text("\(selectedFriends.count) friend\(selectedFriends.count == 1 ? "" : "s") selected")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
            }

            Text("You can invite more friends later")
                .font(.caption)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .center)
                .padding(.top, 8)
        }
    }

    // MARK: - Step 5: Privacy

    private var privacyStep: some View {
        VStack(alignment: .leading, spacing: 12) {
            ForEach(VisibilityLevel.allCases, id: \.self) { level in
                PrivacyOptionRow(
                    level: level,
                    isSelected: visibility == level
                ) {
                    visibility = level
                }
            }
        }
    }

    // MARK: - Bottom Buttons

    private var bottomButtons: some View {
        HStack(spacing: 12) {
            // Back button (not on first step)
            if currentStep != .whereWhen {
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

            // Next/Create button
            Button {
                if currentStep == .privacy {
                    createTrip()
                } else {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        goToNextStep()
                    }
                }
            } label: {
                HStack(spacing: 8) {
                    if isCreating {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text(currentStep == .privacy ? "Create Trip" : "Next")
                    }
                }
                .font(.headline)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(canProceed ? Color.black : Color.gray.opacity(0.3))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .disabled(!canProceed || isCreating)
        }
    }

    // MARK: - Navigation Logic

    private var canProceed: Bool {
        switch currentStep {
        case .whereWhen:
            return !destinations.isEmpty
        case .vibe:
            return true
        case .name:
            return !tripName.trimmingCharacters(in: .whitespaces).isEmpty
        case .who:
            return true
        case .privacy:
            return true
        }
    }

    private func goToNextStep() {
        if let nextStep = CreateTripStep(rawValue: currentStep.rawValue + 1) {
            currentStep = nextStep

            if nextStep == .name {
                // Show local suggestions immediately, then fetch AI suggestions
                updateNameSuggestions()
                if tripName.isEmpty, let firstSuggestion = nameSuggestions.first {
                    tripName = firstSuggestion
                }
                // Generate AI names in background
                generateAINames()
            }
        }
    }

    private func goToPreviousStep() {
        if let prevStep = CreateTripStep(rawValue: currentStep.rawValue - 1) {
            currentStep = prevStep
        }
    }

    private func updateNameSuggestions() {
        // Use local generator as fallback/initial
        nameSuggestions = TripNameGenerator.generateSuggestions(
            destinations: destinations,
            vibes: selectedVibes,
            startDate: tripStartDate,
            count: 4
        )
    }

    private func generateAINames() {
        guard !destinations.isEmpty else { return }

        isGeneratingNames = true

        Task {
            do {
                let destinationNames = destinations.map { $0.displayName }
                let vibeNames = selectedVibes.map { $0.name }

                var month: String? = nil
                if let selectedMonth = selectedMonth {
                    let formatter = DateFormatter()
                    formatter.dateFormat = "MMMM"
                    month = formatter.string(from: selectedMonth)
                } else if let startDate = tripStartDate {
                    let formatter = DateFormatter()
                    formatter.dateFormat = "MMMM"
                    month = formatter.string(from: startDate)
                }

                let aiNames = try await AIService.shared.generateTripNames(
                    destinations: destinationNames,
                    vibes: vibeNames,
                    month: month,
                    count: 4
                )

                await MainActor.run {
                    if !aiNames.isEmpty {
                        nameSuggestions = aiNames
                    }
                    isGeneratingNames = false
                }
            } catch {
                print("❌ [CreateTripView] AI name generation failed: \(error)")
                await MainActor.run {
                    isGeneratingNames = false
                    // Keep local suggestions as fallback
                }
            }
        }
    }

    // MARK: - Create Trip

    private func createTrip() {
        isCreating = true

        Task {
            let isFlexible = dateMode != .exact
            print("[CreateTripView] Starting trip creation...")
            print("[CreateTripView] Trip name: \(tripName)")
            print("[CreateTripView] Destinations: \(destinations.map { $0.displayName })")
            print("[CreateTripView] Date mode: \(dateMode)")
            print("[CreateTripView] Start date: \(String(describing: tripStartDate))")
            print("[CreateTripView] End date: \(String(describing: tripEndDate))")
            print("[CreateTripView] Selected month: \(String(describing: selectedMonth))")
            print("[CreateTripView] Visibility: \(visibility)")

            let trip = await viewModel.createTrip(
                name: tripName.trimmingCharacters(in: .whitespaces),
                description: tripDescription.isEmpty ? nil : tripDescription,
                startDate: tripStartDate,
                endDate: tripEndDate,
                isFlexible: isFlexible,
                visibility: visibility,
                destinations: destinations
            )

            if let trip = trip {
                print("[CreateTripView] Trip created successfully: \(trip.name) (ID: \(trip.id))")

                for friendId in selectedFriends {
                    let invited = await viewModel.inviteParticipant(tripId: trip.id, userId: friendId)
                    print("[CreateTripView] Invited friend \(friendId): \(invited ? "success" : "failed")")
                }

                await MainActor.run {
                    isCreating = false
                    dismiss()
                }
            } else {
                let error = viewModel.errorMessage ?? "Unknown error occurred. Please try again."
                print("[CreateTripView] Trip creation failed: \(error)")
                await MainActor.run {
                    isCreating = false
                    errorText = error
                    showError = true
                }
            }
        }
    }
}

// MARK: - City Autocomplete Field (Google Places)

struct CityAutocompleteField: View {
    @Bindable var viewModel: TripsViewModel
    let placeholder: String
    let onSelect: (City?, String?) -> Void

    @State private var searchText = ""
    @State private var isExpanded = false
    @State private var predictions: [PlacePrediction] = []
    @State private var isSearching = false
    @State private var searchTask: Task<Void, Never>?
    @FocusState private var isFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Search Input
            HStack(spacing: 12) {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(.secondary)

                TextField(placeholder, text: $searchText)
                    .textFieldStyle(.plain)
                    .autocorrectionDisabled()
                    .focused($isFocused)

                if isSearching {
                    ProgressView()
                        .scaleEffect(0.8)
                } else if !searchText.isEmpty {
                    Button {
                        searchText = ""
                        predictions = []
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(.tertiary)
                    }
                }
            }
            .padding(16)
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 12))

            // Autocomplete Results
            if isExpanded && !searchText.isEmpty {
                VStack(alignment: .leading, spacing: 0) {
                    // City predictions from Google Places
                    ForEach(predictions) { prediction in
                        Button {
                            selectPrediction(prediction)
                        } label: {
                            HStack(spacing: 12) {
                                Image(systemName: "mappin.circle.fill")
                                    .foregroundStyle(Color.seeyaPurple)
                                    .frame(width: 24)

                                VStack(alignment: .leading, spacing: 2) {
                                    Text(prediction.mainText)
                                        .font(.body)
                                        .foregroundStyle(.primary)
                                    if !prediction.secondaryText.isEmpty {
                                        Text(prediction.secondaryText)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }

                                Spacer()
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 12)
                        }

                        if prediction.id != predictions.last?.id {
                            Divider()
                                .padding(.leading, 52)
                        }
                    }

                    // Custom location option
                    if !predictions.isEmpty {
                        Divider()
                            .padding(.leading, 52)
                    }

                    Button {
                        onSelect(nil, searchText)
                        searchText = ""
                        predictions = []
                        isFocused = false
                    } label: {
                        HStack(spacing: 12) {
                            Image(systemName: "pencil")
                                .foregroundStyle(.secondary)
                                .frame(width: 24)

                            VStack(alignment: .leading, spacing: 2) {
                                Text("Use \"\(searchText)\"")
                                    .font(.body)
                                    .foregroundStyle(.primary)
                                Text("Custom location")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }

                            Spacer()
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                    }
                }
                .background(Color.white)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .shadow(color: .black.opacity(0.1), radius: 8, y: 4)
                .padding(.top, 4)
            }
        }
        .onChange(of: searchText) { _, newValue in
            isExpanded = !newValue.isEmpty
            performSearch(query: newValue)
        }
        .onChange(of: isFocused) { _, focused in
            if focused && !searchText.isEmpty {
                isExpanded = true
            } else if !focused {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                    isExpanded = false
                }
            }
        }
    }

    private func performSearch(query: String) {
        searchTask?.cancel()

        guard !query.isEmpty else {
            predictions = []
            return
        }

        searchTask = Task {
            try? await Task.sleep(nanoseconds: 250_000_000) // 250ms debounce
            guard !Task.isCancelled else { return }

            await MainActor.run { isSearching = true }

            do {
                let results = try await PlacesService.shared.autocomplete(query: query)
                guard !Task.isCancelled else { return }

                await MainActor.run {
                    predictions = results
                    isSearching = false
                }
            } catch {
                print("[CityAutocomplete] Search error: \(error)")
                await MainActor.run {
                    isSearching = false
                }
            }
        }
    }

    private func selectPrediction(_ prediction: PlacePrediction) {
        onSelect(nil, prediction.fullText)
        searchText = ""
        predictions = []
        isFocused = false
    }
}

// MARK: - Month Tile

struct MonthTile: View {
    let month: Date
    let isSelected: Bool
    let action: () -> Void

    private var monthName: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM"
        return formatter.string(from: month)
    }

    private var year: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy"
        return formatter.string(from: month)
    }

    var body: some View {
        Button(action: action) {
            VStack(spacing: 2) {
                Text(monthName)
                    .font(.subheadline)
                    .fontWeight(.medium)
                Text(year)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(isSelected ? Color.black : Color.clear)
            .foregroundStyle(isSelected ? .white : .primary)
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(isSelected ? Color.clear : Color.gray.opacity(0.3), lineWidth: 1)
            )
        }
    }
}

// MARK: - Destination Row With Dates

struct DestinationRowWithDates: View {
    @Binding var destination: TripsViewModel.TripDestination
    let index: Int
    let previousEndDate: Date?
    let dateMode: DateMode
    let onRemove: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Main Row
            HStack(spacing: 12) {
                // Location pin icon
                Image(systemName: "mappin.circle.fill")
                    .foregroundStyle(Color.seeyaPurple)
                    .font(.title2)

                // Location info
                VStack(alignment: .leading, spacing: 2) {
                    Text("Stop \(index)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(destination.displayName)
                        .font(.body)
                        .fontWeight(.medium)
                        .lineLimit(1)
                }

                Spacer()

                // Remove button
                Button(action: onRemove) {
                    Image(systemName: "xmark")
                        .foregroundStyle(.secondary)
                        .font(.caption)
                }
            }
            .padding(16)

            // Date Pickers (only visible when exact dates mode)
            if dateMode == .exact {
                VStack(spacing: 8) {
                    Divider()
                        .padding(.horizontal, 16)

                    HStack(spacing: 12) {
                        // Start Date
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Arrive")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            DatePicker(
                                "",
                                selection: Binding(
                                    get: { destination.startDate ?? Date() },
                                    set: { destination.startDate = $0 }
                                ),
                                in: (previousEndDate ?? Date())...,
                                displayedComponents: .date
                            )
                            .datePickerStyle(.compact)
                            .labelsHidden()
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)

                        // End Date
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Depart")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            DatePicker(
                                "",
                                selection: Binding(
                                    get: { destination.endDate ?? (destination.startDate ?? Date()) },
                                    set: { destination.endDate = $0 }
                                ),
                                in: (destination.startDate ?? Date())...,
                                displayedComponents: .date
                            )
                            .datePickerStyle(.compact)
                            .labelsHidden()
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 12)
                }
            }
        }
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.gray.opacity(0.2), lineWidth: 1)
        )
    }
}

// MARK: - Destination Row (Simple - for backward compatibility)

struct DestinationRow: View {
    let destination: TripsViewModel.TripDestination
    let index: Int
    let onRemove: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            // Number badge
            ZStack {
                Circle()
                    .fill(Color.seeyaPurple)
                    .frame(width: 28, height: 28)
                Text("\(index)")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.white)
            }

            // Flag & Name
            if let flag = destination.flagEmoji {
                Text(flag)
                    .font(.title2)
            }

            Text(destination.displayName)
                .font(.body)
                .fontWeight(.medium)

            Spacer()

            // Remove button
            Button(action: onRemove) {
                Image(systemName: "xmark.circle.fill")
                    .foregroundStyle(.tertiary)
                    .font(.title3)
            }
        }
        .padding(16)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Vibe Tile

struct VibeTile: View {
    let vibe: TripNameGenerator.TripVibe
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: vibe.icon)
                    .font(.system(size: 24))
                    .foregroundStyle(isSelected ? .white : Color.seeyaPurple)

                Text(vibe.name)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(isSelected ? .white : .primary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(isSelected ? Color.black : Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? Color.clear : Color.gray.opacity(0.2), lineWidth: 1)
            )
        }
    }
}

// MARK: - Friend Selection Row

struct FriendSelectionRow: View {
    let friend: Profile
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                AvatarView(name: friend.fullName, avatarUrl: friend.avatarUrl, size: 44)

                VStack(alignment: .leading, spacing: 2) {
                    Text(friend.fullName)
                        .font(.body)
                        .fontWeight(.medium)
                        .foregroundStyle(.primary)

                    if let username = friend.username {
                        Text("@\(username)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                ZStack {
                    Circle()
                        .stroke(isSelected ? Color.seeyaPurple : Color.gray.opacity(0.3), lineWidth: 2)
                        .frame(width: 24, height: 24)

                    if isSelected {
                        Circle()
                            .fill(Color.seeyaPurple)
                            .frame(width: 24, height: 24)
                        Image(systemName: "checkmark")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(.white)
                    }
                }
            }
            .padding(16)
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }
}

// MARK: - Privacy Option Row

struct PrivacyOptionRow: View {
    let level: VisibilityLevel
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 16) {
                // Icon
                Image(systemName: level.icon)
                    .font(.title3)
                    .foregroundStyle(isSelected ? Color.seeyaPurple : .secondary)
                    .frame(width: 24)

                // Text
                VStack(alignment: .leading, spacing: 2) {
                    Text(level.displayName)
                        .font(.body)
                        .fontWeight(.medium)
                        .foregroundStyle(isSelected ? Color.seeyaPurple : .primary)

                    Text(level.description)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                // Radio button
                ZStack {
                    Circle()
                        .stroke(isSelected ? Color.seeyaPurple : Color.gray.opacity(0.3), lineWidth: 2)
                        .frame(width: 24, height: 24)

                    if isSelected {
                        Circle()
                            .fill(Color.seeyaPurple)
                            .frame(width: 24, height: 24)
                        Image(systemName: "checkmark")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(.white)
                    }
                }
            }
            .padding(16)
            .background(isSelected ? Color.seeyaPurple.opacity(0.08) : Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? Color.seeyaPurple : Color.clear, lineWidth: 2)
            )
        }
    }
}

// MARK: - Flow Layout for Name Suggestions

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = FlowResult(in: proposal.width ?? 0, subviews: subviews, spacing: spacing)
        return CGSize(width: proposal.width ?? 0, height: result.height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = FlowResult(in: bounds.width, subviews: subviews, spacing: spacing)
        for (index, subview) in subviews.enumerated() {
            let point = result.positions[index]
            subview.place(at: CGPoint(x: bounds.minX + point.x, y: bounds.minY + point.y), proposal: .unspecified)
        }
    }

    struct FlowResult {
        var positions: [CGPoint] = []
        var height: CGFloat = 0

        init(in width: CGFloat, subviews: Subviews, spacing: CGFloat) {
            var x: CGFloat = 0
            var y: CGFloat = 0
            var maxHeight: CGFloat = 0

            for subview in subviews {
                let size = subview.sizeThatFits(.unspecified)

                if x + size.width > width && x > 0 {
                    x = 0
                    y += maxHeight + spacing
                    maxHeight = 0
                }

                positions.append(CGPoint(x: x, y: y))
                maxHeight = max(maxHeight, size.height)
                x += size.width + spacing
            }

            height = y + maxHeight
        }
    }
}

// MARK: - Preview

#Preview {
    CreateTripView(viewModel: TripsViewModel())
}
