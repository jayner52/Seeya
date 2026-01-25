import SwiftUI

struct DocumentFormFields: View {
    @Binding var details: [String: Any]

    @State private var documentType = ""
    @State private var documentNumber = ""
    @State private var expiryDate = ""
    @State private var holderName = ""

    private let documentTypes = ["Passport", "Visa", "ID Card", "Driver's License", "Insurance", "Vaccination Record", "Travel Insurance", "Other"]

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Document Type
            VStack(alignment: .leading, spacing: 6) {
                Text("Document Type")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Picker("Document Type", selection: $documentType) {
                    Text("Select...").tag("")
                    ForEach(documentTypes, id: \.self) { type in
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

            // Document Number
            FormField(label: "Document Number", placeholder: "e.g., AB1234567", text: $documentNumber)

            // Holder Name
            FormField(label: "Holder Name", placeholder: "e.g., John Doe", text: $holderName)

            // Expiry Date
            FormField(label: "Expiry Date", placeholder: "e.g., Dec 2028", text: $expiryDate)
        }
        .onChange(of: documentType) { updateDetails() }
        .onChange(of: documentNumber) { updateDetails() }
        .onChange(of: expiryDate) { updateDetails() }
        .onChange(of: holderName) { updateDetails() }
        .onAppear { loadDetails() }
    }

    private func updateDetails() {
        var dict: [String: Any] = [:]
        if !documentType.isEmpty { dict["documentType"] = documentType }
        if !documentNumber.isEmpty { dict["documentNumber"] = documentNumber }
        if !expiryDate.isEmpty { dict["expiryDate"] = expiryDate }
        if !holderName.isEmpty { dict["holderName"] = holderName }
        details = dict
    }

    private func loadDetails() {
        documentType = details["documentType"] as? String ?? ""
        documentNumber = details["documentNumber"] as? String ?? ""
        expiryDate = details["expiryDate"] as? String ?? ""
        holderName = details["holderName"] as? String ?? ""
    }
}

#Preview {
    ScrollView {
        DocumentFormFields(details: .constant([:]))
            .padding()
    }
}
