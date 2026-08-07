package ai

import (
	"fmt"
	"strings"
)

const tierLadder = `TIER DEFINITIONS:
1 - No prior knowledge; unaware of the topic's key terms and concepts entirely.
2 - Aware of a few key terms by name, understanding is surface-level or based on intuition rather than actual knowledge.
3 - Familiar with most key terms by name, can give basic definitions for a few but understanding is mostly superficial with little grasp of how or why.
4 - Basic understanding of most key concepts, can describe what they are but struggles to explain how they work or why they matter.
5 - Solid understanding of most key concepts, can explain what they are and how they work, but has gaps in application, edge cases, and deeper mechanics.
6 - Good grasp of most key concepts and solid understanding of the rest, can explain concepts clearly and apply them correctly in straightforward scenarios.
7 - Strong understanding of almost all key concepts, comfortable with practical application and beginning to reason about how concepts interact with each other.
8 - Deep understanding of almost all key concepts, can reason confidently about cross-concept interactions, identify non-obvious connections, and handle moderately complex problems that span multiple areas.
9 - Complete understanding of most concepts with strong cross-domain knowledge, can tackle complex, multi-layered problems, reason through edge cases, and explain the trade-offs and implications of different approaches.
10 - Complete understanding of almost all concepts with strong applied and theoretical cross-domain knowledge, capable of critical thinking, novel problem-solving, and arriving at well-reasoned solutions in unfamiliar or ambiguous scenarios.`

func (g *Generator) buildAssessmentPrompt(topic string, proficiency string) string {
	return fmt.Sprintf(`You are a knowledge assessment engine for a learning app. Your task is to generate a diagnostic quiz to assess a user's actual knowledge on a topic. The user has self-reported their proficiency level. Use this to calibrate question difficulty.
TOPIC: %s
USER CLAIMED PROFICIENCY : %s

PROFICIENCY DEFINITIONS (use these as your calibration reference):
- beginner     : no knowledge of the topic; unaware of key terms and concepts
- intermediate : has heard of key terms/concepts; solid understanding of most,
                 vague understanding of the rest
- advanced     : knows all key terms/concepts - what they do, how they work;
                 can reason about complex questions that overlap with other
                 concepts or domains, their interactions and edge cases

CALIBRATION RULES BY CLAIMED LEVEL:
- If claimed "intermediate":
    - '~40%%' of questions should test foundational concepts (to catch gaps they may have skipped)
    - '~60%%' should test mid-level understanding and application
    - Avoid highly advanced or cross-domain questions
- If claimed "advanced":
    - '~20%%' foundational (quick sanity check)
    - '~40%%' mid-level application
    - '~40%%' advanced — complex reasoning, edge cases, cross-domain interactions
GENERATION RULES:
- Generate between 5 and 10 questions. Use fewer for narrow topics, more for broad ones.
- Mix question formats: MCQ for conceptual/factual, short answer for applied or reasoning questions.
- Each question must target a distinct concept or sub-area. Do not repeat similar questions.
- For MCQ: exactly 4 options labeled A, B, C, D. One correct answer. Distractors must be plausible.
- For short answer: answerable in 1-3 sentences by someone at the claimed level.
- Tag each question with concept_tags: the 1-3 shortest snake_case concept tags it targets.`, topic, proficiency)
}

func (g *Generator) buildAssessmentEvaluationPrompt(topic string, response string) string {
	return fmt.Sprintf(`You are a learning assessment engine for a learning app. Your task is to evaluate a user's quiz answers and produce a tier level of their actual knowledge level based on the tier definition.
TOPIC: %s

USER ASSESSMENT RESPONSES (Questions & Answer):
%s

%s

QUESTION AND ANSWERS:
The user's answers are included in the USER ASSESSMENT RESPONSES block above.

EVALUATION RULES:
- Evaluate each answer on conceptual accuracy, not exact wording.
- For short answers: award "correct" if core concepts are accurately covered,
  "partial" if partially right or imprecise, "wrong" if incorrect or missing key concepts.
- Identify what concept or sub-area each question was testing.
- Determine the user's ACTUAL proficiency level using the definitions above.
- Cross-reference actual level vs claimed level
- recommended_focus must be a single actionable sentence the roadmap generator can use directly.
- If confidence data is present in the responses, use it for calibration:
  - Overconfident: high/med confidence with a wrong or poor answer.
  - Underconfident: low confidence with a correct answer.
  - Note concept tags where the user was consistently overconfident or underconfident.`, topic, response, tierLadder)
}

