package service

import (
	"testing"
	"time"

	"github.com/acerowl/lockin/backend/internal/models"
	"github.com/acerowl/lockin/backend/internal/repository"
)

func activityEntry(day string, seconds int) repository.UserSessionActivity {
	t, err := time.Parse("2006-01-02", day)
	if err != nil {
		panic(err)
	}
	created := t.In(time.UTC)
	completed := created.Add(time.Duration(seconds) * time.Second)
	return repository.UserSessionActivity{CreatedAt: created, CompletedAt: &completed}
}

func TestComputeStreakWithCommitment_MeetsGoalEachDay(t *testing.T) {
	now := time.Date(2026, 8, 7, 12, 0, 0, 0, time.UTC)
	activity := []repository.UserSessionActivity{
		activityEntry("2026-08-07", 1200),
		activityEntry("2026-08-06", 1200),
		activityEntry("2026-08-05", 1200),
	}

	current, longest := computeStreakWithCommitment(activity, 600, now, 0)
	if current != 3 {
		t.Errorf("expected current=3, got %d", current)
	}
	if longest != 3 {
		t.Errorf("expected longest=3, got %d", longest)
	}
}

func TestComputeStreakWithCommitment_BreaksOnMissedDay(t *testing.T) {
	now := time.Date(2026, 8, 7, 12, 0, 0, 0, time.UTC)
	activity := []repository.UserSessionActivity{
		activityEntry("2026-08-07", 1200),
		activityEntry("2026-08-05", 1200),
	}

	current, longest := computeStreakWithCommitment(activity, 600, now, 0)
	if current != 1 {
		t.Errorf("expected current=1, got %d", current)
	}
	if longest != 2 {
		t.Errorf("expected longest=2, got %d", longest)
	}
}

func TestComputeStreakWithCommitment_LongestAcrossHistory(t *testing.T) {
	now := time.Date(2026, 8, 7, 12, 0, 0, 0, time.UTC)
	activity := []repository.UserSessionActivity{
		activityEntry("2026-08-07", 1200),
		activityEntry("2026-08-02", 1200),
		activityEntry("2026-08-01", 1200),
		activityEntry("2026-07-31", 1200),
	}

	current, longest := computeStreakWithCommitment(activity, 600, now, 0)
	if current != 1 {
		t.Errorf("expected current=1, got %d", current)
	}
	if longest != 4 {
		t.Errorf("expected longest=4, got %d", longest)
	}
}

func TestComputeStreakWithCommitment_BelowGoalDoesNotCount(t *testing.T) {
	now := time.Date(2026, 8, 7, 12, 0, 0, 0, time.UTC)
	activity := []repository.UserSessionActivity{
		activityEntry("2026-08-07", 300),
	}

	current, longest := computeStreakWithCommitment(activity, 600, now, 0)
	if current != 0 {
		t.Errorf("expected current=0, got %d", current)
	}
	if longest != 0 {
		t.Errorf("expected longest=0, got %d", longest)
	}
}

func TestComputeStreakWithCommitment_EmptyActivity(t *testing.T) {
	now := time.Date(2026, 8, 7, 12, 0, 0, 0, time.UTC)

	current, longest := computeStreakWithCommitment(nil, 600, now, 0)
	if current != 0 {
		t.Errorf("expected current=0, got %d", current)
	}
	if longest != 0 {
		t.Errorf("expected longest=0, got %d", longest)
	}
}

func TestComputeStreakWithCommitment_ExistingLongestPreserved(t *testing.T) {
	now := time.Date(2026, 8, 7, 12, 0, 0, 0, time.UTC)
	activity := []repository.UserSessionActivity{
		activityEntry("2026-08-07", 1200),
	}

	_, longest := computeStreakWithCommitment(activity, 600, now, 9)
	if longest != 9 {
		t.Errorf("expected longest=9, got %d", longest)
	}
}

func TestComputeLegacyStreak_NoLastSession(t *testing.T) {
	now := time.Date(2026, 8, 7, 12, 0, 0, 0, time.UTC)

	current, longest := computeLegacyStreak(now, nil, 5, 8)
	if current != 1 {
		t.Errorf("expected current=1, got %d", current)
	}
	if longest != 1 {
		t.Errorf("expected longest=1, got %d", longest)
	}
}

