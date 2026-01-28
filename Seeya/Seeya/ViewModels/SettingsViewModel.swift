import Foundation
import Supabase

@Observable
@MainActor
final class SettingsViewModel {
    // Privacy & Safety
    var defaultTripVisibility: VisibilityLevel = .busyOnly
    var delayedTripVisibility: Bool = false
    var calendarSharing: Bool = true

    // Notifications
    var notifyTravelPalRequests: Bool = true
    var notifyTripInvitations: Bool = true
    var notifyTripMessages: Bool = true
    var notifyAddedToTripbit: Bool = true

    var isLoading = false
    var errorMessage: String?

    private var cachedUserId: UUID?
    private let userDefaultsKey = "userSettings"

    // MARK: - User ID

    private func getCurrentUserId() async -> UUID? {
        if let cached = cachedUserId {
            return cached
        }
        do {
            let session = try await SupabaseService.shared.client.auth.session
            cachedUserId = session.user.id
            return session.user.id
        } catch {
            return nil
        }
    }

    // MARK: - Load Settings

    func loadSettings() async {
        isLoading = true

        // First try to load from UserDefaults (for offline support)
        loadFromUserDefaults()

        // Then try to fetch from Supabase
        await fetchFromSupabase()

        isLoading = false
    }

    private func loadFromUserDefaults() {
        guard let data = UserDefaults.standard.data(forKey: userDefaultsKey),
              let settings = try? JSONDecoder().decode(UserSettings.self, from: data) else {
            return
        }

        applySettings(settings)
    }

    private func applySettings(_ settings: UserSettings) {
        defaultTripVisibility = settings.defaultTripVisibility
        delayedTripVisibility = settings.delayedTripVisibility
        calendarSharing = settings.calendarSharing
        notifyTravelPalRequests = settings.notifyTravelPalRequests
        notifyTripInvitations = settings.notifyTripInvitations
        notifyTripMessages = settings.notifyTripMessages
        notifyAddedToTripbit = settings.notifyAddedToTripbit
    }

    private func fetchFromSupabase() async {
        guard let userId = await getCurrentUserId() else { return }

        do {
            let response: [UserSettingsRow] = try await SupabaseService.shared.client
                .from("user_settings")
                .select()
                .eq("user_id", value: userId.uuidString)
                .execute()
                .value

            if let row = response.first {
                let settings = UserSettings(
                    defaultTripVisibility: VisibilityLevel(rawValue: row.defaultTripVisibility) ?? .busyOnly,
                    delayedTripVisibility: row.delayedTripVisibility,
                    calendarSharing: row.calendarSharing,
                    notifyTravelPalRequests: row.notifyTravelPalRequests,
                    notifyTripInvitations: row.notifyTripInvitations,
                    notifyTripMessages: row.notifyTripMessages,
                    notifyAddedToTripbit: row.notifyAddedToTripbit
                )
                applySettings(settings)
                saveToUserDefaults(settings)
            }

            print("✅ [SettingsViewModel] Loaded settings from Supabase")
        } catch {
            print("⚠️ [SettingsViewModel] Could not fetch from Supabase, using local: \(error)")
        }
    }

    // MARK: - Save Settings

    func saveSettings() async {
        let settings = currentSettings()
        saveToUserDefaults(settings)
        await saveToSupabase(settings)
    }

    private func currentSettings() -> UserSettings {
        UserSettings(
            defaultTripVisibility: defaultTripVisibility,
            delayedTripVisibility: delayedTripVisibility,
            calendarSharing: calendarSharing,
            notifyTravelPalRequests: notifyTravelPalRequests,
            notifyTripInvitations: notifyTripInvitations,
            notifyTripMessages: notifyTripMessages,
            notifyAddedToTripbit: notifyAddedToTripbit
        )
    }

    private func saveToUserDefaults(_ settings: UserSettings) {
        if let data = try? JSONEncoder().encode(settings) {
            UserDefaults.standard.set(data, forKey: userDefaultsKey)
        }
    }

    private func saveToSupabase(_ settings: UserSettings) async {
        guard let userId = await getCurrentUserId() else { return }

        do {
            let row = UserSettingsRow(
                userId: userId,
                defaultTripVisibility: settings.defaultTripVisibility.rawValue,
                delayedTripVisibility: settings.delayedTripVisibility,
                calendarSharing: settings.calendarSharing,
                notifyTravelPalRequests: settings.notifyTravelPalRequests,
                notifyTripInvitations: settings.notifyTripInvitations,
                notifyTripMessages: settings.notifyTripMessages,
                notifyAddedToTripbit: settings.notifyAddedToTripbit
            )

            try await SupabaseService.shared.client
                .from("user_settings")
                .upsert(row, onConflict: "user_id")
                .execute()

            print("✅ [SettingsViewModel] Saved settings to Supabase")
        } catch {
            print("❌ [SettingsViewModel] Error saving to Supabase: \(error)")
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Save on Change

    /// Call this after any setting changes to persist
    func settingDidChange() {
        Task { await saveSettings() }
    }

    // MARK: - Reset Onboarding

    func resetOnboarding() async -> Bool {
        guard let userId = await getCurrentUserId() else {
            errorMessage = "Not authenticated"
            return false
        }

        do {
            struct ResetOnboarding: Encodable {
                let onboardingCompleted: Bool

                enum CodingKeys: String, CodingKey {
                    case onboardingCompleted = "onboarding_completed"
                }
            }

            try await SupabaseService.shared.client
                .from("profiles")
                .update(ResetOnboarding(onboardingCompleted: false))
                .eq("id", value: userId.uuidString)
                .execute()

            print("✅ [SettingsViewModel] Onboarding reset successfully")
            return true
        } catch {
            print("❌ [SettingsViewModel] Error resetting onboarding: \(error)")
            errorMessage = error.localizedDescription
            return false
        }
    }
}

// MARK: - Supabase Row Model

private struct UserSettingsRow: Codable {
    let userId: UUID
    let defaultTripVisibility: String
    let delayedTripVisibility: Bool
    let calendarSharing: Bool
    let notifyTravelPalRequests: Bool
    let notifyTripInvitations: Bool
    let notifyTripMessages: Bool
    let notifyAddedToTripbit: Bool

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case defaultTripVisibility = "default_trip_visibility"
        case delayedTripVisibility = "delayed_trip_visibility"
        case calendarSharing = "calendar_sharing"
        case notifyTravelPalRequests = "notify_travel_pal_requests"
        case notifyTripInvitations = "notify_trip_invitations"
        case notifyTripMessages = "notify_trip_messages"
        case notifyAddedToTripbit = "notify_added_to_tripbit"
    }
}
