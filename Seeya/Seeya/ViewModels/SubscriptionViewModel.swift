import Foundation
import Supabase

@Observable
@MainActor
final class SubscriptionViewModel {
    var subscription: UserSubscription?
    var isLoading = false
    var error: String?

    var isPremium: Bool {
        subscription?.isPremium ?? false
    }

    var canAccessCalendar: Bool { isPremium }
    var canAccessAI: Bool { isPremium }
    var canExportPDF: Bool { isPremium }
    var canExportICS: Bool { isPremium }
    var showAds: Bool { !isPremium }

    func fetchSubscription() async {
        do {
            let session = try await SupabaseService.shared.client.auth.session
            isLoading = true
            subscription = try await SubscriptionService.shared.fetchSubscription(userId: session.user.id)
            isLoading = false
        } catch {
            self.error = error.localizedDescription
            isLoading = false
        }
    }

    func canCreateTrip(upcomingTripCount: Int) -> Bool {
        if isPremium { return true }
        return upcomingTripCount < SubscriptionService.maxFreeUpcomingTrips
    }

    func tripsRemaining(upcomingTripCount: Int) -> Int? {
        if isPremium { return nil }
        return max(0, SubscriptionService.maxFreeUpcomingTrips - upcomingTripCount)
    }
}
