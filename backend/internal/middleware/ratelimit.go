package middleware

import (
	"context"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
)

type rateLimiter struct {
	mu       sync.Mutex
	requests map[string][]time.Time
	limit    int
	window   time.Duration
}

func newRateLimiter(limit int, window time.Duration) *rateLimiter {
	return &rateLimiter{
		requests: make(map[string][]time.Time),
		limit:    limit,
		window:   window,
	}
}

func (rl *rateLimiter) allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-rl.window)

	timestamps := rl.requests[key]
	valid := make([]time.Time, 0, len(timestamps))
	for _, t := range timestamps {
		if t.After(cutoff) {
			valid = append(valid, t)
		}
	}

	if len(valid) >= rl.limit {
		rl.requests[key] = valid
		return false
	}

	rl.requests[key] = append(valid, now)
	return true
}

func (rl *rateLimiter) cleanup() {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	cutoff := time.Now().Add(-rl.window)
	for key, timestamps := range rl.requests {
		valid := make([]time.Time, 0, len(timestamps))
		for _, t := range timestamps {
			if t.After(cutoff) {
				valid = append(valid, t)
			}
		}
		if len(valid) == 0 {
			delete(rl.requests, key)
		} else {
			rl.requests[key] = valid
		}
	}
}

func AuthRateLimit() fiber.Handler {
	limiter := newRateLimiter(20, time.Minute)

	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			limiter.cleanup()
		}
	}()

	return func(c *fiber.Ctx) error {
		ip := c.IP()
		if !limiter.allow("auth:" + ip) {
			return c.Status(429).JSON(fiber.Map{
				"success": false,
				"error":   "Too many requests. Please try again later.",
			})
		}
		return c.Next()
	}
}

func AIRateLimit() fiber.Handler {
	limiter := newRateLimiter(5, time.Minute)

	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			limiter.cleanup()
		}
	}()

	return func(c *fiber.Ctx) error {
		userID, ok := c.Locals("user_id").(string)
		if !ok || userID == "" {
			return c.Next()
		}
		if !limiter.allow("ai:" + userID) {
			return c.Status(429).JSON(fiber.Map{
				"success": false,
				"error":   "AI rate limit exceeded. Please try again later.",
			})
		}
		return c.Next()
	}
}

func TopicCreationRateLimit(rdb *redis.Client) fiber.Handler {
	const limit = 2

	return func(c *fiber.Ctx) error {
		userID, ok := c.Locals("user_id").(string)
		if !ok || userID == "" {
			return c.Next()
		}

		key := "rate_limit:topic:" + userID
		ctx := context.Background()

		val, err := rdb.Get(ctx, key).Int64()
		if err != nil && err != redis.Nil {
			return c.Next()
		}

		if val >= limit {
			return c.Status(429).JSON(fiber.Map{
				"success": false,
				"error":   "You can only create up to 2 topics.",
			})
		}

		return c.Next()
	}
}

func ReviewCardGenerationRateLimit(rdb *redis.Client) fiber.Handler {
	const limit = 2

	return func(c *fiber.Ctx) error {
		userID, ok := c.Locals("user_id").(string)
		if !ok || userID == "" {
			return c.Next()
		}

		key := "rate_limit:review:" + userID
		ctx := context.Background()

		val, err := rdb.Get(ctx, key).Int64()
		if err != nil && err != redis.Nil {
			return c.Next()
		}

		if val >= limit {
			return c.Status(429).JSON(fiber.Map{
				"success": false,
				"error":   "You can only generate review cards 2 times per day.",
			})
		}

		return c.Next()
	}
}
