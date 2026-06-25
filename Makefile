.PHONY: build-models build-chorus build-frontend build deploy synth clean dev-frontend dev-models dev-chorus

build-models:
	cd backend/models && cargo lambda build --release --arm64

build-chorus:
	cd backend/chorus && cargo lambda build --release --arm64

build-frontend:
	cd frontend && bun install && bun run build

build: build-models build-chorus build-frontend

deploy: build
	set -a && . ./.env && set +a && cd infra && npx cdk deploy --require-approval never

synth:
	set -a && . ./.env && set +a && cd infra && npx cdk synth

clean:
	cd backend/models && cargo clean
	cd backend/chorus && cargo clean
	cd frontend && rm -rf dist node_modules

dev-frontend:
	cd frontend && bun run dev

dev-models:
	cd backend/models && cargo lambda watch --invoke-port 9001 --env-file ../../.env

dev-chorus:
	cd backend/chorus && cargo lambda watch --invoke-port 9002 --env-file ../../.env
