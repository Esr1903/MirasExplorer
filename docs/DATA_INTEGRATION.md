# Data integration

The public API is API-first and paginated. Search, detail, facets and media are served from FastAPI. The repository currently contains no verified import JSON suitable for a public fallback, so the frontend does not fabricate catalogue records when the production API reports zero results.
