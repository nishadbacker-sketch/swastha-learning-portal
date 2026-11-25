-- Remove redundant demographic questions only from templates with no assignments; retain all clinical items.
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
        )) ORDER BY c.ordinality
      )
      FROM jsonb_array_elements(s.value->'categories') WITH ORDINALITY AS c(value,ordinality)
    )) ORDER BY s.ordinality
  )
  FROM jsonb_array_elements(t.structure) WITH ORDINALITY AS s(value,ordinality)
) WHERE t.title IN ('Behavioural Therapy — Student History Assessment','Behavioural Therapy — Skills Assessment') AND NOT EXISTS (SELECT 1 FROM public.custom_assessment_assignments a WHERE a.template_id=t.id);
