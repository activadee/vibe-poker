# NFR-001: Reconnect Banner

When the WebSocket connection drops (e.g., API restart), the room page now shows:

- Info banner: “Connection lost. Attempting to reconnect…”
- Success banner after reconnect: “Reconnected to server. Rooms are ephemeral and may reset.”

Behavior details:
- The success banner auto-hides after ~4 seconds.
- Users can dismiss the banner immediately with the Dismiss button.

Test coverage:
- Unit test simulates `disconnect` followed by `connect` and asserts banner state transitions.

