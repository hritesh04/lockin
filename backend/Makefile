.PHONY: swag build run dev

# Regenerate Swagger docs (run this whenever you change handler annotations)
swag:
	swag init -g cmd/server/main.go -o docs --parseDependency --parseInternal

# Build the server binary
build: swag
	go build -o bin/server ./cmd/server

# Run with live .env
run: swag
	go run ./cmd/server

# Alias for run
dev: run
