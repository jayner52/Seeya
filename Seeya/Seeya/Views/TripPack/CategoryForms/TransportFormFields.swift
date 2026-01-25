import SwiftUI

struct TransportFormFields: View {
    @Binding var details: [String: Any]

    @State private var transportType = ""
    @State private var transportOperator = ""
    @State private var departureStation = ""
    @State private var arrivalStation = ""
    @State private var platform = ""
    @State private var confirmationNumber = ""

    private let transportTypes = ["Train", "Bus", "Ferry", "Shuttle", "Taxi", "Uber/Lyft", "Metro", "Other"]

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Transport Type
            VStack(alignment: .leading, spacing: 6) {
                Text("Transport Type")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Picker("Transport Type", selection: $transportType) {
                    Text("Select...").tag("")
                    ForEach(transportTypes, id: \.self) { type in
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

            // Operator
            FormField(label: "Operator", placeholder: "e.g., Eurostar", text: $transportOperator)

            // Stations
            HStack(spacing: 12) {
                FormField(label: "From", placeholder: "e.g., Gare du Nord", text: $departureStation)
                FormField(label: "To", placeholder: "e.g., St Pancras", text: $arrivalStation)
            }

            // Platform
            FormField(label: "Platform/Track", placeholder: "e.g., Platform 5", text: $platform)

            // Confirmation
            FormField(label: "Confirmation Number", placeholder: "e.g., EUR12345", text: $confirmationNumber)
        }
        .onChange(of: transportType) { updateDetails() }
        .onChange(of: transportOperator) { updateDetails() }
        .onChange(of: departureStation) { updateDetails() }
        .onChange(of: arrivalStation) { updateDetails() }
        .onChange(of: platform) { updateDetails() }
        .onChange(of: confirmationNumber) { updateDetails() }
        .onAppear { loadDetails() }
    }

    private func updateDetails() {
        var dict: [String: Any] = [:]
        if !transportType.isEmpty { dict["transportType"] = transportType }
        if !transportOperator.isEmpty { dict["operator"] = transportOperator }
        if !departureStation.isEmpty { dict["departureStation"] = departureStation }
        if !arrivalStation.isEmpty { dict["arrivalStation"] = arrivalStation }
        if !platform.isEmpty { dict["platform"] = platform }
        if !confirmationNumber.isEmpty { dict["confirmationNumber"] = confirmationNumber }
        details = dict
    }

    private func loadDetails() {
        transportType = details["transportType"] as? String ?? ""
        transportOperator = details["operator"] as? String ?? ""
        departureStation = details["departureStation"] as? String ?? ""
        arrivalStation = details["arrivalStation"] as? String ?? ""
        platform = details["platform"] as? String ?? ""
        confirmationNumber = details["confirmationNumber"] as? String ?? ""
    }
}

#Preview {
    ScrollView {
        TransportFormFields(details: .constant([:]))
            .padding()
    }
}
