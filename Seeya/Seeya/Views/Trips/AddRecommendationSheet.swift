import SwiftUI

struct AddRecommendationSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var viewModel: TripsViewModel
    let tripId: UUID

    @State private var title = ""
    @State private var description = ""
    @State private var category: RecommendationCategory = .restaurant

    private var isValid: Bool {
        !title.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker("Category", selection: $category) {
                        ForEach(RecommendationCategory.allCases, id: \.self) { cat in
                            Label(cat.displayName, systemImage: cat.icon)
                                .tag(cat)
                        }
                    }
                    .pickerStyle(.menu)
                } header: {
                    Text("Category")
                }

                Section {
                    TextField("Title", text: $title)

                    TextField("Description (optional)", text: $description, axis: .vertical)
                        .lineLimit(3...6)
                } header: {
                    Text("Details")
                }

                if let error = viewModel.errorMessage {
                    Section {
                        Text(error)
                            .foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("Add Recommendation")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        addRecommendation()
                    }
                    .fontWeight(.semibold)
                    .disabled(!isValid || viewModel.isLoading)
                }
            }
        }
    }

    private func addRecommendation() {
        Task {
            let success = await viewModel.addRecommendation(
                tripId: tripId,
                title: title.trimmingCharacters(in: .whitespaces),
                description: description.isEmpty ? nil : description,
                category: category
            )

            if success {
                dismiss()
            }
        }
    }
}

#Preview {
    AddRecommendationSheet(viewModel: TripsViewModel(), tripId: UUID())
}