func (g *Generator) buildRoadmapPrompt(topic string, assessment string, goal string, recommendedFocus string) string {
	goalLine := "No specific goal provided."
	if goal != "" {
		goalLine = goal
	}
	focusLine := ""
	if recommendedFocus != "" {
		focusLine = "\nRECOMMENDED FOCUS: " + recommendedFocus + "\n"
	}
	return fmt.Sprintf(`You are a curriculum design engine for a learning app. Your task is to generate a personalised learning roadmap based on the user's topic, their claimed proficiency, and their assessed proficiency (if available). Use both signals together — the assessment reveals what they actually know, the claim reveals how they perceive themselves.
TOPIC: %s

USER GOAL: %s

USER KNOWLEDGE ASSESSMENT: %s
%s
%s

PROFICIENCY DEFINITIONS:
- beginner     : no knowledge; unaware of key terms and concepts (TIER 1-4)
- intermediate : has heard of key terms/concepts; solid understanding of most, vague understanding of the rest (TIER 5-7)
- advanced     : knows all key terms/concepts — what they do, how they work, can reason about complex questions that overlap with other concepts or domains, their interactions and edge cases (TIER 8-10)

ROADMAP CONSTRUCTION RULES:
1. TIER LEVEL
   Determine the user's TIER level using user knowledge assessment, if no assessment (beginner onboarding path) use TIER 1

2. MODULE COVERAGE
   Every significant sub-area of the topic must have at least one module regardless of
   user level. No sub-area is skipped entirely. Adjust depth, not existence:
   - strong_areas from assessment → fewer lessons (min 1), skew toward advanced/applied content
   - gap or unassessed areas from assessment    → full lesson count, start foundational

3. MODULE COUNT
   Scale with topic breadth and tier level:
   - beginner  → 6-12 modules (full foundational coverage)
   - intermediate → 5-10 modules (compress known areas, expand gaps)
   - advanced  → 4-8 modules (compress heavily, focus on depth, cross-domain and applied content)

4. MODULE STRUCTURE
   Each module must have:
   - A specific title (not generic — e.g. "Gradient Descent & Optimisation" not "Module 3")
   - A one-sentence description
   - 3-5 lessons (fewer for strong areas, more for gap areas)
   - 5-10 quizzes total for each lesson
   - difficulty level appropriate to the module's position and the user's assessment
   - Concept tags for all key concepts covered

5. LESSON STRUCTURE
   Each lesson must have:
   - A specific title
   - A 1-2 sentence description
   - A quiz count
   - Quiz formats: mix of "mcq", "true_false", "fill_blank", "short_answer" — Weight toward mcq/true_false for factual/definitional, fill_blank/short_answer for reasoning/applied questions. Advanced modules should have proportionally more short_answer questions.

6. FIRST MODULE RULE
   The first module must always be "foundational" or "beginner" difficulty regardless of
   user assessment. It is a context-setter and warm-up, not a test of prior knowledge.

7. DIFFICULTY PROGRESSION
   Difficulty must progress logically across modules. Do not jump from foundational to
   advanced without intermediate steps. Each module's difficulty must be reachable from
   the previous module's difficulty.

PEDAGOGY RULES:
- Chunked sections: break lesson content into focused, digestible sections rather than long monolithic blocks.
- Concrete-before-abstract: always present a concrete instance or worked example before introducing the abstract principle it illustrates.
- Worked examples: include at least 1 fully worked example per lesson that walks through the reasoning step-by-step.
- Analogies: when introducing an abstract concept, provide an analogy to a familiar real-world concept to anchor understanding.
- Quiz difficulty: start quizzes a notch below the user's tier (desirable difficulty) and ramp up within the lesson.`, topic, goalLine, assessment, focusLine, tierLadder)
}

func (g *Generator) buildTopicSessionPrompt(topic string, tier int, remark string, quizMode string, weakConcepts []string) string {
	modeInstruction := ""
	switch quizMode {
	case "options":
		modeInstruction = "STRICT: Only generate 'mcq' and 'true_false' questions."
	case "text":
		modeInstruction = "STRICT: Only generate 'short_answer' and 'fill_blank' questions."
	case "interleave", "mixed", "":
		modeInstruction = "Generate a mix of question formats: 'mcq', 'true_false', 'fill_blank', and 'short_answer'. Do not use the same format for more than 3 consecutive questions."
	}

	weakInstruction := ""
	if len(weakConcepts) > 0 {
		weakInstruction = "WEAK CONCEPTS (user scores below 50% on these in reviews — weight at least half the session's questions toward them):\n" + fmt.Sprintf("%s", strings.Join(weakConcepts, ", "))
	}

	return fmt.Sprintf(`You are a tutor for a learning app. Your task is to generate a practice session on a specific topic.
The session should be tailored to the user's current tier and progress remark.

TOPIC: %s
USER TIER: %d (Scale 1-10)
USER PROGRESS REMARK: %s

%s

%s

%s

GENERATION RULES:
- Generate 10 questions.
- Tailor difficulty and concepts based on Tier and Remark.
- For MCQ: exactly 4 options. One correct answer.
- For true_false: exactly 2 options (True/False).
- For fill_blank: the blank must be filled with a single word or short phrase. NEVER embed the answer in the surrounding text of the question.
- Session difficulty arc: start with 2-3 warm-up questions (slightly below tier), then 5-6 at-tier questions, then 2-3 stretch questions (slightly above tier).
- Tag each question with concept_tags: the 1-3 shortest concept tags it targets (snake_case). These are used for retention analytics and calibration.
`, topic, tier, remark, modeInstruction, weakInstruction, tierLadder)
}

