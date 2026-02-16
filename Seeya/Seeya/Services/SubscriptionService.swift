import Foundation
import Supabase

struct UserSubscription: Codable, Sendable {
    let id: UUID
    let userId: UUID
    let planType: String
    let status: String
    let stripeCustomerId: String?
    let stripeSubscriptionId: String?
    let currentPeriodStart: Date?
    let currentPeriodEnd: Date?
    let createdAt: Date?
    let updatedAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case planType = "plan_type"
        case status
        case stripeCustomerId = "stripe_customer_id"
        case stripeSubscriptionId = "stripe_subscription_id"
        case currentPeriodStart = "current_period_start"
        case currentPeriodEnd = "current_period_end"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    var isPremium: Bool {
        planType == "premium" && status == "active"
    }
}

actor SubscriptionService {
    static let shared = SubscriptionService()

    static let maxFreeUpcomingTrips = 5

    private init() {}

    // MARK: - Fetch Subscription

    func fetchSubscription(userId: UUID) async throws -> UserSubscription {
        let subscriptions: [UserSubscription] = try await SupabaseService.shared.client
            .from("user_subscriptions")
            .select()
            .eq("user_id", value: userId.uuidString)
            .execute()
            .value

        if let subscription = subscriptions.first {
            return subscription
        }

        // Auto-create free subscription if none exists
        let newSub: UserSubscription = try await SupabaseService.shared.client
            .from("user_subscriptions")
            .insert(["user_id": userId.uuidString, "plan_type": "free", "status": "active"])
            .select()
            .single()
            .execute()
            .value

        return newSub
    }

    // MARK: - Feature Gates

    func canCreateTrip(userId: UUID, upcomingTripCount: Int) async throws -> Bool {
        let subscription = try await fetchSubscription(userId: userId)
        if subscription.isPremium { return true }
        return upcomingTripCount < Self.maxFreeUpcomingTrips
    }

    func tripsRemaining(userId: UUID, upcomingTripCount: Int) async throws -> Int? {
        let subscription = try await fetchSubscription(userId: userId)
        if subscription.isPremium { return nil } // Unlimited
        return max(0, Self.maxFreeUpcomingTrips - upcomingTripCount)
    }
}
