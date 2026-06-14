.PHONY: dev dev-backend dev-frontend build migrate migrations shell
.PHONY: test test-backend test-frontend lint lint-backend lint-frontend
.PHONY: docker-up docker-down docker-build clean

# ── Development ──────────────────────────────────────────────────────────────

dev-backend:
	pip install -r backend/requirements.txt
	python backend/manage.py runserver 0.0.0.0:8000

dev-frontend:
	cd frontend && npm install && npm run dev

dev: dev-backend dev-frontend

build:
	cd frontend && npm run build

migrate:
	python backend/manage.py migrate

migrations:
	python backend/manage.py makemigrations

shell:
	python backend/manage.py shell

# ── Testing ──────────────────────────────────────────────────────────────────

test-backend:
	pytest

test-frontend:
	cd frontend && npm run test

test: test-backend test-frontend

# ── Linting ──────────────────────────────────────────────────────────────────

lint-backend:
	ruff check backend/

lint-frontend:
	cd frontend && npm run lint

lint: lint-backend lint-frontend

typecheck:
	cd frontend && npm run typecheck

# ── Docker ───────────────────────────────────────────────────────────────────

docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-build:
	docker compose build

# ── Cleanup ──────────────────────────────────────────────────────────────────

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .ruff_cache -exec rm -rf {} + 2>/dev/null || true
	rm -rf frontend/dist
