import SwiftUI

// MARK: - Itinerary View Mode

enum ItineraryViewMode: String, CaseIterable {
    case list = "List"
    case calendar = "Calendar"

    var icon: String {
        switch self {
        case .list: return "list.bullet"
        case .calendar: return "calendar"
        }
    }
}

// MARK: - Traveler Filter Option

enum TravelerFilterOption: Hashable {
    case all
    case me
    case specific(UUID)
}

// MARK: - Itinerary View

struct ItineraryView: View {
    @Bindable var viewModel: TripPackViewModel
    let trip: Trip
    let currentUserId: UUID?

    @State private var viewMode: ItineraryViewMode = .calendar
    @State private var selectedTravelerOption: TravelerFilterOption = .all

    var body: some View {
        VStack(spacing: 0) {
            // Header with view toggle, filters, and actions
            ItineraryHeaderView(
                viewMode: $viewMode,
                selectedTravelerOption: $selectedTravelerOption,
                trip: trip,
                currentUserId: currentUserId
            )

            ScrollView {
                VStack(spacing: 20) {
                    // Trip Summary Card
                    TripSummaryCard(trip: trip)

                    // Who's Traveling Section
                    TravelersSection(
                        trip: trip,
                        selectedOption: $selectedTravelerOption
                    )

                    // Main Content (Calendar or List)
                    switch viewMode {
                    case .list:
                        ItineraryListView(viewModel: viewModel, trip: trip)
                    case .calendar:
                        ItineraryCalendarView(viewModel: viewModel, trip: trip)
                    }
                }
                .padding()
            }
        }
        .background(Color.seeyaBackground)
        .onChange(of: selectedTravelerOption) { _, newValue in
            switch newValue {
            case .all:
                viewModel.selectedTravelerFilter = nil
            case .me:
                viewModel.selectedTravelerFilter = currentUserId
            case .specific(let userId):
                viewModel.selectedTravelerFilter = userId
            }
        }
    }
}

#Preview {
    ItineraryView(
        viewModel: TripPackViewModel(tripId: UUID()),
        trip: Trip(
            id: UUID(),
            userId: UUID(),
            name: "Mexico Adventure",
            description: "A Mexico multilegged trip",
            startDate: Date(),
            endDate: Date().addingTimeInterval(14 * 24 * 60 * 60),
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
        currentUserId: UUID()
    )
}
