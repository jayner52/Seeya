import SwiftUI
import MapKit

struct TripRouteMapView: View {
    let locations: [TripLocation]

    private var coordPoints: [CLLocationCoordinate2D] {
        locations.compactMap { l in
            guard let lat = l.city?.latitude, let lng = l.city?.longitude else { return nil }
            return CLLocationCoordinate2D(latitude: lat, longitude: lng)
        }
    }

    private var cameraPosition: MapCameraPosition {
        guard !coordPoints.isEmpty else { return .automatic }
        let lats = coordPoints.map(\.latitude)
        let lngs = coordPoints.map(\.longitude)
        let center = CLLocationCoordinate2D(
            latitude: (lats.min()! + lats.max()!) / 2,
            longitude: (lngs.min()! + lngs.max()!) / 2
        )
        let span = MKCoordinateSpan(
            latitudeDelta: max((lats.max()! - lats.min()!) * 1.6, 2.0),
            longitudeDelta: max((lngs.max()! - lngs.min()!) * 1.6, 2.0)
        )
        return .region(MKCoordinateRegion(center: center, span: span))
    }

    var body: some View {
        if coordPoints.isEmpty {
            EmptyView()
        } else {
            Map(initialPosition: cameraPosition) {
                ForEach(Array(coordPoints.enumerated()), id: \.offset) { _, coord in
                    Annotation("", coordinate: coord) {
                        Circle()
                            .fill(Color.seeyaPurple)
                            .frame(width: 10, height: 10)
                            .overlay(Circle().stroke(.white, lineWidth: 1.5))
                    }
                }
                if coordPoints.count >= 2 {
                    MapPolyline(coordinates: coordPoints)
                        .stroke(Color.seeyaPurple.opacity(0.8), lineWidth: 2)
                }
            }
            .mapStyle(.standard(elevation: .flat))
            .mapControlVisibility(.hidden)
            .frame(width: 110, height: 110)
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
    }
}
