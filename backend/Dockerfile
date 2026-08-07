FROM golang:1.25-alpine AS builder

WORKDIR /app

RUN apk add --no-cache make

COPY go.mod go.sum ./
RUN go mod download
RUN go install github.com/swaggo/swag/cmd/swag@latest

COPY . .

RUN make build-docker

FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata && \
    addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY --from=builder /app/main .

# Keep /app read-only for appuser; provide a writable tmpfs for runtime.
VOLUME ["/tmp"]

USER appuser

EXPOSE 8080

CMD ["./main"]
