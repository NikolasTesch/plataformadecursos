import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/admin/materiais/actions", () => ({
  iniciarUploadVideoAction: vi.fn(),
}));
import { criarFingerprintUpload } from "@/components/player/VideoUploadPanel";

describe("fingerprint de upload de vídeo", () => {
  it("não compartilha fingerprint entre GUIDs do mesmo material e arquivo", () => {
    const arquivo = { name: "aula.mp4", size: 1024, lastModified: 1234 };

    expect(criarFingerprintUpload("material-1", "guid-antigo", arquivo))
      .not.toBe(criarFingerprintUpload("material-1", "guid-atual", arquivo));
  });
});
