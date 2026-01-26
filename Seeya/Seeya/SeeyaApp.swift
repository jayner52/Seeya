import SwiftUI

@main
struct SeeyaApp: App {
    @State private var deepLinkManager = DeepLinkManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(deepLinkManager)
                .onOpenURL { url in
                    deepLinkManager.handleURL(url)
                }
                .sheet(isPresented: $deepLinkManager.showInviteReceivedView) {
                    if let code = deepLinkManager.pendingInviteCode {
                        InviteReceivedView(inviteCode: code) {
                            deepLinkManager.clearPendingInvite()
                        }
                    }
                }
        }
    }
}

// MARK: - Deep Link Manager

@Observable
@MainActor
final class DeepLinkManager {
    var pendingInviteCode: String?
    var showInviteReceivedView = false

    func handleURL(_ url: URL) {
        // Handle seeya://invite/{code}
        guard url.scheme == "seeya" else { return }

        switch url.host {
        case "invite":
            if let code = url.pathComponents.last, code != "/" {
                pendingInviteCode = code
                showInviteReceivedView = true
                print("📬 [DeepLink] Received invite code: \(code)")
            }

        default:
            print("⚠️ [DeepLink] Unknown URL: \(url)")
        }
    }

    func clearPendingInvite() {
        pendingInviteCode = nil
        showInviteReceivedView = false
    }
}
