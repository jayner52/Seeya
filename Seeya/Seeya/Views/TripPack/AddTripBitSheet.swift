import SwiftUI
import PhotosUI
import PDFKit

struct AddTripBitSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var viewModel: TripPackViewModel
    let trip: Trip

    // AI Upload State
    @State private var aiUploadedData: Data?
    @State private var aiUploadedFileName: String?
    @State private var aiUploadedFileType: String?
    @State private var isProcessingAI = false
    @State private var aiConfidence: Double?
    @State private var aiError: String?

    // Form Fields (can be AI-filled or manual)
    @State private var selectedCategory: TripBitCategory?
    @State private var title = ""
    @State private var startDate: Date?
    @State private var endDate: Date?
    @State private var selectedTravelerIds: Set<UUID> = []
    @State private var appliesToAll = true
    @State private var attachments: [PendingAttachment] = []
    @State private var notes = ""
    @State private var link = ""
    @State private var status: TripBitStatus = .confirmed
    @State private var details: [String: Any] = [:]

    // UI State
    @State private var showAttachmentPicker = false
    @State private var isSaving = false
    @State private var highlightedFields: Set<String> = []
    @State private var showTravelerSelection = false

    // PhotosPicker state for attachments
    @State private var selectedPhotoItem: PhotosPickerItem?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // AI Quick Add Section
                    aiQuickAddSection

                    // Divider
                    orDivider

                    // Category Selection
                    categorySection

                    // Link Field
                    linkSection

                    // Title Field (Required)
                    titleSection

                    // Status
                    statusSection

                    // Dates
                    datesSection

                    // Travelers
                    travelersSection

                    // Attachments
                    attachmentsSection

                    // Notes
                    notesSection

                    // Category-specific details
                    if selectedCategory != nil {
                        categoryDetailsSection
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical)
            }
            .background(Color.seeyaBackground)
            .navigationTitle("Add Tripbit")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.body)
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button("Add Tripbit") {
                        saveTripBit()
                    }
                    .fontWeight(.semibold)
                    .disabled(!canSave || isSaving)
                }
            }
        }
    }

    // MARK: - Validation

    private var canSave: Bool {
        selectedCategory != nil && !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    // MARK: - AI Quick Add Section

    private var aiQuickAddSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 6) {
                Image(systemName: "sparkles")
                    .foregroundStyle(Color.seeyaPurple)
                Text("Quick Add with AI")
                    .font(.subheadline)
                    .fontWeight(.semibold)
            }

            DocumentDropZone(
                label: "Upload a booking confirmation",
                subtitle: "Image or PDF - AI will extract details",
                icon: "arrow.up.doc",
                isProcessing: isProcessingAI,
                showPreview: aiUploadedData != nil,
                previewData: aiUploadedData,
                previewFileName: aiUploadedFileName,
                onFileSelected: { data, fileName, fileType in
                    handleAIUpload(data: data, fileName: fileName, fileType: fileType)
                },
                onRemove: {
                    clearAIUpload()
                }
            )

            // Confidence indicator
            if let confidence = aiConfidence {
                confidenceIndicator(confidence)
            }

            // Error message
            if let error = aiError {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.red.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }
        }
    }

    private func confidenceIndicator(_ confidence: Double) -> some View {
        HStack(spacing: 8) {
            Image(systemName: confidence >= 0.8 ? "checkmark.circle.fill" :
                    confidence >= 0.5 ? "exclamationmark.circle.fill" : "questionmark.circle.fill")
                .foregroundStyle(confidence >= 0.8 ? .green : confidence >= 0.5 ? .orange : .red)

            Text(confidence >= 0.8 ? "High confidence - review below" :
                    confidence >= 0.5 ? "Medium confidence - please verify" : "Low confidence - check all fields")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background((confidence >= 0.8 ? Color.green : confidence >= 0.5 ? Color.orange : Color.red).opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    // MARK: - OR Divider

    private var orDivider: some View {
        HStack(spacing: 12) {
            Rectangle()
                .fill(Color(.systemGray4))
                .frame(height: 1)

            Text("OR FILL MANUALLY")
                .font(.caption)
                .fontWeight(.medium)
                .foregroundStyle(.secondary)

            Rectangle()
                .fill(Color(.systemGray4))
                .frame(height: 1)
        }
    }

    // MARK: - Category Section

    private var categorySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Category")
                .font(.subheadline)
                .fontWeight(.medium)

            // 4 columns grid for better fit on iPhone portrait
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 4), spacing: 8) {
                ForEach(TripBitCategory.allCases, id: \.self) { category in
                    CategoryGridTile(
                        category: category,
                        isSelected: selectedCategory == category,
                        isHighlighted: highlightedFields.contains("category")
                    ) {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            selectedCategory = category
                            highlightedFields.remove("category")
                        }
                    }
                }
            }
        }
        .modifier(HighlightModifier(isHighlighted: highlightedFields.contains("category")))
    }

    // MARK: - Link Section

    private var linkSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Link (optional)")
                .font(.subheadline)
                .fontWeight(.medium)

            HStack {
                Image(systemName: "link")
                    .foregroundStyle(.secondary)

                TextField("https://...", text: $link)
                    .textContentType(.URL)
                    .autocapitalization(.none)
                    .keyboardType(.URL)

                if !link.isEmpty {
                    Button {
                        detectCategoryFromLink()
                    } label: {
                        Image(systemName: "sparkles")
                            .foregroundStyle(Color.seeyaPurple)
                    }
                }
            }
            .padding(12)
            .background(Color(.systemGray6))
            .clipShape(RoundedRectangle(cornerRadius: 10))

            Text("Paste a link and we'll auto-detect the category")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    // MARK: - Title Section

    private var titleSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Title")
                    .font(.subheadline)
                    .fontWeight(.medium)
                Text("*")
                    .foregroundStyle(.red)
            }

            TextField("Enter a title", text: $title)
                .padding(12)
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 10))
        }
        .modifier(HighlightModifier(isHighlighted: highlightedFields.contains("title")))
    }

    // MARK: - Status Section

    private var statusSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Status")
                .font(.subheadline)
                .fontWeight(.medium)

            Picker("Status", selection: $status) {
                ForEach(TripBitStatus.allCases, id: \.self) { s in
                    Text(s.displayName).tag(s)
                }
            }
            .pickerStyle(.segmented)
        }
    }

    // MARK: - Dates Section

    private var datesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 6) {
                Image(systemName: "calendar")
                    .foregroundStyle(.secondary)
                Text("Dates (optional)")
                    .font(.subheadline)
                    .fontWeight(.medium)
            }

            VStack(spacing: 12) {
                // Start date
                HStack {
                    Text("Start")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Spacer()
                    DatePicker(
                        "",
                        selection: Binding(
                            get: { startDate ?? Date() },
                            set: { startDate = $0 }
                        ),
                        displayedComponents: [.date, .hourAndMinute]
                    )
                    .labelsHidden()
                    .datePickerStyle(.compact)
                }
                .padding(12)
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .modifier(HighlightModifier(isHighlighted: highlightedFields.contains("startDate")))

                // End date
                HStack {
                    Text("End")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Spacer()
                    DatePicker(
                        "",
                        selection: Binding(
                            get: { endDate ?? (startDate ?? Date()) },
                            set: { endDate = $0 }
                        ),
                        in: (startDate ?? Date())...,
                        displayedComponents: [.date, .hourAndMinute]
                    )
                    .labelsHidden()
                    .datePickerStyle(.compact)
                }
                .padding(12)
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .modifier(HighlightModifier(isHighlighted: highlightedFields.contains("endDate")))
            }
        }
    }

    // MARK: - Travelers Section

    private var travelersSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 6) {
                Image(systemName: "person.2")
                    .foregroundStyle(.secondary)
                Text("Who's involved? (optional)")
                    .font(.subheadline)
                    .fontWeight(.medium)
            }

            // Traveler chips
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    // Everyone chip
                    TravelerChip(
                        name: "Everyone",
                        isSelected: appliesToAll,
                        onTap: {
                            appliesToAll = true
                            selectedTravelerIds.removeAll()
                        }
                    )

                    // Trip owner
                    if let owner = trip.owner {
                        TravelerChip(
                            name: owner.fullName.components(separatedBy: " ").first ?? owner.fullName,
                            isSelected: !appliesToAll && selectedTravelerIds.contains(owner.id),
                            onTap: {
                                appliesToAll = false
                                toggleTraveler(owner.id)
                            }
                        )
                    }

                    // Confirmed participants
                    ForEach(trip.confirmedParticipants) { participant in
                        if let user = participant.user {
                            TravelerChip(
                                name: user.fullName.components(separatedBy: " ").first ?? user.fullName,
                                isSelected: !appliesToAll && selectedTravelerIds.contains(user.id),
                                onTap: {
                                    appliesToAll = false
                                    toggleTraveler(user.id)
                                }
                            )
                        }
                    }
                }
            }
        }
    }

    private func toggleTraveler(_ id: UUID) {
        if selectedTravelerIds.contains(id) {
            selectedTravelerIds.remove(id)
            if selectedTravelerIds.isEmpty {
                appliesToAll = true
            }
        } else {
            selectedTravelerIds.insert(id)
        }
    }

    // MARK: - Attachments Section

    private var attachmentsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 6) {
                Image(systemName: "paperclip")
                    .foregroundStyle(.secondary)
                Text("Attachments (optional)")
                    .font(.subheadline)
                    .fontWeight(.medium)
            }

            if attachments.isEmpty {
                SimpleDocumentDropZone(
                    label: "Click to attach files (images, PDFs, docs)"
                ) { data, fileName, fileType in
                    addAttachment(data: data, fileName: fileName, fileType: fileType)
                }
            } else {
                // Show attachment thumbnails
                VStack(spacing: 12) {
                    AttachmentThumbnailGrid(
                        attachments: $attachments,
                        onAdd: { showAttachmentPicker = true }
                    )
                }
                .padding()
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
        .sheet(isPresented: $showAttachmentPicker) {
            AttachmentPickerSheet { data, fileName, fileType in
                addAttachment(data: data, fileName: fileName, fileType: fileType)
            }
        }
    }

    private func addAttachment(data: Data, fileName: String, fileType: String) {
        let attachment = PendingAttachment(
            data: data,
            fileName: fileName,
            fileType: fileType
        )
        attachments.append(attachment)
    }

    // MARK: - Notes Section

    private var notesSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Notes (optional)")
                .font(.subheadline)
                .fontWeight(.medium)

            TextField("Add any additional details...", text: $notes, axis: .vertical)
                .lineLimit(3...6)
                .padding(12)
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    // MARK: - Category Details Section

    private var categoryDetailsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("\(selectedCategory?.displayName ?? "") Details")
                .font(.subheadline)
                .fontWeight(.semibold)

            VStack(spacing: 12) {
                categoryFormFields
            }
            .padding()
            .background(Color(.systemGray6))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    @ViewBuilder
    private var categoryFormFields: some View {
        switch selectedCategory {
        case .flight:
            FlightFormFields(details: $details)
        case .stay:
            StayFormFields(details: $details)
        case .car:
            CarFormFields(details: $details)
        case .activity:
            ActivityFormFields(details: $details)
        case .transport:
            TransportFormFields(details: $details)
        case .money:
            MoneyFormFields(details: $details)
        case .reservation:
            ReservationFormFields(details: $details)
        case .document:
            DocumentFormFields(details: $details)
        case .photos:
            PhotosFormFields(details: $details)
        case .other:
            OtherFormFields(details: $details)
        case .none:
            EmptyView()
        }
    }

    // MARK: - Actions

    private func handleAIUpload(data: Data, fileName: String, fileType: String) {
        aiUploadedData = data
        aiUploadedFileName = fileName
        aiUploadedFileType = fileType
        aiError = nil

        // Add to attachments automatically
        let attachment = PendingAttachment(data: data, fileName: fileName, fileType: fileType)
        attachments.insert(attachment, at: 0)

        // Check file type for AI processing
        let isImage = fileType.lowercased().contains("image")
        let isPDF = fileType.lowercased().contains("pdf")

        if isImage {
            isProcessingAI = true

            Task {
                do {
                    let result = try await AIService.shared.parseBookingScreenshot(imageData: data)

                    await MainActor.run {
                        applyParsedResult(result)
                        isProcessingAI = false
                    }
                } catch {
                    await MainActor.run {
                        aiError = "Failed to extract details: \(error.localizedDescription)"
                        isProcessingAI = false
                    }
                }
            }
        } else if isPDF {
            // Extract text from PDF and process with AI
            isProcessingAI = true

            Task {
                do {
                    guard let pdfText = extractTextFromPDF(data: data), !pdfText.isEmpty else {
                        throw AIServiceError.parsingError
                    }

                    let result = try await AIService.shared.parseBookingText(pdfText)

                    await MainActor.run {
                        applyParsedResult(result)
                        isProcessingAI = false
                    }
                } catch {
                    await MainActor.run {
                        aiError = "Failed to extract details from PDF: \(error.localizedDescription)"
                        isProcessingAI = false
                    }
                }
            }
        } else {
            // For other documents, just attach without AI processing
            aiConfidence = nil
        }
    }

    private func extractTextFromPDF(data: Data) -> String? {
        guard let pdfDocument = PDFDocument(data: data) else { return nil }

        var fullText = ""
        for pageIndex in 0..<min(pdfDocument.pageCount, 5) { // Limit to first 5 pages
            if let page = pdfDocument.page(at: pageIndex),
               let pageText = page.string {
                fullText += pageText + "\n"
            }
        }

        return fullText.isEmpty ? nil : fullText
    }

    private func applyParsedResult(_ result: ParsedTripBit) {
        // Animate the form filling
        withAnimation(.easeInOut(duration: 0.3)) {
            highlightedFields.insert("category")
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            withAnimation {
                selectedCategory = result.category
            }
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
            withAnimation {
                highlightedFields.insert("title")
                title = result.title
            }
        }

        if let start = result.startDatetime {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                withAnimation {
                    highlightedFields.insert("startDate")
                    startDate = start
                }
            }
        }

        if let end = result.endDatetime {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
                withAnimation {
                    highlightedFields.insert("endDate")
                    endDate = end
                }
            }
        }

        // Set details
        details = result.details

        // Set confidence
        aiConfidence = result.confidence

        // Clear highlights after a delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            withAnimation {
                highlightedFields.removeAll()
            }
        }
    }

    private func clearAIUpload() {
        aiUploadedData = nil
        aiUploadedFileName = nil
        aiUploadedFileType = nil
        aiConfidence = nil
        aiError = nil

        // Remove the AI-uploaded attachment if it's the first one
        if !attachments.isEmpty {
            attachments.removeFirst()
        }
    }

    private func detectCategoryFromLink() {
        guard !link.isEmpty else { return }

        let urlString = link
        Task { @MainActor in
            let detected = await AIService.shared.detectCategoryFromLink(urlString)
            if let category = detected {
                withAnimation {
                    highlightedFields.insert("category")
                    selectedCategory = category
                }

                try? await Task.sleep(nanoseconds: 1_500_000_000)
                withAnimation {
                    highlightedFields.remove("category")
                }
            }
        }
    }

    private func saveTripBit() {
        guard let category = selectedCategory else { return }

        isSaving = true

        Task {
            // First create the trip bit
            let newTripBit = await viewModel.createTripBit(
                category: category,
                title: title.trimmingCharacters(in: .whitespacesAndNewlines),
                status: status,
                startDatetime: startDate,
                endDatetime: endDate,
                notes: notes.isEmpty ? nil : notes,
                details: details.isEmpty ? nil : details,
                travelerIds: appliesToAll ? nil : Array(selectedTravelerIds),
                appliesToAll: appliesToAll
            )

            // Upload attachments if any
            if let tripBit = newTripBit, !attachments.isEmpty {
                await uploadAttachments(for: tripBit)
            }

            await MainActor.run {
                isSaving = false
                dismiss()
            }
        }
    }

    private func uploadAttachments(for tripBit: TripBit) async {
        for attachment in attachments {
            do {
                let path = SupabaseService.shared.generateStoragePath(
                    tripId: trip.id,
                    fileName: attachment.fileName
                )

                let fileUrl = try await SupabaseService.shared.uploadFile(
                    data: attachment.data,
                    path: path,
                    contentType: attachment.fileType
                )

                let _ = await viewModel.addAttachment(
                    to: tripBit,
                    fileUrl: fileUrl,
                    fileName: attachment.fileName,
                    fileType: attachment.fileType
                )
            } catch {
                print("Failed to upload attachment: \(error)")
            }
        }
    }
}

