import SwiftUI

struct FlightFormFields: View {
    @Binding var details: [String: Any]

    @State private var airline = ""
    @State private var flightNumber = ""
    @State private var departureAirport = ""
    @State private var arrivalAirport = ""
    @State private var confirmationNumber = ""
    @State private var seatAssignments = ""
    @State private var terminal = ""
    @State private var gate = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Airline & Flight Number
            HStack(spacing: 12) {
                FormField(label: "Airline", placeholder: "e.g., Delta", text: $airline)
                FormField(label: "Flight #", placeholder: "e.g., DL123", text: $flightNumber)
            }

            // Airports
            HStack(spacing: 12) {
                FormField(label: "From (Airport Code)", placeholder: "e.g., JFK", text: $departureAirport)
                FormField(label: "To (Airport Code)", placeholder: "e.g., CDG", text: $arrivalAirport)
            }

            // Confirmation
            FormField(label: "Confirmation Number", placeholder: "e.g., ABC123", text: $confirmationNumber)

            // Seat Assignments
            FormField(label: "Seat Assignments", placeholder: "e.g., 12A, 12B", text: $seatAssignments)

            // Terminal & Gate
            HStack(spacing: 12) {
                FormField(label: "Terminal", placeholder: "e.g., 4", text: $terminal)
                FormField(label: "Gate", placeholder: "e.g., B22", text: $gate)
            }
        }
        .onChange(of: airline) { updateDetails() }
        .onChange(of: flightNumber) { updateDetails() }
        .onChange(of: departureAirport) { updateDetails() }
        .onChange(of: arrivalAirport) { updateDetails() }
        .onChange(of: confirmationNumber) { updateDetails() }
        .onChange(of: seatAssignments) { updateDetails() }
        .onChange(of: terminal) { updateDetails() }
        .onChange(of: gate) { updateDetails() }
        .onAppear { loadDetails() }
    }

    private func updateDetails() {
        var dict: [String: Any] = [:]
        if !airline.isEmpty { dict["airline"] = airline }
        if !flightNumber.isEmpty { dict["flightNumber"] = flightNumber }
        if !departureAirport.isEmpty { dict["departureAirport"] = departureAirport.uppercased() }
        if !arrivalAirport.isEmpty { dict["arrivalAirport"] = arrivalAirport.uppercased() }
        if !confirmationNumber.isEmpty { dict["confirmationNumber"] = confirmationNumber }
        if !seatAssignments.isEmpty { dict["seatAssignments"] = seatAssignments }
        if !terminal.isEmpty { dict["terminal"] = terminal }
        if !gate.isEmpty { dict["gate"] = gate }
        details = dict
    }

    private func loadDetails() {
        airline = details["airline"] as? String ?? ""
        flightNumber = details["flightNumber"] as? String ?? ""
        departureAirport = details["departureAirport"] as? String ?? ""
        arrivalAirport = details["arrivalAirport"] as? String ?? ""
        confirmationNumber = details["confirmationNumber"] as? String ?? ""
        seatAssignments = details["seatAssignments"] as? String ?? ""
        terminal = details["terminal"] as? String ?? ""
        gate = details["gate"] as? String ?? ""
    }
}

// MARK: - Form Field Helper

struct FormField: View {
    let label: String
    let placeholder: String
    @Binding var text: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)

            TextField(placeholder, text: $text)
                .textFieldStyle(.roundedBorder)
        }
    }
}

#Preview {
    ScrollView {
        FlightFormFields(details: .constant([:]))
            .padding()
    }
}
