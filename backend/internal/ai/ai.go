package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/acerowl/lockin/backend/internal/models"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type LLMProvider interface {
	GenerateRoadmap(ctx context.Context, prompt string) (string, error)
	GenerateTopicQuestions(ctx context.Context, prompt string) (string, error)
	EvaluateTopicSession(ctx context.Context, prompt string) (string, error)
	GenerateAssessmentQuestions(ctx context.Context, prompt string) (string, error)
	GenerateReviewCards(ctx context.Context, prompt string) (string, error)
	GenerateSocraticFollowUp(ctx context.Context, prompt string) (string, error)
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
	ConceptTags []string          `json:"concept_tags,omitempty"`
	Options     []RoadmapOptionAI `json:"options"`
}

type TopicEvaluationAIResponse struct {
	NewTier          int    `json:"new_tier"`
	NewRemark        string `json:"new_remark"`
	RecommendedFocus string `json:"recommended_focus,omitempty"`
}

// ReviewCardAI is a single generative flashcard returned by the LLM.
type ReviewCardAI struct {
	Prompt     string `json:"prompt"`
	Answer     string `json:"answer"`
	ConceptTag string `json:"concept_tag"`
}

// ReviewCardsAIResponse is the top-level AI response for review-card generation.
type ReviewCardsAIResponse struct {
	Cards []ReviewCardAI `json:"cards"`
}

// SocraticFollowUpAIResponse is the top-level AI response for a Socratic follow-up.
type SocraticFollowUpAIResponse struct {
	FollowUp    string `json:"follow_up"`
	Feedback    string `json:"feedback"`
	Explanation string `json:"explanation"`
}

