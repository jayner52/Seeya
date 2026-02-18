import Foundation

struct UnsplashPhoto {
    let url: URL
    let photographer: String
    let photographerURL: URL
}

actor UnsplashService {
    static let shared = UnsplashService()

    private var accessKey: String {
        SecretsManager.unsplashAccessKey
    }

    private let searchURL = "https://api.unsplash.com/search/photos"
    private var cache: [String: UnsplashPhoto?] = [:]

    private init() {}

    var isConfigured: Bool {
        !accessKey.isEmpty && accessKey != "your-unsplash-access-key"
    }

    func fetchCityPhoto(query: String) async -> UnsplashPhoto? {
        if let cached = cache[query] {
            return cached
        }

        guard isConfigured, !query.isEmpty else {
            cache[query] = nil
            return nil
        }

        guard let encodedQuery = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let url = URL(string: "\(searchURL)?query=\(encodedQuery)&orientation=landscape&per_page=1") else {
            cache[query] = nil
            return nil
        }

        var request = URLRequest(url: url)
        request.setValue("Client-ID \(accessKey)", forHTTPHeaderField: "Authorization")

        do {
            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
                cache[query] = nil
                return nil
            }

            let result = try JSONDecoder().decode(UnsplashSearchResponse.self, from: data)

            guard let firstResult = result.results.first,
                  let rawURL = URL(string: firstResult.urls.raw + "&w=800&h=400&fit=crop"),
                  let photographerURL = URL(string: firstResult.user.links.html) else {
                cache[query] = nil
                return nil
            }

            let photo = UnsplashPhoto(
                url: rawURL,
                photographer: firstResult.user.name,
                photographerURL: photographerURL
            )
            cache[query] = photo
            return photo
        } catch {
            print("⚠️ [UnsplashService] City photo lookup failed: \(error.localizedDescription)")
            cache[query] = nil
            return nil
        }
    }
}

// MARK: - API Response Models

private struct UnsplashSearchResponse: Decodable {
    let results: [UnsplashResult]

    struct UnsplashResult: Decodable {
        let urls: URLs
        let user: User
        let links: ResultLinks

        struct URLs: Decodable {
            let raw: String
        }

        struct User: Decodable {
            let name: String
            let links: UserLinks

            struct UserLinks: Decodable {
                let html: String
            }
        }

        struct ResultLinks: Decodable {
            let html: String
        }
    }
}