// MARK: - Supporting Views

struct CategoryGridTile: View {
    let category: TripBitCategory
    let isSelected: Bool
    let isHighlighted: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 6) {
                Image(systemName: category.icon)
                    .font(.system(size: 20))
                    .foregroundStyle(isSelected ? .white : category.color)
                    .frame(width: 44, height: 44)
                    .background(isSelected ? category.color : category.color.opacity(0.15))
                    .clipShape(Circle())

                Text(shortName)
                    .font(.caption2)
                    .fontWeight(isSelected ? .semibold : .regular)
                    .foregroundStyle(isSelected ? category.color : .primary)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
            .background(isSelected ? category.color.opacity(0.1) : Color.clear)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(isHighlighted ? Color.seeyaPurple : (isSelected ? category.color : Color.clear), lineWidth: isHighlighted ? 2 : 1)
            )
        }
        .buttonStyle(.plain)
    }

    private var shortName: String {
        switch category {
        case .flight: return "Flight"
        case .stay: return "Stay"
        case .car: return "Car"
        case .activity: return "Activity"
        case .transport: return "Transit"
        case .money: return "Money"
        case .reservation: return "Reserv."
        case .document: return "Doc"
        case .photos: return "Photos"
        case .other: return "Other"
        }
    }
}

struct TravelerChip: View {
    let name: String
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 4) {
                Text(name)
                    .font(.subheadline)
                    .fontWeight(isSelected ? .medium : .regular)

                if isSelected {
                    Image(systemName: "checkmark")
                        .font(.caption)
                        .fontWeight(.semibold)
                }
            }
            .foregroundStyle(isSelected ? .white : .primary)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(isSelected ? Color.seeyaPurple : Color(.systemGray5))
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }
}

