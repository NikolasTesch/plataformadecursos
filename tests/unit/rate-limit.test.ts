// Testes unitários do rate limiter em memória (janela deslizante).
//
// TDD — semântica record-on-failure (MAJOR-3, SPEC-auth A4: "5 tentativas
// FALHAS/min"): `check()` NÃO consome o orçamento (é chamado ANTES da
// verificação da senha para proteger o custo do argon2); `record()` só é
// chamado APÓS uma falha real (senha errada ou usuário não encontrado).
// Logins bem-sucedidos nunca consomem o orçamento.
import { describe, expect, it } from "vitest";

import {
  loginLimiter,
  registroLimiter,
  SlidingWindowLimiter,
} from "@/lib/rate-limit";

/** Relógio fake injetável — evita manipular Date global nos testes. */
function createClock(start = 0) {
  let current = start;
  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms;
    },
  };
}

describe("SlidingWindowLimiter (genérico)", () => {
  it("permite as 5 primeiras falhas e bloqueia a 6ª com retryAfterSeconds", () => {
    const clock = createClock();
    const limiter = new SlidingWindowLimiter({
      limit: 5,
      windowMs: 60_000,
      now: clock.now,
    });
    const key = "192.168.0.1:aluno@exemplo.com";

    // 5 falhas reais: check passa (não consome) e record registra a falha.
    for (let i = 1; i <= 5; i++) {
      clock.advance(1_000);
      expect(limiter.check(key).allowed).toBe(true);
      limiter.record(key);
    }

    // 6ª tentativa bloqueada.
    clock.advance(1_000);
    const sixth = limiter.check(key);
    expect(sixth.allowed).toBe(false);
    // Registro mais antigo em t=1000; janela 60s; now=6000 → 1000+60000-6000=55000ms → 55s.
    expect(sixth.retryAfterSeconds).toBe(55);
  });

  it("retryAfterSeconds = segundos até o registro mais antigo sair da janela", () => {
    const clock = createClock();
    const limiter = new SlidingWindowLimiter({ now: clock.now });

    for (let i = 0; i < 5; i++) limiter.record("k");

    // 5 registros em t=0 → bloqueado, retryAfter = janela inteira (60s).
    const r1 = limiter.check("k", 5, 60_000);
    expect(r1.allowed).toBe(false);
    expect(r1.retryAfterSeconds).toBe(60);

    // +10s → o registro mais antigo ainda está na janela → retryAfter cai para 50s.
    clock.advance(10_000);
    const r2 = limiter.check("k", 5, 60_000);
    expect(r2.allowed).toBe(false);
    expect(r2.retryAfterSeconds).toBe(50);
  });

  it("janela desliza: timestamps antigos saem da janela e liberam a chave", () => {
    const clock = createClock();
    const limiter = new SlidingWindowLimiter({
      limit: 5,
      windowMs: 60_000,
      now: clock.now,
    });
    const key = "10.0.0.1:velho@exemplo.com";

    for (let i = 0; i < 5; i++) limiter.record(key);
    expect(limiter.check(key).allowed).toBe(false);

    // Passa a janela inteira + 1ms → todos os registros expiram.
    clock.advance(60_001);
    expect(limiter.check(key).allowed).toBe(true);
  });

  it("check() NÃO consome o orçamento — 6 checks sem record seguem permitidos", () => {
    const clock = createClock();
    const limiter = new SlidingWindowLimiter({
      limit: 5,
      windowMs: 60_000,
      now: clock.now,
    });

    // Simula 6 LOGINS BEM-SUCEDIDOS: check antes do verify, nunca record.
    for (let i = 0; i < 6; i++) {
      expect(limiter.check("sucesso@exemplo.com").allowed).toBe(true);
    }
  });

  it("suporta a assinatura genérica check(key, limit, windowMs) sem config", () => {
    const clock = createClock();
    const limiter = new SlidingWindowLimiter({ now: clock.now });

    for (let i = 0; i < 3; i++) {
      expect(limiter.check("k1", 3, 60_000).allowed).toBe(true);
      limiter.record("k1");
    }
    expect(limiter.check("k1", 3, 60_000).allowed).toBe(false);
    // Chave diferente não é afetada.
    expect(limiter.check("k2", 3, 60_000).allowed).toBe(true);
  });
});

describe("loginLimiter (5 falhas/min por IP+email)", () => {
  it("logins bem-sucedidos não consomem o orçamento (6 checks sem record)", () => {
    const key = "203.0.113.7:ok@exemplo.com";
    for (let i = 0; i < 6; i++) {
      expect(loginLimiter.check(key).allowed).toBe(true);
    }
  });

  it("5 falhas registradas → 6ª bloqueada com retryAfterSeconds > 0", () => {
    const key = "198.51.100.4:falha@exemplo.com";

    for (let i = 0; i < 5; i++) {
      expect(loginLimiter.check(key).allowed).toBe(true);
      loginLimiter.record(key);
    }

    const sixth = loginLimiter.check(key);
    expect(sixth.allowed).toBe(false);
    expect(sixth.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("chave por IP+email: email diferente com o mesmo IP não é afetado", () => {
    const chaveA = "10.1.1.1:a@exemplo.com";
    const chaveB = "10.1.1.1:b@exemplo.com";

    for (let i = 0; i < 5; i++) {
      loginLimiter.check(chaveA);
      loginLimiter.record(chaveA);
    }

    expect(loginLimiter.check(chaveB).allowed).toBe(true);
    expect(loginLimiter.check(chaveA).allowed).toBe(false);
  });
});

describe("registroLimiter (10/hora por IP)", () => {
  it("10 registros permitidos, 11º bloqueado com retryAfterSeconds > 0", () => {
    const ip = "198.51.100.9";

    for (let i = 0; i < 10; i++) {
      expect(registroLimiter.check(ip).allowed).toBe(true);
      registroLimiter.record(ip);
    }

    const eleventh = registroLimiter.check(ip);
    expect(eleventh.allowed).toBe(false);
    expect(eleventh.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("IPs diferentes são independentes", () => {
    for (let i = 0; i < 10; i++) {
      registroLimiter.check("203.0.113.50");
      registroLimiter.record("203.0.113.50");
    }
    expect(registroLimiter.check("198.51.100.60").allowed).toBe(true);
  });
});
