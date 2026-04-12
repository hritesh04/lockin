package ai

import (
	"log"
)

func NewAIProvider(provider string) LLMProvider {
	switch provider {
	case "gemini":
		client, err := NewGeminiClient()
		if err != nil {
			log.Fatalf("Failed to initialize Gemini: %v", err)
		}
		return client
	// case "claude":
	// 	client, err := NewClaudeClient()
	// 	if err != nil {
	// 		log.Fatalf("Failed to initialize Claude: %v", err)
	// 	}
	// 	return client
	// default:
	// 	log.Println("Using Dummy AI Provider")
	// 	client := NewDummyProvider()
	// 	return client
	default:
		client, err := NewGeminiClient()
		if err != nil {
			log.Fatalf("Failed to initialize Gemini: %v", err)
		}
		return client
	}
}