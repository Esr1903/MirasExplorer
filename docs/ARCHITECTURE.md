# Architecture

Next.js App Router supplies the public experience and editor routes. FastAPI owns catalogue search, import staging, duplicate protection and PostgreSQL access. Public pages use `NEXT_PUBLIC_API_BASE_URL`; the browser never receives database credentials.

The living-heritage experience is isolated in `frontend/components/experience`. It provides the courtyard, workshop scenes, labelled object hotspots and collection drawer without loading catalogue records into the initial page.
