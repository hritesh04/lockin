package redis

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/redis/go-redis/v9"
)

var Client *redis.Client

func Connect() error {
	addr := os.Getenv("REDIS_URL")
	if addr == "" {
		addr = "redis://localhost:6379"
	}

	opts, err := redis.ParseURL(addr)
	if err != nil {
		return fmt.Errorf("error parsing REDIS_URL: %w", err)
	}

	opts.PoolSize = 10
	opts.MinIdleConns = 2
	opts.DialTimeout = 5 * time.Second
	opts.ReadTimeout = 5 * time.Second
	opts.WriteTimeout = 5 * time.Second

	client := redis.NewClient(opts)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("error connecting to Redis: %w", err)
	}

	log.Println("Successfully connected to Redis")
	Client = client
	return nil
}

func Close() {
	if Client != nil {
		Client.Close()
	}
}
