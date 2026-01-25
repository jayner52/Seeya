import SwiftUI
import PhotosUI
import UniformTypeIdentifiers

/// A reusable drop zone component for uploading documents and images
struct DocumentDropZone: View {
    let label: String
    let subtitle: String?
    let icon: String
    let isProcessing: Bool
    let showPreview: Bool
    let previewData: Data?
    let previewFileName: String?
    let onFileSelected: (Data, String, String) -> Void
    let onRemove: (() -> Void)?

    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var showDocumentPicker = false
    @State private var showActionSheet = false
    @State private var isTargeted = false

    init(
        label: String,
        subtitle: String? = nil,
        icon: String = "arrow.up.doc",
        isProcessing: Bool = false,
        showPreview: Bool = false,
        previewData: Data? = nil,
        previewFileName: String? = nil,
        onFileSelected: @escaping (Data, String, String) -> Void,
        onRemove: (() -> Void)? = nil
    ) {
        self.label = label
        self.subtitle = subtitle
        self.icon = icon
        self.isProcessing = isProcessing
        self.showPreview = showPreview
        self.previewData = previewData
        self.previewFileName = previewFileName
        self.onFileSelected = onFileSelected
        self.onRemove = onRemove
    }

    var body: some View {
        Group {
            if showPreview, let data = previewData {
                previewView(data: data)
            } else {
                uploadView
            }
        }
    }

    // MARK: - Upload View

    private var uploadView: some View {
        Button {
            showActionSheet = true
        } label: {
            VStack(spacing: 12) {
                if isProcessing {
                    ProgressView()
                        .scaleEffect(1.2)
                        .frame(height: 40)
                } else {
                    Image(systemName: icon)
                        .font(.system(size: 32))
                        .foregroundStyle(Color.seeyaPurple.opacity(0.8))
                }

                VStack(spacing: 4) {
                    Text(isProcessing ? "Processing..." : label)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(.primary)

                    if let subtitle = subtitle, !isProcessing {
                        Text(subtitle)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }
                }
            }
            .frame(maxWidth: .infinity)
            .frame(minHeight: 120)
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(isTargeted ? Color.seeyaPurple.opacity(0.1) : Color(.systemGray6))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .strokeBorder(
                        style: StrokeStyle(lineWidth: 2, dash: [8, 4])
                    )
                    .foregroundStyle(isTargeted ? Color.seeyaPurple : Color(.systemGray4))
            )
        }
        .buttonStyle(.plain)
        .disabled(isProcessing)
        .confirmationDialog("Choose Source", isPresented: $showActionSheet, titleVisibility: .visible) {
            Button("Photo Library") {
                // Use the PhotosPicker programmatically isn't directly supported
                // We'll use an overlay approach instead
            }
            Button("Take Photo") {
                // Camera functionality would need UIImagePickerController
            }
            Button("Choose File") {
                showDocumentPicker = true
            }
            Button("Cancel", role: .cancel) {}
        }
        .overlay {
            // PhotosPicker overlay for library selection
            PhotosPicker(
                selection: $selectedPhotoItem,
                matching: .images
            ) {
                Color.clear
            }
            .opacity(0.01)
            .allowsHitTesting(false)
        }
        .onChange(of: selectedPhotoItem) {
            loadPhoto()
        }
        .sheet(isPresented: $showDocumentPicker) {
            DocumentPicker(onDocumentPicked: handleDocument)
        }
        // Note: Full drag & drop requires more complex implementation for iOS
    }

    // MARK: - Preview View

    private func previewView(data: Data) -> some View {
        VStack(spacing: 8) {
            ZStack(alignment: .topTrailing) {
                // Preview content
                if let uiImage = UIImage(data: data) {
                    Image(uiImage: uiImage)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(maxHeight: 150)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                } else {
                    // PDF or other document
                    VStack(spacing: 8) {
                        Image(systemName: "doc.text.fill")
                            .font(.system(size: 40))
                            .foregroundStyle(Color.seeyaPurple)

                        if let fileName = previewFileName {
                            Text(fileName)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 100)
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }

                // Remove button
                if let onRemove = onRemove {
                    Button {
                        onRemove()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title2)
                            .symbolRenderingMode(.palette)
                            .foregroundStyle(.white, Color.black.opacity(0.6))
                    }
                    .padding(4)
                }
            }

            if isProcessing {
                HStack(spacing: 8) {
                    ProgressView()
                        .scaleEffect(0.8)
                    Text("Analyzing with AI...")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Helpers

    private func loadPhoto() {
        guard let item = selectedPhotoItem else { return }

        Task {
            if let data = try? await item.loadTransferable(type: Data.self) {
                let fileName = "photo_\(Int(Date().timeIntervalSince1970)).jpg"
                let contentType = "image/jpeg"
                await MainActor.run {
                    onFileSelected(data, fileName, contentType)
                }
            }
            selectedPhotoItem = nil
        }
    }

    private func handleDocument(url: URL) {
        do {
            let data = try Data(contentsOf: url)
            let fileName = url.lastPathComponent
            let contentType = url.mimeType
            onFileSelected(data, fileName, contentType)
        } catch {
            print("Error loading document: \(error)")
        }
    }
}

// MARK: - Document Picker

struct DocumentPicker: UIViewControllerRepresentable {
    let onDocumentPicked: (URL) -> Void

    func makeUIViewController(context: Context) -> UIDocumentPickerViewController {
        // Use .item to allow ANY file type to be selected
        let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.item], asCopy: true)
        picker.delegate = context.coordinator
        picker.allowsMultipleSelection = false
        return picker
    }

    func updateUIViewController(_ uiViewController: UIDocumentPickerViewController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(onDocumentPicked: onDocumentPicked)
    }

    class Coordinator: NSObject, UIDocumentPickerDelegate {
        let onDocumentPicked: (URL) -> Void

        init(onDocumentPicked: @escaping (URL) -> Void) {
            self.onDocumentPicked = onDocumentPicked
        }

        func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
            guard let url = urls.first else { return }
            onDocumentPicked(url)
        }
    }
}

