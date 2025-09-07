# Web App Architecture

The web project is an Angular front end that provides the user interface for planning poker sessions.

## Component Flow

```mermaid
flowchart TD
    Lobby[Create or Join Lobby] --> Room[Room View]
    Room --> Estimates[Estimate Components]
    Room --> SocketService
    SocketService --> API[Socket.IO & REST API]
```

- **Lobby** – form for creating or joining a room.
- **Room** – displays participants and their estimates.
- **Estimate Components** – controls for submitting values.
- **SocketService** – wraps Socket.IO client and HTTP calls.

## Data Flow

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant Socket as SocketService
    participant API

    User->>UI: submit join/create
    UI->>Socket: REST request
    Socket->>API: POST /rooms
    API-->>Socket: roomId
    UI->>Socket: connect via WebSocket
    Socket-->>API: join event
    API-->>Socket: room state updates
    Socket-->>UI: render changes
```

Type definitions come from the shared-types library to maintain parity with the server.
