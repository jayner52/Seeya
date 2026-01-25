import Foundation

/// Generates creative trip names based on destinations and trip type
struct TripNameGenerator {

    /// Predefined trip types with their vibes
    static let tripVibes: [TripVibe] = [
        // Event/Group Vibes
        TripVibe(id: "bachelor", name: "Bachelor Party", icon: "person.3.fill", adjectives: ["Epic", "Legendary", "Ultimate", "Wild"]),
        TripVibe(id: "bachelorette", name: "Bachelorette", icon: "sparkles", adjectives: ["Fabulous", "Epic", "Ultimate", "Wild"]),
        TripVibe(id: "golf", name: "Golf Trip", icon: "figure.golf", adjectives: ["Epic", "Ultimate", "Championship", "Links"]),
        TripVibe(id: "work", name: "Work Trip", icon: "briefcase.fill", adjectives: ["Business", "Corporate", "Team", "Work"]),
        TripVibe(id: "girls", name: "Girls Trip", icon: "crown.fill", adjectives: ["Girls", "Fabulous", "Epic", "Ultimate"]),
        TripVibe(id: "guys", name: "Guys Trip", icon: "figure.2", adjectives: ["Guys", "Epic", "Ultimate", "Legendary"]),
        TripVibe(id: "sports", name: "Sports Event", icon: "sportscourt.fill", adjectives: ["Game Day", "Championship", "Ultimate", "Epic"]),
        TripVibe(id: "anniversary", name: "Anniversary", icon: "heart.circle.fill", adjectives: ["Anniversary", "Romantic", "Special", "Memorable"]),
        TripVibe(id: "birthday", name: "Birthday Trip", icon: "gift.fill", adjectives: ["Birthday", "Celebratory", "Special", "Epic"]),
        TripVibe(id: "concert", name: "Concert/Festival", icon: "music.note", adjectives: ["Festival", "Music", "Epic", "Ultimate"]),
        TripVibe(id: "ski", name: "Ski Trip", icon: "figure.skiing.downhill", adjectives: ["Ski", "Snowy", "Mountain", "Alpine"]),
        TripVibe(id: "honeymoon", name: "Honeymoon", icon: "heart.fill", adjectives: ["Honeymoon", "Romantic", "Dreamy", "Blissful"]),

        // Activity Vibes
        TripVibe(id: "adventure", name: "Adventure", icon: "figure.hiking", adjectives: ["Epic", "Wild", "Ultimate", "Adventurous"]),
        TripVibe(id: "beach", name: "Beach", icon: "beach.umbrella", adjectives: ["Sunny", "Tropical", "Coastal", "Sandy"]),
        TripVibe(id: "city", name: "City Break", icon: "building.2", adjectives: ["Urban", "Metropolitan", "Downtown", "City"]),
        TripVibe(id: "romantic", name: "Romantic", icon: "heart", adjectives: ["Romantic", "Dreamy", "Lovely", "Enchanting"]),
        TripVibe(id: "family", name: "Family", icon: "figure.2.and.child.holdinghands", adjectives: ["Family", "Fun-Filled", "Memorable", "Special"]),
        TripVibe(id: "foodie", name: "Foodie", icon: "fork.knife", adjectives: ["Culinary", "Tasty", "Gourmet", "Delicious"]),
        TripVibe(id: "wellness", name: "Wellness", icon: "leaf", adjectives: ["Relaxing", "Peaceful", "Zen", "Rejuvenating"]),
        TripVibe(id: "cultural", name: "Cultural", icon: "theatermasks", adjectives: ["Cultural", "Historic", "Artsy", "Enriching"]),
        TripVibe(id: "nightlife", name: "Nightlife", icon: "party.popper", adjectives: ["Party", "Vibrant", "Electric", "Night Out"]),
        TripVibe(id: "nature", name: "Nature", icon: "tree", adjectives: ["Natural", "Scenic", "Wilderness", "Outdoor"]),
        TripVibe(id: "roadtrip", name: "Road Trip", icon: "car", adjectives: ["Epic", "Open Road", "Cross-Country", "Journey"]),
        TripVibe(id: "backpacking", name: "Backpacking", icon: "backpack", adjectives: ["Backpacking", "Explorer", "Wandering", "Discovery"])
    ]

    struct TripVibe: Identifiable, Hashable {
        let id: String
        let name: String
        let icon: String
        let adjectives: [String]
    }

