package ai

// import (
// 	"context"
// )

// type DummyProvider struct{}

// func NewDummyProvider() *DummyProvider {
// 	return &DummyProvider{}
// }

// func (dp *DummyProvider) Generate(ctx context.Context, prompt string) (BatchResponse, error) {
// 	return BatchResponse{
// 		Questions: []QuestionSchema{
// 			{
// 				Format:      "mcq",
// 				Tier:        1,
// 				Content:     "What is the dummy question?",
// 				Options:     []string{"A dummy", "A smart", "A real", "A fake"},
// 				Answer:      "A dummy",
// 				Explanation: "It is literally a dummy question.",
// 				ConceptTags: []string{"basics"},
// 			},
// 			{
// 				Format:      "true_false",
// 				Tier:        1,
// 				Content:     "This is a dummy question.",
// 				Options:     []string{"True", "False"},
// 				Answer:      "True",
// 				Explanation: "Self-evident.",
// 				ConceptTags: []string{"basics"},
// 			},
// 		},
// 	}, nil
// }
