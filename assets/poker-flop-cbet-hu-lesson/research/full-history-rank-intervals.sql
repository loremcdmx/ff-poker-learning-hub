SELECT
  h.user_id,
  h.rang,
  FORMAT_TIMESTAMP('%F %T', GREATEST(h.rang_start_at, TIMESTAMP '2023-09-01 00:00:00+00'), 'UTC') AS rank_start_at,
  FORMAT_TIMESTAMP('%F %T', LEAST(COALESCE(h.rang_end_at, TIMESTAMP '2026-07-22 00:00:00+00'), TIMESTAMP '2026-07-22 00:00:00+00'), 'UTC') AS rank_end_at
FROM `analytics_mcp_readonly.mcp__check_rank_history` AS h
JOIN `analytics_mcp_readonly.mcp__check_users` AS u USING (user_id)
WHERE h.rang BETWEEN 1 AND 18
  AND h.rang_start_at < TIMESTAMP '2026-07-22 00:00:00+00'
  AND COALESCE(h.rang_end_at, TIMESTAMP '2026-07-22 00:00:00+00') > TIMESTAMP '2023-09-01 00:00:00+00'
  AND u.is_real_player = TRUE
ORDER BY h.user_id, h.rang_start_at;
