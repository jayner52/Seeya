import SwiftUI

struct EditTripView: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var viewModel: TripsViewModel
    let trip: Trip

    @State private var name: String
    @State private var startDate: Date
    @State private var endDate: Date
    @State private var description: String
    @State private var visibility: VisibilityLevel
    @State private var useDates: Bool

    init(viewModel: TripsViewModel, trip: Trip) {
        self.viewModel = viewModel
        self.trip = trip
        _name = State(initialValue: trip.name)
        _startDate = State(initialValue: trip.startDate ?? Date())
        _endDate = State(initialValue: trip.endDate ?? Date().addingTimeInterval(7 * 24 * 60 * 60))
        _description = State(initialValue: trip.description ?? "")
        _visibility = State(initialValue: trip.visibility ?? .fullDetails)
        _useDates = State(initialValue: trip.hasDates)
    }

    private var isValid: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        // Current Destination (read-only display)
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Destination")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundStyle(.secondary)

                            HStack {
                                if let flag = trip.locations?.first?.flagEmoji {
                                    Text(flag)
                                        .font(.title2)
                                }
                                Text(trip.destination)
                                    .foregroundStyle(.primary)
                                Spacer()
                            }
                            .padding()
                            .background(Color(.systemGray6))
                            .clipShape(RoundedRectangle(cornerRadius: 12))

                            Text("Location can't be changed after creation")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }

                        // Trip Name
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Trip Name")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundStyle(.secondary)

                            TextField("Trip Name", text: $name)
                                .textFieldStyle(.plain)
                                .padding()
                                .background(Color.white)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                        }

                        // Dates
                        VStack(alignment: .leading, spacing: 12) {
                            Toggle(isOn: $useDates) {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Set travel dates")
                                        .font(.subheadline)
                                        .fontWeight(.medium)
                                    Text(useDates ? "Choose your dates" : "Dates are flexible")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            .tint(Color.seeyaPurple)

                            if useDates {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Start")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                    DatePicker("", selection: $startDate, displayedComponents: .date)
                                        .datePickerStyle(.compact)
                                        .labelsHidden()
                                }
                                .padding()
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(Color.white)
                                .clipShape(RoundedRectangle(cornerRadius: 12))

                                VStack(alignment: .leading, spacing: 4) {
                                    Text("End")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                    DatePicker("", selection: $endDate, in: startDate..., displayedComponents: .date)
                                        .datePickerStyle(.compact)
                                        .labelsHidden()
                                }
                                .padding()
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(Color.white)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                            }
                        }

                        // Description
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Description (optional)")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundStyle(.secondary)

                            TextField("Add notes or details...", text: $description, axis: .vertical)
                                .textFieldStyle(.plain)
                                .lineLimit(3...6)
                                .padding()
                                .background(Color.white)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                        }

                        // Visibility
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Privacy")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundStyle(.secondary)

                            ForEach(VisibilityLevel.allCases, id: \.self) { level in
                                PrivacyOptionRow(
                                    level: level,
                                    isSelected: visibility == level
                                ) {
                                    visibility = level
                                }
                            }
                        }

                        // Error message
                        if let error = viewModel.errorMessage {
                            Text(error)
                                .font(.caption)
                                .foregroundStyle(.red)
                                .padding()
                                .frame(maxWidth: .infinity)
                                .background(Color.red.opacity(0.1))
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                        }
                    }
                    .padding()
                }

                // Save Button
                Button {
                    saveTrip()
                } label: {
                    HStack {
                        if viewModel.isLoading {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Text("Save Changes")
                        }
                    }
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(isValid ? Color.seeyaAccent : Color.gray)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                .disabled(!isValid || viewModel.isLoading)
                .padding()
            }
            .background(Color.seeyaBackground)
            .navigationTitle("Edit Trip")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
            .interactiveDismissDisabled(viewModel.isLoading)
        }
    }

    private func saveTrip() {
        Task {
            let success = await viewModel.updateTrip(
                id: trip.id,
                name: name.trimmingCharacters(in: .whitespaces),
                description: description.isEmpty ? nil : description,
                startDate: useDates ? startDate : nil,
                endDate: useDates ? endDate : nil,
                isFlexible: !useDates,
                visibility: visibility
            )

            if success {
                dismiss()
            }
        }
    }
}

#Preview {
    EditTripView(
        viewModel: TripsViewModel(),
        trip: Trip(
            id: UUID(),
            userId: UUID(),
            name: "Summer Trip",
            description: "A nice trip",
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
        )
    )
}
