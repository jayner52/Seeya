import SwiftUI

struct PhotosFormFields: View {
    @Binding var details: [String: Any]

    @State private var albumName = ""
    @State private var photoCount = ""
    @State private var coverPhotoUrl = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Album Name
            FormField(label: "Album Name", placeholder: "e.g., Paris Day 1", text: $albumName)

            // Photo Count
            FormField(label: "Number of Photos", placeholder: "e.g., 42", text: $photoCount)
                .keyboardType(.numberPad)

            // Cover Photo URL (optional, for external links)
            FormField(label: "Cover Photo URL (Optional)", placeholder: "https://...", text: $coverPhotoUrl)
                .keyboardType(.URL)
                .textInputAutocapitalization(.never)
        }
        .onChange(of: albumName) { updateDetails() }
        .onChange(of: photoCount) { updateDetails() }
        .onChange(of: coverPhotoUrl) { updateDetails() }
        .onAppear { loadDetails() }
    }

    private func updateDetails() {
        var dict: [String: Any] = [:]
        if !albumName.isEmpty { dict["albumName"] = albumName }
        if let count = Int(photoCount) { dict["photoCount"] = count }
        if !coverPhotoUrl.isEmpty { dict["coverPhotoUrl"] = coverPhotoUrl }
        details = dict
    }

    private func loadDetails() {
        albumName = details["albumName"] as? String ?? ""
        if let count = details["photoCount"] as? Int {
            photoCount = String(count)
        }
        coverPhotoUrl = details["coverPhotoUrl"] as? String ?? ""
    }
}

#Preview {
    ScrollView {
        PhotosFormFields(details: .constant([:]))
            .padding()
    }
}
