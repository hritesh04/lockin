package lib

import (
	"crypto/rand"
	"errors"
	"fmt"
	"log"
	"math/big"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	minSecretLen    = 32
	issuer          = "lockin"
	accessTokenTTL  = 30 * time.Minute
	refreshTokenTTL = 30 * 24 * time.Hour
)

func getSecret() string {
	secret := os.Getenv("JWT_SECRET")
	if len(secret) < minSecretLen {
		log.Fatalf("JWT_SECRET must be set and at least %d bytes", minSecretLen)
	}
	return secret
}

func EnsureJWTSecret() {
	getSecret()
}

func GenerateToken(userID string) (string, error) {
	return signToken(userID, accessTokenTTL, "access")
}

func GenerateRefreshToken(userID string) (string, error) {
	return signToken(userID, refreshTokenTTL, "refresh")
}

func signToken(userID string, ttl time.Duration, tokenType string) (string, error) {
	secret := getSecret()
	claims := jwt.MapClaims{
		"user_id":    userID,
		"exp":        time.Now().Add(ttl).Unix(),
		"iat":        time.Now().Unix(),
		"iss":        issuer,
		"aud":        issuer,
		"token_type": tokenType,
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func ValidateToken(tokenStr string) (string, error) {
	return validateTokenWithType(tokenStr, "")
}

func ValidateRefreshToken(tokenStr string) (string, error) {
	return validateTokenWithType(tokenStr, "refresh")
}

func validateTokenWithType(tokenStr, expectedType string) (string, error) {
	secret := getSecret()
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		if t.Method.Alg() != "HS256" {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Method.Alg())
		}
		return []byte(secret), nil
	})
	if err != nil || !token.Valid {
		return "", errors.New("invalid token")
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", errors.New("invalid claims")
	}
	userID, ok := claims["user_id"].(string)
	if !ok {
		return "", errors.New("user_id missing")
	}
	if expectedType != "" {
		tokenType, _ := claims["token_type"].(string)
		if tokenType != expectedType {
			return "", errors.New("invalid token type")
		}
	}
	return userID, nil
}

func GenerateRandomString(n int) string {
	const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, n)
	for i := range b {
		idx, err := rand.Int(rand.Reader, big.NewInt(int64(len(letters))))
		if err != nil {
			panic(err)
		}
		b[i] = letters[idx.Int64()]
	}
	return string(b)
}
