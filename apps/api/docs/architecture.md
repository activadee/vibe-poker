# API Architecture

The API project is a NestJS application that manages planning poker rooms and synchronizes state across clients.

## Module Structure

```mermaid
flowchart TD
    AppModule --> RoomsModule
    AppModule --> HealthController
    RoomsModule --> RoomsController
    RoomsModule --> RoomsGateway
    RoomsModule --> RoomsService
    RoomsService --> TTLSweeper
```

- **RoomsController** – REST endpoints for creating rooms and retrieving state.
- **RoomsGateway** – Socket.IO gateway that broadcasts events.
- **RoomsService** – central room logic and coordination.
- **TTL Sweeper** – background service removing expired rooms.
- **HealthController** – simple health check endpoint.

## Request Flow

```mermaid
sequenceDiagram
    participant Web as Web Client
    participant Rest as REST Controller
    participant Service as RoomsService
    participant Ws as RoomsGateway

    Web->>Rest: POST /rooms
    Rest->>Service: createRoom()
    Service-->>Web: roomId
    Web->>Ws: join(roomId)
    Ws->>Service: joinRoom()
    Service-->>Ws: room state
    Ws-->>Web: broadcast updates
```

Shared models are imported from `@scrum-poker/shared-types` to keep the contracts consistent.
