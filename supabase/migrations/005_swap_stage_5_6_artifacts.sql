-- Swap product order: stage 5 = user journey, stage 6 = latent needs.
-- Existing rows used stage_id 5 for needs_board and stage_id 6 for journey_map.

UPDATE artifacts SET stage_id = -5 WHERE stage_id = 5;
UPDATE artifacts SET stage_id = 5 WHERE stage_id = 6;
UPDATE artifacts SET stage_id = 6 WHERE stage_id = -5;