func (g *Generator) GenerateRoadmap(ctx context.Context, topicID string, topic string, proficiency string, recommendedFocus string) error {
	goal := ""
	if err := g.DB.QueryRow(ctx,
		"SELECT COALESCE(u.goal, '') FROM users u JOIN topics t ON t.user_id = u.id WHERE t.id = $1",
		topicID,
	).Scan(&goal); err != nil {
		log.Println("Warning: could not fetch user goal:", err)
	}
	prompt := g.buildRoadmapPrompt(topic, proficiency, goal, recommendedFocus)
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
		_, _ = g.DB.Exec(ctx, "UPDATE topics SET status = 'failed' WHERE id = $1", topicID)
		return fmt.Errorf("failed to store roadmap: %w", err)
	}

	_, _ = g.DB.Exec(ctx, "UPDATE topics SET status = 'completed' WHERE id = $1", topicID)

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
			if module.Index == 1 && lesson.Index == 1 {
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

func (g *Generator) GenerateTopicQuestions(ctx context.Context, topic string, tier int, remark string, quizMode string, weakConcepts []string) ([]models.Question, error) {
	prompt := g.buildTopicSessionPrompt(topic, tier, remark, quizMode, weakConcepts)
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
			ConceptTags: q.ConceptTags,
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
	prompt := g.buildTopicSessionEvaluationPrompt(topic, tier, remark, sessionData)
	res, err := g.Provider.EvaluateTopicSession(ctx, prompt)
	if err != nil {
		return 0, "", err
	}

	var aiRes TopicEvaluationAIResponse
	if err := json.Unmarshal([]byte(res), &aiRes); err != nil {
		return 0, "", fmt.Errorf("failed to parse evaluation JSON: %w", err)
	}

	if aiRes.NewTier < 1 {
		aiRes.NewTier = 1
	} else if aiRes.NewTier > 10 {
		aiRes.NewTier = 10
	}

	return aiRes.NewTier, aiRes.NewRemark, nil
}

func (g *Generator) GenerateTopicAssessment(ctx context.Context, topic string, proficiency string) (TopicSessionAIResponse, error) {
	start := time.Now()
	log.Println("Generating Assessment Questions for topic: ", topic, " Starting at ", start)
	prompt := g.buildAssessmentPrompt(topic, proficiency)
	res, err := g.Provider.GenerateAssessmentQuestions(ctx, prompt)
	if err != nil {
		log.Println("Error generating assessment questions:", err)
		return TopicSessionAIResponse{}, err
	}
	log.Println("Assessment Questions generated successfully: ", time.Since(start))
	var questions TopicSessionAIResponse
	if err := json.Unmarshal([]byte(res), &questions); err != nil {
		log.Println("Error parsing assessment questions JSON:", err)
		return TopicSessionAIResponse{}, err
	}
	return questions, nil
}

func (g *Generator) EvaluateTopicAssessment(ctx context.Context, topic string, resposne string) (TopicEvaluationAIResponse, error) {
	start := time.Now()
	log.Println("Evaluating Answers of Assessment Questions for topic: ", topic, " Starting at ", start)
	prompt := g.buildAssessmentEvaluationPrompt(topic, resposne)
	res, err := g.Provider.EvaluateTopicSession(ctx, prompt)
	log.Println("Evaluation completed in: ", time.Since(start))
	if err != nil {
		return TopicEvaluationAIResponse{}, err
	}
	var aiRes TopicEvaluationAIResponse
	if err := json.Unmarshal([]byte(res), &aiRes); err != nil {
		return TopicEvaluationAIResponse{}, fmt.Errorf("failed to parse evaluation JSON: %w", err)
	}

	if aiRes.NewTier < 1 {
		aiRes.NewTier = 1
	} else if aiRes.NewTier > 10 {
		aiRes.NewTier = 10
	}

	return aiRes, nil
}

// GenerateReviewCards asks the LLM to produce generative flashcards for a topic,
// scaled to the user's tier and seeded with the topic's lesson summaries and concept tags.
func (g *Generator) GenerateReviewCards(ctx context.Context, topic string, tier int, content string, questionCount int) ([]models.ReviewCardInput, error) {
	prompt := g.buildReviewCardsPrompt(topic, tier, content, questionCount)
	start := time.Now()
	log.Println("Generating Review Cards for topic: ", topic, " Starting at ", start)
	res, err := g.Provider.GenerateReviewCards(ctx, prompt)
	if err != nil {
		log.Println("Error generating review cards:", err)
		return nil, err
	}
	log.Println("Review Cards generated successfully: ", time.Since(start))

	var aiRes ReviewCardsAIResponse
	if err := json.Unmarshal([]byte(res), &aiRes); err != nil {
		log.Println("Error parsing review cards JSON:", err)
		return nil, fmt.Errorf("failed to parse review cards JSON: %w", err)
	}

	cards := make([]models.ReviewCardInput, 0, len(aiRes.Cards))
	for _, c := range aiRes.Cards {
		if strings.TrimSpace(c.Prompt) == "" || strings.TrimSpace(c.Answer) == "" {
			continue
		}
		cards = append(cards, models.ReviewCardInput{
			Prompt:     strings.TrimSpace(c.Prompt),
			Answer:     strings.TrimSpace(c.Answer),
			ConceptTag: strings.TrimSpace(c.ConceptTag),
		})
	}
	return cards, nil
}

// SocraticFollowUp asks the LLM for a conceptual "Why?" follow-up on a
// free-text answer. The evaluation is conceptual, not exact-match.
func (g *Generator) SocraticFollowUp(ctx context.Context, topic string, tier int, question string, userAnswer string) (models.SocraticFollowUp, error) {
	var empty models.SocraticFollowUp
	prompt := g.buildSocraticPrompt(topic, tier, question, userAnswer)
	start := time.Now()
	log.Println("Generating Socratic follow-up for topic: ", topic, " Starting at ", start)
	res, err := g.Provider.GenerateSocraticFollowUp(ctx, prompt)
	if err != nil {
		log.Println("Error generating Socratic follow-up:", err)
		return empty, err
	}
	log.Println("Socratic follow-up generated in: ", time.Since(start))

	var aiRes SocraticFollowUpAIResponse
	if err := json.Unmarshal([]byte(res), &aiRes); err != nil {
		log.Println("Error parsing Socratic follow-up JSON:", err)
		return empty, fmt.Errorf("failed to parse Socratic follow-up JSON: %w", err)
	}

	if strings.TrimSpace(aiRes.FollowUp) == "" {
		return empty, fmt.Errorf("empty follow_up in Socratic response")
	}

	return models.SocraticFollowUp{
		FollowUp:    strings.TrimSpace(aiRes.FollowUp),
		Feedback:    strings.TrimSpace(aiRes.Feedback),
		Explanation: strings.TrimSpace(aiRes.Explanation),
	}, nil
}
