import SwiftUI

struct MoneyFormFields: View {
    @Binding var details: [String: Any]

    @State private var moneyType = ""
    @State private var currency = ""
    @State private var amount = ""
    @State private var notes = ""

    private let moneyTypes = ["Budget", "Expense", "Exchange", "Payment", "Refund"]
    private let currencies = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "MXN", "Other"]

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Money Type
            VStack(alignment: .leading, spacing: 6) {
                Text("Type")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Picker("Type", selection: $moneyType) {
                    Text("Select...").tag("")
                    ForEach(moneyTypes, id: \.self) { type in
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

            // Currency & Amount
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Currency")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    Picker("Currency", selection: $currency) {
                        Text("Select...").tag("")
                        ForEach(currencies, id: \.self) { curr in
                            Text(curr).tag(curr)
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

                FormField(label: "Amount", placeholder: "0.00", text: $amount)
                    .keyboardType(.decimalPad)
            }

            // Notes
            VStack(alignment: .leading, spacing: 6) {
                Text("Description")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                TextField("e.g., Hotel deposit", text: $notes, axis: .vertical)
                    .textFieldStyle(.roundedBorder)
                    .lineLimit(2...4)
            }
        }
        .onChange(of: moneyType) { updateDetails() }
        .onChange(of: currency) { updateDetails() }
        .onChange(of: amount) { updateDetails() }
        .onChange(of: notes) { updateDetails() }
        .onAppear { loadDetails() }
    }

    private func updateDetails() {
        var dict: [String: Any] = [:]
        if !moneyType.isEmpty { dict["type"] = moneyType.lowercased() }
        if !currency.isEmpty { dict["currency"] = currency }
        if let amountDouble = Double(amount) { dict["amount"] = amountDouble }
        if !notes.isEmpty { dict["description"] = notes }
        details = dict
    }

    private func loadDetails() {
        moneyType = (details["type"] as? String)?.capitalized ?? ""
        currency = details["currency"] as? String ?? ""
        if let amountValue = details["amount"] as? Double {
            amount = String(format: "%.2f", amountValue)
        }
        notes = details["description"] as? String ?? ""
    }
}

#Preview {
    ScrollView {
        MoneyFormFields(details: .constant([:]))
            .padding()
    }
}
