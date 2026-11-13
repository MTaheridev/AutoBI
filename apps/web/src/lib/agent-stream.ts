const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3101';

export type AgentArtifact = {
  type: string;
  id: string;
  label?: string;
};

export type AgentAskState = {
  askId: string;
  question: string;
  options: Array<{ id: string; label: string }>;
  allowMultiple: boolean;
};

export type AgentStreamEvent =
  | { type: 'status'; message: string }
  | {
      type: 'tool_start';
      id: string;
      name: string;
      arguments: Record<string, unknown>;
    }
  | {
      type: 'tool_end';
      id: string;
      name: string;
      ok: boolean;
      latencyMs: number;
      result: unknown;
      error?: string;
      artifacts?: AgentArtifact[];
    }
  | { type: 'artifact'; artifact: AgentArtifact }
  | { type: 'message'; role: 'assistant'; content: string }
  | {
      type: 'ask';
      askId: string;
      question: string;
      options: Array<{ id: string; label: string }>;
      allowMultiple: boolean;
    }
  | { type: 'awaiting_input'; conversationId: string; askId: string }
  | { type: 'done'; conversationId: string; artifacts: AgentArtifact[] }
  | { type: 'error'; message: string };

async function readSseStream(
  response: Response,
  onEvent: (event: AgentStreamEvent) => void,
): Promise<void> {
  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Agent stream failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() ?? '';
    for (const chunk of chunks) {
      const line = chunk
        .split('\n')
        .map((l) => l.trim())
        .find((l) => l.startsWith('data:'));
      if (!line) continue;
      const raw = line.slice(5).trim();
      if (!raw) continue;
      try {
        onEvent(JSON.parse(raw) as AgentStreamEvent);
      } catch {
        // ignore malformed frames
      }
    }
  }
}

export async function streamAgentChat(
  body: {
    workspaceId: string;
    conversationId?: string;
    message: string;
    provider?: string;
  },
  onEvent: (event: AgentStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(`${API_URL}/api/v1/agent/chat/stream`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  await readSseStream(response, onEvent);
}

export async function streamAgentAnswer(
  body: {
    workspaceId: string;
    conversationId: string;
    askId: string;
    selectedOptionIds: string[];
    freeText?: string;
    provider?: string;
  },
  onEvent: (event: AgentStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(
    `${API_URL}/api/v1/agent/conversations/${body.conversationId}/answer`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    },
  );
  await readSseStream(response, onEvent);
}