func TestComputeLegacyStreak_ConsecutiveDay(t *testing.T) {
	now := time.Date(2026, 8, 7, 12, 0, 0, 0, time.UTC)
	yesterday := now.AddDate(0, 0, -1)

	current, longest := computeLegacyStreak(now, &yesterday, 3, 4)
	if current != 4 {
		t.Errorf("expected current=4, got %d", current)
	}
	if longest != 4 {
		t.Errorf("expected longest=4, got %d", longest)
	}
}

func TestComputeLegacyStreak_GapResetsCurrent(t *testing.T) {
	now := time.Date(2026, 8, 7, 12, 0, 0, 0, time.UTC)
	threeDaysAgo := now.AddDate(0, 0, -3)

	current, longest := computeLegacyStreak(now, &threeDaysAgo, 3, 4)
	if current != 1 {
		t.Errorf("expected current=1, got %d", current)
	}
	if longest != 4 {
		t.Errorf("expected longest=4, got %d", longest)
	}
}

func TestComputeLegacyStreak_SameDayNoIncrement(t *testing.T) {
	now := time.Date(2026, 8, 7, 12, 0, 0, 0, time.UTC)

	current, longest := computeLegacyStreak(now, &now, 3, 4)
	if current != 3 {
		t.Errorf("expected current=3, got %d", current)
	}
	if longest != 4 {
		t.Errorf("expected longest=4, got %d", longest)
	}
}

func TestReviewCardsToQuestions_EmptyInput(t *testing.T) {
	result := reviewCardsToQuestions(nil)
	if len(result) != 0 {
		t.Errorf("expected empty slice, got %d", len(result))
	}
}

func TestReviewCardsToQuestions_MapsFields(t *testing.T) {
	cards := []models.ReviewCard{
		{
			ID:          "card-1",
			Prompt:      "What is X?",
			Answer:      "X is Y",
			ConceptTags: []string{"concept-a"},
		},
		{
			ID:          "card-2",
			Prompt:      "Define Z",
			Answer:      "Z means W",
			ConceptTags: []string{"concept-b", "concept-c"},
		},
	}

	result := reviewCardsToQuestions(cards)

	if len(result) != 2 {
		t.Fatalf("expected 2 questions, got %d", len(result))
	}

	q1 := result[0]
	if q1.ID != "card-1" {
		t.Errorf("expected ID=card-1, got %s", q1.ID)
	}
	if q1.Type != models.FillBlank {
		t.Errorf("expected type=fill_blank, got %s", q1.Type)
	}
	if q1.Index != 1 {
		t.Errorf("expected index=1, got %d", q1.Index)
	}
	if q1.Question != "What is X?" {
		t.Errorf("expected question='What is X?', got %s", q1.Question)
	}
	if q1.Answer == nil || *q1.Answer != "X is Y" {
		t.Errorf("expected answer='X is Y', got %v", q1.Answer)
	}
	if q1.Explanation != "X is Y" {
		t.Errorf("expected explanation='X is Y', got %s", q1.Explanation)
	}
	if len(q1.ConceptTags) != 1 || q1.ConceptTags[0] != "concept-a" {
		t.Errorf("expected concept_tags=[concept-a], got %v", q1.ConceptTags)
	}

	q2 := result[1]
	if q2.Index != 2 {
		t.Errorf("expected index=2, got %d", q2.Index)
	}
	if q2.ID != "card-2" {
		t.Errorf("expected ID=card-2, got %s", q2.ID)
	}
}

func TestReviewCardsToQuestions_IndexSequential(t *testing.T) {
	cards := make([]models.ReviewCard, 5)
	for i := range cards {
		cards[i] = models.ReviewCard{
			ID:     "card-" + string(rune('a'+i)),
			Prompt: "Q",
			Answer: "A",
		}
	}

	result := reviewCardsToQuestions(cards)
	for i, q := range result {
		if q.Index != i+1 {
			t.Errorf("expected index=%d, got %d", i+1, q.Index)
		}
	}
}

