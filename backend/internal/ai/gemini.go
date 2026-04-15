package ai

import (
	"context"
	"fmt"
	"os"

	"google.golang.org/genai"
)

type GeminiClient struct {
	client *genai.Client
	model  string
}

func NewGeminiClient() (*GeminiClient, error) {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("GEMINI_API_KEY is not set")
	}

	client, err := genai.NewClient(context.Background(), &genai.ClientConfig{
		APIKey: apiKey,
	})
	if err != nil {
		return nil, err
	}

	return &GeminiClient{
		client: client,
		model:  "gemini-2.5-flash-lite",
	}, nil
}

func (g *GeminiClient) GenerateRoadmap(ctx context.Context, prompt string) (string, error) {
	schema := &genai.Schema{
		Type:     genai.TypeObject,
		Required: []string{"modules"},
		Properties: map[string]*genai.Schema{
			"modules": {
				Type: genai.TypeArray,
				Items: &genai.Schema{
					Type:     genai.TypeObject,
					Required: []string{"index", "title", "description", "concept_tags", "lessons"},
					Properties: map[string]*genai.Schema{
						"index": {
							Type:        genai.TypeInteger,
							Description: "Order of appearance in the roadmap",
						},
						"title": {
							Type:        genai.TypeString,
							Description: "Title of the module",
						},
						"description": {
							Type:        genai.TypeString,
							Description: "1-2 sentence description of the module",
						},
						"concept_tags": {
							Type: genai.TypeArray,
							Items: &genai.Schema{
								Type: genai.TypeString,
							},
							Description: "Key concept tags for the module",
						},
						"lessons": {
							Type: genai.TypeArray,
							Items: &genai.Schema{
								Type:     genai.TypeObject,
								Required: []string{"index", "title", "description", "content", "quizzes"},
								Properties: map[string]*genai.Schema{
									"index": {
										Type:        genai.TypeInteger,
										Description: "Order of appearance in the module",
									},
									"title": {
										Type:        genai.TypeString,
										Description: "Title of the lesson",
									},
									"description": {
										Type:        genai.TypeString,
										Description: "1-2 sentence description of the lesson",
									},
									"content": {
										Type:        genai.TypeString,
										Description: "Detailed lesson content",
									},
									"quizzes": {
										Type: genai.TypeArray,
										Items: &genai.Schema{
											Type:     genai.TypeObject,
											Required: []string{"index", "type", "question"},
											Properties: map[string]*genai.Schema{
												"index": {
													Type:        genai.TypeInteger,
													Description: "Order of the question in the quiz",
												},
												"type": {
													Type: genai.TypeString,
													Enum: []string{"mcq", "true_false", "fill_blank", "short_answer"},
													Description: "Type of question",
												},
												"question": {
													Type:        genai.TypeString,
													Description: "The question text",
												},
												"options": {
													Type: genai.TypeArray,
													Items: &genai.Schema{
														Type:     genai.TypeObject,
														Required: []string{"label", "index","explanation","is_correct"},
														Properties: map[string]*genai.Schema{
															"label": {
																Type: genai.TypeString,
																Description: "The label of the option",
															},
															"index": {
																Type: genai.TypeInteger,
																Description: "Order of the option in the options",
															},
															"explanation": {
																Type:        genai.TypeString,
																Description: "Why this option is correct/incorrect",
															},
															"is_correct": {
																Type: genai.TypeBoolean,
																Description: "Whether this option is correct",
															},
														},
													},
													Description: "Answer options (required for mcq and true_false, ignored otherwise)",
												},
											},
										},
									},
								},
							},
						},
					},
				},
			},
		},
	}

	res, err :=  g.client.Models.GenerateContent(ctx, "gemini-2.5-flash-lite", genai.Text(prompt), &genai.GenerateContentConfig{
		ResponseMIMEType: "application/json",
		ResponseSchema:   schema,
	})
	if err != nil {
		return "",err
	}
	fmt.Printf("%+v",res.Text())
	return res.Text(),nil
}

