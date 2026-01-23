export interface StoredSession {
  id: string;
  title: string;
  date: string; // ISO string
  messages: any[]; // Message[]
  updatedAt: number;
}

export const STORAGE_KEY = "flint_chat_sessions";

export const getSessions = (): StoredSession[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveSession = (session: StoredSession) => {
  const sessions = getSessions();
  const index = sessions.findIndex((s) => s.id === session.id);
  if (index >= 0) {
    sessions[index] = session;
  } else {
    sessions.unshift(session);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  window.dispatchEvent(new Event("storage-update"));
};

export const deleteSession = (sessionId: string) => {
  const sessions = getSessions();
  const filtered = sessions.filter((s) => s.id !== sessionId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  window.dispatchEvent(new Event("storage-update"));
};
