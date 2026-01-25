import SwiftUI

struct ActivityFormFields: View {
    @Binding var details: [String: Any]

    @State private var venueName = ""
    @State private var address = ""
    @State private var duration = ""
    @State private var meetingPoint = ""
    @State private var ticketType = ""
    @State private var confirmationNumber = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Venue Name
            FormField(label: "Venue/Activity Name", placeholder: "e.g., Louvre Museum", text: $venueName)

            // Address
            FormField(label: "Address", placeholder: "e.g., Rue de Rivoli, Paris", text: $address)

            // Duration
            FormField(label: "Duration", placeholder: "e.g., 2 hours", text: $duration)

            // Meeting Point
            FormField(label: "Meeting Point", placeholder: "e.g., Main entrance", text: $meetingPoint)

            // Ticket Type
            FormField(label: "Ticket Type", placeholder: "e.g., Skip-the-line", text: $ticketType)

            // Confirmation
            FormField(label: "Confirmation Number", placeholder: "e.g., VTR12345", text: $confirmationNumber)
        }
        .onChange(of: venueName) { updateDetails() }
        .onChange(of: address) { updateDetails() }
        .onChange(of: duration) { updateDetails() }
        .onChange(of: meetingPoint) { updateDetails() }
        .onChange(of: ticketType) { updateDetails() }
        .onChange(of: confirmationNumber) { updateDetails() }
        .onAppear { loadDetails() }
    }

    private func updateDetails() {
        var dict: [String: Any] = [:]
        if !venueName.isEmpty { dict["venueName"] = venueName }
        if !address.isEmpty { dict["address"] = address }
        if !duration.isEmpty { dict["duration"] = duration }
        if !meetingPoint.isEmpty { dict["meetingPoint"] = meetingPoint }
        if !ticketType.isEmpty { dict["ticketType"] = ticketType }
        if !confirmationNumber.isEmpty { dict["confirmationNumber"] = confirmationNumber }
        details = dict
    }

    private func loadDetails() {
        venueName = details["venueName"] as? String ?? ""
        address = details["address"] as? String ?? ""
        duration = details["duration"] as? String ?? ""
        meetingPoint = details["meetingPoint"] as? String ?? ""
        ticketType = details["ticketType"] as? String ?? ""
        confirmationNumber = details["confirmationNumber"] as? String ?? ""
    }
}

#Preview {
    ScrollView {
        ActivityFormFields(details: .constant([:]))
            .padding()
    }
}