func (g *GeminiClient) GenerateTopicQuestions(ctx context.Context, prompt string) (string, error) {
	schema := &genai.Schema{
		Type:     genai.TypeObject,
		Required: []string{"questions"},
		Properties: map[string]*genai.Schema{
			"questions": {
				Type: genai.TypeArray,
				Items: &genai.Schema{
					Type:     genai.TypeObject,
					Required: []string{"index", "type", "question"},
					Properties: map[string]*genai.Schema{
						"index": {
							Type:        genai.TypeInteger,
							Description: "Order of the question in the quiz",
						},
						"type": {
							Type: genai.TypeString,
							Enum: []string{"mcq", "true_false", "fill_blank", "short_answer"},
							Description: "Type of question",
						},
						"question": {
							Type:        genai.TypeString,
							Description: "The question text",
						},
						"options": {
							Type: genai.TypeArray,
							Items: &genai.Schema{
								Type:     genai.TypeObject,
								Required: []string{"label", "index","explanation","is_correct"},
								Properties: map[string]*genai.Schema{
									"label": {
										Type: genai.TypeString,
										Description: "The label of the option",
									},
									"index": {
										Type: genai.TypeInteger,
										Description: "Order of the option in the options",
									},
									"explanation": {
										Type:        genai.TypeString,
										Description: "Why this option is correct/incorrect",
									},
									"is_correct": {
										Type: genai.TypeBoolean,
										Description: "Whether this option is correct",
									},
								},
							},
							Description: "Answer options (required for mcq and true_false, ignored otherwise)",
						},
					},
				},
			},
		},
	}

	res, err :=  g.client.Models.GenerateContent(ctx, "gemini-2.5-flash-lite", genai.Text(prompt), &genai.GenerateContentConfig{
		ResponseMIMEType: "application/json",
		ResponseSchema:   schema,
	})
	if err != nil {
		return "",err
	}
	fmt.Printf("%+v",res.Text())
	return res.Text(),nil
}

func (g *GeminiClient) EvaluateTopicSession(ctx context.Context, prompt string) (string, error) {
	schema := &genai.Schema{
		Type:     genai.TypeObject,
		Required: []string{"new_tier", "new_remark"},
		Properties: map[string]*genai.Schema{
			"new_tier": {
				Type: genai.TypeInteger,
				Description: "The new user knowledge tier for the topic",
			},
			"new_remark": {
				Type: genai.TypeString,
				Description: "The new remark of user's knowledge for the topic",
			},
		},
	}

	res, err :=  g.client.Models.GenerateContent(ctx, "gemini-2.5-flash-lite", genai.Text(prompt), &genai.GenerateContentConfig{
		ResponseMIMEType: "application/json",
		ResponseSchema:   schema,
	})
	if err != nil {
		return "",err
	}
	fmt.Printf("%+v",res.Text())
	return res.Text(),nil
}

func (g *GeminiClient) GenerateAssessmentQuestions(ctx context.Context, prompt string) (string, error) {
	schema := &genai.Schema{
		Type:     genai.TypeObject,
		Required: []string{"questions"},
		Properties: map[string]*genai.Schema{
			"questions": {
				Type: genai.TypeArray,
				Items: &genai.Schema{
					Type:     genai.TypeObject,
					Required: []string{"index", "type", "question"},
					Properties: map[string]*genai.Schema{
						"index": {
							Type:        genai.TypeInteger,
							Description: "Order of the question in the quiz",
						},
						"type": {
							Type: genai.TypeString,
							Enum: []string{"mcq", "true_false", "fill_blank", "short_answer"},
							Description: "Type of question",
						},
						"question": {
							Type:        genai.TypeString,
							Description: "The question text",
						},
						"options": {
							Type: genai.TypeArray,
							Items: &genai.Schema{
								Type:     genai.TypeObject,
								Required: []string{"label", "index"},
								Properties: map[string]*genai.Schema{
									"label": {
										Type: genai.TypeString,
										Description: "The label of the option",
									},
									"index": {
										Type: genai.TypeInteger,
										Description: "Order of the option in the options",
									},
								},
							},
							Description: "Answer options (required for mcq and true_false, ignored otherwise)",
						},
					},
				},
			},
		},
	}

	res, err :=  g.client.Models.GenerateContent(ctx, g.model, genai.Text(prompt), &genai.GenerateContentConfig{
		ResponseMIMEType: "application/json",
		ResponseSchema:   schema,
	})
	if err != nil {
		return "",err
	}
	return res.Text(),nil
}
