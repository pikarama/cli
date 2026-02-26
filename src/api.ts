const BASE_URL = 'https://www.pikarama.com/api/v1';

export class ApiError extends Error {
  public readonly status: number;
  public readonly body?: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions extends Omit<RequestInit, 'headers' | 'body'> {
  token?: string;
  params?: Record<string, string | number | boolean | undefined>;
  payload?: unknown;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, params, payload, ...rest } = options;
  const url = new URL(`${BASE_URL}${path}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const authHeaders: Record<string, string> = {
    Accept: 'application/json',
  };

  if (token) {
    authHeaders.Authorization = `Bearer ${token}`;
  }

  if (payload !== undefined && payload !== null) {
    authHeaders['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    headers: { ...authHeaders },
    body: payload !== undefined && payload !== null ? JSON.stringify(payload) : undefined,
    ...rest,
  });

  const text = await response.text();
  const responseBody = text ? safeJsonParse(text) : undefined;

  if (!response.ok) {
    throw new ApiError(response.status, `${response.status} ${response.statusText}`, responseBody ?? text);
  }

  return responseBody as T;
}

function safeJsonParse(value: string): unknown | undefined {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

export interface Group {
  id: string;
  name?: string;
  members_count?: number;
  topic_count?: number;
  invite_code?: string;
}

export interface EventSummary {
  id: string;
  name?: string;
  status?: string;
  topic?: { id: string; name?: string };
  group?: { id: string; name?: string };
}

export interface EventDetail extends EventSummary {
  submissions?: Submission[];
}

export interface Submission {
  id: string;
  title?: string;
  by?: string;
  user?: { id: string; name?: string };
  votes?: number;
  voteCount?: number;
  isWinner?: boolean;
}

export interface PollResult {
  id: string;
  question?: string;
  options?: PollOption[];
  link?: string;
}

export interface PollOption {
  id: string;
  label?: string;
  votes?: number;
}

export interface KarmaEntry {
  id?: string;
  name?: string;
  topic?: { id: string; name?: string };
  group?: { id: string; name?: string };
  karma?: number;
}

export async function listGroups(token: string): Promise<unknown> {
  return request('/groups', { method: 'GET', token });
}

export async function getGroup(token: string, groupId: string): Promise<unknown> {
  return request(`/groups/${groupId}`, { method: 'GET', token });
}

export async function createGroup(token: string, payload: { name: string }): Promise<unknown> {
  return request('/groups', { method: 'POST', token, payload });
}

export async function joinGroup(token: string, code: string): Promise<unknown> {
  return request('/groups/join', { method: 'POST', token, payload: { code } });
}

export async function listEvents(token: string, status?: string): Promise<unknown> {
  return request('/events', {
    method: 'GET',
    token,
    params: status ? { status } : undefined,
  });
}

export async function getEvent(token: string, eventId: string): Promise<unknown> {
  return request(`/events/${eventId}`, { method: 'GET', token });
}

export async function createEvent(token: string, topicId: string, name: string): Promise<unknown> {
  return request('/events', { method: 'POST', token, payload: { topicId, name } });
}

export async function submitPick(token: string, eventId: string, title: string): Promise<unknown> {
  return request(`/events/${eventId}/submit`, { method: 'POST', token, payload: { title } });
}

export async function voteForSubmission(token: string, eventId: string, submissionId: string): Promise<unknown> {
  return request(`/events/${eventId}/vote`, {
    method: 'POST',
    token,
    payload: { submissionId },
  });
}

export async function voteForSubmissions(token: string, eventId: string, submissionIds: string[]): Promise<unknown> {
  return request(`/events/${eventId}/vote`, {
    method: 'POST',
    token,
    payload: { submissionIds },
  });
}

export async function advanceEvent(token: string, eventId: string): Promise<unknown> {
  return request(`/events/${eventId}/advance`, { method: 'POST', token });
}

export async function createPoll(token: string, topicId: string, name: string, pollOptions: string[]): Promise<unknown> {
  return request('/events', {
    method: 'POST',
    token,
    payload: { topicId, name, isPoll: true, pollOptions },
  });
}

export async function getKarma(token: string, groupId?: string): Promise<unknown> {
  return request('/karma', { method: 'GET', token, params: groupId ? { groupId } : undefined });
}

export interface MeResponse {
  user: {
    id: string;
    name?: string;
    email?: string;
    image?: string;
    created_at?: string;
  };
  stats: {
    groups: number;
    api_tokens: number;
    webhooks: number;
  };
}

export async function getMe(token: string): Promise<MeResponse> {
  return request('/me', { method: 'GET', token });
}
