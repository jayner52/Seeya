import SwiftUI
import PhotosUI

struct EditProfileView: View {
    @Bindable var viewModel: ProfileViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var fullName: String = ""
    @State private var username: String = ""
    @State private var bio: String = ""
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var avatarImage: Image?
    @State private var avatarData: Data?
    @State private var isSaving = false
    @State private var showingError = false
    @State private var errorMessage = ""

    var body: some View {
        NavigationStack {
            Form {
                // Avatar Section
                Section {
                    HStack {
                        Spacer()

                        PhotosPicker(selection: $selectedPhoto, matching: .images) {
                            ZStack(alignment: .bottomTrailing) {
                                if let avatarImage {
                                    avatarImage
                                        .resizable()
                                        .aspectRatio(contentMode: .fill)
                                        .frame(width: 100, height: 100)
                                        .clipShape(Circle())
                                } else {
                                    AvatarView(
                                        name: fullName.isEmpty ? "User" : fullName,
                                        avatarUrl: viewModel.profile?.avatarUrl,
                                        size: 100
                                    )
                                }

                                Image(systemName: "camera.circle.fill")
                                    .font(.title)
                                    .foregroundStyle(.white, Color.seeyaPurple)
                            }
                        }
                        .onChange(of: selectedPhoto) { _, newValue in
                            Task {
                                if let data = try? await newValue?.loadTransferable(type: Data.self) {
                                    avatarData = data
                                    if let uiImage = UIImage(data: data) {
                                        avatarImage = Image(uiImage: uiImage)
                                    }
                                }
                            }
                        }

                        Spacer()
                    }
                    .listRowBackground(Color.clear)
                }

                // Profile Info
                Section("Profile Information") {
                    TextField("Full Name", text: $fullName)
                        .textContentType(.name)

                    HStack {
                        Text("@")
                            .foregroundStyle(.secondary)
                        TextField("username", text: $username)
                            .textContentType(.username)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                    }
                }

                // Bio
                Section("Bio") {
                    TextField("Tell us about yourself...", text: $bio, axis: .vertical)
                        .lineLimit(3...6)
                }
            }
            .navigationTitle("Edit Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .disabled(isSaving)
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        saveProfile()
                    }
                    .fontWeight(.semibold)
                    .disabled(isSaving || fullName.isEmpty)
                }
            }
            .onAppear {
                loadProfileData()
            }
            .alert("Error", isPresented: $showingError) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(errorMessage)
            }
            .overlay {
                if isSaving {
                    Color.black.opacity(0.3)
                        .ignoresSafeArea()
                        .overlay {
                            ProgressView("Saving...")
                                .padding()
                                .background(.regularMaterial)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                }
            }
        }
    }

    private func loadProfileData() {
        if let profile = viewModel.profile {
            fullName = profile.fullName
            username = profile.username ?? ""
            bio = profile.bio ?? ""
        }
    }

    private func saveProfile() {
        isSaving = true

        Task {
            // Upload avatar if changed
            if let avatarData {
                let result = await viewModel.uploadAvatar(imageData: avatarData)
                if result == nil && viewModel.errorMessage != nil {
                    errorMessage = viewModel.errorMessage!
                    showingError = true
                    isSaving = false
                    return
                }
            }

            // Update profile info
            let success = await viewModel.updateProfile(
                fullName: fullName,
                username: username.isEmpty ? nil : username,
                bio: bio.isEmpty ? nil : bio
            )

            isSaving = false

            if success {
                dismiss()
            } else if let error = viewModel.errorMessage {
                errorMessage = error
                showingError = true
            }
        }
    }
}

#Preview {
    EditProfileView(viewModel: ProfileViewModel())
}
