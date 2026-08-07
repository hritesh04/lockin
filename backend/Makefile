.PHONY: swag build build-docker run dev migrate-up migrate-down migrate-status

GOOSE := go run github.com/pressly/goose/v3/cmd/goose@v3.27.3

swag:
	swag init -g cmd/server/main.go -o docs --parseDependency --parseInternal

build: swag
	go build -o bin/server ./cmd/server

build-docker: swag
	CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o main ./cmd/server/main.go

run: swag
	go run ./cmd/server

dev: run

migrate-up:
	$(GOOSE) -dir migrations postgres "$(DATABASE_URL)" up

migrate-down:
	$(GOOSE) -dir migrations postgres "$(DATABASE_URL)" down

migrate-status:
	$(GOOSE) -dir migrations postgres "$(DATABASE_URL)" status