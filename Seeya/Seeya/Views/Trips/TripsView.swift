import SwiftUI

struct TripsView: View {
    @State private var viewModel = TripsViewModel()
    @State private var showCreateTrip = false
    @State private var selectedTrip: Trip?
    @Binding var tripIdToOpen: UUID?

    init(tripIdToOpen: Binding<UUID?> = .constant(nil)) {
        _tripIdToOpen = tripIdToOpen
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.seeyaBackground
                    .ignoresSafeArea()

                if viewModel.isLoading && viewModel.trips.isEmpty {
                    ProgressView("Loading trips...")
                } else if viewModel.trips.isEmpty {
                    emptyState
                } else {
                    tripsList
                }

                // Floating add button
                VStack {
                    Spacer()
                    HStack {
                        Spacer()
                        Button {
                            showCreateTrip = true
                        } label: {
                            Image(systemName: "plus")
                                .font(.title2)
                                .fontWeight(.semibold)
                                .foregroundStyle(.white)
                                .frame(width: 56, height: 56)
                                .background(Color.seeyaAccent)
                                .clipShape(Circle())
                                .shadow(color: .black.opacity(0.15), radius: 8, y: 4)
                        }
                        .padding(.trailing, 20)
                        .padding(.bottom, 20)
                    }
                }
            }
            .navigationTitle("My Trips")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showCreateTrip = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .refreshable {
                await viewModel.fetchTrips()
            }
            .sheet(isPresented: $showCreateTrip, onDismiss: {
                Task {
                    await viewModel.fetchTrips()
                }
            }) {
                CreateTripView(viewModel: viewModel)
            }
            .navigationDestination(item: $selectedTrip) { trip in
                TripDetailView(viewModel: viewModel, trip: trip)
            }
            .task {
                await viewModel.fetchTrips()
            }
            .onChange(of: tripIdToOpen) { _, newTripId in
                if let tripId = newTripId {
                    // Find the trip and navigate to it
                    if let trip = viewModel.trips.first(where: { $0.id == tripId }) {
                        selectedTrip = trip
                    }
                    // Clear the navigation request
                    tripIdToOpen = nil
                }
            }
        }
    }

    private var emptyState: some View {
        EmptyStateView(
            icon: "airplane.departure",
            title: "No Trips Yet",
            message: "Start planning your next adventure with friends!",
            buttonTitle: "Create Trip",
            buttonAction: { showCreateTrip = true }
        )
    }

    private var tripsList: some View {
        ScrollView {
            LazyVStack(spacing: 24) {
                // Pending Invitations
                if !viewModel.pendingInvitations.isEmpty {
                    invitationsSection
                }

                // Upcoming Trips
                if !viewModel.upcomingTrips.isEmpty {
                    tripSection(
                        title: "Upcoming Trips",
                        trips: viewModel.upcomingTrips
                    )
                }

                // Past Trips
                if !viewModel.pastTrips.isEmpty {
                    tripSection(
                        title: "Past Trips",
                        trips: viewModel.pastTrips
                    )
                }

                // Error message
                if let error = viewModel.errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .padding()
                }
            }
            .padding(.vertical)
        }
    }

    private var invitationsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Pending Invitations")
                .font(.headline)
                .padding(.horizontal)

            ForEach(viewModel.pendingInvitations) { trip in
                InvitationCard(trip: trip, viewModel: viewModel)
                    .padding(.horizontal)
            }
        }
    }

    private func tripSection(title: String, trips: [Trip]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(title)
                    .font(.headline)
                Spacer()
                Text("\(trips.count)")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal)

            ForEach(trips) { trip in
                TripCard(trip: trip, isOwner: viewModel.isOwner(of: trip))
                    .padding(.horizontal)
                    .onTapGesture {
                        selectedTrip = trip
                    }
            }
        }
    }
}

// MARK: - Invitation Card

struct InvitationCard: View {
    let trip: Trip
    @Bindable var viewModel: TripsViewModel
    @State private var isResponding = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("You're invited!")
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundStyle(Color.seeyaPurple)

                    Text(trip.destination)
                        .font(.title3)
                        .fontWeight(.semibold)

                    Text(trip.name)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Image(systemName: "envelope.badge")
                    .font(.title2)
                    .foregroundStyle(Color.seeyaPurple)
            }

            Text(trip.dateRangeText)
                .font(.subheadline)
                .foregroundStyle(.secondary)

            HStack(spacing: 12) {
                Button {
                    respondToInvite(accept: true)
                } label: {
                    Text("I'm Going!")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color.seeyaSuccess)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }

                Button {
                    respondToInvite(accept: false)
                } label: {
                    Text("Can't Make It")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color(.systemGray6))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
            .disabled(isResponding)
        }
        .padding()
        .background(Color.seeyaCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.seeyaPurple.opacity(0.3), lineWidth: 2)
        )
        .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
    }

    private func respondToInvite(accept: Bool) {
        isResponding = true
        Task {
            _ = await viewModel.respondToInvitation(tripId: trip.id, accept: accept)
            await viewModel.fetchTrips()
            isResponding = false
        }
    }
}

#Preview {
    TripsView()
}
