import SwiftUI

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var authViewModel: AuthViewModel
    @State private var viewModel = SettingsViewModel()
    @State private var showingRedoSetupAlert = false
    @State private var isResettingOnboarding = false

    private let settingsAccent = Color(red: 0.95, green: 0.85, blue: 0.4) // Yellow/gold accent

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: SeeyaSpacing.lg) {
                    privacySection
                    notificationsSection
                    helpSection
                    signOutSection
                }
                .padding(.horizontal, SeeyaSpacing.md)
                .padding(.vertical, SeeyaSpacing.sm)
            }
            .background(Color.seeyaBackground)
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
            .task {
                await viewModel.loadSettings()
            }
        }
    }

    // MARK: - Privacy & Safety Section

    private var privacySection: some View {
        SettingsSection(
            title: "Privacy & Safety",
            subtitle: "Control how your travel information is shared",
            icon: "shield.fill",
            accentColor: settingsAccent
        ) {
            VStack(spacing: 0) {
                // Default Trip Visibility
                SettingsPickerRow(
                    title: "Default Trip Visibility",
                    subtitle: "Applied to all new trips you create",
                    selection: $viewModel.defaultTripVisibility,
                    options: VisibilityLevel.allCases,
                    displayName: { $0.displayName }
                )
                .onChange(of: viewModel.defaultTripVisibility) { _, _ in
                    viewModel.settingDidChange()
                }

                Divider()
                    .padding(.leading, SeeyaSpacing.md)

                // Delayed Trip Visibility
                SettingsToggleRow(
                    title: "Delayed Trip Visibility",
                    subtitle: "Trips only appear to friends after they start",
                    isOn: $viewModel.delayedTripVisibility,
                    accentColor: settingsAccent
                )
                .onChange(of: viewModel.delayedTripVisibility) { _, _ in
                    viewModel.settingDidChange()
                }

                Divider()
                    .padding(.leading, SeeyaSpacing.md)

                // Calendar Sharing
                SettingsToggleRow(
                    title: "Calendar Sharing",
                    subtitle: "Allow friends to see your availability",
                    isOn: $viewModel.calendarSharing,
                    accentColor: settingsAccent
                )
                .onChange(of: viewModel.calendarSharing) { _, _ in
                    viewModel.settingDidChange()
                }
            }
        }
    }

    // MARK: - Notifications Section

    private var notificationsSection: some View {
        SettingsSection(
            title: "Notifications",
            subtitle: "Manage how you receive updates",
            icon: "bell.fill",
            accentColor: settingsAccent
        ) {
            VStack(spacing: 0) {
                SettingsToggleRow(
                    title: "Travel Pal Requests",
                    subtitle: "When someone sends you a travel pal request",
                    isOn: $viewModel.notifyTravelPalRequests,
                    accentColor: settingsAccent
                )
                .onChange(of: viewModel.notifyTravelPalRequests) { _, _ in
                    viewModel.settingDidChange()
                }

                Divider()
                    .padding(.leading, SeeyaSpacing.md)

                SettingsToggleRow(
                    title: "Trip Invitations",
                    subtitle: "When you're invited to a trip",
                    isOn: $viewModel.notifyTripInvitations,
                    accentColor: settingsAccent
                )
                .onChange(of: viewModel.notifyTripInvitations) { _, _ in
                    viewModel.settingDidChange()
                }

                Divider()
                    .padding(.leading, SeeyaSpacing.md)

                SettingsToggleRow(
                    title: "Trip Messages",
                    subtitle: "When someone sends a message in your trips",
                    isOn: $viewModel.notifyTripMessages,
                    accentColor: settingsAccent
                )
                .onChange(of: viewModel.notifyTripMessages) { _, _ in
                    viewModel.settingDidChange()
                }

                Divider()
                    .padding(.leading, SeeyaSpacing.md)

                SettingsToggleRow(
                    title: "Added to Tripbit",
                    subtitle: "When someone adds you to a tripbit",
                    isOn: $viewModel.notifyAddedToTripbit,
                    accentColor: settingsAccent
                )
                .onChange(of: viewModel.notifyAddedToTripbit) { _, _ in
                    viewModel.settingDidChange()
                }
            }
        }
    }

    // MARK: - Help & Support Section

    private var helpSection: some View {
        SettingsSection(
            title: "Help & Support",
            subtitle: "Learn how to get the most out of Seeya",
            icon: "questionmark.circle.fill",
            accentColor: settingsAccent
        ) {
            VStack(spacing: SeeyaSpacing.sm) {
                SettingsButtonRow(
                    title: "Replay App Tour",
                    icon: "play.circle"
                ) {
                    // App tour not yet implemented - placeholder
                }

                SettingsButtonRow(
                    title: "Redo Initial Setup",
                    icon: "arrow.counterclockwise",
                    isLoading: isResettingOnboarding
                ) {
                    showingRedoSetupAlert = true
                }
            }
        }
        .alert("Redo Initial Setup?", isPresented: $showingRedoSetupAlert) {
            Button("Cancel", role: .cancel) { }
            Button("Redo Setup", role: .destructive) {
                redoInitialSetup()
            }
        } message: {
            Text("This will take you through the onboarding process again. Your existing data will not be deleted.")
        }
    }

    private func redoInitialSetup() {
        isResettingOnboarding = true
        Task {
            let success = await viewModel.resetOnboarding()
            isResettingOnboarding = false
            if success {
                // Refresh auth state to trigger onboarding
                await authViewModel.checkOnboardingStatus()
                dismiss()
            }
        }
    }

    // MARK: - Sign Out Section

    private var signOutSection: some View {
        Button {
            Task {
                await authViewModel.signOut()
            }
        } label: {
            HStack {
                Image(systemName: "rectangle.portrait.and.arrow.right")
                    .font(.system(size: SeeyaIconSize.medium))
                Text("Sign Out")
                    .font(SeeyaTypography.bodyMedium)
            }
            .foregroundStyle(.red)
            .frame(maxWidth: .infinity)
            .padding(.vertical, SeeyaSpacing.md)
            .background(Color.seeyaCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
        }
        .buttonStyle(.plain)
        .padding(.top, SeeyaSpacing.md)
        .padding(.bottom, SeeyaSpacing.xl)
    }
}

