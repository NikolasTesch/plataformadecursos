-- S5: a invariável R11 também deve existir no banco, não só no serviço.
-- A validação aborta sem alterar dados se o banco legado já estiver inválido.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "materials"
    WHERE "tipo" = 'video'
      AND "status" = 'publicado'
      AND ("video_status" IS NULL OR "video_status" <> 'pronto')
  ) THEN
    RAISE EXCEPTION 'published video materials must have video_status pronto before applying R11 constraint';
  END IF;
END $$;

ALTER TABLE "materials"
ADD CONSTRAINT "materials_video_publicado_pronto_check"
CHECK (
  "tipo" <> 'video'
  OR "status" <> 'publicado'
  OR ("video_status" IS NOT NULL AND "video_status" = 'pronto')
);