func (g *Generator) buildTopicSessionEvaluationPrompt(topic string, tier int, remark string, results string) string {
	return fmt.Sprintf(`You are an expert evaluator for a learning app. Your task is to evaluate a user's performance in a study session and update their progress.

TOPIC: %s
CURRENT TIER: %d (Scale 1-10)
CURRENT REMARK: %s

%s

SESSION RESULTS (Questions and User Answers):
%s

EVALUATION RULES:
1. Analyze the performance on each question.
2. Each user answer may include a self-reported "confidence" field ("low", "med", or "high"). Use it for calibration:
   - Overconfident: high/med confidence with a wrong or poor answer.
   - Underconfident: low confidence with a correct answer.
   - Note concept tags where the user was consistently overconfident or underconfident.
3. Determine if the user should advance to a higher tier, stay at the current tier, or revisit earlier concepts.
4. Provide a new Tier (integer 1-10) and a brief Remark (single actionable sentence) about their current progress.
5. The Remark must end with a calibration insight when calibration signals exist, e.g. "You were overconfident on gradient descent — review that before the next session." or "Your intuition is sharper than you think on linear algebra."
`, topic, tier, remark, tierLadder, results)
}

func (g *Generator) buildReviewCardsPrompt(topic string, tier int, content string, questionCount int) string {
	if questionCount <= 0 {
		questionCount = 10
	}
	return fmt.Sprintf(`You are a spaced-repetition engine for a learning app. Your task is to generate generative flashcards that will be reviewed with the SM-2 algorithm. Each card front must be a recall prompt that forces the learner to actively retrieve the answer from memory — never a question that already contains or reveals the answer.

TOPIC: %s
USER TIER: %d (Scale 1-10)

LESSON SUMMARIES AND CONCEPTS:
%s

GENERATION RULES:
- Generate exactly %d cards.
- Card front (prompt): a recall prompt such as "Explain why...", "What is...?", a fill-in-the-blank like "______ is...", or a "How does X relate to Y?" prompt. NEVER include the answer in the prompt.
- Card back (answer): the correct answer, 1-3 sentences, self-contained so it can stand alone as an explanation.
- Cover the key concepts and concept tags from the lesson summaries above. Do not repeat the same concept.
- Scale difficulty to the user's tier: lower tiers get foundational prompts, higher tiers get applied/relational "why" and cross-concept prompts.
- Include a healthy mix: some fill-blank cards, some "Why?" / elaborative-interrogation cards, and some "How does ... relate to ...?" cards (these seed dual-coding and elaborative processing).
- concept_tag must be the single shortest tag that identifies the concept (e.g. "gradient_descent").
- Prioritise concepts that are commonly confused or that appeared in the user's incorrect answers if such data is available.`, topic, tier, content, questionCount)
}

func (g *Generator) buildSocraticPrompt(topic string, tier int, question string, userAnswer string) string {
	return fmt.Sprintf(`You are a Socratic tutor for a learning app. Your task is to deepen the user's understanding by asking a focused conceptual follow-up, then briefly evaluate their written answer conceptually (not by exact wording).

TOPIC: %s
USER TIER: %d (Scale 1-10)

ORIGINAL QUESTION:
%s

USER'S ANSWER:
%s

RULES:
- follow_up: a single "Why?" / "How does this relate to...?" / "What would happen if...?" question that probes the reasoning behind the user's answer. It must NOT reveal the correct answer and must be answerable in 1-3 sentences by someone at their tier. Anchor the follow-up to a prior concept or analogy the user already knows when possible.
- feedback: one of "correct", "partial", "wrong" — judged on whether the core concept in the answer is accurate, not on wording.
- explanation: 1-2 sentences of plain-language coaching that (a) confirms what the user got right, (b) gently corrects any misconception, and (c) points at the follow-up. Never grade harshly; frame it as growth.
- Only return the JSON object; do not add surrounding text.`, topic, tier, question, userAnswer)
}
