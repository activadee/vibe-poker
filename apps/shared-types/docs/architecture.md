# Shared Types Library

This library hosts domain models and contract definitions shared by the web and API projects.

## Structure

```mermaid
flowchart TD
    SharedTypes --> Domain[domain.ts]
    SharedTypes --> Rest[rest-contracts.ts]
    SharedTypes --> Ws[ws-contracts.ts]
```

- **domain.ts** – core entities such as `Room` and `Player`.
- **rest-contracts.ts** – shapes of HTTP requests and responses.
- **ws-contracts.ts** – WebSocket message formats.

## Data Sharing

```mermaid
flowchart LR
    Web[Web App] -- uses --> SharedTypes
    API[NestJS API] -- uses --> SharedTypes
```

Using a shared package ensures server and client remain in sync.
