async function parseVoteJson(res) {
  try {
    return await res.json();
  } catch (e) {
    return null;
  }
}

export async function fetchVoteSession(code) {
  const res = await fetch(`/api/vote-sessions/${encodeURIComponent(code)}`);
  const json = await parseVoteJson(res);
  if (!res.ok) {
    throw new Error(json?.message || `HTTP ${res.status}`);
  }
  return json;
}

export async function joinVoteSession(code, displayName) {
  const res = await fetch(`/api/vote-sessions/${encodeURIComponent(code)}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName }),
  });
  const json = await parseVoteJson(res);
  if (!res.ok) {
    throw new Error(json?.message || `HTTP ${res.status}`);
  }
  return json;
}

export async function castVote(code, { participantId, vote, watchableId }) {
  const res = await fetch(`/api/vote-sessions/${encodeURIComponent(code)}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ participantId, vote, watchableId }),
  });
  const json = await parseVoteJson(res);
  if (!res.ok) {
    throw new Error(json?.message || `HTTP ${res.status}`);
  }
  return json;
}

export function participantStorageKey(code) {
  return `watchlist.vote.participant.${code}`;
}

export function loadParticipantId(code) {
  return sessionStorage.getItem(participantStorageKey(code));
}

export function saveParticipantId(code, participantId) {
  sessionStorage.setItem(participantStorageKey(code), participantId);
}
