import SwiftUI

struct TripDocumentsView: View {
    @Bindable var viewModel: TripPackViewModel
    let trip: Trip

    @State private var selectedCategory: TripBitCategory?
    @State private var selectedAttachment: TripBitAttachment?

    private var allAttachments: [(attachment: TripBitAttachment, tripBit: TripBit)] {
        var result: [(attachment: TripBitAttachment, tripBit: TripBit)] = []

        for tripBit in viewModel.tripBits {
            if let attachments = tripBit.attachments {
                for attachment in attachments {
                    result.append((attachment: attachment, tripBit: tripBit))
                }
            }
        }

        // Sort by created date, newest first
        return result.sorted(by: { ($0.attachment.createdAt ?? .distantPast) > ($1.attachment.createdAt ?? .distantPast) })
    }

    private var filteredAttachments: [(attachment: TripBitAttachment, tripBit: TripBit)] {
        guard let category = selectedCategory else {
            return allAttachments
        }
        return allAttachments.filter { $0.tripBit.category == category }
    }

    private var categoriesWithAttachments: [TripBitCategory] {
        let categories = Set(allAttachments.map { $0.tripBit.category })
        return TripBitCategory.allCases.filter { categories.contains($0) }
    }

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12)
    ]

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Category filter
                if !categoriesWithAttachments.isEmpty {
                    categoryFilter
                }

                // Documents grid
                if filteredAttachments.isEmpty {
                    emptyState
                } else {
                    documentsGrid
                }
            }
            .padding()
        }
        .background(Color.seeyaBackground)
        .navigationTitle("Documents")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $selectedAttachment) { attachment in
            AttachmentViewer(attachment: attachment)
        }
    }

    // MARK: - Category Filter

    private var categoryFilter: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                // All filter
                FilterChip(
                    title: "All",
                    icon: nil,
                    count: allAttachments.count,
                    isSelected: selectedCategory == nil
                ) {
                    selectedCategory = nil
                }

                // Category filters
                ForEach(categoriesWithAttachments, id: \.self) { category in
                    let count = allAttachments.filter { $0.tripBit.category == category }.count
                    FilterChip(
                        title: category.displayName,
                        icon: category.icon,
                        count: count,
                        isSelected: selectedCategory == category,
                        color: category.color
                    ) {
                        selectedCategory = category
                    }
                }
            }
        }
    }

    // MARK: - Documents Grid

    private var documentsGrid: some View {
        LazyVGrid(columns: columns, spacing: 12) {
            ForEach(filteredAttachments, id: \.attachment.id) { item in
                DocumentCard(
                    attachment: item.attachment,
                    tripBit: item.tripBit
                ) {
                    selectedAttachment = item.attachment
                }
            }
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "doc.text.magnifyingglass")
                .font(.system(size: 48))
                .foregroundStyle(Color.seeyaPurple.opacity(0.5))

            Text("No Documents")
                .font(.headline)

            Text(selectedCategory == nil
                 ? "Documents uploaded to your TripBits will appear here"
                 : "No documents found for this category")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 60)
    }
}

// MARK: - Filter Chip

private struct FilterChip: View {
    let title: String
    let icon: String?
    let count: Int
    let isSelected: Bool
    var color: Color = Color.seeyaPurple
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 6) {
                if let icon = icon {
                    Image(systemName: icon)
                        .font(.caption)
                }

                Text(title)
                    .font(.caption)
                    .fontWeight(isSelected ? .semibold : .regular)

                Text("\(count)")
                    .font(.caption2)
                    .fontWeight(.medium)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(isSelected ? Color.white.opacity(0.3) : Color(.systemGray5))
                    .clipShape(Capsule())
            }
            .foregroundStyle(isSelected ? .white : .primary)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(isSelected ? color : Color(.systemGray6))
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Document Card

private struct DocumentCard: View {
    let attachment: TripBitAttachment
    let tripBit: TripBit
    let onTap: () -> Void

    private var isImage: Bool {
        guard let fileType = attachment.fileType?.lowercased() else { return false }
        return fileType.contains("image") || fileType.contains("jpg") || fileType.contains("png") || fileType.contains("jpeg")
    }

    private var isPDF: Bool {
        guard let fileType = attachment.fileType?.lowercased() else { return false }
        return fileType.contains("pdf")
    }

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 0) {
                // Thumbnail area
                thumbnailView
                    .frame(height: 80)
                    .frame(maxWidth: .infinity)
                    .background(Color(.systemGray6))

                // Info area
                VStack(alignment: .leading, spacing: 4) {
                    Text(attachment.fileName ?? "Document")
                        .font(.caption)
                        .fontWeight(.medium)
                        .lineLimit(1)

                    HStack(spacing: 4) {
                        Image(systemName: tripBit.category.icon)
                            .font(.system(size: 10))
                            .foregroundStyle(tripBit.category.color)

                        Text(tripBit.title)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                }
                .padding(8)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.seeyaCardBackground)
            }
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .shadow(color: .black.opacity(0.05), radius: 3, y: 1)
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var thumbnailView: some View {
        if isImage {
            // For images, show async loaded thumbnail
            AsyncImage(url: URL(string: attachment.fileUrl)) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                case .failure:
                    placeholderIcon(systemName: "photo.fill", color: .indigo)
                case .empty:
                    ProgressView()
                @unknown default:
                    placeholderIcon(systemName: "photo.fill", color: .indigo)
                }
            }
        } else if isPDF {
            placeholderIcon(systemName: "doc.text.fill", color: .red)
        } else {
            placeholderIcon(systemName: "doc.fill", color: .secondary)
        }
    }

    private func placeholderIcon(systemName: String, color: Color) -> some View {
        VStack {
            Image(systemName: systemName)
                .font(.title)
                .foregroundStyle(color)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

#Preview {
    NavigationStack {
        TripDocumentsView(
            viewModel: TripPackViewModel(tripId: UUID()),
            trip: Trip(
                id: UUID(),
                userId: UUID(),
                name: "Test Trip",
                description: nil,
                startDate: Date(),
                endDate: Date(),
                isFlexible: false,
                visibility: .fullDetails,
                isPast: false,
                createdAt: Date(),
                updatedAt: Date(),
                locations: nil,
                participants: nil,
                owner: nil,
                recommendations: nil,
                tripTypes: nil
            )
        )
    }
}
