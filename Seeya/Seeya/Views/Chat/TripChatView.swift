import SwiftUI

struct TripChatView: View {
    let tripId: UUID
    let tripName: String

    @State private var viewModel: ChatViewModel
    @State private var messageText = ""
    @State private var scrollProxy: ScrollViewProxy?
    @FocusState private var isInputFocused: Bool

    init(tripId: UUID, tripName: String) {
        self.tripId = tripId
        self.tripName = tripName
        self._viewModel = State(initialValue: ChatViewModel(tripId: tripId))
    }

    var body: some View {
        VStack(spacing: 0) {
            // Messages area
            messagesContent

            // Divider
            Divider()

            // Input bar
            inputBar
        }
        .background(Color.seeyaBackground)
        .navigationTitle(tripName)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.fetchMessages()
            await viewModel.subscribeToMessages()
        }
        .onDisappear {
            Task {
                await viewModel.markAsRead()
                await viewModel.unsubscribe()
            }
        }
        .onChange(of: viewModel.messages.count) { _, _ in
            scrollToBottom()
        }
    }

    // MARK: - Messages Content

    @ViewBuilder
    private var messagesContent: some View {
        if viewModel.isLoading && viewModel.messages.isEmpty {
            loadingState
        } else if viewModel.messages.isEmpty {
            emptyState
        } else {
            messagesList
        }
    }

    // MARK: - Loading State

    private var loadingState: some View {
        VStack {
            Spacer()
            ProgressView()
                .scaleEffect(1.2)
            Text("Loading messages...")
                .font(SeeyaTypography.bodySmall)
                .foregroundStyle(.secondary)
                .padding(.top, SeeyaSpacing.xs)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: SeeyaSpacing.md) {
            Spacer()

            Image(systemName: "bubble.left.and.bubble.right")
                .font(.system(size: 56))
                .foregroundStyle(.tertiary)

            Text("No messages yet")
                .font(SeeyaTypography.headlineMedium)

            Text("Start the conversation!")
                .font(SeeyaTypography.bodyMedium)
                .foregroundStyle(.secondary)

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Messages List

    private var messagesList: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: SeeyaSpacing.xxs) {
                    ForEach(Array(viewModel.messages.enumerated()), id: \.element.id) { index, message in
                        let isOwnMessage = message.userId == viewModel.currentUserId
                        let showSender = shouldShowSender(at: index)
                        let showTimestamp = shouldShowTimestamp(at: index)

                        VStack(spacing: 0) {
                            if showTimestamp {
                                timestampDivider(for: message)
                                    .padding(.top, SeeyaSpacing.sm)
                                    .padding(.bottom, SeeyaSpacing.xs)
                            }

                            MessageBubble(
                                message: message,
                                isOwnMessage: isOwnMessage,
                                showSender: showSender,
                                onDelete: isOwnMessage ? {
                                    Task { await viewModel.deleteMessage(message) }
                                } : nil
                            )
                        }
                        .id(message.id)
                    }
                }
                .padding(.horizontal, SeeyaSpacing.sm)
                .padding(.vertical, SeeyaSpacing.xs)
            }
            .onAppear {
                scrollProxy = proxy
                scrollToBottom()
            }
            .onTapGesture {
                isInputFocused = false
            }
        }
    }

    // MARK: - Input Bar

    private var inputBar: some View {
        HStack(spacing: SeeyaSpacing.xs) {
            TextField("Message...", text: $messageText, axis: .vertical)
                .font(SeeyaTypography.bodyMedium)
                .lineLimit(1...5)
                .padding(.horizontal, SeeyaSpacing.sm)
                .padding(.vertical, SeeyaSpacing.xs)
                .background(Color.seeyaCardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 20))
                .focused($isInputFocused)

            Button {
                sendMessage()
            } label: {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.system(size: 32))
                    .foregroundStyle(canSend ? Color.seeyaPurple : Color.gray.opacity(0.4))
            }
            .disabled(!canSend)
        }
        .padding(.horizontal, SeeyaSpacing.sm)
        .padding(.vertical, SeeyaSpacing.xs)
        .background(Color.seeyaBackground)
    }

    // MARK: - Helpers

    private var canSend: Bool {
        !messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !viewModel.isSending
    }

    private func sendMessage() {
        let text = messageText
        messageText = ""
        Task {
            await viewModel.sendMessage(content: text)
        }
    }

    private func scrollToBottom() {
        guard let lastMessage = viewModel.messages.last else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            withAnimation(.easeOut(duration: 0.2)) {
                scrollProxy?.scrollTo(lastMessage.id, anchor: .bottom)
            }
        }
    }

    /// Show sender name/avatar when the previous message is from a different user
    /// or when there is a timestamp gap.
    private func shouldShowSender(at index: Int) -> Bool {
        let message = viewModel.messages[index]
        // Always show sender for other users' first message
        if message.userId == viewModel.currentUserId { return false }
        guard index > 0 else { return true }
        let previous = viewModel.messages[index - 1]
        if previous.userId != message.userId { return true }
        // Show sender if more than 5 minutes apart
        if let current = message.createdAt, let prev = previous.createdAt {
            return current.timeIntervalSince(prev) > 300
        }
        return false
    }

    /// Show a timestamp divider when messages are more than 30 minutes apart
    /// or when it's a new day.
    private func shouldShowTimestamp(at index: Int) -> Bool {
        guard index > 0 else { return true }
        let message = viewModel.messages[index]
        let previous = viewModel.messages[index - 1]

        guard let current = message.createdAt, let prev = previous.createdAt else {
            return false
        }

        // New day
        if !Calendar.current.isDate(current, inSameDayAs: prev) {
            return true
        }

        // More than 30 minutes apart
        return current.timeIntervalSince(prev) > 1800
    }

    private func timestampDivider(for message: ChatMessage) -> some View {
        HStack {
            VStack { Divider() }
            Text(formattedTimestamp(message.createdAt))
                .font(SeeyaTypography.captionSmall)
                .foregroundStyle(.tertiary)
                .lineLimit(1)
            VStack { Divider() }
        }
        .padding(.horizontal, SeeyaSpacing.lg)
    }

    private func formattedTimestamp(_ date: Date?) -> String {
        guard let date = date else { return "" }
        let calendar = Calendar.current

        if calendar.isDateInToday(date) {
            let formatter = DateFormatter()
            formatter.dateFormat = "h:mm a"
            return "Today \(formatter.string(from: date))"
        } else if calendar.isDateInYesterday(date) {
            let formatter = DateFormatter()
            formatter.dateFormat = "h:mm a"
            return "Yesterday \(formatter.string(from: date))"
        } else if calendar.isDate(date, equalTo: Date(), toGranularity: .weekOfYear) {
            let formatter = DateFormatter()
            formatter.dateFormat = "EEEE h:mm a"
            return formatter.string(from: date)
        } else {
            let formatter = DateFormatter()
            formatter.dateFormat = "MMM d, h:mm a"
            return formatter.string(from: date)
        }
    }
}

