import SwiftUI

struct OtherFormFields: View {
    @Binding var details: [String: Any]

    @State private var customType = ""
    @State private var customDescription = ""
    @State private var confirmationNumber = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Custom Type
            FormField(label: "Type", placeholder: "e.g., Travel Insurance", text: $customType)

            // Description
            VStack(alignment: .leading, spacing: 6) {
                Text("Description")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                TextField("Describe this item...", text: $customDescription, axis: .vertical)
                    .textFieldStyle(.roundedBorder)
                    .lineLimit(3...6)
            }

            // Confirmation Number (optional)
            FormField(label: "Reference Number (Optional)", placeholder: "e.g., REF12345", text: $confirmationNumber)
        }
        .onChange(of: customType) { updateDetails() }
        .onChange(of: customDescription) { updateDetails() }
        .onChange(of: confirmationNumber) { updateDetails() }
        .onAppear { loadDetails() }
    }

    private func updateDetails() {
        var dict: [String: Any] = [:]
        if !customType.isEmpty { dict["customType"] = customType }
        if !customDescription.isEmpty { dict["description"] = customDescription }
        if !confirmationNumber.isEmpty { dict["confirmationNumber"] = confirmationNumber }
        details = dict
    }

    private func loadDetails() {
        customType = details["customType"] as? String ?? ""
        customDescription = details["description"] as? String ?? ""
        confirmationNumber = details["confirmationNumber"] as? String ?? ""
    }
}

#Preview {
    ScrollView {
        OtherFormFields(details: .constant([:]))
            .padding()
    }
}
