import Foundation

struct Continent: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let name: String
    let orderIndex: Int?
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case orderIndex = "order_index"
        case createdAt = "created_at"
    }
}