    /// Generate a creative trip name
    static func generateName(
        destinations: [TripsViewModel.TripDestination],
        vibe: TripVibe?,
        startDate: Date?
    ) -> String {
        // Get city names
        let cityNames = destinations.compactMap { dest -> String? in
            if let city = dest.city {
                return city.name
            }
            return dest.customLocation
        }

        guard !cityNames.isEmpty else {
            return "My Trip"
        }

        // Format based on number of destinations
        let destinationText: String
        if cityNames.count == 1 {
            destinationText = cityNames[0]
        } else if cityNames.count == 2 {
            destinationText = "\(cityNames[0]) & \(cityNames[1])"
        } else {
            destinationText = "\(cityNames[0]) + \(cityNames.count - 1) more"
        }

        // Add vibe adjective if available
        if let vibe = vibe, let adjective = vibe.adjectives.randomElement() {
            return "\(adjective) \(destinationText)"
        }

        // Add season/time based name
        if let date = startDate {
            let season = getSeason(from: date)
            return "\(season) in \(destinationText)"
        }

        // Default patterns
        let patterns = [
            "Trip to \(destinationText)",
            "\(destinationText) Adventure",
            "\(destinationText) Getaway",
            "Exploring \(destinationText)"
        ]

        return patterns.randomElement() ?? "Trip to \(destinationText)"
    }

    /// Generate multiple name suggestions (single vibe - legacy)
    static func generateSuggestions(
        destinations: [TripsViewModel.TripDestination],
        vibe: TripVibe?,
        startDate: Date?,
        count: Int = 3
    ) -> [String] {
        let vibes: Set<TripVibe> = vibe != nil ? [vibe!] : []
        return generateSuggestions(destinations: destinations, vibes: vibes, startDate: startDate, count: count)
    }

    /// Generate multiple name suggestions with multiple vibes
    static func generateSuggestions(
        destinations: [TripsViewModel.TripDestination],
        vibes: Set<TripVibe>,
        startDate: Date?,
        count: Int = 4
    ) -> [String] {
        var suggestions: [String] = []

        let cityNames = destinations.compactMap { dest -> String? in
            if let city = dest.city {
                return city.name
            }
            return dest.customLocation
        }

        guard !cityNames.isEmpty else {
            return ["My Trip", "New Adventure", "Upcoming Trip", "The Great Escape"]
        }

        let primaryCity = cityNames[0]
        let shortCity = primaryCity.components(separatedBy: ",").first ?? primaryCity

        // Generate creative names based on vibe combinations
        let vibeList = Array(vibes)

        if vibeList.isEmpty {
            // No vibes selected - generic but fun names
            suggestions.append("\(shortCity) Getaway")
            suggestions.append("The \(shortCity) Trip")
            if let date = startDate {
                let season = getSeason(from: date)
                suggestions.append("\(season) in \(shortCity)")
            }
            suggestions.append("\(shortCity) Adventures")
            if cityNames.count > 1 {
                suggestions.append("\(shortCity) & Beyond")
            }
        } else if vibeList.count == 1 {
            // Single vibe - targeted names
            let vibe = vibeList[0]
            suggestions.append(contentsOf: generateSingleVibeNames(vibe: vibe, city: shortCity, startDate: startDate))
        } else {
            // Multiple vibes - creative combinations
            suggestions.append(contentsOf: generateMultiVibeNames(vibes: vibeList, city: shortCity, startDate: startDate))
        }

        // Ensure uniqueness and limit count
        var uniqueSuggestions: [String] = []
        for suggestion in suggestions {
            if !uniqueSuggestions.contains(suggestion) {
                uniqueSuggestions.append(suggestion)
            }
            if uniqueSuggestions.count >= count {
                break
            }
        }

        return uniqueSuggestions
    }

