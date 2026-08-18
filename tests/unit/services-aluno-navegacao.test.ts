import { describe, expect, it } from "vitest";

import { determinarStatusMaterial } from "@/services/aluno/navegacao";

describe("status da navegação do aluno", () => {
  it.each([
    [true, "assinatura", false, "disponivel"],
    [true, "venda_unica", false, "disponivel"],
    [true, "amostra", false, "amostra"],
    [true, "assinatura", true, "concluido"],
    [true, "amostra", true, "concluido"],
    [false, "assinatura", true, "bloqueado"],
  ] as const)("retorna %s para acesso=%s, motivo=%s, concluido=%s", (permitido, motivo, concluido, esperado) => {
    expect(determinarStatusMaterial({ permitido, motivo, concluido })).toBe(esperado);
  });

  it("não expõe conclusão de outro estado sem acesso", () => {
    expect(determinarStatusMaterial({ permitido: false, motivo: "bloqueado", concluido: true })).toBe("bloqueado");
  });
});
