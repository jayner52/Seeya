import SwiftUI

struct ReservationFormFields: View {
    @Binding var details: [String: Any]

    @State private var venueName = ""
    @State private var venueType = ""
    @State private var address = ""
    @State private var reservationTime = ""
    @State private var partySize = ""
    @State private var confirmationNumber = ""

    private let venueTypes = ["Restaurant", "Spa", "Tour", "Class", "Event", "Show", "Other"]

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Venue Name
            FormField(label: "Venue Name", placeholder: "e.g., Le Cinq", text: $venueName)

            // Venue Type
            VStack(alignment: .leading, spacing: 6) {
                Text("Venue Type")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Picker("Venue Type", selection: $venueType) {
                    Text("Select...").tag("")
                    ForEach(venueTypes, id: \.self) { type in
                        Text(type).tag(type)
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

            // Address
            FormField(label: "Address", placeholder: "e.g., 31 Avenue George V", text: $address)

            // Time & Party Size
            HStack(spacing: 12) {
                FormField(label: "Reservation Time", placeholder: "e.g., 7:30 PM", text: $reservationTime)
                FormField(label: "Party Size", placeholder: "e.g., 4", text: $partySize)
                    .keyboardType(.numberPad)
            }

            // Confirmation
            FormField(label: "Confirmation Number", placeholder: "e.g., RES12345", text: $confirmationNumber)
        }
        .onChange(of: venueName) { updateDetails() }
        .onChange(of: venueType) { updateDetails() }
        .onChange(of: address) { updateDetails() }
        .onChange(of: reservationTime) { updateDetails() }
        .onChange(of: partySize) { updateDetails() }
        .onChange(of: confirmationNumber) { updateDetails() }
        .onAppear { loadDetails() }
    }

    private func updateDetails() {
        var dict: [String: Any] = [:]
        if !venueName.isEmpty { dict["venueName"] = venueName }
        if !venueType.isEmpty { dict["venueType"] = venueType }
        if !address.isEmpty { dict["address"] = address }
        if !reservationTime.isEmpty { dict["reservationTime"] = reservationTime }
        if let size = Int(partySize) { dict["partySize"] = size }
        if !confirmationNumber.isEmpty { dict["confirmationNumber"] = confirmationNumber }
        details = dict
    }

    private func loadDetails() {
        venueName = details["venueName"] as? String ?? ""
        venueType = details["venueType"] as? String ?? ""
        address = details["address"] as? String ?? ""
        reservationTime = details["reservationTime"] as? String ?? ""
        if let size = details["partySize"] as? Int {
            partySize = String(size)
        }
        confirmationNumber = details["confirmationNumber"] as? String ?? ""
    }
}

#Preview {
    ScrollView {
        ReservationFormFields(details: .constant([:]))
            .padding()
    }
}