    /// Generate names for a single vibe
    private static func generateSingleVibeNames(vibe: TripVibe, city: String, startDate: Date?) -> [String] {
        var names: [String] = []

        switch vibe.id {
        case "bachelor":
            names = ["\(city) Send-Off", "The Last Hurrah: \(city)", "\(city) Bachelor Bash", "Groom's \(city) Getaway"]
        case "bachelorette":
            names = ["\(city) Before the Ring", "Bride Tribe: \(city)", "\(city) Bachelorette Bash", "Last Fling in \(city)"]
        case "girls":
            names = ["Girls Gone \(city)", "\(city) Queens Trip", "Ladies of \(city)", "\(city) Girl Gang"]
        case "guys":
            names = ["Boys in \(city)", "\(city) Guys Trip", "The \(city) Brotherhood", "Dudes Do \(city)"]
        case "golf":
            names = ["\(city) Links Trip", "Tee Time in \(city)", "\(city) Golf Getaway", "Fairways of \(city)"]
        case "birthday":
            names = ["Birthday in \(city)", "\(city) Birthday Bash", "Celebrate in \(city)", "Birthday Trip: \(city)"]
        case "anniversary":
            names = ["Anniversary in \(city)", "\(city) Love Trip", "Our \(city) Escape", "Romance in \(city)"]
        case "honeymoon":
            names = ["\(city) Honeymoon", "Newlyweds in \(city)", "Just Married: \(city)", "Honeymoon Bliss: \(city)"]
        case "beach":
            names = ["\(city) Beach Escape", "Sun & Sand: \(city)", "\(city) Shore Trip", "Beachin' in \(city)"]
        case "ski":
            names = ["\(city) Ski Trip", "Slopes of \(city)", "\(city) Powder Run", "Ski \(city)"]
        case "concert":
            names = ["\(city) Music Trip", "Festival Bound: \(city)", "\(city) Concert Getaway", "Live in \(city)"]
        case "foodie":
            names = ["Taste of \(city)", "\(city) Food Tour", "Eat Your Way Through \(city)", "Foodie \(city)"]
        case "adventure":
            names = ["\(city) Adventure", "Wild \(city)", "\(city) Expedition", "Adventure Awaits: \(city)"]
        case "wellness":
            names = ["\(city) Wellness Retreat", "Zen in \(city)", "\(city) Reset", "Relax & Recharge: \(city)"]
        case "nightlife":
            names = ["\(city) Nights", "Party in \(city)", "\(city) After Dark", "Night Out: \(city)"]
        case "cultural":
            names = ["Discover \(city)", "\(city) Culture Trip", "Explore \(city)", "Historic \(city)"]
        case "work":
            names = ["Team \(city)", "\(city) Offsite", "Work Trip: \(city)", "\(city) Conference"]
        case "roadtrip":
            names = ["Road to \(city)", "\(city) Road Trip", "Drive to \(city)", "Open Road: \(city)"]
        default:
            if let adjective = vibe.adjectives.first {
                names = ["\(adjective) \(city)", "\(city) \(vibe.name)", "\(vibe.name) in \(city)"]
            }
        }

        // Add season-based option if date available
        if let date = startDate {
            let season = getSeason(from: date)
            names.append("\(season) \(vibe.name): \(city)")
        }

        return names
    }

    /// Generate creative names for multiple vibes
    private static func generateMultiVibeNames(vibes: [TripVibe], city: String, startDate: Date?) -> [String] {
        var names: [String] = []
        let vibeIds = Set(vibes.map { $0.id })

        // Check for fun combinations
        if vibeIds.contains("girls") && vibeIds.contains("beach") {
            names.append("Beach Babes: \(city)")
            names.append("\(city) Sun Sisters")
        }
        if vibeIds.contains("girls") && vibeIds.contains("nightlife") {
            names.append("Girls Night Out: \(city)")
            names.append("\(city) Queens Night")
        }
        if vibeIds.contains("guys") && vibeIds.contains("golf") {
            names.append("\(city) Golf Bros")
            names.append("Tee Time with the Boys")
        }
        if vibeIds.contains("bachelor") && vibeIds.contains("nightlife") {
            names.append("Epic Bachelor Nights: \(city)")
            names.append("Groom's Last Party: \(city)")
        }
        if vibeIds.contains("bachelorette") && vibeIds.contains("beach") {
            names.append("Beach Bride Tribe: \(city)")
            names.append("Sandy Bachelorette: \(city)")
        }
        if vibeIds.contains("bachelorette") && vibeIds.contains("nightlife") {
            names.append("Last Fling Before the Ring")
            names.append("Bride Squad Nights: \(city)")
        }
        if vibeIds.contains("foodie") && vibeIds.contains("cultural") {
            names.append("Taste & Culture: \(city)")
            names.append("\(city) Food & Art Tour")
        }
        if vibeIds.contains("adventure") && vibeIds.contains("nature") {
            names.append("Wild \(city) Expedition")
            names.append("\(city) Outdoor Adventure")
        }
        if vibeIds.contains("romantic") && vibeIds.contains("beach") {
            names.append("Beach Romance: \(city)")
            names.append("Love on the Shore: \(city)")
        }
        if vibeIds.contains("ski") && vibeIds.contains("guys") {
            names.append("Bros on the Slopes: \(city)")
            names.append("\(city) Ski Squad")
        }
        if vibeIds.contains("birthday") && vibeIds.contains("nightlife") {
            names.append("Birthday Bash: \(city)")
            names.append("Party Like It's Your Birthday")
        }

        // If no specific combo matched, combine vibe names creatively
        if names.isEmpty {
            let vibeNames = vibes.prefix(2).map { $0.name }
            names.append("\(vibeNames.joined(separator: " & ")): \(city)")

            if let firstVibe = vibes.first, let adjective = firstVibe.adjectives.first {
                names.append("\(adjective) \(city) Trip")
            }
        }

        // Add generic multi-vibe options
        names.append("The Ultimate \(city) Trip")
        names.append("\(city) Experience")

        // Add season if available
        if let date = startDate {
            let season = getSeason(from: date)
            names.append("\(season) \(city) Escape")
        }

        return names
    }

    private static func getSeason(from date: Date) -> String {
        let month = Calendar.current.component(.month, from: date)
        switch month {
        case 3...5: return "Spring"
        case 6...8: return "Summer"
        case 9...11: return "Fall"
        default: return "Winter"
        }
    }
}
