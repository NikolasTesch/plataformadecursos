-- S5: um GUID Bunny identifica no máximo um material.
-- A checagem falha de forma explícita se um banco legado tiver duplicatas;
-- nenhum dado é apagado ou alterado automaticamente.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "materials"
    WHERE "video_provider_id" IS NOT NULL
    GROUP BY "video_provider_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'duplicated non-null materials.video_provider_id; resolve duplicates before applying S5 migration';
  END IF;
END $$;

CREATE UNIQUE INDEX "materials_video_provider_id_key"
ON "materials"("video_provider_id");
