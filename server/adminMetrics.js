async function nudgeLeaders(db, scope) {
  const [sent, received] = await Promise.all([
    db.query(`SELECT u.id, u.username, COUNT(*)::int AS count
      FROM messages m JOIN conversations c ON c.id=m.conversation_id JOIN users u ON u.id=m.sender_id
      WHERE c.company_id=$1 AND c.event_id=$2 AND u.company_id=$1 AND u.event_id=$2 AND m.draw_attention
      GROUP BY u.id,u.username ORDER BY count DESC,u.id LIMIT 1`, scope),
    db.query(`SELECT u.id, u.username, COUNT(DISTINCT m.id)::int AS count
      FROM messages m JOIN conversations c ON c.id=m.conversation_id
      JOIN conversation_members cm ON cm.conversation_id=c.id AND cm.user_id<>m.sender_id
      JOIN users u ON u.id=cm.user_id
      WHERE c.company_id=$1 AND c.event_id=$2 AND u.company_id=$1 AND u.event_id=$2 AND m.draw_attention
      GROUP BY u.id,u.username ORDER BY count DESC,u.id LIMIT 1`, scope),
  ]);
  return { topNudgeSender: sent.rows[0] || null, topNudgeRecipient: received.rows[0] || null };
}
module.exports = { nudgeLeaders };
