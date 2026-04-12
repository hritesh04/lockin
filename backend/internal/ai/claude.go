// package ai

// import (
// 	"context"
// 	"encoding/json"
// 	"fmt"
// 	"os"

// 	"github.com/anthropics/anthropic-sdk-go"
// 	"github.com/anthropics/anthropic-sdk-go/option"
// )

// type ClaudeClient struct {
// 	client *anthropic.Client
// 	model  string
// }

// func NewClaudeClient() (*ClaudeClient, error) {
// 	apiKey := os.Getenv("ANTHROPIC_API_KEY")
// 	if apiKey == "" {
// 		return nil, fmt.Errorf("ANTHROPIC_API_KEY is not set")
// 	}

// 	client := anthropic.NewClient(
// 		option.WithAPIKey(apiKey),
// 	)

// 	return &ClaudeClient{
// 		client: &client,
// 		model:  anthropic.ModelClaudeOpus4_0,
// 	}, nil
// }

// func (c *ClaudeClient) Generate(ctx context.Context, prompt string) (BatchResponse, error) {
// 	schema := anthropic.ToolParam{
// 		Name:        "generate_quiz",
// 		Description: anthropic.String("Generate a batch of micro-lessons and quiz questions based on the prompt instructions."),
// 		InputSchema: anthropic.ToolInputSchemaParam{
// 			Type: anthropic.ToolInputSchemaTypeObject,
// 			Properties: map[string]interface{}{
// 				"lesson_cards": map[string]interface{}{
// 					"type": "array",
// 					"items": map[string]interface{}{
// 						"type": "object",
// 						"properties": map[string]interface{}{
// 							"content": map[string]interface{}{"type": "string"},
// 							"tier":    map[string]interface{}{"type": "integer"},
// 						},
// 						"required": []string{"content", "tier"},
// 					},
// 				},
// 				"questions": map[string]interface{}{
// 					"type": "array",
// 					"items": map[string]interface{}{
// 						"type": "object",
// 						"properties": map[string]interface{}{
// 							"format":            map[string]interface{}{"type": "string", "enum": []string{"mcq", "true_false"}},
// 							"tier":              map[string]interface{}{"type": "integer"},
// 							"content":           map[string]interface{}{"type": "string"},
// 							"options":           map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}},
// 							"answer":            map[string]interface{}{"type": "string"},
// 							"explanation":       map[string]interface{}{"type": "string"},
// 							"concept_tags":      map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}},
// 							"lesson_card_index": map[string]interface{}{"type": "integer"},
// 						},
// 						"required": []string{"format", "tier", "content", "options", "answer", "explanation", "concept_tags"},
// 					},
// 				},
// 			},
// 			Required: anthropic.F([]string{"lesson_cards", "questions"}),
// 		},
// 	}

// 	msg, err := c.client.Messages.New(ctx, anthropic.MessageNewParams{
// 		Model:     anthropic.F(c.model),
// 		MaxTokens: anthropic.F(int64(4096)),
// 		ToolChoice: anthropic.F(anthropic.ToolChoiceUnionParam(anthropic.ToolChoiceToolParam{
// 			Type: anthropic.F(anthropic.ToolChoiceToolTypeTool),
// 			Name: anthropic.F("generate_quiz"),
// 		})),
// 		Tools: anthropic.F([]anthropic.ToolParam{schema}),
// 		Messages: anthropic.F([]anthropic.MessageParam{
// 			anthropic.NewUserMessage(anthropic.NewTextBlock(prompt)),
// 		}),
// 	})

// 	if err != nil {
// 		return BatchResponse{}, err
// 	}

// 	for _, block := range msg.Content {
// 		if block.Type == anthropic.ContentBlockTypeToolUse {

// 			inputBytes, err := json.Marshal(block.ToolUse.Input)
// 			if err != nil {
// 				return BatchResponse{}, fmt.Errorf("failed to encode tool input proxy: %w", err)
// 			}

// 			var resp BatchResponse
// 			if err := json.Unmarshal(inputBytes, &resp); err != nil {
// 				return BatchResponse{}, fmt.Errorf("failed to parse structured output from claude tool args: %w", err)
// 			}
// 			return resp, nil
// 		}
// 	}

//		return BatchResponse{}, fmt.Errorf("no tool_use block returned from claude")
//	}
package ai