func TestBuildCardFromAnswer_MCQ_UsesCorrectOption(t *testing.T) {
	svc := &sessionService{}
	q := models.Question{
		ID:       "q1",
		Type:     models.MCQ,
		Question: "What is 2+2?",
		Options: []models.Option{
			{Label: "A", Explanation: "Wrong", IsCorrect: false},
			{Label: "B", Explanation: "Correct answer", IsCorrect: true},
			{Label: "C", Explanation: "", IsCorrect: false},
		},
	}

	card := svc.buildCardFromAnswer("user-1", "topic-1", "lesson-1", q)
	if card == nil {
		t.Fatal("expected non-nil card")
	}

	expectedBack := "B. Correct answer"
	if card.Answer != expectedBack {
		t.Errorf("expected answer=%q, got %q", expectedBack, card.Answer)
	}
	if card.Prompt != "What is 2+2?" {
		t.Errorf("expected prompt='What is 2+2?', got %q", card.Prompt)
	}
}

func TestBuildCardFromAnswer_TrueFalse_UsesCorrectOption(t *testing.T) {
	svc := &sessionService{}
	q := models.Question{
		ID:       "q2",
		Type:     models.TrueFalse,
		Question: "Sky is blue?",
		Options: []models.Option{
			{Label: "True", Explanation: "", IsCorrect: true},
			{Label: "False", Explanation: "", IsCorrect: false},
		},
	}

	card := svc.buildCardFromAnswer("user-1", "topic-1", "", q)
	if card == nil {
		t.Fatal("expected non-nil card")
	}

	if card.Answer != "True" {
		t.Errorf("expected answer='True', got %q", card.Answer)
	}
}

func TestBuildCardFromAnswer_FillBlank_UsesAnswerField(t *testing.T) {
	svc := &sessionService{}
	ans := "Paris"
	q := models.Question{
		ID:       "q3",
		Type:     models.FillBlank,
		Question: "Capital of France?",
		Answer:   &ans,
	}

	card := svc.buildCardFromAnswer("user-1", "topic-1", "", q)
	if card == nil {
		t.Fatal("expected non-nil card")
	}

	if card.Answer != "Paris" {
		t.Errorf("expected answer='Paris', got %q", card.Answer)
	}
}

func TestBuildCardFromAnswer_EmptyPrompt_ReturnsNil(t *testing.T) {
	svc := &sessionService{}
	q := models.Question{
		ID:       "q4",
		Type:     models.MCQ,
		Question: "  ",
	}

	card := svc.buildCardFromAnswer("user-1", "topic-1", "", q)
	if card != nil {
		t.Error("expected nil card for empty prompt")
	}
}

func TestBuildCardFromAnswer_EmptyAnswer_ReturnsNil(t *testing.T) {
	svc := &sessionService{}
	q := models.Question{
		ID:          "q5",
		Type:        models.FillBlank,
		Question:    "What?",
		Answer:      nil,
		Explanation: "",
	}

	card := svc.buildCardFromAnswer("user-1", "topic-1", "", q)
	if card != nil {
		t.Error("expected nil card for empty answer and explanation")
	}
}

func TestBuildCardFromAnswer_FallbackToExplanation(t *testing.T) {
	svc := &sessionService{}
	q := models.Question{
		ID:          "q6",
		Type:        models.ShortAnswer,
		Question:    "Explain X",
		Answer:      nil,
		Explanation: "X is a concept",
	}

	card := svc.buildCardFromAnswer("user-1", "topic-1", "", q)
	if card == nil {
		t.Fatal("expected non-nil card")
	}

	if card.Answer != "X is a concept" {
		t.Errorf("expected answer='X is a concept', got %q", card.Answer)
	}
}

func TestBuildCardFromAnswer_LessonID_FromQuestion(t *testing.T) {
	svc := &sessionService{}
	lessonID := "lesson-from-q"
	q := models.Question{
		ID:       "q7",
		Type:     models.MCQ,
		Question: "Q?",
		LessonID: &lessonID,
		Options:  []models.Option{{Label: "A", IsCorrect: true}},
	}

	card := svc.buildCardFromAnswer("user-1", "topic-1", "session-lesson", q)
	if card == nil {
		t.Fatal("expected non-nil card")
	}

	if card.LessonID == nil || *card.LessonID != "lesson-from-q" {
		t.Errorf("expected lesson_id='lesson-from-q', got %v", card.LessonID)
	}
}

