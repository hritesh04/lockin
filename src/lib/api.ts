import axios, { AxiosError } from 'axios';
import { useAuthStore } from '../store/auth';
import type { Lesson } from '../store/lessons';
import type { Module } from '../store/modules';
import type { Question } from '../store/session';
import { API_BASE_URL } from './config';

export type ApiUser = {
  id: string;
  email: string;
  currentStreak: number;
  longestStreak: number;
  lastSessionDate?: string | null;
  createdAt?: string;
};

export type LessonActivity = {
  title: string;
  created_at: string;
  completed_at: string;
};

export type QuizActivity = {
  topic_name: string;
  created_at: string;
  completed_at: string;
};

export type UserActivityData = {
  day: string;
  lessons: LessonActivity[];
  quizes: QuizActivity[];
  total_time: number; // in seconds
};

export type UserActivityInfo = {
  active_streak: number;
  highest_streak: number;
  activity: UserActivityData[];
};

export type ApiTopic = {
  id: string;
  userId: string;
  title: string;
  domain: string;
  familiarityLevel: string;
  currentTier: number;
  createdAt: string;
};

export type SubmitAnswerResponse = {
  is_correct: boolean;
  correct_answer: string;
  explanation: string;
};

export type ProgressUpdateResponse = {
  updatedLessons: Lesson[];
  updatedModules: Module[];
};

type ApiOption = {
  id: string;
  question_id: string;
  index: number;
  label: string;
  explanation: string;
  is_correct: boolean;
};

type ApiQuestionRaw = {
  id: string;
  index: number;
  type: 'mcq' | 'true_false' | 'short_answer' | 'fill_blank';
  question: string;
  options: ApiOption[];
  answer?: string;
  explanation?: string;
};

export function mapSessionQuestion(q: ApiQuestionRaw): Question {
  const safeFormat = (q.type === 'mcq' || q.type === 'true_false' || q.type === 'short_answer' || q.type === 'fill_blank')
    ? q.type
    : 'mcq';
  
  return {
    id: q.id,
    format: safeFormat as any,
    question: q.question,
    options: q.options || [],
    answer: q.answer ?? '',
    explanation: q.explanation ?? '',
  };
}

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach Bearer token on every request.
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Track whether a token refresh is already in flight to avoid loops.
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeToRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function notifyRefreshSubscribers(newToken: string) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

// Response interceptor — on 401, try to refresh then retry the original request.
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };

    if (error.response?.status !== 401 || originalRequest?._retry) {
      return Promise.reject(error);
    }

    const { refreshToken, setTokens, clearTokens } = useAuthStore.getState();

    if (!refreshToken) {
      clearTokens();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue this request until the refresh completes.
      return new Promise((resolve, reject) => {
        subscribeToRefresh((newToken) => {
          if (originalRequest) {
            originalRequest.headers = originalRequest.headers ?? {};
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(apiClient(originalRequest));
          } else {
            reject(error);
          }
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post<{ success: boolean; data: { token: string; refresh_token: string } }>(
        `${API_BASE_URL}/auth/refresh`,
        { refresh_token: refreshToken },
        { headers: { 'Content-Type': 'application/json' } }
      );

      setTokens(data.data.token, data.data.refresh_token);
      notifyRefreshSubscribers(data.data.token);
      isRefreshing = false;

      if (originalRequest) {
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${data.data.token}`;
        return apiClient(originalRequest);
      }
    } catch (refreshError) {
      isRefreshing = false;
      refreshSubscribers = [];
      clearTokens();
      return Promise.reject(refreshError);
    }
  }
);

export async function login(
  email: string,
  password: string
): Promise<{ token: string; refresh_token: string; user: ApiUser }> {
  const { data } = await apiClient.post<{ success: boolean; data: { token: string; refresh_token: string; user: ApiUser } }>(
    '/auth/login',
    { email, password }
  );
  return data.data;
}

export async function listTopics(): Promise<ApiTopic[]> {
  const { data } = await apiClient.get<{ success: boolean; data: ApiTopic[] }>('/topics');
  return data.data;
}

export async function getMe(): Promise<ApiUser> {
  const { data } = await apiClient.get<{ success: boolean; data: ApiUser }>('/users/me');
  return data.data;
}

export async function getActivity(): Promise<UserActivityInfo> {
  const { data } = await apiClient.get<{ success: boolean; data: UserActivityInfo }>('/sessions/activity');
  return data.data;
}

export async function createTopic(body: {
  title: string;
  familiarity_level: string;
}): Promise<{ topic: ApiTopic; status: string }> {
  const { data } = await apiClient.post<{ data: { topic: ApiTopic; status: string } }>(
    '/topics',
    body
  );
  return data.data;
}

export async function startSession(
  params: { topic_id: string; lesson_id?: string; quiz_mode?: string }
): Promise<{ session_id: string; questions: Question[] }> {
  const { data } = await apiClient.post<{ success: boolean; data: { session_id: string; questions: ApiQuestionRaw[] } }>(
    '/sessions/start',
    params
  );
  return {
    session_id: data.data.session_id,
    questions: data.data.questions.map(mapSessionQuestion),
  };
}

export async function submitAnswer(
  sessionId: string,
  payload: { question_id: string; selected_answer: string }
): Promise<SubmitAnswerResponse> {
  const { data } = await apiClient.post<{ success: boolean; data: SubmitAnswerResponse }>(
    `/sessions/${sessionId}/answer`,
    payload
  );
  return data.data;
}

export async function completeSession(
  sessionId: string, 
  diagData?: { topic_id: string; answers: { question: Question; answer: string }[] }
): Promise<void> {
  await apiClient.post(`/sessions/${sessionId}/complete`, diagData);
}

export async function updateModuleStatus(moduleId: string, status: string): Promise<void> {
  await apiClient.post(`/modules/status/${moduleId}`, { status });
}

export async function updateProgress(lessonId: string): Promise<ProgressUpdateResponse> {
  const { data } = await apiClient.post<{ success: boolean; data: ProgressUpdateResponse }>(`/lessons/progress/${lessonId}`);
  if (!data.success){
    throw new Error("Failed to update progress");
  }
  return data.data;
}

export function proficiencyToApi(p: 'beginner' | 'intermediate' | 'advanced'): string {
  return p;
}
