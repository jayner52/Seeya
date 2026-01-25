import Foundation

struct Friendship: Codable, Identifiable, Sendable {
    let id: UUID
    let requesterId: UUID
    let addresseeId: UUID
    let status: FriendshipStatus
    let createdAt: Date?
    let updatedAt: Date?
    var requester: Profile?
    var addressee: Profile?

    enum CodingKeys: String, CodingKey {
        case id
        case requesterId = "requester_id"
        case addresseeId = "addressee_id"
        case status
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case requester
        case addressee
    }
}
