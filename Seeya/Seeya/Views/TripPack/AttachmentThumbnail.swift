import SwiftUI

/// Model for pending attachments that haven't been uploaded yet
struct PendingAttachment: Identifiable {
    let id = UUID()
    let data: Data
    let fileName: String
    let fileType: String
    var isUploading: Bool = false
    var uploadedURL: String?
    var uploadProgress: Double = 0
    var error: String?
}

/// Thumbnail view for displaying attachment previews
struct AttachmentThumbnail: View {
    let attachment: PendingAttachment
    let onRemove: () -> Void
    let onTap: (() -> Void)?

    init(
        attachment: PendingAttachment,
        onRemove: @escaping () -> Void,
        onTap: (() -> Void)? = nil
    ) {
        self.attachment = attachment
        self.onRemove = onRemove
        self.onTap = onTap
    }

    var body: some View {
        ZStack(alignment: .topTrailing) {
            Button {
                onTap?()
            } label: {
                contentView
            }
            .buttonStyle(.plain)
            .disabled(onTap == nil)

            // Remove button
            if !attachment.isUploading {
                Button {
                    onRemove()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 20))
                        .symbolRenderingMode(.palette)
                        .foregroundStyle(.white, Color.black.opacity(0.6))
                }
                .offset(x: 6, y: -6)
            }
        }
    }

    @ViewBuilder
    private var contentView: some View {
        if attachment.isUploading {
            uploadingView
        } else if let error = attachment.error {
            errorView(error)
        } else if isImage {
            imagePreview
        } else {
            documentPreview
        }
    }

    // MARK: - Image Preview

    private var imagePreview: some View {
        Group {
            if let uiImage = UIImage(data: attachment.data) {
                Image(uiImage: uiImage)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: 80, height: 80)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            } else {
                placeholderView
            }
        }
    }

    // MARK: - Document Preview

    private var documentPreview: some View {
        VStack(spacing: 4) {
            Image(systemName: documentIcon)
                .font(.system(size: 28))
                .foregroundStyle(documentColor)

            Text(fileExtension.uppercased())
                .font(.caption2)
                .fontWeight(.medium)
                .foregroundStyle(.secondary)
        }
        .frame(width: 80, height: 80)
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    // MARK: - Uploading View

    private var uploadingView: some View {
        VStack(spacing: 8) {
            ProgressView()
                .scaleEffect(0.8)

            Text("Uploading...")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(width: 80, height: 80)
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    // MARK: - Error View

    private func errorView(_ error: String) -> some View {
        VStack(spacing: 4) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.title2)
                .foregroundStyle(.orange)

            Text("Failed")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(width: 80, height: 80)
        .background(Color.orange.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    // MARK: - Placeholder View

    private var placeholderView: some View {
        VStack {
            Image(systemName: "doc")
                .font(.title2)
                .foregroundStyle(.secondary)
        }
        .frame(width: 80, height: 80)
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    // MARK: - Helpers

    private var isImage: Bool {
        attachment.fileType.hasPrefix("image/")
    }

    private var fileExtension: String {
        let components = attachment.fileName.split(separator: ".")
        return components.last.map(String.init) ?? "file"
    }

    private var documentIcon: String {
        switch fileExtension.lowercased() {
        case "pdf":
            return "doc.text.fill"
        case "doc", "docx":
            return "doc.richtext.fill"
        case "xls", "xlsx":
            return "tablecells.fill"
        case "txt":
            return "doc.plaintext.fill"
        default:
            return "doc.fill"
        }
    }

    private var documentColor: Color {
        switch fileExtension.lowercased() {
        case "pdf":
            return .red
        case "doc", "docx":
            return .blue
        case "xls", "xlsx":
            return .green
        default:
            return .secondary
        }
    }
}

/// Grid view for displaying multiple attachment thumbnails
struct AttachmentThumbnailGrid: View {
    @Binding var attachments: [PendingAttachment]
    let onAdd: () -> Void
    let onTap: ((PendingAttachment) -> Void)?

    init(
        attachments: Binding<[PendingAttachment]>,
        onAdd: @escaping () -> Void,
        onTap: ((PendingAttachment) -> Void)? = nil
    ) {
        self._attachments = attachments
        self.onAdd = onAdd
        self.onTap = onTap
    }

    private let columns = [
        GridItem(.adaptive(minimum: 80, maximum: 100), spacing: 12)
    ]

    var body: some View {
        LazyVGrid(columns: columns, spacing: 12) {
            ForEach(attachments) { attachment in
                AttachmentThumbnail(
                    attachment: attachment,
                    onRemove: {
                        removeAttachment(attachment)
                    },
                    onTap: onTap != nil ? { onTap?(attachment) } : nil
                )
            }

            // Add button
            addButton
        }
    }

    private var addButton: some View {
        Button(action: onAdd) {
            VStack(spacing: 4) {
                Image(systemName: "plus")
                    .font(.title2)
                    .foregroundStyle(Color.seeyaPurple)

                Text("Add")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            .frame(width: 80, height: 80)
            .background(Color(.systemGray6))
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .strokeBorder(
                        style: StrokeStyle(lineWidth: 1, dash: [4, 2])
                    )
                    .foregroundStyle(Color(.systemGray4))
            )
        }
        .buttonStyle(.plain)
    }

    private func removeAttachment(_ attachment: PendingAttachment) {
        attachments.removeAll { $0.id == attachment.id }
    }
}

/// Row view for displaying an attachment in a list
struct AttachmentRow: View {
    let attachment: TripBitAttachment
    let onTap: () -> Void
    let onDelete: (() -> Void)?

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                // Icon
                iconView
                    .frame(width: 40, height: 40)
                    .background(iconBackgroundColor.opacity(0.15))
                    .clipShape(RoundedRectangle(cornerRadius: 8))

                // File info
                VStack(alignment: .leading, spacing: 2) {
                    Text(attachment.fileName ?? "Attachment")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .lineLimit(1)

                    Text(fileTypeLabel)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                // Actions
                if let onDelete = onDelete {
                    Button(role: .destructive) {
                        onDelete()
                    } label: {
                        Image(systemName: "trash")
                            .font(.body)
                            .foregroundStyle(.red)
                    }
                    .buttonStyle(.plain)
                } else {
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
            }
            .padding()
            .background(Color.seeyaCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var iconView: some View {
        Image(systemName: iconName)
            .font(.title3)
            .foregroundStyle(iconBackgroundColor)
    }

    private var iconName: String {
        guard let fileType = attachment.fileType?.lowercased() else {
            return "doc"
        }

        if fileType.contains("image") || fileType.contains("jpg") || fileType.contains("png") || fileType.contains("jpeg") {
            return "photo.fill"
        } else if fileType.contains("pdf") {
            return "doc.text.fill"
        }
        return "doc.fill"
    }

    private var iconBackgroundColor: Color {
        guard let fileType = attachment.fileType?.lowercased() else {
            return .secondary
        }

        if fileType.contains("image") || fileType.contains("jpg") || fileType.contains("png") {
            return .indigo
        } else if fileType.contains("pdf") {
            return .red
        }
        return .secondary
    }

    private var fileTypeLabel: String {
        guard let fileType = attachment.fileType?.lowercased() else {
            return "Document"
        }

        if fileType.contains("image") || fileType.contains("jpg") || fileType.contains("png") {
            return "Image"
        } else if fileType.contains("pdf") {
            return "PDF Document"
        }
        return "Document"
    }
}

// MARK: - Full Screen Attachment Viewer

struct AttachmentViewer: View {
    let attachment: TripBitAttachment
    @Environment(\.dismiss) private var dismiss
    @State private var imageData: Data?
    @State private var isLoading = true
    @State private var error: String?

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView("Loading...")
                } else if let error = error {
                    VStack(spacing: 16) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.largeTitle)
                            .foregroundStyle(.orange)
                        Text(error)
                            .foregroundStyle(.secondary)
                    }
                } else if let data = imageData, let uiImage = UIImage(data: data) {
                    Image(uiImage: uiImage)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                } else {
                    // Show PDF or document placeholder
                    VStack(spacing: 16) {
                        Image(systemName: "doc.text.fill")
                            .font(.system(size: 60))
                            .foregroundStyle(Color.seeyaPurple)

                        Text(attachment.fileName ?? "Document")
                            .font(.headline)

                        Link("Open in Browser", destination: URL(string: attachment.fileUrl)!)
                            .buttonStyle(SeeyaSecondaryButtonStyle())
                    }
                }
            }
            .navigationTitle(attachment.fileName ?? "Attachment")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
        .task {
            await loadAttachment()
        }
    }

    private func loadAttachment() async {
        guard let url = URL(string: attachment.fileUrl) else {
            error = "Invalid URL"
            isLoading = false
            return
        }

        // Check if it's an image type
        let isImage = attachment.fileType?.lowercased().contains("image") == true

        if isImage {
            do {
                let (data, _) = try await URLSession.shared.data(from: url)
                imageData = data
            } catch {
                self.error = "Failed to load image"
            }
        }

        isLoading = false
    }
}

#Preview {
    VStack(spacing: 20) {
        // Pending attachment thumbnails
        HStack(spacing: 12) {
            AttachmentThumbnail(
                attachment: PendingAttachment(
                    data: Data(),
                    fileName: "test.pdf",
                    fileType: "application/pdf"
                ),
                onRemove: {}
            )

            AttachmentThumbnail(
                attachment: PendingAttachment(
                    data: Data(),
                    fileName: "photo.jpg",
                    fileType: "image/jpeg",
                    isUploading: true
                ),
                onRemove: {}
            )
        }

        // Attachment row
        AttachmentRow(
            attachment: TripBitAttachment(
                id: UUID(),
                tripBitId: UUID(),
                fileUrl: "https://example.com/file.pdf",
                fileName: "booking_confirmation.pdf",
                fileType: "application/pdf",
                createdAt: Date()
            ),
            onTap: {},
            onDelete: {}
        )
    }
    .padding()
    .background(Color.seeyaBackground)
}
