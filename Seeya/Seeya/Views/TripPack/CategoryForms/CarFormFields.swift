import SwiftUI

struct CarFormFields: View {
    @Binding var details: [String: Any]

    @State private var rentalCompany = ""
    @State private var vehicleType = ""
    @State private var pickupLocation = ""
    @State private var dropoffLocation = ""
    @State private var confirmationNumber = ""

    private let vehicleTypes = ["Economy", "Compact", "Mid-size", "Full-size", "SUV", "Minivan", "Luxury", "Convertible", "Other"]

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Rental Company
            FormField(label: "Rental Company", placeholder: "e.g., Hertz", text: $rentalCompany)

            // Vehicle Type
            VStack(alignment: .leading, spacing: 6) {
                Text("Vehicle Type")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Picker("Vehicle Type", selection: $vehicleType) {
                    Text("Select...").tag("")
                    ForEach(vehicleTypes, id: \.self) { type in
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

            // Pickup Location
            FormField(label: "Pickup Location", placeholder: "e.g., CDG Airport", text: $pickupLocation)

            // Dropoff Location
            FormField(label: "Drop-off Location", placeholder: "e.g., Nice Airport", text: $dropoffLocation)

            // Confirmation
            FormField(label: "Confirmation Number", placeholder: "e.g., HZ987654", text: $confirmationNumber)
        }
        .onChange(of: rentalCompany) { updateDetails() }
        .onChange(of: vehicleType) { updateDetails() }
        .onChange(of: pickupLocation) { updateDetails() }
        .onChange(of: dropoffLocation) { updateDetails() }
        .onChange(of: confirmationNumber) { updateDetails() }
        .onAppear { loadDetails() }
    }

    private func updateDetails() {
        var dict: [String: Any] = [:]
        if !rentalCompany.isEmpty { dict["rentalCompany"] = rentalCompany }
        if !vehicleType.isEmpty { dict["vehicleType"] = vehicleType }
        if !pickupLocation.isEmpty { dict["pickupLocation"] = pickupLocation }
        if !dropoffLocation.isEmpty { dict["dropoffLocation"] = dropoffLocation }
        if !confirmationNumber.isEmpty { dict["confirmationNumber"] = confirmationNumber }
        details = dict
    }

    private func loadDetails() {
        rentalCompany = details["rentalCompany"] as? String ?? ""
        vehicleType = details["vehicleType"] as? String ?? ""
        pickupLocation = details["pickupLocation"] as? String ?? ""
        dropoffLocation = details["dropoffLocation"] as? String ?? ""
        confirmationNumber = details["confirmationNumber"] as? String ?? ""
    }
}

#Preview {
    ScrollView {
        CarFormFields(details: .constant([:]))
            .padding()
    }
}
