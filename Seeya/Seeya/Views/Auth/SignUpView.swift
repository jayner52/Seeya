import SwiftUI

struct SignUpView: View {
    @Bindable var viewModel: AuthViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var fullName = ""
    @State private var username = ""

    private var isFormValid: Bool {
        !email.isEmpty &&
        !password.isEmpty &&
        !fullName.isEmpty &&
        !username.isEmpty &&
        password == confirmPassword &&
        password.count >= 6
    }

    private var passwordError: String? {
        if !password.isEmpty && password.count < 6 {
            return "Password must be at least 6 characters"
        }
        if !confirmPassword.isEmpty && password != confirmPassword {
            return "Passwords do not match"
        }
        return nil
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                Text("Create Account")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                VStack(spacing: 16) {
                    TextField("Full Name", text: $fullName)
                        .textFieldStyle(.roundedBorder)
                        .textContentType(.name)

                    TextField("Username", text: $username)
                        .textFieldStyle(.roundedBorder)
                        .textContentType(.username)
                        .autocapitalization(.none)

                    TextField("Email", text: $email)
                        .textFieldStyle(.roundedBorder)
                        .textContentType(.emailAddress)
                        .autocapitalization(.none)
                        .keyboardType(.emailAddress)

                    SecureField("Password", text: $password)
                        .textFieldStyle(.roundedBorder)
                        .textContentType(.newPassword)

                    SecureField("Confirm Password", text: $confirmPassword)
                        .textFieldStyle(.roundedBorder)
                        .textContentType(.newPassword)

                    if let error = passwordError {
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(.orange)
                    }
                }
                .padding(.horizontal)

                if let error = viewModel.errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }

                Button {
                    Task {
                        await viewModel.signUp(
                            email: email,
                            password: password,
                            fullName: fullName,
                            username: username
                        )
                    }
                } label: {
                    if viewModel.isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                    } else {
                        Text("Sign Up")
                            .frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.borderedProminent)
                .padding(.horizontal)
                .disabled(!isFormValid || viewModel.isLoading)

                Button("Already have an account? Sign In") {
                    dismiss()
                }
                .font(.footnote)
            }
            .padding(.vertical)
        }
        .navigationBarTitleDisplayMode(.inline)
    }
}

#Preview {
    NavigationStack {
        SignUpView(viewModel: AuthViewModel())
    }
}
