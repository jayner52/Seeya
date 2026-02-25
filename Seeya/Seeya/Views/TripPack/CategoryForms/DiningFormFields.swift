import SwiftUI

struct DiningFormFields: View {
    @Binding var details: [String: Any]

    @State private var restaurantName = ""
    @State private var cuisine = ""
    @State private var address = ""
    @State private var reservationTime = ""
    @State private var partySize = ""
    @State private var confirmationNumber = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Restaurant Name
            FormField(label: "Restaurant / Venue Name", placeholder: "e.g., Le Cinq", text: $restaurantName)

            // Cuisine (optional)
            FormField(label: "Cuisine (optional)", placeholder: "e.g., French, Italian, Sushi", text: $cuisine)

            // Address
            FormField(label: "Address", placeholder: "e.g., 31 Avenue George V", text: $address)

            // Time & Party Size
            HStack(spacing: 12) {
                FormField(label: "Reservation Time", placeholder: "e.g., 7:30 PM", text: $reservationTime)
                FormField(label: "Party Size", placeholder: "e.g., 4", text: $partySize)
                    .keyboardType(.numberPad)
            }

            // Confirmation
            FormField(label: "Confirmation Number (optional)", placeholder: "e.g., RES12345", text: $confirmationNumber)
        }
        .onChange(of: restaurantName) { updateDetails() }
        .onChange(of: cuisine) { updateDetails() }
        .onChange(of: address) { updateDetails() }
        .onChange(of: reservationTime) { updateDetails() }
        .onChange(of: partySize) { updateDetails() }
        .onChange(of: confirmationNumber) { updateDetails() }
        .onAppear { loadDetails() }
    }

    private func updateDetails() {
        var dict: [String: Any] = [:]
        if !restaurantName.isEmpty { dict["restaurantName"] = restaurantName }
        if !cuisine.isEmpty { dict["cuisine"] = cuisine }
        if !address.isEmpty { dict["address"] = address }
        if !reservationTime.isEmpty { dict["reservationTime"] = reservationTime }
        if let size = Int(partySize) { dict["partySize"] = size }
        if !confirmationNumber.isEmpty { dict["confirmationNumber"] = confirmationNumber }
        details = dict
    }

    private func loadDetails() {
        restaurantName = details["restaurantName"] as? String ?? ""
        cuisine = details["cuisine"] as? String ?? ""
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
        DiningFormFields(details: .constant([:]))
            .padding()
    }
}
