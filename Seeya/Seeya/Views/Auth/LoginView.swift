import SwiftUI

struct LoginView: View {
    @Bindable var viewModel: AuthViewModel
    @State private var email = ""
    @State private var password = ""
    @State private var showSignUp = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Spacer()

                Text("Seeya")
                    .font(.system(size: 48, weight: .bold))

                Text("Plan trips with friends")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                Spacer()

                // Google Sign-In Button
                Button {
                    Task {
                        await viewModel.signInWithGoogle()
                    }
                } label: {
                    HStack(spacing: 12) {
                        // Google "G" logo
                        GoogleLogoView()
                            .frame(width: 20, height: 20)

                        Text("Continue with Google")
                            .fontWeight(.medium)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color(.systemBackground))
                    .foregroundStyle(.primary)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(Color(.systemGray4), lineWidth: 1)
                    )
                }
                .padding(.horizontal)
                .disabled(viewModel.isLoading)

                // Divider
                HStack {
                    Rectangle()
                        .fill(Color(.systemGray4))
                        .frame(height: 1)
                    Text("or")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Rectangle()
                        .fill(Color(.systemGray4))
                        .frame(height: 1)
                }
                .padding(.horizontal)

                // Email/Password Fields
                VStack(spacing: 16) {
                    TextField("Email", text: $email)
                        .textFieldStyle(.roundedBorder)
                        .textContentType(.emailAddress)
                        .autocapitalization(.none)
                        .keyboardType(.emailAddress)

                    SecureField("Password", text: $password)
                        .textFieldStyle(.roundedBorder)
                        .textContentType(.password)
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
                        await viewModel.signIn(email: email, password: password)
                    }
                } label: {
                    if viewModel.isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                    } else {
                        Text("Sign In")
                            .frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.borderedProminent)
                .padding(.horizontal)
                .disabled(email.isEmpty || password.isEmpty || viewModel.isLoading)

                Button("Don't have an account? Sign Up") {
                    showSignUp = true
                }
                .font(.footnote)

                Spacer()
            }
            .navigationDestination(isPresented: $showSignUp) {
                SignUpView(viewModel: viewModel)
            }
        }
    }
}

// MARK: - Google Logo View

struct GoogleLogoView: View {
    var body: some View {
        ZStack {
            // Blue
            Circle()
                .trim(from: 0.0, to: 0.25)
                .stroke(Color(red: 66/255, green: 133/255, blue: 244/255), lineWidth: 3)
            // Green
            Circle()
                .trim(from: 0.25, to: 0.5)
                .stroke(Color(red: 52/255, green: 168/255, blue: 83/255), lineWidth: 3)
            // Yellow
            Circle()
                .trim(from: 0.5, to: 0.75)
                .stroke(Color(red: 251/255, green: 188/255, blue: 5/255), lineWidth: 3)
            // Red
            Circle()
                .trim(from: 0.75, to: 1.0)
                .stroke(Color(red: 234/255, green: 67/255, blue: 53/255), lineWidth: 3)
        }
        .rotationEffect(.degrees(-90))
    }
}

#Preview {
    LoginView(viewModel: AuthViewModel())
}
