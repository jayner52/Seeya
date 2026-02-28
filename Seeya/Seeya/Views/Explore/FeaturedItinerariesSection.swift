import SwiftUI

// MARK: - Featured Itineraries Section

struct FeaturedItinerariesSection: View {
    @State private var itineraries: [FeaturedItinerary] = []
    @State private var isLoading = true
    @State private var selectedShareCode: String?
    @State private var showItinerary = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            if !isLoading && !itineraries.isEmpty {
                VStack(alignment: .leading, spacing: SeeyaSpacing.md) {
                    // Header
                    HStack {
                        HStack(spacing: SeeyaSpacing.xs) {
                            Image(systemName: "book.pages")
                                .foregroundStyle(Color.seeyaPurple)
                            Text("Featured Itineraries")
                                .font(SeeyaTypography.headlineMedium)
                                .foregroundStyle(Color.seeyaTextPrimary)
                        }
                        Spacer()
                    }

                    // Horizontal scroll
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: SeeyaSpacing.md) {
                            ForEach(itineraries) { itin in
                                Button {
                                    selectedShareCode = itin.shareCode
                                    showItinerary = true
                                } label: {
                                    FeaturedItineraryCard(itinerary: itin)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.horizontal, 1)
                    }
                }
            }
        }
        .task { await fetchFeaturedItineraries() }
        .navigationDestination(isPresented: $showItinerary) {
            if let code = selectedShareCode {
                PublicItineraryView(shareCode: code)
            }
        }
    }

    private func fetchFeaturedItineraries() async {
        guard let url = URL(string: "https://seeya-tawny.vercel.app/api/itineraries/featured") else { return }
        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else { return }

            let decoded = try JSONDecoder().decode(FeaturedItinerariesResponse.self, from: data)
            await MainActor.run {
                itineraries = decoded.itineraries
                isLoading = false
            }
        } catch {
            print("❌ [FeaturedItineraries] Error: \(error)")
            await MainActor.run { isLoading = false }
        }
    }
}

// MARK: - Card

private struct FeaturedItineraryCard: View {
    let itinerary: FeaturedItinerary
    @State private var coverPhotoURL: URL?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Cover
            ZStack(alignment: .bottomLeading) {
                if let url = coverPhotoURL {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().scaledToFill()
                        default:
                            placeholderBackground
                        }
                    }
                    .frame(width: 180, height: 120)
                    .clipped()
                } else {
                    placeholderBackground
                        .frame(width: 180, height: 120)
                }

                if let days = itinerary.durationDays {
                    HStack(spacing: 3) {
                        Image(systemName: "calendar")
                            .font(.caption2)
                        Text("\(days)d")
                            .font(.caption2)
                            .fontWeight(.medium)
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(.black.opacity(0.5))
                    .foregroundStyle(.white)
                    .clipShape(Capsule())
                    .padding(8)
                }
            }
            .frame(width: 180, height: 120)
            .clipShape(UnevenRoundedRectangle(topLeadingRadius: 12, bottomLeadingRadius: 0, bottomTrailingRadius: 0, topTrailingRadius: 12))

            // Info
            VStack(alignment: .leading, spacing: 4) {
                Text(itinerary.title)
                    .font(SeeyaTypography.labelSmall)
                    .foregroundStyle(Color.seeyaTextPrimary)
                    .lineLimit(1)

                Label(itinerary.destination, systemImage: "mappin.circle")
                    .font(SeeyaTypography.caption)
                    .foregroundStyle(Color.seeyaTextSecondary)
                    .lineLimit(1)

                if let creator = itinerary.creator {
                    Label(creator.fullName, systemImage: "person.fill")
                        .font(SeeyaTypography.caption)
                        .foregroundStyle(Color.seeyaTextTertiary)
                        .lineLimit(1)
                }
            }
            .padding(10)
            .frame(width: 180, alignment: .leading)
        }
        .background(Color.seeyaCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.07), radius: 6, y: 3)
        .task { await loadCoverPhoto() }
    }

    private var placeholderBackground: some View {
        LinearGradient(
            colors: [Color.seeyaPurple.opacity(0.3), Color.seeyaPurple.opacity(0.6)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .overlay {
            Image(systemName: "book.pages")
                .font(.system(size: 28))
                .foregroundStyle(.white.opacity(0.5))
        }
    }

    private func loadCoverPhoto() async {
        guard let url = URL(string: "https://seeya-tawny.vercel.app/api/unsplash/city-photo?city=\(itinerary.destination.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? itinerary.destination)") else { return }
        guard let (data, _) = try? await URLSession.shared.data(from: url),
              let json = try? JSONDecoder().decode([String: String].self, from: data),
              let photoURLString = json["photoUrl"],
              let photoURL = URL(string: photoURLString) else { return }
        await MainActor.run { coverPhotoURL = photoURL }
    }
}

// MARK: - Models

struct FeaturedItinerary: Decodable, Identifiable {
    let id: String
    let title: String
    let description: String?
    let destination: String
    let durationDays: Int?
    let shareCode: String
    let viewCount: Int
    let creator: FeaturedCreator?

    enum CodingKeys: String, CodingKey {
        case id, title, description, destination
        case durationDays = "duration_days"
        case shareCode = "share_code"
        case viewCount = "view_count"
        case creator
    }
}

struct FeaturedCreator: Decodable {
    let fullName: String
    let avatarUrl: String?

    enum CodingKeys: String, CodingKey {
        case fullName = "full_name"
        case avatarUrl = "avatar_url"
    }
}

private struct FeaturedItinerariesResponse: Decodable {
    let itineraries: [FeaturedItinerary]
}

#Preview {
    ScrollView {
        FeaturedItinerariesSection()
            .padding()
    }
}