func TestBuildCardFromAnswer_LessonID_FallsBackToSession(t *testing.T) {
	svc := &sessionService{}
	q := models.Question{
		ID:       "q8",
		Type:     models.MCQ,
		Question: "Q?",
		Options:  []models.Option{{Label: "A", IsCorrect: true}},
	}

	card := svc.buildCardFromAnswer("user-1", "topic-1", "session-lesson", q)
	if card == nil {
		t.Fatal("expected non-nil card")
	}

	if card.LessonID == nil || *card.LessonID != "session-lesson" {
		t.Errorf("expected lesson_id='session-lesson', got %v", card.LessonID)
	}
}

func TestBuildCardFromAnswer_NewCard_HasDefaults(t *testing.T) {
	svc := &sessionService{}
	q := models.Question{
		ID:       "q9",
		Type:     models.MCQ,
		Question: "Q?",
		Options:  []models.Option{{Label: "A", IsCorrect: true}},
	}

	card := svc.buildCardFromAnswer("user-1", "topic-1", "", q)
	if card == nil {
		t.Fatal("expected non-nil card")
	}

	if card.EaseFactor != 2.5 {
		t.Errorf("expected ease_factor=2.5, got %f", card.EaseFactor)
	}
	if card.IntervalDays != 0 {
		t.Errorf("expected interval_days=0, got %d", card.IntervalDays)
	}
	if card.Repetitions != 0 {
		t.Errorf("expected repetitions=0, got %d", card.Repetitions)
	}
	if card.Lapses != 0 {
		t.Errorf("expected lapses=0, got %d", card.Lapses)
	}
	if card.LastResult != 0 {
		t.Errorf("expected last_result=0, got %d", card.LastResult)
	}
	if card.CreatedAt.IsZero() {
		t.Error("expected created_at to be set")
	}
}

func TestStringPtr_EmptyString_ReturnsNil(t *testing.T) {
	result := stringPtr("")
	if result != nil {
		t.Errorf("expected nil, got %v", result)
	}
}

func TestStringPtr_NonEmpty_ReturnsPointer(t *testing.T) {
	result := stringPtr("hello")
	if result == nil || *result != "hello" {
		t.Errorf("expected 'hello', got %v", result)
	}
}

func TestCorrectOptionAnswer_ReturnsLabelAndExplanation(t *testing.T) {
	q := models.Question{
		Options: []models.Option{
			{Label: "A", Explanation: "wrong", IsCorrect: false},
			{Label: "B", Explanation: "because", IsCorrect: true},
		},
	}
	result := correctOptionAnswer(q)
	if result != "B. because" {
		t.Errorf("expected 'B. because', got %q", result)
	}
}

func TestCorrectOptionAnswer_NoExplanation_ReturnsLabelOnly(t *testing.T) {
	q := models.Question{
		Options: []models.Option{
			{Label: "True", Explanation: "", IsCorrect: true},
		},
	}
	result := correctOptionAnswer(q)
	if result != "True" {
		t.Errorf("expected 'True', got %q", result)
	}
}

func TestCorrectOptionAnswer_NoCorrectOption_ReturnsEmpty(t *testing.T) {
	q := models.Question{
		Options: []models.Option{
			{Label: "A", IsCorrect: false},
		},
	}
	result := correctOptionAnswer(q)
	if result != "" {
		t.Errorf("expected empty string, got %q", result)
	}
}

func TestFormatTime_Nil_ReturnsEmpty(t *testing.T) {
	result := formatTime(nil)
	if result != "" {
		t.Errorf("expected empty string, got %q", result)
	}
}

func TestFormatTime_NonNil_ReturnsRFC3339(t *testing.T) {
	now := time.Now()
	result := formatTime(&now)
	if result == "" {
		t.Error("expected non-empty string")
	}
}
