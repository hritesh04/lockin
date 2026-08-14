package service

import (
	"testing"
	"time"

	"github.com/acerowl/lockin/backend/internal/models"
)

func streakDatePtr(day string) *time.Time {
	t, err := time.Parse("2006-01-02", day)
	if err != nil {
		panic(err)
	}
	utc := t.In(time.UTC)
	return &utc
}

func TestComputeIncrementalStreak_NilDate(t *testing.T) {
	now := time.Date(2026, 8, 7, 12, 0, 0, 0, time.UTC)

	current, longest := computeIncrementalStreak(now, nil, 0, 0)
	if current != 1 {
		t.Errorf("expected current=1, got %d", current)
	}
	if longest != 1 {
		t.Errorf("expected longest=1, got %d", longest)
	}
}

func TestComputeIncrementalStreak_NilDatePreservesLongest(t *testing.T) {
	now := time.Date(2026, 8, 7, 12, 0, 0, 0, time.UTC)

	_, longest := computeIncrementalStreak(now, nil, 0, 9)
	if longest != 9 {
		t.Errorf("expected longest=9, got %d", longest)
	}
}

func TestComputeIncrementalStreak_SameDayNoIncrement(t *testing.T) {
	now := time.Date(2026, 8, 7, 12, 0, 0, 0, time.UTC)

	current, longest := computeIncrementalStreak(now, streakDatePtr("2026-08-07"), 3, 4)
	if current != 3 {
		t.Errorf("expected current=3, got %d", current)
	}
	if longest != 4 {
		t.Errorf("expected longest=4, got %d", longest)
	}
}

func TestComputeIncrementalStreak_ConsecutiveDay(t *testing.T) {
	now := time.Date(2026, 8, 7, 12, 0, 0, 0, time.UTC)

	current, longest := computeIncrementalStreak(now, streakDatePtr("2026-08-06"), 3, 4)
	if current != 4 {
		t.Errorf("expected current=4, got %d", current)
	}
	if longest != 4 {
		t.Errorf("expected longest=4, got %d", longest)
	}
}

func TestComputeIncrementalStreak_ConsecutiveDayUpdatesLongest(t *testing.T) {
	now := time.Date(2026, 8, 7, 12, 0, 0, 0, time.UTC)

	current, longest := computeIncrementalStreak(now, streakDatePtr("2026-08-06"), 3, 3)
	if current != 4 {
		t.Errorf("expected current=4, got %d", current)
	}
	if longest != 4 {
		t.Errorf("expected longest=4, got %d", longest)
	}
}

func TestComputeIncrementalStreak_GapResetsCurrent(t *testing.T) {
	now := time.Date(2026, 8, 7, 12, 0, 0, 0, time.UTC)

	current, longest := computeIncrementalStreak(now, streakDatePtr("2026-08-04"), 3, 4)
	if current != 1 {
		t.Errorf("expected current=1, got %d", current)
	}
	if longest != 4 {
		t.Errorf("expected longest=4, got %d", longest)
	}
}

func TestComputeIncrementalStreak_TimeZoneAgnostic(t *testing.T) {
	now := time.Date(2026, 8, 7, 12, 0, 0, 0, time.UTC)
	// 2026-08-06 23:30 IST == 2026-08-06 18:00 UTC -> still yesterday.
	ist := time.FixedZone("IST", 5*3600+30*60)
	last := time.Date(2026, 8, 6, 23, 30, 0, 0, ist)

	current, _ := computeIncrementalStreak(now, &last, 3, 4)
	if current != 4 {
		t.Errorf("expected current=4, got %d", current)
	}
}

func TestExpiredCurrentStreak_NilDate(t *testing.T) {
	now := time.Date(2026, 8, 7, 12, 0, 0, 0, time.UTC)

	got := expiredCurrentStreak(nil, 3, now)
	if got != 3 {
		t.Errorf("expected current=3, got %d", got)
	}
}

