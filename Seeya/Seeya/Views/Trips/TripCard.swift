import SwiftUI

struct TripCard: View {
    let trip: Trip
    let isOwner: Bool

    @State private var photo: UnsplashPhoto?
    @State private var showAttribution = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Photo Banner
            if let photo {
                ZStack(alignment: .bottom) {
                    AsyncImage(url: photo.url) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .scaledToFill()
                        case .failure:
                            EmptyView()
                                .onAppear { self.photo = nil }
                        default:
                            Color(.systemGray5)
                        }
                    }
                    .frame(height: 120)
                    .clipped()

                    // Gradient overlay
                    LinearGradient(
                        colors: [.black.opacity(0.3), .clear],
                        startPoint: .bottom,
                        endPoint: .top
                    )
                    .frame(height: 40)

                    // Happening Now pill
                    if trip.isCurrent {
                        HStack {
                            HStack(spacing: 4) {
                                Circle()
                                    .fill(.white)
                                    .frame(width: 6, height: 6)
                                Text("Happening Now")
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundStyle(.white)
                            }
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.green.opacity(0.9))
                            .clipShape(Capsule())
                            .padding(8)
                            Spacer()
                        }
                        .frame(maxHeight: .infinity, alignment: .top)
                    }

                    // Attribution info button
                    HStack {
                        Spacer()
                        Button {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                showAttribution.toggle()
                            }
                        } label: {
                            Image(systemName: "info.circle")
                                .font(.system(size: 12))
                                .foregroundStyle(.white.opacity(0.7))
                                .padding(6)
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.trailing, 2)
                    .padding(.top, 2)
                    .frame(maxHeight: .infinity, alignment: .top)

                    // Attribution overlay
                    if showAttribution {
                        HStack(spacing: 0) {
                            Text("Photo by ")
                                .font(.system(size: 9))
                                .foregroundStyle(.white.opacity(0.9))
                            Link(photo.photographer, destination: photo.photographerURL.appending(queryItems: [URLQueryItem(name: "utm_source", value: "seeya"), URLQueryItem(name: "utm_medium", value: "referral")]))
                                .font(.system(size: 9))
                                .foregroundStyle(.white.opacity(0.9))
                                .underline()
                            Text(" / ")
                                .font(.system(size: 9))
                                .foregroundStyle(.white.opacity(0.9))
                            Link("Unsplash", destination: URL(string: "https://unsplash.com/?utm_source=seeya&utm_medium=referral")!)
                                .font(.system(size: 9))
                                .foregroundStyle(.white.opacity(0.9))
                                .underline()
                            Spacer()
                        }
                        .padding(.horizontal, 6)
                        .padding(.bottom, 4)
                        .transition(.opacity)
                    }
                }
            }

            VStack(alignment: .leading, spacing: SeeyaSpacing.sm) {
                // Happening Now pill (for photo-less cards)
                if trip.isCurrent && photo == nil {
                    HStack(spacing: 4) {
                        Circle()
                            .fill(Color.green)
                            .frame(width: 6, height: 6)
                        Text("Happening Now")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(Color.green)
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.green.opacity(0.1))
                    .clipShape(Capsule())
                }

                // Destination & Visibility
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: SeeyaSpacing.xxs) {
                        // Flag + Destination
                        HStack(spacing: SeeyaSpacing.xs) {
                            if let flag = trip.locations?.first?.flagEmoji {
                                Text(flag)
                                    .font(SeeyaTypography.headlineLarge)
                            }
                            Text(trip.allDestinations)
                                .font(SeeyaTypography.headlineLarge)
                                .lineLimit(1)
                        }

                        Text(trip.dateRangeText)
                            .font(SeeyaTypography.bodyMedium)
                            .foregroundStyle(Color.seeyaTextSecondary)
                    }

                    Spacer()

                    if let visibility = trip.visibility, visibility != .fullDetails {
                        Image(systemName: visibility.icon)
                            .font(.system(size: SeeyaIconSize.small))
                            .foregroundStyle(Color.seeyaTextSecondary)
                            .padding(SeeyaSpacing.xs)
                            .background(Color(.systemGray6))
                            .clipShape(Circle())
                    }
                }

                // Trip Name
                Text(trip.name)
                    .font(SeeyaTypography.bodyMedium)
                    .foregroundStyle(Color.seeyaTextSecondary)
                    .lineLimit(1)

                // Participants
                HStack {
                    if let participants = trip.participants, !participants.isEmpty {
                        StackedAvatarsView(
                            participants: participants.filter { $0.status == .confirmed },
                            maxVisible: 3,
                            size: 28
                        )
                    }

                    Spacer()

                    Text(trip.participantText)
                        .font(SeeyaTypography.caption)
                        .foregroundStyle(Color.seeyaTextSecondary)

                    if isOwner {
                        Text("Organizer")
                            .font(SeeyaTypography.labelMedium)
                            .foregroundStyle(Color.seeyaPurple)
                            .padding(.horizontal, SeeyaSpacing.xs)
                            .padding(.vertical, SeeyaSpacing.xxs)
                            .background(Color.seeyaPurple.opacity(0.1))
                            .clipShape(Capsule())
                    }
                }
            }
            .padding(SeeyaSpacing.md)
        }
        .seeyaCard()
        .task {
            let destination = trip.destination
            guard !destination.isEmpty, destination != "Destination TBD" else { return }
            let result = await UnsplashService.shared.fetchCityPhoto(query: destination)
            print("📸 [TripCard] \(destination): \(result?.url.absoluteString.prefix(60) ?? "nil") by \(result?.photographer ?? "n/a")")
            photo = result
        }
    }
}

#Preview {
    VStack(spacing: 16) {
        TripCard(
            trip: Trip(
                id: UUID(),
                userId: UUID(),
                name: "Anniversary Trip",
                description: "A romantic getaway",
                startDate: Date().addingTimeInterval(7 * 24 * 60 * 60),
                endDate: Date().addingTimeInterval(14 * 24 * 60 * 60),
                isFlexible: false,
                visibility: .fullDetails,
                isPast: false,
                createdAt: Date(),
                updatedAt: Date(),
                locations: nil,
                participants: nil,
                owner: nil,
                recommendations: nil,
                tripTypes: nil
            ),
            isOwner: true
        )

        TripCard(
            trip: Trip(
                id: UUID(),
                userId: UUID(),
                name: "Beach Vacation",
                description: nil,
                startDate: nil,
                endDate: nil,
                isFlexible: true,
                visibility: .datesOnly,
                isPast: false,
                createdAt: Date(),
                updatedAt: Date(),
                locations: nil,
                participants: nil,
                owner: nil,
                recommendations: nil,
                tripTypes: nil
            ),
            isOwner: false
        )
    }
    .padding()
    .background(Color.seeyaBackground)
}
