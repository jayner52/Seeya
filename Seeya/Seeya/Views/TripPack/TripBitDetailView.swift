import SwiftUI

struct TripBitDetailView: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var viewModel: TripPackViewModel
    let tripBit: TripBit
    let trip: Trip

    @State private var showEditSheet = false
    @State private var showDeleteConfirmation = false
    @State private var showAddAttachment = false
    @State private var selectedAttachment: TripBitAttachment?
    @State private var attachmentToDelete: TripBitAttachment?
    @State private var isUploadingAttachment = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Header card
                    headerCard

                    // Details section
                    detailsSection

                    // Travelers section
                    travelersSection

                    // Attachments section (always show to allow adding)
                    attachmentsSection

                    // Notes section
                    if let notes = tripBit.notes, !notes.isEmpty {
                        notesSection(notes)
                    }

                    // Actions
                    actionsSection
                }
                .padding()
            }
            .background(Color.seeyaBackground)
            .navigationTitle(tripBit.category.displayName)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Done") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button {
                            showEditSheet = true
                        } label: {
                            Label("Edit", systemImage: "pencil")
                        }

                        Button(role: .destructive) {
                            showDeleteConfirmation = true
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
            .sheet(isPresented: $showEditSheet) {
                EditTripBitSheet(viewModel: viewModel, tripBit: tripBit, trip: trip)
            }
            .confirmationDialog(
                "Delete Item",
                isPresented: $showDeleteConfirmation,
                titleVisibility: .visible
            ) {
                Button("Delete", role: .destructive) {
                    deleteItem()
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("Are you sure you want to delete this item? This action cannot be undone.")
            }
            .confirmationDialog(
                "Delete Attachment",
                isPresented: .init(
                    get: { attachmentToDelete != nil },
                    set: { if !$0 { attachmentToDelete = nil } }
                ),
                titleVisibility: .visible
            ) {
                Button("Delete", role: .destructive) {
                    if let attachment = attachmentToDelete {
                        deleteAttachment(attachment)
                    }
                }
                Button("Cancel", role: .cancel) {
                    attachmentToDelete = nil
                }
            } message: {
                Text("Are you sure you want to delete this attachment?")
            }
            .sheet(isPresented: $showAddAttachment) {
                AddAttachmentSheet(
                    tripBit: tripBit,
                    trip: trip,
                    viewModel: viewModel,
                    isUploading: $isUploadingAttachment
                )
            }
            .sheet(item: $selectedAttachment) { attachment in
                AttachmentViewer(attachment: attachment)
            }
        }
    }

    // MARK: - Header Card

    private var headerCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 16) {
                // Category icon
                Image(systemName: tripBit.category.icon)
                    .font(.title)
                    .foregroundStyle(tripBit.category.color)
                    .frame(width: 56, height: 56)
                    .background(tripBit.category.color.opacity(0.15))
                    .clipShape(RoundedRectangle(cornerRadius: 14))

                VStack(alignment: .leading, spacing: 4) {
                    Text(tripBit.title)
                        .font(.title3)
                        .fontWeight(.bold)

                    Text(tripBit.formattedDateTime)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Spacer()
            }

            // Status badge
            HStack {
                StatusBadge(
                    text: tripBit.displayStatus.displayName,
                    color: tripBit.displayStatus.color
                )

                Spacer()

                if let confirmNumber = tripBit.details?.confirmationNumber {
                    HStack(spacing: 4) {
                        Image(systemName: "doc.text")
                            .font(.caption)
                        Text(confirmNumber)
                            .font(.caption)
                            .fontWeight(.medium)
                    }
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                }
            }
        }
        .padding()
        .seeyaCard()
    }

    // MARK: - Details Section

    private var detailsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Details")
                .font(.headline)

            VStack(spacing: 0) {
                detailRows
            }
            .seeyaCard()
        }
    }

    @ViewBuilder
    private var detailRows: some View {
        switch tripBit.category {
        case .flight:
            flightDetailRows
        case .stay:
            stayDetailRows
        case .car:
            carDetailRows
        case .activity:
            activityDetailRows
        case .transport:
            transportDetailRows
        case .money:
            moneyDetailRows
        case .reservation:
            reservationDetailRows
        case .document:
            documentDetailRows
        case .photos:
            photosDetailRows
        case .other:
            otherDetailRows
        }
    }

    private var flightDetailRows: some View {
        VStack(spacing: 0) {
            if let airline = tripBit.details?.airline {
                DetailRow(label: "Airline", value: airline)
            }
            if let flightNumber = tripBit.details?.flightNumber {
                DetailRow(label: "Flight Number", value: flightNumber)
            }
            if let departure = tripBit.details?.departureAirport,
               let arrival = tripBit.details?.arrivalAirport {
                DetailRow(label: "Route", value: "\(departure) → \(arrival)")
            }
            if let terminal = tripBit.details?.terminal {
                DetailRow(label: "Terminal", value: terminal)
            }
            if let gate = tripBit.details?.gate {
                DetailRow(label: "Gate", value: gate)
            }
            if let seats = tripBit.details?.seatAssignments {
                DetailRow(label: "Seats", value: seats)
            }
        }
    }

    private var stayDetailRows: some View {
        VStack(spacing: 0) {
            if let propertyName = tripBit.details?.propertyName {
                DetailRow(label: "Property", value: propertyName)
            }
            if let propertyType = tripBit.details?.propertyType {
                DetailRow(label: "Type", value: propertyType)
            }
            if let address = tripBit.details?.address {
                DetailRow(label: "Address", value: address)
            }
            if let checkIn = tripBit.details?.checkInTime {
                DetailRow(label: "Check-in", value: checkIn)
            }
            if let checkOut = tripBit.details?.checkOutTime {
                DetailRow(label: "Check-out", value: checkOut)
            }
            if let roomType = tripBit.details?.roomType {
                DetailRow(label: "Room Type", value: roomType)
            }
        }
    }

    private var carDetailRows: some View {
        VStack(spacing: 0) {
            if let company = tripBit.details?.rentalCompany {
                DetailRow(label: "Company", value: company)
            }
            if let vehicleType = tripBit.details?.vehicleType {
                DetailRow(label: "Vehicle", value: vehicleType)
            }
            if let pickup = tripBit.details?.pickupLocation {
                DetailRow(label: "Pickup", value: pickup)
            }
            if let dropoff = tripBit.details?.dropoffLocation {
                DetailRow(label: "Drop-off", value: dropoff)
            }
        }
    }

    private var activityDetailRows: some View {
        VStack(spacing: 0) {
            if let venue = tripBit.details?.venueName {
                DetailRow(label: "Venue", value: venue)
            }
            if let address = tripBit.details?.address {
                DetailRow(label: "Address", value: address)
            }
            if let duration = tripBit.details?.duration {
                DetailRow(label: "Duration", value: duration)
            }
            if let meetingPoint = tripBit.details?.meetingPoint {
                DetailRow(label: "Meeting Point", value: meetingPoint)
            }
            if let ticketType = tripBit.details?.ticketType {
                DetailRow(label: "Ticket", value: ticketType)
            }
        }
    }

    private var transportDetailRows: some View {
        VStack(spacing: 0) {
            if let transportType = tripBit.details?.transportType {
                DetailRow(label: "Type", value: transportType)
            }
            if let op = tripBit.details?.transportOperator {
                DetailRow(label: "Operator", value: op)
            }
            if let departure = tripBit.details?.departureStation,
               let arrival = tripBit.details?.arrivalStation {
                DetailRow(label: "Route", value: "\(departure) → \(arrival)")
            }
            if let platform = tripBit.details?.platform {
                DetailRow(label: "Platform", value: platform)
            }
        }
    }

    private var moneyDetailRows: some View {
        VStack(spacing: 0) {
            if let type = tripBit.details?.moneyType {
                DetailRow(label: "Type", value: type.capitalized)
            }
            if let amount = tripBit.details?.amount,
               let currency = tripBit.details?.currency {
                DetailRow(label: "Amount", value: "\(currency) \(String(format: "%.2f", amount))")
            }
        }
    }

    private var reservationDetailRows: some View {
        VStack(spacing: 0) {
            if let venue = tripBit.details?.venueName {
                DetailRow(label: "Venue", value: venue)
            }
            if let venueType = tripBit.details?.venueType {
                DetailRow(label: "Type", value: venueType)
            }
            if let address = tripBit.details?.address {
                DetailRow(label: "Address", value: address)
            }
            if let time = tripBit.details?.reservationTime {
                DetailRow(label: "Time", value: time)
            }
            if let partySize = tripBit.details?.partySize {
                DetailRow(label: "Party Size", value: "\(partySize) guests")
            }
        }
    }

    private var documentDetailRows: some View {
        VStack(spacing: 0) {
            if let docType = tripBit.details?.documentType {
                DetailRow(label: "Type", value: docType)
            }
            if let docNumber = tripBit.details?.documentNumber {
                DetailRow(label: "Number", value: docNumber)
            }
            if let holder = tripBit.details?.holderName {
                DetailRow(label: "Holder", value: holder)
            }
            if let expiry = tripBit.details?.expiryDate {
                DetailRow(label: "Expires", value: expiry)
            }
        }
    }

    private var photosDetailRows: some View {
        VStack(spacing: 0) {
            if let albumName = tripBit.details?.albumName {
                DetailRow(label: "Album", value: albumName)
            }
            if let count = tripBit.details?.photoCount {
                DetailRow(label: "Photos", value: "\(count)")
            }
        }
    }

    private var otherDetailRows: some View {
        VStack(spacing: 0) {
            if let customType = tripBit.details?.customType {
                DetailRow(label: "Type", value: customType)
            }
            if let desc = tripBit.details?.customDescription {
                DetailRow(label: "Description", value: desc)
            }
        }
    }

    // MARK: - Travelers Section

    private var travelersSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Travelers")
                .font(.headline)

            VStack(spacing: 0) {
                if let travelers = tripBit.travelers, !travelers.isEmpty {
                    if travelers.first?.appliesToAll == true {
                        HStack {
                            Image(systemName: "person.3.fill")
                                .foregroundStyle(Color.seeyaPurple)
                            Text("Everyone on this trip")
                                .font(.subheadline)
                            Spacer()
                        }
                        .padding()
                    } else {
                        ForEach(Array(travelers.enumerated()), id: \.element.id) { index, traveler in
                            if index > 0 {
                                Divider()
                            }
                            if let user = traveler.user {
                                HStack(spacing: 12) {
                                    AvatarView(name: user.fullName, avatarUrl: user.avatarUrl, size: 36)

                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(user.fullName)
                                            .font(.subheadline)
                                            .fontWeight(.medium)

                                        if let username = user.username {
                                            Text("@\(username)")
                                                .font(.caption)
                                                .foregroundStyle(.secondary)
                                        }
                                    }

                                    Spacer()
                                }
                                .padding()
                            }
                        }
                    }
                } else {
                    HStack {
                        Image(systemName: "person.3.fill")
                            .foregroundStyle(Color.seeyaPurple)
                        Text("Everyone on this trip")
                            .font(.subheadline)
                        Spacer()
                    }
                    .padding()
                }
            }
            .seeyaCard()
        }
    }

    // MARK: - Attachments Section

    private var attachmentsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Attachments", action: {
                showAddAttachment = true
            }, actionIcon: "plus")

            VStack(spacing: 0) {
                if let attachments = tripBit.attachments, !attachments.isEmpty {
                    ForEach(Array(attachments.enumerated()), id: \.element.id) { index, attachment in
                        if index > 0 {
                            Divider()
                        }
                        AttachmentRow(
                            attachment: attachment,
                            onTap: {
                                selectedAttachment = attachment
                            },
                            onDelete: {
                                attachmentToDelete = attachment
                            }
                        )
                    }
                } else {
                    // Empty state with add button
                    Button {
                        showAddAttachment = true
                    } label: {
                        HStack(spacing: 12) {
                            Image(systemName: "plus.circle.fill")
                                .font(.title2)
                                .foregroundStyle(Color.seeyaPurple)

                            VStack(alignment: .leading, spacing: 2) {
                                Text("Add Attachment")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .foregroundStyle(.primary)

                                Text("Attach files, images, or documents")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }

                            Spacer()
                        }
                        .padding()
                    }
                    .buttonStyle(.plain)
                }

                // Show uploading indicator
                if isUploadingAttachment {
                    Divider()
                    HStack(spacing: 12) {
                        ProgressView()
                        Text("Uploading...")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        Spacer()
                    }
                    .padding()
                }
            }
            .seeyaCard()
        }
    }

    private func deleteAttachment(_ attachment: TripBitAttachment) {
        Task {
            let _ = await viewModel.deleteAttachment(attachment)
            attachmentToDelete = nil
        }
    }

    private func attachmentIcon(for fileType: String?) -> String {
        guard let type = fileType?.lowercased() else { return "doc" }
        if type.contains("image") || type.contains("jpg") || type.contains("png") {
            return "photo"
        } else if type.contains("pdf") {
            return "doc.text"
        }
        return "doc"
    }

    // MARK: - Notes Section

    private func notesSection(_ notes: String) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Notes")
                .font(.headline)

            Text(notes)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .seeyaCard()
        }
    }

    // MARK: - Actions Section

    private var actionsSection: some View {
        VStack(spacing: 12) {
            Button {
                showEditSheet = true
            } label: {
                Label("Edit Item", systemImage: "pencil")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(SeeyaSecondaryButtonStyle())

            Button(role: .destructive) {
                showDeleteConfirmation = true
            } label: {
                Label("Delete Item", systemImage: "trash")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            .tint(.red)
        }
        .padding(.top)
    }

    // MARK: - Actions

    private func deleteItem() {
        Task {
            let success = await viewModel.deleteTripBit(tripBit)
            if success {
                dismiss()
            }
        }
    }
}

// MARK: - Detail Row

struct DetailRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Spacer()

            Text(value)
                .font(.subheadline)
                .fontWeight(.medium)
                .multilineTextAlignment(.trailing)
        }
        .padding()
    }
}

