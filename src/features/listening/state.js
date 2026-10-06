export const createListeningState = () => ({ activities: {}, revisions: new Map() });

const envelopeTime = (activity) => {
  const value = activity?.expiresAt;
  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

const applyEnvelope = (state, envelope, now, { allowEqual = false } = {}) => {
  if (!envelope || envelope.userId == null || !Number.isFinite(Number(envelope.revision))) return state;
  const userId = Number(envelope.userId);
  const revision = Number(envelope.revision);
  const previousRevision = state.revisions.get(userId) ?? -1;
  if (allowEqual ? revision < previousRevision : revision <= previousRevision) return state;

  const revisions = new Map(state.revisions);
  revisions.set(userId, revision);
  const activities = { ...state.activities };
  if (envelope.activity && envelopeTime(envelope.activity) > now) activities[userId] = envelope.activity;
  else delete activities[userId];
  return { activities, revisions };
};

export function reduceListeningState(state, action) {
  const now = action.now ?? Date.now();
  if (action.type === 'reset') return createListeningState();
  if (action.type === 'delta') return applyEnvelope(state, action.envelope, now);
  if (action.type === 'rest') {
    return (action.activities || []).reduce((next, activity) => applyEnvelope(next, {
      userId: activity.userId, revision: activity.revision, activity,
    }, now), state);
  }
  if (action.type === 'snapshot') {
    const visibleUsers = new Set();
    const activities = {};
    const revisions = new Map(state.revisions);
    (action.envelopes || []).forEach((envelope) => {
      if (!envelope || envelope.userId == null || !Number.isFinite(Number(envelope.revision))) return;
      const userId = Number(envelope.userId);
      const revision = Number(envelope.revision);
      visibleUsers.add(userId);
      const previousRevision = state.revisions.get(userId) ?? -1;
      const previousActivity = state.activities[userId];
      if (revision < previousRevision) {
        if (previousActivity && envelopeTime(previousActivity) > now) activities[userId] = previousActivity;
        return;
      }
      if (revision > previousRevision) revisions.set(userId, revision);
      if (envelope.activity && envelopeTime(envelope.activity) > now) activities[userId] = envelope.activity;
    });
    // A full snapshot also defines who is still authorized to appear. Users omitted
    // from it lose their visible activity, while their revision stays as a stale-event guard.
    Object.keys(state.activities).forEach((key) => {
      if (!visibleUsers.has(Number(key))) delete activities[key];
    });
    return { activities, revisions };
  }
  if (action.type === 'expire') {
    const expired = Object.entries(state.activities).filter(([, activity]) => {
      const expiresAt = envelopeTime(activity);
      return expiresAt !== null && expiresAt <= now;
    });
    if (!expired.length) return state;
    const activities = { ...state.activities };
    expired.forEach(([userId]) => delete activities[userId]);
    return { ...state, activities };
  }
  return state;
}
