import SwiftUI

struct EnterInviteCodeSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel = InviteViewModel()

    @State private var code = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showInviteReceived = false

    var onJoinSuccess: (() -> Void)?

    var body: some View {
        NavigationStack {
            VStack(spacing: 32) {
                // Icon + headline
                VStack(spacing: 12) {
                    Image(systemName: "link.badge.plus")
                        .font(.system(size: 52))
                        .foregroundStyle(Color.seeyaPurple)

                    Text("Join a Trip")
                        .font(.title2)
                        .fontWeight(.bold)

                    Text("Enter the invite code someone shared with you")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding(.top, 16)

                // Code input
                VStack(alignment: .leading, spacing: 8) {
                    Text("Invite Code")
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundStyle(.secondary)

                    TextField("e.g. ABC12345", text: $code)
                        .font(.title3.monospaced())
                        .textInputAutocapitalization(.characters)
                        .autocorrectionDisabled()
                        .multilineTextAlignment(.center)
                        .padding()
                        .background(Color(.systemGray6))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                        .onChange(of: code) { _, newValue in
                            // Keep uppercase, max 8 chars
                            let filtered = String(newValue.uppercased().filter { $0.isLetter || $0.isNumber }.prefix(8))
                            if filtered != newValue { code = filtered }
                            errorMessage = nil
                        }

                    if let error = errorMessage {
                        HStack(spacing: 4) {
                            Image(systemName: "exclamationmark.circle")
                                .font(.caption)
                            Text(error)
                                .font(.caption)
                        }
                        .foregroundStyle(.red)
                    }
                }

                // Join button
                Button {
                    joinWithCode()
                } label: {
                    HStack {
                        if isLoading {
                            ProgressView().tint(.white)
                        } else {
                            Image(systemName: "arrow.right.circle.fill")
                            Text("Look Up Trip")
                        }
                    }
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(code.count >= 6 ? Color.seeyaPurple : Color.seeyaPurple.opacity(0.4))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .disabled(code.count < 6 || isLoading)

                Spacer()
            }
            .padding(.horizontal, 24)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
        .sheet(isPresented: $showInviteReceived) {
            InviteReceivedView(inviteCode: code) {
                onJoinSuccess?()
                dismiss()
            }
        }
    }

    private func joinWithCode() {
        let trimmed = code.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }

        isLoading = true
        errorMessage = nil

        Task {
            let success = await viewModel.loadInviteFromCode(trimmed)
            isLoading = false

            if success {
                showInviteReceived = true
            } else {
                errorMessage = viewModel.errorMessage ?? "Invite code not found. Check the code and try again."
            }
        }
    }
}

#Preview {
    EnterInviteCodeSheet()
}