struct HighlightModifier: ViewModifier {
    let isHighlighted: Bool

    func body(content: Content) -> some View {
        content
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isHighlighted ? Color.seeyaPurple : Color.clear, lineWidth: 2)
                    .animation(.easeInOut(duration: 0.3), value: isHighlighted)
            )
    }
}

struct AttachmentPickerSheet: View {
    @Environment(\.dismiss) private var dismiss
    let onFileSelected: (Data, String, String) -> Void

    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var showDocumentPicker = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    PhotosPicker(selection: $selectedPhotoItem, matching: .images) {
                        Label("Choose Photo", systemImage: "photo.on.rectangle")
                    }

                    Button {
                        showDocumentPicker = true
                    } label: {
                        Label("Choose File", systemImage: "doc")
                    }
                }
            }
            .navigationTitle("Add Attachment")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
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
    }

    private func loadPhoto() {
        guard let item = selectedPhotoItem else { return }

        Task {
            if let data = try? await item.loadTransferable(type: Data.self) {
                let fileName = "photo_\(Int(Date().timeIntervalSince1970)).jpg"
                let contentType = "image/jpeg"
                await MainActor.run {
                    onFileSelected(data, fileName, contentType)
                    dismiss()
                }
            }
        }
    }

    private func handleDocument(url: URL) {
        do {
            let data = try Data(contentsOf: url)
            let fileName = url.lastPathComponent
            let contentType = url.mimeType
            onFileSelected(data, fileName, contentType)
            dismiss()
        } catch {
            print("Error loading document: \(error)")
        }
    }
}

#Preview {
    AddTripBitSheet(
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