func TestExpiredCurrentStreak_PendingDayKept(t *testing.T) {
	now := time.Date(2026, 8, 7, 12, 0, 0, 0, time.UTC)

	got := expiredCurrentStreak(streakDatePtr("2026-08-06"), 3, now)
	if got != 3 {
		t.Errorf("expected current=3, got %d", got)
	}
}

func TestExpiredCurrentStreak_QualifiedTodayKept(t *testing.T) {
	now := time.Date(2026, 8, 7, 12, 0, 0, 0, time.UTC)

	got := expiredCurrentStreak(streakDatePtr("2026-08-07"), 4, now)
	if got != 4 {
		t.Errorf("expected current=4, got %d", got)
	}
}

func TestExpiredCurrentStreak_SkippedWholeDay(t *testing.T) {
	now := time.Date(2026, 8, 7, 12, 0, 0, 0, time.UTC)

	got := expiredCurrentStreak(streakDatePtr("2026-08-05"), 3, now)
	if got != 0 {
		t.Errorf("expected current=0, got %d", got)
	}
}

func TestExpiredCurrentStreak_ExpiredOnOlderGap(t *testing.T) {
	now := time.Date(2026, 8, 7, 12, 0, 0, 0, time.UTC)

	got := expiredCurrentStreak(streakDatePtr("2026-07-01"), 3, now)
	if got != 0 {
		t.Errorf("expected current=0, got %d", got)
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

func TestBuildReachableLessonDigest_NilRoadmap(t *testing.T) {
	if got := buildReachableLessonDigest(nil); got != "" {
		t.Errorf("expected empty digest, got %q", got)
	}
}

func TestBuildReachableLessonDigest_AllLocked(t *testing.T) {
	roadmap := &models.TopicRoadmap{
		Modules: []models.Module{
			{Title: "Module 1", Lessons: []models.Lesson{
				{Title: "Lesson 1", Description: "L1", Status: models.StatusLocked},
				{Title: "Lesson 2", Description: "L2", Status: models.StatusLocked},
			}},
		},
	}
	if got := buildReachableLessonDigest(roadmap); got != "" {
		t.Errorf("expected empty digest, got %q", got)
	}
}

func TestBuildReachableLessonDigest_IncludesReachableOnly(t *testing.T) {
	roadmap := &models.TopicRoadmap{
		Modules: []models.Module{
			{
				Title:       "Gradient Descent",
				ConceptTags: []string{"gradient_descent", "learning_rate"},
				Lessons: []models.Lesson{
					{Title: "Intuition", Description: "Big picture", Status: models.StatusCompleted},
					{Title: "Math", Description: "Derivations", Status: models.StatusInProgress},
					{Title: "Optimisers", Description: "Future content", Status: models.StatusLocked},
				},
			},
			{
				Title: "Locked Module",
				Lessons: []models.Lesson{
					{Title: "Hidden", Description: "Nope", Status: models.StatusLocked},
				},
			},
		},
	}

	want := "Module: Gradient Descent\n" +
		"  Concept tags: gradient_descent, learning_rate\n" +
		"  - Lesson: Intuition — Big picture\n" +
		"  - Lesson: Math — Derivations\n"

	if got := buildReachableLessonDigest(roadmap); got != want {
		t.Errorf("digest mismatch:\n got: %q\nwant: %q", got, want)
	}
}

func TestBuildReachableLessonDigest_NoConceptTags(t *testing.T) {
	roadmap := &models.TopicRoadmap{
		Modules: []models.Module{
			{
				Title: "Module 1",
				Lessons: []models.Lesson{
					{Title: "Only", Description: "One", Status: models.StatusCompleted},
				},
			},
		},
	}

	want := "Module: Module 1\n" +
		"  - Lesson: Only — One\n"

	if got := buildReachableLessonDigest(roadmap); got != want {
		t.Errorf("digest mismatch:\n got: %q\nwant: %q", got, want)
	}
}
