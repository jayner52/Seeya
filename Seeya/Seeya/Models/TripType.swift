import Foundation

struct TripType: Codable, Identifiable, Sendable {
    let id: UUID
    let name: String
    let icon: String?
    let color: String?
    let emoji: String?

    enum CodingKeys: String, CodingKey {
        case id, name, icon, color, emoji
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        icon = try container.decodeIfPresent(String.self, forKey: .icon)
        color = try container.decodeIfPresent(String.self, forKey: .color)
        emoji = try container.decodeIfPresent(String.self, forKey: .emoji)
    }
}