// MARK: - Edit TripBit Sheet

struct EditTripBitSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var viewModel: TripPackViewModel
    let tripBit: TripBit
    let trip: Trip

    @State private var title: String
    @State private var status: TripBitStatus
    @State private var startDate: Date
    @State private var endDate: Date
    @State private var hasEndDate: Bool
    @State private var notes: String
    @State private var details: [String: Any]
    @State private var isSaving = false

    init(viewModel: TripPackViewModel, tripBit: TripBit, trip: Trip) {
        self.viewModel = viewModel
        self.tripBit = tripBit
        self.trip = trip

        _title = State(initialValue: tripBit.title)
        _status = State(initialValue: tripBit.displayStatus)
        _startDate = State(initialValue: tripBit.startDatetime ?? Date())
        _endDate = State(initialValue: tripBit.endDatetime ?? Date())
        _hasEndDate = State(initialValue: tripBit.endDatetime != nil)
        _notes = State(initialValue: tripBit.notes ?? "")

        // Convert details
        var initialDetails: [String: Any] = [:]
        if let tripBitDetails = tripBit.details {
            for (key, value) in tripBitDetails.details {
                initialDetails[key] = value.value
            }
        }
        _details = State(initialValue: initialDetails)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Common fields
                    VStack(alignment: .leading, spacing: 16) {
                        FormField(label: "Title", placeholder: "Enter title", text: $title)

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

                        VStack(alignment: .leading, spacing: 8) {
                            Text("Date & Time")
                                .font(.subheadline)
                                .fontWeight(.medium)

                            DatePicker(
                                "Start",
                                selection: $startDate,
                                displayedComponents: [.date, .hourAndMinute]
                            )

                            Toggle("Has End Date/Time", isOn: $hasEndDate)

                            if hasEndDate {
                                DatePicker(
                                    "End",
                                    selection: $endDate,
                                    in: startDate...,
                                    displayedComponents: [.date, .hourAndMinute]
                                )
                            }
                        }

                        VStack(alignment: .leading, spacing: 8) {
                            Text("Notes")
                                .font(.subheadline)
                                .fontWeight(.medium)

                            TextField("Notes", text: $notes, axis: .vertical)
                                .textFieldStyle(.roundedBorder)
                                .lineLimit(3...6)
                        }
                    }

                    Divider()

                    // Category-specific fields
                    VStack(alignment: .leading, spacing: 16) {
                        Text("\(tripBit.category.displayName) Details")
                            .font(.subheadline)
                            .fontWeight(.semibold)

                        categoryFormFields
                    }
                }
                .padding()
            }
            .background(Color.seeyaBackground)
            .navigationTitle("Edit \(tripBit.category.displayName)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save") {
                        saveChanges()
                    }
                    .fontWeight(.semibold)
                    .disabled(isSaving || title.isEmpty)
                }
            }
        }
    }

    @ViewBuilder
    private var categoryFormFields: some View {
        switch tripBit.category {
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
        }
    }

    private func saveChanges() {
        isSaving = true

        Task {
            let _ = await viewModel.updateTripBit(
                tripBit,
                title: title,
                status: status,
                startDatetime: startDate,
                endDatetime: hasEndDate ? endDate : nil,
                notes: notes.isEmpty ? nil : notes,
                details: details
            )

            isSaving = false
            dismiss()
        }
    }
}

