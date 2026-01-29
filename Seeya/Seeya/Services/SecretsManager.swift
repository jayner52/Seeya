import Foundation

enum SecretsManager {
    private static var secrets: [String: Any]? = {
        guard let url = Bundle.main.url(forResource: "Secrets", withExtension: "plist"),
              let data = try? Data(contentsOf: url),
              let plist = try? PropertyListSerialization.propertyList(from: data, format: nil) as? [String: Any] else {
            return nil
        }
        return plist
    }()

    static var googlePlacesAPIKey: String {
        secrets?["GOOGLE_PLACES_API_KEY"] as? String ?? ""
    }

    static var openRouterAPIKey: String {
        secrets?["OPENROUTER_API_KEY"] as? String ?? ""
    }
}