// MARK: - URL Extension for MIME Type

extension URL {
    var mimeType: String {
        let pathExtension = self.pathExtension.lowercased()
        switch pathExtension {
        case "jpg", "jpeg":
            return "image/jpeg"
        case "png":
            return "image/png"
        case "heic":
            return "image/heic"
        case "gif":
            return "image/gif"
        case "pdf":
            return "application/pdf"
        case "doc":
            return "application/msword"
        case "docx":
            return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        default:
            return "application/octet-stream"
        }
    }
}

// MARK: - Simple Drop Zone (for attachments section)

struct SimpleDocumentDropZone: View {
    let label: String
    let onFileSelected: (Data, String, String) -> Void

    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var showDocumentPicker = false

    var body: some View {
        Menu {
            Button {
                // PhotosPicker will handle this
            } label: {
                Label("Photo Library", systemImage: "photo.on.rectangle")
            }

            Button {
                showDocumentPicker = true
            } label: {
                Label("Choose File", systemImage: "doc")
            }
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "plus.circle.fill")
                    .font(.title3)
                    .foregroundStyle(Color.seeyaPurple)

                Text(label)
                    .font(.subheadline)
                    .foregroundStyle(.primary)

                Spacer()
            }
            .padding()
            .background(Color(.systemGray6))
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
        .buttonStyle(.plain)
        .overlay {
            PhotosPicker(
                selection: $selectedPhotoItem,
                matching: .images
            ) {
                Color.clear
            }
            .opacity(0.01)
        }
        .onChange(of: selectedPhotoItem) {
            loadPhoto()
        }
        .sheet(isPresented: $showDocumentPicker) {
            DocumentPicker { url in
                handleDocument(url: url)
            }
        }
    }

    private func loadPhoto() {
        guard let item = selectedPhotoItem else { return }

        Task {
            if let data = try? await item.loadTransferable(type: Data.self) {
                let fileName = "photo_\(Int(Date().timeIntervalSince1970)).jpg"
                let contentType = "image/jpeg"
                await MainActor.run {
                    onFileSelected(data, fileName, contentType)
                }
            }
            selectedPhotoItem = nil
        }
    }

    private func handleDocument(url: URL) {
        do {
            let data = try Data(contentsOf: url)
            let fileName = url.lastPathComponent
            let contentType = url.mimeType
            onFileSelected(data, fileName, contentType)
        } catch {
            print("Error loading document: \(error)")
        }
    }
}

#Preview {
    VStack(spacing: 20) {
        DocumentDropZone(
            label: "Upload a booking confirmation",
            subtitle: "Image or PDF - AI will extract details",
            onFileSelected: { _, _, _ in }
        )

        DocumentDropZone(
            label: "Processing...",
            isProcessing: true,
            onFileSelected: { _, _, _ in }
        )

        SimpleDocumentDropZone(
            label: "Add attachment"
        ) { _, _, _ in }
    }
    .padding()
    .background(Color.seeyaBackground)
}
