.PHONY: swag build build-docker run dev

swag:
	swag init -g cmd/server/main.go -o docs --parseDependency --parseInternal

build: swag
	go build -o bin/server ./cmd/server

build-docker: swag
	CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o main ./cmd/server/main.go

run: swag
	go run ./cmd/server

dev: run
