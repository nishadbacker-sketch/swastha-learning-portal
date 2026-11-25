-- Remove duplicate demographic QUESTIONS from the two newly created
-- Behavioural Therapy templates.  The assigned student's details are
-- displayed from students / the signed-in guardian profile in the UI.
-- Do not touch any template that has recorded assignment history.
DO $migration$
DECLARE existing_assignments bigint;
BEGIN
  SELECT count(*) INTO existing_assignments
  FROM public.custom_assessment_assignments a
  JOIN public.custom_assessment_templates t ON t.id=a.template_id
  WHERE t.title IN (
    'Behavioural Therapy — Student History Assessment',
    'Behavioural Therapy — Skills Assessment'
  );
  IF existing_assignments > 0 THEN
    RAISE EXCEPTION 'Cannot change existing assessment question IDs while assignments exist: %', existing_assignments;
  END IF;

  UPDATE public.custom_assessment_templates AS t
  SET structure = (
    SELECT jsonb_agg(
      jsonb_set(s.value,'{categories}',(
        SELECT jsonb_agg(
          jsonb_set(c.value,'{questions}',(
            SELECT jsonb_agg(q.value ORDER BY q.ordinality)
            FROM jsonb_array_elements(c.value->'questions') WITH ORDINALITY AS q(value,ordinality)
            WHERE NOT (
              (t.title='Behavioural Therapy — Student History Assessment'
               AND q.value->>'id' IN (
                 'q_BT_HISTORY_01_01','q_BT_HISTORY_01_02',
                 'q_BT_HISTORY_01_03','q_BT_HISTORY_01_04',
                 'q_BT_HISTORY_01_05','q_BT_HISTORY_01_06'
               ))
              OR (t.title='Behavioural Therapy — Skills Assessment'
               AND q.value->>'id' IN (
                 'q_BT2_CLIENT_01','q_BT2_CLIENT_02','q_BT2_CLIENT_03'
               ))
            )
          ) ORDER BY c.ordinality
        )
        FROM jsonb_array_elements(s.value->'categories') WITH ORDINALITY AS c(value,ordinality)
      )) ORDER BY s.ordinality
    )
    FROM jsonb_array_elements(t.structure) WITH ORDINALITY AS s(value,ordinality)
  )
  WHERE t.title IN (
    'Behavioural Therapy — Student History Assessment',
    'Behavioural Therapy — Skills Assessment'
  );
END
$migration$;
