import SwiftUI

struct TravelersSection: View {
    let trip: Trip
    @Binding var selectedOption: TravelerFilterOption

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Section Header
            HStack {
                Image(systemName: "person.2.fill")
                    .foregroundStyle(Color.seeyaPurple)
                Text("Who's Traveling")
                    .font(.headline)

                Spacer()

                Text("\(trip.totalTravelerCount) traveler\(trip.totalTravelerCount == 1 ? "" : "s") total")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            // Travelers Horizontal Scroll
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    // Owner Card
                    if let owner = trip.owner {
                        TravelerCard(
                            profile: owner,
                            role: "Organizer",
                            isSelected: selectedOption == .specific(owner.id)
                        ) {
                            if selectedOption == .specific(owner.id) {
                                selectedOption = .all
                            } else {
                                selectedOption = .specific(owner.id)
                            }
                        }
                    }

                    // Participant Cards
                    if let participants = trip.participants {
                        ForEach(participants.filter { $0.status == .confirmed }) { participant in
                            if let user = participant.user {
                                TravelerCard(
                                    profile: user,
                                    role: nil,
                                    isSelected: selectedOption == .specific(user.id)
                                ) {
                                    if selectedOption == .specific(user.id) {
                                        selectedOption = .all
                                    } else {
                                        selectedOption = .specific(user.id)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Traveler Card

struct TravelerCard: View {
    let profile: Profile
    let role: String?
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                AvatarView(
                    name: profile.fullName,
                    avatarUrl: profile.avatarUrl,
                    size: 56,
                    showBorder: isSelected
                )
                .overlay(
                    Circle()
                        .stroke(isSelected ? Color.seeyaPurple : Color.clear, lineWidth: 3)
                )

                VStack(spacing: 2) {
                    Text(profile.fullName)
                        .font(.caption)
                        .fontWeight(.medium)
                        .lineLimit(1)
                        .foregroundStyle(.primary)

                    if let role = role {
                        Text(role)
                            .font(.caption2)
                            .foregroundStyle(Color.seeyaPurple)
                    }
                }
            }
            .frame(width: 80)
            .padding(.vertical, 12)
            .padding(.horizontal, 8)
            .background(isSelected ? Color.seeyaPurple.opacity(0.1) : Color.seeyaCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? Color.seeyaPurple : Color.clear, lineWidth: 2)
            )
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    VStack {
        TravelersSection(
            trip: Trip(
                id: UUID(),
                userId: UUID(),
                name: "Test Trip",
                description: nil,
                startDate: Date(),
                endDate: Date(),
                isFlexible: false,
                visibility: .fullDetails,
                isPast: false,
                createdAt: Date(),
                updatedAt: Date(),
                locations: nil,
                participants: nil,
                owner: Profile(
                    id: UUID(),
                    username: "johndoe",
                    fullName: "John Doe",
                    avatarUrl: nil,
                    bio: nil,
                    createdAt: nil,
                    updatedAt: nil
                ),
                recommendations: nil,
                tripTypes: nil
            ),
            selectedOption: .constant(.all)
        )
        .padding()

        Spacer()
    }
    .background(Color.seeyaBackground)
}
