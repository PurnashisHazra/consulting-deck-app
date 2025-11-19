# Agent Guidelines for Consulting Deck App

## Commands
- **Frontend dev**: `cd frontend && npm start` (port 3000)
- **Frontend build**: `cd frontend && npm run build`
- **Frontend lint**: `cd frontend && npx eslint src/`
- **Backend dev**: `cd backend && uvicorn app:app --reload` (port 8000)
- **Backend deps**: `cd backend && pip install -r requirements.txt`

## Architecture
- **Stack**: React (Create React App) frontend + FastAPI Python backend
- **Frontend**: React 18, Tailwind CSS, React Router, Chart.js/Recharts for visualizations, React Flow for diagrams
- **Backend**: FastAPI, OpenAI API integration (GPT-4o-mini default), MongoDB (Motor/PyMongo), authentication with JWT
- **Database**: MongoDB collections: `decks` (user decks), `users` (auth)
- **Key modules**: `charts_repo.py`, `frameworks_repo.py`, `layout_repo.py`, `infographics_repo.py` contain consulting templates

## Code Style
- **React**: Functional components with hooks; PropTypes not required
- **Imports**: Group by external libs, then internal (`api.js`, `utils/`, `components/`)
- **Naming**: camelCase for JS/React, snake_case for Python
- **Python**: Follow FastAPI async patterns; use Pydantic models for validation
- **ESLint**: React hooks exhaustive-deps warnings enabled
- **Error handling**: Try-catch with fallback values (see `sanitize_for_json`, `repair_json` usage)
