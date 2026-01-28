import SwiftUI

// MARK: - App Navigation State

@Observable
class AppNavigationState {
    var selectedTab: AppTab = .trips
    var tripIdToOpen: UUID?

    enum AppTab: Hashable {
        case trips
        case explore
        case calendar
        case circle
        case profile
    }

    func navigateToTrip(_ tripId: UUID) {
        tripIdToOpen = tripId
        selectedTab = .trips
    }
}

struct MainTabView: View {
    @Bindable var authViewModel: AuthViewModel
    @State private var navigationState = AppNavigationState()

    var body: some View {
        TabView(selection: $navigationState.selectedTab) {
            Tab("Trips", systemImage: "airplane", value: .trips) {
                TripsView(tripIdToOpen: $navigationState.tripIdToOpen)
            }

            Tab("Explore", systemImage: "sparkles", value: .explore) {
                ExploreView()
            }

            Tab("Calendar", systemImage: "calendar", value: .calendar) {
                CalendarView(navigationState: navigationState)
            }

            Tab("Circle", systemImage: "person.2", value: .circle) {
                TravelCircleView()
            }

            Tab("Profile", systemImage: "person.circle", value: .profile) {
                ProfileView(authViewModel: authViewModel)
            }
        }
    }
}

#Preview {
    MainTabView(authViewModel: AuthViewModel())
}