// MARK: - Add Attachment Sheet

struct AddAttachmentSheet: View {
    let tripBit: TripBit
    let trip: Trip
    @Bindable var viewModel: TripPackViewModel
    @Binding var isUploading: Bool

    @Environment(\.dismiss) private var dismiss
    @State private var selectedData: Data?
    @State private var selectedFileName: String?
    @State private var selectedFileType: String?

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                if let data = selectedData {
                    // Preview
                    VStack(spacing: 12) {
                        if let uiImage = UIImage(data: data) {
                            Image(uiImage: uiImage)
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(maxHeight: 200)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                        } else {
                            VStack(spacing: 8) {
                                Image(systemName: "doc.text.fill")
                                    .font(.system(size: 48))
                                    .foregroundStyle(Color.seeyaPurple)

                                Text(selectedFileName ?? "Document")
                                    .font(.subheadline)
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 150)
                            .background(Color(.systemGray6))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }

                        Button {
                            selectedData = nil
                            selectedFileName = nil
                            selectedFileType = nil
                        } label: {
                            Label("Choose Different", systemImage: "arrow.counterclockwise")
                        }
                        .buttonStyle(SeeyaSecondaryButtonStyle())
                    }
                    .padding()
                } else {
                    // File picker
                    DocumentDropZone(
                        label: "Select a file to attach",
                        subtitle: "Images, PDFs, or documents",
                        icon: "paperclip",
                        isProcessing: false,
                        onFileSelected: { data, fileName, fileType in
                            selectedData = data
                            selectedFileName = fileName
                            selectedFileType = fileType
                        }
                    )
                    .padding()
                }

