import SwiftUI
import Supabase

// MARK: - Publish Itinerary Sheet

struct PublishItinerarySheet: View {
    let trip: Trip
    let tripBits: [TripBit]
    @Environment(\.dismiss) private var dismiss

    @State private var step: PublishStep = .selectItems
    @State private var selectedIds: Set<UUID> = []
    @State private var title: String = ""
    @State private var description: String = ""
    @State private var destination: String = ""
    @State private var durationDays: String = ""
    @State private var isPublishing = false
    @State private var publishError: String?
    @State private var shareCode: String?
    @State private var didCopy = false

    enum PublishStep {
        case selectItems
        case details
        case success
    }

    private var selectedBits: [TripBit] {
        tripBits.filter { selectedIds.contains($0.id) }
    }

    private var shareURL: String {
        guard let code = shareCode else { return "" }
        return "https://seeya-tawny.vercel.app/itinerary/\(code)"
    }

    var body: some View {
        NavigationStack {
            Group {
                switch step {
                case .selectItems:
                    selectItemsView
                case .details:
                    detailsView
                case .success:
                    successView
                }
            }
            .navigationTitle(navigationTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    if step != .success {
                        Button("Cancel") { dismiss() }
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    if step == .selectItems {
                        Button("Next") {
                            withAnimation { step = .details }
                        }
                        .disabled(selectedIds.isEmpty)
                        .fontWeight(.semibold)
                    }
                }
            }
        }
        .onAppear {
            // Pre-fill destination from trip
            destination = trip.destination
        }
    }

    private var navigationTitle: String {
        switch step {
        case .selectItems: return "Select Items"
        case .details: return "Itinerary Details"
        case .success: return "Published!"
        }
    }

    // MARK: - Step 1: Select Items

    private var selectItemsView: some View {
        List {
            Section {
                HStack {
                    Text("\(selectedIds.count) of \(tripBits.count) selected")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Spacer()
                    Button("Select All") {
                        selectedIds = Set(tripBits.map(\.id))
                    }
                    .font(.subheadline)
                    .foregroundStyle(Color.seeyaPurple)
                }
            }

            if tripBits.isEmpty {
                Section {
                    VStack(spacing: 8) {
                        Image(systemName: "tray")
                            .font(.largeTitle)
                            .foregroundStyle(.tertiary)
                        Text("No trip items yet")
                            .foregroundStyle(.secondary)
                        Text("Add some trip bits to your trip first.")
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 24)
                }
            } else {
                Section("Trip Items") {
                    ForEach(tripBits) { bit in
                        tripBitRow(bit)
                    }
                }
            }
        }
    }

