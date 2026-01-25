import SwiftUI

struct StayFormFields: View {
    @Binding var details: [String: Any]

    @State private var propertyName = ""
    @State private var propertyType = ""
    @State private var address = ""
    @State private var checkInTime = ""
    @State private var checkOutTime = ""
    @State private var roomType = ""
    @State private var confirmationNumber = ""

    private let propertyTypes = ["Hotel", "Airbnb", "Hostel", "Resort", "Villa", "Apartment", "Other"]

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Property Name
            FormField(label: "Property Name", placeholder: "e.g., Hotel Marais", text: $propertyName)

            // Property Type
            VStack(alignment: .leading, spacing: 6) {
                Text("Property Type")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Picker("Property Type", selection: $propertyType) {
                    Text("Select...").tag("")
                    ForEach(propertyTypes, id: \.self) { type in
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
            FormField(label: "Address", placeholder: "e.g., 123 Rue de Rivoli, Paris", text: $address)

            // Check-in/out times
            HStack(spacing: 12) {
                FormField(label: "Check-in Time", placeholder: "e.g., 3:00 PM", text: $checkInTime)
                FormField(label: "Check-out Time", placeholder: "e.g., 11:00 AM", text: $checkOutTime)
            }

            // Room Type
            FormField(label: "Room Type", placeholder: "e.g., Deluxe King", text: $roomType)

            // Confirmation
            FormField(label: "Confirmation Number", placeholder: "e.g., HM12345", text: $confirmationNumber)
        }
        .onChange(of: propertyName) { updateDetails() }
        .onChange(of: propertyType) { updateDetails() }
        .onChange(of: address) { updateDetails() }
        .onChange(of: checkInTime) { updateDetails() }
        .onChange(of: checkOutTime) { updateDetails() }
        .onChange(of: roomType) { updateDetails() }
        .onChange(of: confirmationNumber) { updateDetails() }
        .onAppear { loadDetails() }
    }

    private func updateDetails() {
        var dict: [String: Any] = [:]
        if !propertyName.isEmpty { dict["propertyName"] = propertyName }
        if !propertyType.isEmpty { dict["propertyType"] = propertyType }
        if !address.isEmpty { dict["address"] = address }
        if !checkInTime.isEmpty { dict["checkInTime"] = checkInTime }
        if !checkOutTime.isEmpty { dict["checkOutTime"] = checkOutTime }
        if !roomType.isEmpty { dict["roomType"] = roomType }
        if !confirmationNumber.isEmpty { dict["confirmationNumber"] = confirmationNumber }
        details = dict
    }

    private func loadDetails() {
        propertyName = details["propertyName"] as? String ?? ""
        propertyType = details["propertyType"] as? String ?? ""
        address = details["address"] as? String ?? ""
        checkInTime = details["checkInTime"] as? String ?? ""
        checkOutTime = details["checkOutTime"] as? String ?? ""
        roomType = details["roomType"] as? String ?? ""
        confirmationNumber = details["confirmationNumber"] as? String ?? ""
    }
}

#Preview {
    ScrollView {
        StayFormFields(details: .constant([:]))
            .padding()
    }
}
