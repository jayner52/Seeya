import SwiftUI

struct PhotosFormFields: View {
    @Binding var details: [String: Any]

    @State private var albumTitle = ""
    @State private var albumLink = ""
    @State private var platform = ""

    private let platforms = ["Google Photos", "iCloud", "Dropbox", "OneDrive", "Other"]

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Album Title
            FormField(label: "Album Title", placeholder: "e.g., Paris Trip 2026", text: $albumTitle)

            // Album Link
            FormField(label: "Album Link", placeholder: "https://photos.google.com/...", text: $albumLink)
                .keyboardType(.URL)
                .textInputAutocapitalization(.never)

            // Platform picker
            VStack(alignment: .leading, spacing: 6) {
                Text("Platform")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Picker("Platform", selection: $platform) {
                    Text("Select...").tag("")
                    ForEach(platforms, id: \.self) { p in
                        Text(p).tag(p)
                    }
                }
                .pickerStyle(.menu)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(8)
                .background(Color(.systemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(Color(.systemGray4), lineWidth: 1)
                )
            }
        }
        .onChange(of: albumTitle) { updateDetails() }
        .onChange(of: albumLink) { updateDetails() }
        .onChange(of: platform) { updateDetails() }
        .onAppear { loadDetails() }
    }

    private func updateDetails() {
        var dict: [String: Any] = [:]
        if !albumTitle.isEmpty { dict["albumTitle"] = albumTitle }
        if !albumLink.isEmpty { dict["albumLink"] = albumLink }
        if !platform.isEmpty { dict["platform"] = platform }
        details = dict
    }

    private func loadDetails() {
        albumTitle = details["albumTitle"] as? String ?? details["albumName"] as? String ?? ""
        albumLink = details["albumLink"] as? String ?? details["coverPhotoUrl"] as? String ?? ""
        platform = details["platform"] as? String ?? ""
    }
}

#Preview {
    ScrollView {
        PhotosFormFields(details: .constant([:]))
            .padding()
    }
}