// MARK: - Settings Section Container

private struct SettingsSection<Content: View>: View {
    let title: String
    let subtitle: String
    let icon: String
    let accentColor: Color
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.sm) {
            // Section Header
            HStack(spacing: SeeyaSpacing.sm) {
                Image(systemName: icon)
                    .font(.system(size: SeeyaIconSize.large))
                    .foregroundStyle(accentColor)

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(SeeyaTypography.headlineMedium)
                        .foregroundStyle(Color.seeyaTextPrimary)

                    Text(subtitle)
                        .font(SeeyaTypography.caption)
                        .foregroundStyle(Color.seeyaTextSecondary)
                }
            }
            .padding(.horizontal, SeeyaSpacing.md)
            .padding(.top, SeeyaSpacing.md)

            // Section Content
            content
                .padding(.bottom, SeeyaSpacing.sm)
        }
        .background(Color.seeyaCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
    }
}

// MARK: - Settings Toggle Row

private struct SettingsToggleRow: View {
    let title: String
    let subtitle: String
    @Binding var isOn: Bool
    let accentColor: Color

    var body: some View {
        HStack(spacing: SeeyaSpacing.sm) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(SeeyaTypography.bodyMedium)
                    .foregroundStyle(Color.seeyaTextPrimary)

                Text(subtitle)
                    .font(SeeyaTypography.caption)
                    .foregroundStyle(Color.seeyaTextSecondary)
            }

            Spacer()

            Toggle("", isOn: $isOn)
                .labelsHidden()
                .tint(accentColor)
        }
        .padding(.horizontal, SeeyaSpacing.md)
        .padding(.vertical, SeeyaSpacing.sm)
    }
}

// MARK: - Settings Picker Row

private struct SettingsPickerRow<T: Hashable>: View {
    let title: String
    let subtitle: String
    @Binding var selection: T
    let options: [T]
    let displayName: (T) -> String

    var body: some View {
        HStack(spacing: SeeyaSpacing.sm) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(SeeyaTypography.bodyMedium)
                    .foregroundStyle(Color.seeyaTextPrimary)

                Text(subtitle)
                    .font(SeeyaTypography.caption)
                    .foregroundStyle(Color.seeyaTextSecondary)
            }

            Spacer()

            Menu {
                ForEach(options, id: \.self) { option in
                    Button {
                        selection = option
                    } label: {
                        HStack {
                            Text(displayName(option))
                            if option == selection {
                                Image(systemName: "checkmark")
                            }
                        }
                    }
                }
            } label: {
                HStack(spacing: SeeyaSpacing.xxs) {
                    Text(displayName(selection))
                        .font(SeeyaTypography.bodyMedium)
                        .foregroundStyle(Color.seeyaTextPrimary)

                    Image(systemName: "chevron.down")
                        .font(.system(size: SeeyaIconSize.small))
                        .foregroundStyle(Color.seeyaTextSecondary)
                }
                .padding(.horizontal, SeeyaSpacing.sm)
                .padding(.vertical, SeeyaSpacing.xs)
                .background(Color.seeyaSurface)
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }
        }
        .padding(.horizontal, SeeyaSpacing.md)
        .padding(.vertical, SeeyaSpacing.sm)
    }
}

// MARK: - Settings Button Row

private struct SettingsButtonRow: View {
    let title: String
    let icon: String
    var isLoading: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: SeeyaSpacing.sm) {
                if isLoading {
                    ProgressView()
                        .scaleEffect(0.8)
                        .frame(width: 24)
                } else {
                    Image(systemName: icon)
                        .font(.system(size: SeeyaIconSize.medium))
                        .foregroundStyle(Color.seeyaTextSecondary)
                        .frame(width: 24)
                }

                Text(title)
                    .font(SeeyaTypography.bodyMedium)
                    .foregroundStyle(Color.seeyaTextPrimary)

                Spacer()
            }
            .padding(.horizontal, SeeyaSpacing.md)
            .padding(.vertical, SeeyaSpacing.sm)
            .background(Color.seeyaSurface)
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
        .buttonStyle(.plain)
        .disabled(isLoading)
        .padding(.horizontal, SeeyaSpacing.md)
    }
}

#Preview {
    SettingsView(authViewModel: AuthViewModel())
}