    private func tripBitRow(_ bit: TripBit) -> some View {
        let isSelected = selectedIds.contains(bit.id)
        return Button {
            if isSelected {
                selectedIds.remove(bit.id)
            } else {
                selectedIds.insert(bit.id)
            }
        } label: {
            HStack(spacing: 12) {
                Image(systemName: bit.category.icon)
                    .font(.title3)
                    .foregroundStyle(bit.category.color)
                    .frame(width: 32)

                VStack(alignment: .leading, spacing: 2) {
                    Text(bit.title)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(.primary)
                    Text(bit.category.displayName)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(isSelected ? Color.seeyaPurple : Color(.systemGray4))
                    .font(.title3)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    // MARK: - Step 2: Details

    private var detailsView: some View {
        Form {
            Section("Basic Info") {
                LabeledContent("Title") {
                    TextField("e.g. Perfect Tokyo Week", text: $title)
                        .multilineTextAlignment(.trailing)
                }

                LabeledContent("Destination") {
                    TextField("e.g. Tokyo, Japan", text: $destination)
                        .multilineTextAlignment(.trailing)
                }

                LabeledContent("Duration (days)") {
                    TextField("e.g. 7", text: $durationDays)
                        .multilineTextAlignment(.trailing)
                        .keyboardType(.numberPad)
                }
            }

            Section("Description") {
                TextEditor(text: $description)
                    .frame(minHeight: 80)
                    .overlay(alignment: .topLeading) {
                        if description.isEmpty {
                            Text("Share what makes this itinerary special...")
                                .font(.body)
                                .foregroundStyle(.tertiary)
                                .padding(.top, 8)
                                .padding(.leading, 4)
                                .allowsHitTesting(false)
                        }
                    }
            }

            Section {
                Text("Publishing \(selectedBits.count) item\(selectedBits.count == 1 ? "" : "s")")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            if let error = publishError {
                Section {
                    Label(error, systemImage: "exclamationmark.triangle.fill")
                        .foregroundStyle(.red)
                        .font(.subheadline)
                }
            }

            Section {
                Button {
                    Task { await publishItinerary() }
                } label: {
                    HStack {
                        Spacer()
                        if isPublishing {
                            ProgressView()
                        } else {
                            Label("Publish Itinerary", systemImage: "globe")
                        }
                        Spacer()
                    }
                }
                .disabled(isPublishing || title.trimmingCharacters(in: .whitespaces).isEmpty || destination.trimmingCharacters(in: .whitespaces).isEmpty)
                .foregroundStyle(Color.seeyaPurple)
            }
        }
    }

    // MARK: - Step 3: Success

    private var successView: some View {
        VStack(spacing: 32) {
            Spacer()

            VStack(spacing: 16) {
                Circle()
                    .fill(Color.green.opacity(0.15))
                    .frame(width: 80, height: 80)
                    .overlay {
                        Image(systemName: "globe")
                            .font(.system(size: 36))
                            .foregroundStyle(.green)
                    }

                Text("Your itinerary is live!")
                    .font(.title2)
                    .fontWeight(.bold)

                Text("Share this link with anyone — no account required to view.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }

            // Share link
            VStack(spacing: 12) {
                HStack {
                    Text(shareURL)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                        .truncationMode(.middle)

                    Spacer()

                    Button {
                        UIPasteboard.general.string = shareURL
                        didCopy = true
                        Task {
                            try? await Task.sleep(nanoseconds: 2_000_000_000)
                            await MainActor.run { didCopy = false }
                        }
                    } label: {
                        Label(
                            didCopy ? "Copied!" : "Copy",
                            systemImage: didCopy ? "checkmark" : "doc.on.doc"
                        )
                        .font(.caption)
                        .fontWeight(.medium)
                    }
                    .foregroundStyle(didCopy ? .green : Color.seeyaPurple)
                }
                .padding()
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .padding(.horizontal)

                // Native share sheet
                ShareLink(item: URL(string: shareURL)!) {
                    Label("Share Link", systemImage: "square.and.arrow.up")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(SeeyaPrimaryButtonStyle())
                .padding(.horizontal)
            }

            Spacer()

            Button("Done") { dismiss() }
                .buttonStyle(SeeyaSecondaryButtonStyle())
                .padding(.horizontal)
                .padding(.bottom, 24)
        }
    }

    // MARK: - Publish Action

    private func publishItinerary() async {
        guard !title.trimmingCharacters(in: .whitespaces).isEmpty,
              !destination.trimmingCharacters(in: .whitespaces).isEmpty,
              !selectedBits.isEmpty else { return }

        isPublishing = true
        publishError = nil

        do {
            let items = selectedBits.enumerated().map { index, bit in
                ItineraryItemPayload(
                    dayNumber: nil,
                    orderIndex: index,
                    category: bit.category.rawValue,
                    title: bit.title,
                    notes: bit.notes,
                    startTime: nil,
                    locationName: nil
                )
            }

            let payload = PublishItineraryPayload(
                tripId: trip.id.uuidString,
                title: title.trimmingCharacters(in: .whitespaces),
                description: description.trimmingCharacters(in: .whitespaces).isEmpty ? nil : description.trimmingCharacters(in: .whitespaces),
                destination: destination.trimmingCharacters(in: .whitespaces),
                durationDays: Int(durationDays),
                items: items
            )

            let encoder = JSONEncoder()
            encoder.keyEncodingStrategy = .convertToSnakeCase
            let body = try encoder.encode(payload)

            guard let url = URL(string: "https://seeya-tawny.vercel.app/api/itineraries") else { return }

            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = body

            // Attach auth token
            if let session = try? await SupabaseService.shared.client.auth.session {
                request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
            }

            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 201 else {
                let msg = String(data: data, encoding: .utf8) ?? "Unknown error"
                throw NSError(domain: "PublishItinerary", code: 0, userInfo: [NSLocalizedDescriptionKey: msg])
            }

            let result = try JSONDecoder().decode(PublishItineraryResponse.self, from: data)

            await MainActor.run {
                shareCode = result.shareCode
                withAnimation { step = .success }
            }
        } catch {
            await MainActor.run {
                publishError = error.localizedDescription
            }
        }

        await MainActor.run { isPublishing = false }
    }
}

// MARK: - Payloads

private struct ItineraryItemPayload: Encodable {
    let dayNumber: Int?
    let orderIndex: Int
    let category: String
    let title: String
    let notes: String?
    let startTime: String?
    let locationName: String?
}

private struct PublishItineraryPayload: Encodable {
    let tripId: String?
    let title: String
    let description: String?
    let destination: String
    let durationDays: Int?
    let items: [ItineraryItemPayload]
}

private struct PublishItineraryResponse: Decodable {
    let id: String
    let shareCode: String
}

#Preview {
    PublishItinerarySheet(
        trip: Trip(
            id: UUID(),
            userId: UUID(),
            name: "Summer Vacation",
            description: nil,
            startDate: Date(),
            endDate: Date().addingTimeInterval(7 * 24 * 60 * 60),
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
        ),
        tripBits: []
    )
}