// MARK: - Message Bubble

private struct MessageBubble: View {
    let message: ChatMessage
    let isOwnMessage: Bool
    let showSender: Bool
    let onDelete: (() -> Void)?

    @State private var showDeleteConfirmation = false

    var body: some View {
        HStack(alignment: .bottom, spacing: SeeyaSpacing.xs) {
            if isOwnMessage {
                Spacer(minLength: 60)
            }

            // Avatar for other users' messages
            if !isOwnMessage {
                if showSender {
                    AvatarView(
                        name: message.sender?.fullName ?? "?",
                        avatarUrl: message.sender?.avatarUrl,
                        size: 28
                    )
                } else {
                    // Invisible spacer to keep alignment
                    Color.clear
                        .frame(width: 28, height: 28)
                }
            }

            VStack(alignment: isOwnMessage ? .trailing : .leading, spacing: 2) {
                // Sender name
                if showSender {
                    Text(message.sender?.fullName ?? "Unknown")
                        .font(SeeyaTypography.captionSmall)
                        .fontWeight(.medium)
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, 4)
                }

                // Bubble
                HStack(alignment: .bottom, spacing: SeeyaSpacing.xxs) {
                    if isOwnMessage {
                        messageTime
                    }

                    Text(message.content)
                        .font(SeeyaTypography.bodyMedium)
                        .foregroundStyle(isOwnMessage ? .white : .primary)
                        .padding(.horizontal, SeeyaSpacing.sm)
                        .padding(.vertical, SeeyaSpacing.xs)
                        .background(
                            isOwnMessage
                                ? Color.seeyaPurple
                                : Color.seeyaCardBackground
                        )
                        .clipShape(
                            RoundedRectangle(cornerRadius: 18)
                        )
                        .contextMenu {
                            if let onDelete = onDelete {
                                Button(role: .destructive) {
                                    showDeleteConfirmation = true
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                            }

                            Button {
                                UIPasteboard.general.string = message.content
                            } label: {
                                Label("Copy", systemImage: "doc.on.doc")
                            }
                        }

                    if !isOwnMessage {
                        messageTime
                    }
                }
            }

            if !isOwnMessage {
                Spacer(minLength: 60)
            }
        }
        .padding(.vertical, 1)
        .confirmationDialog(
            "Delete Message",
            isPresented: $showDeleteConfirmation,
            titleVisibility: .visible
        ) {
            Button("Delete", role: .destructive) {
                onDelete?()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This message will be permanently deleted.")
        }
    }

    private var messageTime: some View {
        Group {
            if let date = message.createdAt {
                Text(shortTime(date))
                    .font(SeeyaTypography.captionSmall)
                    .foregroundStyle(.tertiary)
            }
        }
    }

    private func shortTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: date)
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        TripChatView(
            tripId: UUID(),
            tripName: "Summer Vacation"
        )
    }
}
