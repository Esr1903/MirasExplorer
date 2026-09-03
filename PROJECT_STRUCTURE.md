# MirasExplorer Project Structure

This is the Task 1 skeleton. No application implementation has been started yet.

Architectural boundaries:
- `frontend`: Next.js/TypeScript public + editor UI and separate immersive experience layer.
- `backend`: FastAPI modular monolith, with worker boundaries ready to split later.
- `database`: authoritative PostgreSQL/PostGIS schema plus future seeds/search/views.
- `contracts`: shared JSON/API/scene contracts.
- `infra`: local infrastructure definitions.
- `deploy`: environment-specific deployment manifests/configuration.
- `docs`: architecture, ADR, API, UX, data-contract and deployment documentation.
- `data`: local sample/import/export working areas; runtime data is ignored by Git.
- `tools`: developer-side API/Postman resources.
