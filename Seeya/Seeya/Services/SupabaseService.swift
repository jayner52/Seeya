import Foundation
import Supabase

final class SupabaseService: Sendable {
    static let shared = SupabaseService()

    let client: SupabaseClient

    private let storageBucket = "trip-documents"

    private init() {
        client = SupabaseClient(
            supabaseURL: URL(string: "https://vrvknkvgqyoqmovjmvpb.supabase.co")!,
            supabaseKey: "sb_publishable_0KziTg7HUoZSviEnXL0kow_RWDtcSZD"
        )
    }

    // MARK: - Storage Operations

    /// Uploads a file to Supabase storage
    /// - Parameters:
    ///   - data: The file data to upload
    ///   - path: The storage path (e.g., "tripId/filename.jpg")
    ///   - contentType: The MIME type (e.g., "image/jpeg", "application/pdf")
    /// - Returns: The public URL of the uploaded file
    func uploadFile(data: Data, path: String, contentType: String) async throws -> String {
        try await client.storage
            .from(storageBucket)
            .upload(
                path,
                data: data,
                options: FileOptions(contentType: contentType)
            )

        // Get the public URL
        let publicURL = try client.storage
            .from(storageBucket)
            .getPublicURL(path: path)

        return publicURL.absoluteString
    }

    /// Gets a signed URL for private file access
    /// - Parameters:
    ///   - path: The storage path
    ///   - expiresIn: Expiration time in seconds (default 1 hour)
    /// - Returns: A signed URL with temporary access
    func getSignedURL(path: String, expiresIn: Int = 3600) async throws -> URL {
        try await client.storage
            .from(storageBucket)
            .createSignedURL(path: path, expiresIn: expiresIn)
    }

    /// Downloads a file from storage
    /// - Parameter path: The storage path
    /// - Returns: The file data
    func downloadFile(path: String) async throws -> Data {
        try await client.storage
            .from(storageBucket)
            .download(path: path)
    }

    /// Deletes a file from storage
    /// - Parameter path: The storage path
    func deleteFile(path: String) async throws {
        try await client.storage
            .from(storageBucket)
            .remove(paths: [path])
    }

    /// Deletes multiple files from storage
    /// - Parameter paths: Array of storage paths
    func deleteFiles(paths: [String]) async throws {
        try await client.storage
            .from(storageBucket)
            .remove(paths: paths)
    }

    /// Generates a unique storage path for a file
    /// - Parameters:
    ///   - tripId: The trip ID
    ///   - fileName: The original file name
    /// - Returns: A unique storage path
    func generateStoragePath(tripId: UUID, fileName: String) -> String {
        let timestamp = Int(Date().timeIntervalSince1970)
        let uuid = UUID().uuidString.prefix(8)
        let sanitizedName = fileName.replacingOccurrences(of: " ", with: "_")
        return "\(tripId.uuidString)/\(timestamp)_\(uuid)_\(sanitizedName)"
    }
}