                Spacer()

                // Upload button
                if selectedData != nil {
                    Button {
                        uploadAttachment()
                    } label: {
                        if isUploading {
                            HStack {
                                ProgressView()
                                    .tint(.white)
                                Text("Uploading...")
                            }
                        } else {
                            Text("Upload Attachment")
                        }
                    }
                    .buttonStyle(SeeyaPrimaryButtonStyle(isEnabled: !isUploading))
                    .disabled(isUploading)
                    .padding(.horizontal)
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
        }
    }

    private func uploadAttachment() {
        guard let data = selectedData,
              let fileName = selectedFileName,
              let fileType = selectedFileType else { return }

        isUploading = true

        Task {
            do {
                let path = SupabaseService.shared.generateStoragePath(
                    tripId: trip.id,
                    fileName: fileName
                )

                let fileUrl = try await SupabaseService.shared.uploadFile(
                    data: data,
                    path: path,
                    contentType: fileType
                )

                let _ = await viewModel.addAttachment(
                    to: tripBit,
                    fileUrl: fileUrl,
                    fileName: fileName,
                    fileType: fileType
                )

                await MainActor.run {
                    isUploading = false
                    dismiss()
                }
            } catch {
                print("Failed to upload attachment: \(error)")
                await MainActor.run {
                    isUploading = false
                }
            }
        }
    }
}

#Preview {
    TripBitDetailView(
        viewModel: TripPackViewModel(tripId: UUID()),
        tripBit: TripBit(
            id: UUID(),
            tripId: UUID(),
            createdBy: UUID(),
            category: .flight,
            title: "Flight to Paris",
            status: .confirmed,
            startDatetime: Date()
        ),
        trip: Trip(
            id: UUID(),
            userId: UUID(),
            name: "Paris Trip",
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
