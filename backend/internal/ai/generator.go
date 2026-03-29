package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/acerowl/lockin/backend/internal/models"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Generator struct {
	APIKey string
	Client *http.Client
	DB     *pgxpool.Pool
}

func NewGenerator(db *pgxpool.Pool) *Generator {
	return &Generator{
		APIKey: os.Getenv("ANTHROPIC_API_KEY"),
		Client: &http.Client{},
		DB:     db,
	}
}

// BatchResponse is the expected JSON schema from the model
type BatchResponse struct {
	LessonCards []models.LessonCard `json:"lesson_cards"`
	Questions   []struct {
		Format          string   `json:"format"`
		Tier            int      `json:"tier"`
		Content         string   `json:"content"`
		Options         []string `json:"options"`
		Answer          string   `json:"answer"`
		Explanation     string   `json:"explanation"`
		ConceptTags     []string `json:"concept_tags"`
		LessonCardIndex *int     `json:"lesson_card_index"`
	} `json:"questions"`
}

// GenerateAndStoreBatch calls the Claude API and stores the resulting batch in the database
func (g *Generator) GenerateAndStoreBatch(ctx context.Context, topicID uuid.UUID, title, domain, familiarity string, tier int, weakConceptTags []string) error {
	prompt := g.buildPrompt(title, domain, tier, familiarity, weakConceptTags)

	var batchResp BatchResponse
	var err error

	// Retry logic: up to 3 retries on malformed JSON
	for i := 0; i < 3; i++ {
		batchResp, err = g.callClaudeAPI(prompt)
		if err == nil {
			break
		}
		log.Printf("Attempt %d failed: %v", i+1, err)
	}

	if err != nil {
		return fmt.Errorf("failed to generate batch after 3 attempts: %w", err)
	}

	return g.storeBatch(ctx, topicID, batchResp)
}

func (g *Generator) buildPrompt(title, domain string, tier int, familiarity string, weakConceptTags []string) string {
	weakConceptsStr := ""
	if len(weakConceptTags) > 0 {
		weakConceptsStr = fmt.Sprintf("Focus on these weak concepts: %v", weakConceptTags)
	}

	instruction := ""
	if familiarity == "beginner" || familiarity == "some_exposure" {
		instruction = "Generate 5 micro-lesson cards. For each lesson card, generate 2 questions testing that specific lesson. Total 10 questions and 5 lesson cards."
	} else {
		instruction = "Generate 25 standalone questions for someone who already knows the basics. Do not generate any lesson cards (leave the array empty)."
	}

	return fmt.Sprintf(`Topic: %s (Domain: %s)
Tier Level: %d (1=Beginner, 2=Intermediate, 3=Advanced)
User Familiarity: %s

%s
%s

You MUST return ONLY valid JSON matching this schema exactly, and nothing else (no markdown wrapping, no explanation):
{
  "lesson_cards": [
    { "content": "3-5 sentences explaining a core concept...", "tier": %d }
  ],
  "questions": [
    {
      "format": "mcq" | "true_false",
      "tier": %d,
      "content": "Question text...",
      "options": ["A", "B", "C", "D"], // or ["True", "False"] for true_false
      "answer": "Exact string of correct option",
      "explanation": "One line explanation",
      "concept_tags": ["tag1", "tag2"],
      "lesson_card_index": <number or null>
    }
  ]
}`, title, domain, tier, familiarity, instruction, weakConceptsStr, tier, tier)
}

func (g *Generator) callClaudeAPI(prompt string) (BatchResponse, error) {
	// DUMMY QUESTION RETURN
	// As requested, instead of calling the actual Claude API, we return a dummy question batch.
	dummyCardIndex := 0

	return BatchResponse{
		LessonCards: []models.LessonCard{
			{Content: "This is a dummy micro-lesson card explaining the basics of the requested topic.", Tier: 1},
		},
		Questions: []struct {
			Format          string   `json:"format"`
			Tier            int      `json:"tier"`
			Content         string   `json:"content"`
			Options         []string `json:"options"`
			Answer          string   `json:"answer"`
			Explanation     string   `json:"explanation"`
			ConceptTags     []string `json:"concept_tags"`
			LessonCardIndex *int     `json:"lesson_card_index"`
		}{
			{
				Format:          "mcq",
				Tier:            1,
				Content:         "What is the dummy question?",
				Options:         []string{"A dummy", "A smart", "A real", "A fake"},
				Answer:          "A dummy",
				Explanation:     "It is literally a dummy question.",
				ConceptTags:     []string{"basics"},
				LessonCardIndex: &dummyCardIndex,
			},
			{
				Format:          "true_false",
				Tier:            1,
				Content:         "This is a dummy question.",
				Options:         []string{"True", "False"},
				Answer:          "True",
				Explanation:     "Self-evident.",
				ConceptTags:     []string{"basics"},
				LessonCardIndex: &dummyCardIndex,
			},
		},
	}, nil
}

func (g *Generator) storeBatch(ctx context.Context, topicID uuid.UUID, batch BatchResponse) error {
	tx, err := g.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Insert lesson cards mapped by array index
	lessonCardIDs := make(map[int]uuid.UUID)
	for i, card := range batch.LessonCards {
		cardID := uuid.New()
		lessonCardIDs[i] = cardID
		_, err := tx.Exec(ctx,
			"INSERT INTO lesson_cards (id, topic_id, content, tier) VALUES ($1, $2, $3, $4)",
			cardID, topicID, card.Content, card.Tier,
		)
		if err != nil {
			return fmt.Errorf("failed inserting lesson card: %w", err)
		}
	}

	for _, q := range batch.Questions {
		qID := uuid.New()
		var lcID *uuid.UUID
		if q.LessonCardIndex != nil {
			id := lessonCardIDs[*q.LessonCardIndex]
			lcID = &id
		}

		optionsJSON, err := json.Marshal(q.Options)
		if err != nil {
			return err
		}

		_, err = tx.Exec(ctx,
			"INSERT INTO questions (id, topic_id, lesson_card_id, format, content, options, answer, explanation, tier, concept_tags) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
			qID, topicID, lcID, q.Format, q.Content, optionsJSON, q.Answer, q.Explanation, q.Tier, q.ConceptTags,
		)
		if err != nil {
			return fmt.Errorf("failed inserting question: %w", err)
		}
	}

	return tx.Commit(ctx)
}
