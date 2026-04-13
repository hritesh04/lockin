package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/acerowl/lockin/backend/internal/models"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type LLMProvider interface {
	GenerateRoadmap(ctx context.Context, prompt string) (string, error)
	GenerateTopicQuestions(ctx context.Context, prompt string) (string, error)
	EvaluateTopicSession(ctx context.Context, prompt string) (string, error)
}

type Generator struct {
	Provider LLMProvider
	DB       *pgxpool.Pool
}

func NewGenerator(db *pgxpool.Pool, provider LLMProvider) *Generator {
	return &Generator{
		Provider: provider,
		DB:       db,
	}
}

// -- Response types for parsing AI output --

// RoadmapAIResponse is the top-level AI response for roadmap generation
type RoadmapAIResponse struct {
	Modules []RoadmapModuleAI `json:"modules"`
}

type RoadmapModuleAI struct {
	Index       int               `json:"index"`
	Title       string            `json:"title"`
	Description string            `json:"description"`
	Lessons     []RoadmapLessonAI `json:"lessons"`
}

type RoadmapLessonAI struct {
	Index   int             `json:"index"`
	Content string          `json:"content"`
	Quizzes []RoadmapQuizAI `json:"quizzes"`
}

type RoadmapQuizAI struct {
	Index    int               `json:"index"`
	Type     string            `json:"type"`
	Question string            `json:"question"`
	Options  []RoadmapOptionAI `json:"options"`
}

type RoadmapOptionAI struct {
	Index       int    `json:"index"`
	Label       string `json:"label"`
	Explanation string `json:"explanation"`
	IsCorrect   bool   `json:"is_correct"`
}

type TopicSessionAIResponse struct {
	Questions []TopicQuestionAI `json:"questions"`
}

type TopicQuestionAI struct {
	Index       int               `json:"index"`
	Type        string            `json:"type"`
	Question    string            `json:"question"`
	Options     []RoadmapOptionAI `json:"options"`
}

type TopicEvaluationAIResponse struct {
	NewTier   int    `json:"new_tier"`
	NewRemark string `json:"new_remark"`
}

func (g *Generator) GenerateRoadmap(ctx context.Context, topicID string, topic string, proficiency string) error {
	prompt := g.buidlRoadmapPrompt(topic, proficiency)
	start := time.Now()
	log.Println("Generating Roadmap for topic: ", topicID, " Starting at ", start)
	res, err := g.Provider.GenerateRoadmap(ctx, prompt)
	log.Println("Roadmap generation took: ", time.Since(start))
	if err != nil {
		log.Println("Error generating roadmap:", err)
		return err
	}

	var roadmap models.Roadmap
	if err := json.Unmarshal([]byte(res), &roadmap); err != nil {
		log.Println("Error parsing roadmap JSON:", err)
		return fmt.Errorf("failed to parse roadmap response: %w", err)
	}

	if err := g.storeRoadmap(ctx, topicID, roadmap); err != nil {
		log.Println("Error storing roadmap:", err)
		return fmt.Errorf("failed to store roadmap: %w", err)
	}

	log.Printf("Roadmap saved for topic %s: %d modules", topicID, len(roadmap.Modules))
	return nil
}

// storeRoadmap saves the full roadmap (modules → lessons → questions → options) in a single transaction.
func (g *Generator) storeRoadmap(ctx context.Context, topicID string, roadmap models.Roadmap) error {
	tx, err := g.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for _, module := range roadmap.Modules {
		moduleID := uuid.New()

		// First module is available, rest are locked
		status := "locked"
		if module.Index == 1 {
			status = "in-progress"
		}

		_, err := tx.Exec(ctx,
			`INSERT INTO modules (id, topic_id, title, description, index, status, concept_tags)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			moduleID, topicID, module.Title, module.Description, module.Index, status, module.ConceptTags,
		)
		if err != nil {
			return fmt.Errorf("failed inserting module %q: %w", module.Title, err)
		}

		for _, lesson := range module.Lessons {
			lessonID := uuid.New()
			status := "locked"
			if lesson.Index == 1 {
				status = "in-progress"
			}
			_, err := tx.Exec(ctx,
				`INSERT INTO lessons (id, node_id, content, index, title, description, status)
				 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
				lessonID, moduleID, lesson.Content, lesson.Index, lesson.Title, lesson.Description, status,
			)
			if err != nil {
				return fmt.Errorf("failed inserting lesson: %w", err)
			}

			for _, quiz := range lesson.Quizzes {
				questionID := uuid.New()

				// For MCQ/true_false the answer is determined by is_correct on options.
				// For fill_blank/short_answer, answer can be nil.
				_, err := tx.Exec(ctx,
					`INSERT INTO questions (id, node_id, lesson_id, index, type, question)
					 VALUES ($1, $2, $3, $4, $5, $6)`,
					questionID, moduleID, lessonID, quiz.Index, quiz.Type, quiz.Question,
				)
				if err != nil {
					return fmt.Errorf("failed inserting question: %w", err)
				}

				for _, opt := range quiz.Options {
					optionID := uuid.New()

					_, err := tx.Exec(ctx,
						`INSERT INTO question_options (id, question_id, index, label, explanation, is_correct)
						 VALUES ($1, $2, $3, $4, $5, $6)`,
						optionID, questionID, opt.Index, opt.Label, opt.Explanation, opt.IsCorrect,
					)
					if err != nil {
						return fmt.Errorf("failed inserting option: %w", err)
					}
				}
			}
		}
	}

	return tx.Commit(ctx)
}

func (g *Generator) GenerateTopicQuestions(ctx context.Context, topic string, tier int, remark string, quizMode string) ([]models.Question, error) {
	prompt := g.buildTopicSessionPrompt(topic, tier, remark, quizMode)
	start := time.Now()
	log.Println("Generating Topic Questions for topic: ", topic, " Starting at ", start)
	res, err := g.Provider.GenerateTopicQuestions(ctx, prompt)
	if err != nil {
		log.Println("Error generating topic questions:", err)
		return nil, err
	}
	log.Println("Topic Questions generated successfully: ", time.Since(start))
	var aiRes TopicSessionAIResponse
	if err := json.Unmarshal([]byte(res), &aiRes); err != nil {
		log.Println("Error parsing topic session JSON:", err)
		return nil, fmt.Errorf("failed to parse topic session JSON: %w", err)
	}

	questions := make([]models.Question, len(aiRes.Questions))
	for i, q := range aiRes.Questions {
		questions[i] = models.Question{
			ID:          uuid.New().String(),
			Index:       q.Index,
			Type:        models.QuestionType(q.Type),
			Question:    q.Question,
		}
		for _, opt := range q.Options {
			questions[i].Options = append(questions[i].Options, models.Option{
				ID:          uuid.New().String(),
				QuestionID:  questions[i].ID,
				Index:       opt.Index,
				Label:       opt.Label,
				Explanation: opt.Explanation,
				IsCorrect:   opt.IsCorrect,
			})
		}
	}

	return questions, nil
}

func (g *Generator) EvaluateTopicSession(ctx context.Context, topic string, tier int, remark string, sessionData string) (int, string, error) {
	prompt := g.buildTopicEvaluationPrompt(topic, tier, remark, sessionData)
	res, err := g.Provider.EvaluateTopicSession(ctx, prompt)
	if err != nil {
		return 0, "", err
	}

	var aiRes TopicEvaluationAIResponse
	if err := json.Unmarshal([]byte(res), &aiRes); err != nil {
		return 0, "", fmt.Errorf("failed to parse evaluation JSON: %w", err)
	}

	return aiRes.NewTier, aiRes.NewRemark, nil
}