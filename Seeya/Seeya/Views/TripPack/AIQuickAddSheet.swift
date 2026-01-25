import SwiftUI
import PhotosUI
import PDFKit

struct AIQuickAddSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var viewModel: TripPackViewModel
    let trip: Trip

    @State private var selectedItem: PhotosPickerItem?
    @State private var selectedImageData: Data?
    @State private var selectedPDFData: Data?
    @State private var selectedFileName: String?
    @State private var pastedText = ""
    @State private var inputMode: AIInputMode = .upload
    @State private var showDocumentPicker = false

    @State private var isProcessing = false
    @State private var parsedResult: ParsedTripBit?
    @State private var errorMessage: String?

    // Editable parsed fields
    @State private var editedTitle = ""
    @State private var editedCategory: TripBitCategory = .other
    @State private var editedStartDate = Date()
    @State private var editedEndDate = Date()
    @State private var hasEndDate = false
    @State private var editedDetails: [String: Any] = [:]

    @State private var isSaving = false

    var body: some View {
        NavigationStack {
            Group {
                if parsedResult != nil {
                    reviewView
                } else {
                    inputView
                }
            }
            .navigationTitle("AI Quick Add")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                if parsedResult != nil {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Save") {
                            saveItem()
                        }
                        .fontWeight(.semibold)
                        .disabled(isSaving || editedTitle.isEmpty)
                    }
                }
            }
        }
    }

    // MARK: - Input View

    private var inputView: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Mode selector
                Picker("Input Mode", selection: $inputMode) {
                    ForEach(AIInputMode.allCases, id: \.self) { mode in
                        Text(mode.displayName).tag(mode)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)

                // Content based on mode
                if inputMode == .upload {
                    uploadInput
                } else {
                    textInput
                }

                // Process button
                if canProcess {
                    Button {
                        processInput()
                    } label: {
                        if isProcessing {
                            HStack(spacing: 8) {
                                ProgressView()
                                    .tint(.white)
                                Text("Analyzing...")
                            }
                        } else {
                            Label("Extract Information", systemImage: "sparkles")
                        }
                    }
                    .buttonStyle(SeeyaPrimaryButtonStyle(isEnabled: !isProcessing))
                    .disabled(isProcessing)
                    .padding(.horizontal)
                }

                // Error message
                if let error = errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color.red.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .padding(.horizontal)
                }

                Spacer()
            }
            .padding(.vertical)
        }
        .background(Color.seeyaBackground)
    }

    private var uploadInput: some View {
        VStack(spacing: 16) {
            // Instructions
            VStack(spacing: 8) {
                Image(systemName: "doc.badge.plus")
                    .font(.system(size: 48))
                    .foregroundStyle(Color.seeyaPurple)

                Text("Upload Confirmation")
                    .font(.headline)

                Text("Upload an image or PDF of your booking confirmation")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding()

            // Show preview if file selected
            if let imageData = selectedImageData, let uiImage = UIImage(data: imageData) {
                Image(uiImage: uiImage)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(maxHeight: 250)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.seeyaPurple, lineWidth: 2)
                    )
                    .padding(.horizontal)

                Button("Choose Different File") {
                    clearSelection()
                }
                .font(.subheadline)
                .foregroundStyle(Color.seeyaPurple)
            } else if selectedPDFData != nil {
                VStack(spacing: 8) {
                    Image(systemName: "doc.text.fill")
                        .font(.system(size: 40))
                        .foregroundStyle(Color.seeyaPurple)

                    Text(selectedFileName ?? "PDF Document")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 120)
                .background(Color.seeyaPurple.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .padding(.horizontal)

                Button("Choose Different File") {
                    clearSelection()
                }
                .font(.subheadline)
                .foregroundStyle(Color.seeyaPurple)
            } else {
                // File picker options
                VStack(spacing: 12) {
                    PhotosPicker(selection: $selectedItem, matching: .images) {
                        HStack {
                            Image(systemName: "photo")
                            Text("Choose from Photos")
                        }
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(Color.seeyaPurple)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color.seeyaPurple.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                    }

                    Button {
                        showDocumentPicker = true
                    } label: {
                        HStack {
                            Image(systemName: "doc")
                            Text("Choose PDF or File")
                        }
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(Color.seeyaPurple)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color.seeyaPurple.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                }
                .padding(.horizontal)
            }
        }
        .onChange(of: selectedItem) {
            loadImage()
        }
        .sheet(isPresented: $showDocumentPicker) {
            DocumentPicker { url in
                loadDocument(from: url)
            }
        }
    }

    private func clearSelection() {
        selectedItem = nil
        selectedImageData = nil
        selectedPDFData = nil
        selectedFileName = nil
    }

    private func loadDocument(from url: URL) {
        do {
            let data = try Data(contentsOf: url)
            selectedFileName = url.lastPathComponent

            if url.pathExtension.lowercased() == "pdf" {
                selectedPDFData = data
                selectedImageData = nil
            } else {
                // Treat as image
                selectedImageData = data
                selectedPDFData = nil
            }
        } catch {
            errorMessage = "Failed to load file: \(error.localizedDescription)"
        }
    }

    private var textInput: some View {
        VStack(spacing: 16) {
            // Instructions
            VStack(spacing: 8) {
                Image(systemName: "doc.text")
                    .font(.system(size: 48))
                    .foregroundStyle(Color.seeyaPurple)

                Text("Paste Confirmation Text")
                    .font(.headline)

                Text("Copy and paste the text from your booking confirmation email")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding()

            // Text input
            TextEditor(text: $pastedText)
                .font(.body)
                .frame(minHeight: 200)
                .padding(12)
                .background(Color.seeyaCardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color(.systemGray4), lineWidth: 1)
                )
                .padding(.horizontal)

            if pastedText.isEmpty {
                Text("Tip: Select all text in your confirmation email and paste here")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    // MARK: - Review View

    private var reviewView: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Confidence indicator
                if let result = parsedResult {
                    confidenceCard(result.confidence)
                }

                // Editable fields
                VStack(alignment: .leading, spacing: 16) {
                    Text("Review & Edit")
                        .font(.headline)

                    // Category
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Category")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)

                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(TripBitCategory.allCases, id: \.self) { category in
                                    CategoryChip(
                                        category: category,
                                        isSelected: editedCategory == category
                                    ) {
                                        editedCategory = category
                                    }
                                }
                            }
                        }
                    }

                    // Title
                    FormField(label: "Title", placeholder: "Enter title", text: $editedTitle)

                    // Date & Time
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Date & Time")
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        DatePicker(
                            "Start",
                            selection: $editedStartDate,
                            displayedComponents: [.date, .hourAndMinute]
                        )

                        Toggle("Has End Date/Time", isOn: $hasEndDate)

                        if hasEndDate {
                            DatePicker(
                                "End",
                                selection: $editedEndDate,
                                in: editedStartDate...,
                                displayedComponents: [.date, .hourAndMinute]
                            )
                        }
                    }

                    // Category-specific details
                    Divider()

                    Text("\(editedCategory.displayName) Details")
                        .font(.subheadline)
                        .fontWeight(.semibold)

                    categoryFormFields
                }
                .padding()
                .background(Color.seeyaCardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 12))

                // Re-scan button
                Button {
                    resetInput()
                } label: {
                    Label("Upload Different File", systemImage: "arrow.counterclockwise")
                }
                .buttonStyle(SeeyaSecondaryButtonStyle())
            }
            .padding()
        }
        .background(Color.seeyaBackground)
    }

    private func confidenceCard(_ confidence: Double) -> some View {
        HStack(spacing: 12) {
            Image(systemName: confidenceIcon(for: confidence))
                .font(.title2)
                .foregroundStyle(confidenceColor(for: confidence))

            VStack(alignment: .leading, spacing: 4) {
                Text(confidenceLabel(for: confidence))
                    .font(.subheadline)
                    .fontWeight(.semibold)

                Text("Review the extracted information and make any needed changes")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()
        }
        .padding()
        .background(confidenceColor(for: confidence).opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func confidenceIcon(for confidence: Double) -> String {
        if confidence >= 0.8 { return "checkmark.circle.fill" }
        if confidence >= 0.5 { return "exclamationmark.circle.fill" }
        return "questionmark.circle.fill"
    }

    private func confidenceColor(for confidence: Double) -> Color {
        if confidence >= 0.8 { return .green }
        if confidence >= 0.5 { return .orange }
        return .red
    }

    private func confidenceLabel(for confidence: Double) -> String {
        if confidence >= 0.8 { return "High Confidence" }
        if confidence >= 0.5 { return "Medium Confidence" }
        return "Low Confidence - Please Review"
    }

    @ViewBuilder
    private var categoryFormFields: some View {
        switch editedCategory {
        case .flight:
            FlightFormFields(details: $editedDetails)
        case .stay:
            StayFormFields(details: $editedDetails)
        case .car:
            CarFormFields(details: $editedDetails)
        case .activity:
            ActivityFormFields(details: $editedDetails)
        case .transport:
            TransportFormFields(details: $editedDetails)
        case .money:
            MoneyFormFields(details: $editedDetails)
        case .reservation:
            ReservationFormFields(details: $editedDetails)
        case .document:
            DocumentFormFields(details: $editedDetails)
        case .photos:
            PhotosFormFields(details: $editedDetails)
        case .other:
            OtherFormFields(details: $editedDetails)
        }
    }

    // MARK: - Helpers

    private var canProcess: Bool {
        if inputMode == .upload {
            return selectedImageData != nil || selectedPDFData != nil
        } else {
            return !pastedText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }
    }

    private func loadImage() {
        Task {
            if let data = try? await selectedItem?.loadTransferable(type: Data.self) {
                selectedImageData = data
            }
        }
    }

    private func processInput() {
        isProcessing = true
        errorMessage = nil

        Task {
            do {
                let result: ParsedTripBit

                if inputMode == .upload {
                    if let imageData = selectedImageData {
                        // Process image
                        result = try await AIService.shared.parseBookingScreenshot(imageData: imageData)
                    } else if let pdfData = selectedPDFData {
                        // Extract text from PDF and process
                        guard let pdfText = extractTextFromPDF(data: pdfData), !pdfText.isEmpty else {
                            throw AIServiceError.parsingError
                        }
                        print("📄 [AIQuickAdd] Extracted PDF text:\n\(pdfText)")
                        result = try await AIService.shared.parseBookingText(pdfText)
                    } else {
                        throw AIServiceError.parsingError
                    }
                } else {
                    result = try await AIService.shared.parseBookingText(pastedText)
                }

                // Populate editable fields
                print("🎯 [AIQuickAdd] AI Result - category: \(result.category), title: \(result.title)")
                print("🎯 [AIQuickAdd] AI Result - startDatetime: \(String(describing: result.startDatetime))")
                print("🎯 [AIQuickAdd] AI Result - endDatetime: \(String(describing: result.endDatetime))")
                print("🎯 [AIQuickAdd] AI Result - details: \(result.details)")

                editedCategory = result.category
                editedTitle = result.title
                editedStartDate = result.startDatetime ?? Date()
                editedEndDate = result.endDatetime ?? Date()
                hasEndDate = result.endDatetime != nil
                editedDetails = result.details

                parsedResult = result
            } catch {
                errorMessage = "Failed to extract information: \(error.localizedDescription)"
            }

            isProcessing = false
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

    private func resetInput() {
        parsedResult = nil
        selectedItem = nil
        selectedImageData = nil
        selectedPDFData = nil
        selectedFileName = nil
        pastedText = ""
        errorMessage = nil
    }

    private func saveItem() {
        isSaving = true

        Task {
            // Create the TripBit first
            if let createdTripBit = await viewModel.createTripBit(
                category: editedCategory,
                title: editedTitle,
                startDatetime: editedStartDate,
                endDatetime: hasEndDate ? editedEndDate : nil,
                details: editedDetails.isEmpty ? nil : editedDetails
            ) {
                // If we have uploaded file data, save it as attachment
                if let imageData = selectedImageData {
                    let fileName = selectedFileName ?? "upload_\(Int(Date().timeIntervalSince1970)).jpg"
                    let _ = await viewModel.uploadAndAttach(
                        to: createdTripBit,
                        data: imageData,
                        fileName: fileName,
                        fileType: "image/jpeg",
                        tripId: trip.id
                    )
                } else if let pdfData = selectedPDFData {
                    let fileName = selectedFileName ?? "upload_\(Int(Date().timeIntervalSince1970)).pdf"
                    let _ = await viewModel.uploadAndAttach(
                        to: createdTripBit,
                        data: pdfData,
                        fileName: fileName,
                        fileType: "application/pdf",
                        tripId: trip.id
                    )
                }
            }

            isSaving = false
            dismiss()
        }
    }
}

// MARK: - Supporting Types

enum AIInputMode: String, CaseIterable {
    case upload
    case text

    var displayName: String {
        switch self {
        case .upload: return "Upload"
        case .text: return "Paste Text"
        }
    }
}

// MARK: - Category Chip

struct CategoryChip: View {
    let category: TripBitCategory
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 6) {
                Image(systemName: category.icon)
                    .font(.caption)
                Text(category.displayName)
                    .font(.caption)
                    .fontWeight(isSelected ? .semibold : .regular)
            }
            .foregroundStyle(isSelected ? .white : category.color)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(isSelected ? category.color : category.color.opacity(0.15))
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    AIQuickAddSheet(
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
