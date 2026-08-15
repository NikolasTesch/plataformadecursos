// Rate limiter em memória (janela deslizante) — src/lib/rate-limit/index.ts.
//
// Semântica RECORD-ON-FAILURE (MAJOR-3, SPEC-auth A4: "5 tentativas FALHAS/min"):
// `check()` NÃO consome o orçamento — é chamado ANTES da verificação da senha
// para proteger o custo do argon2 sem penalizar tentativas legítimas;
// `record()` deve ser chamado SOMENTE após uma falha real (senha errada ou
// usuário não encontrado). Logins bem-sucedidos nunca consomem o orçamento.
//
// Limite documentado (plano S1): armazenamento em memória (Map) — válido para
// instância única; migração para Redis é necessária em multi-instância
// (fora do escopo do S1).
//
// Chaves: login = `${ip}:${email}` (5 falhas/min); registro = `ip`
// (10/hora); reenvio de verificação = conta (3/dia, preparado para S8).

export interface RateLimitResult {
  allowed: boolean;
  /** Segundos até o registro de falha mais antigo sair da janela (0 quando `allowed`). */
  retryAfterSeconds: number;
}

export interface RateLimiterOptions {
  /** Limite de falhas por janela (default quando `check` não recebe `limit`). */
  limit?: number;
  /** Tamanho da janela em ms (default quando `check` não recebe `windowMs`). */
  windowMs?: number;
  /** Fonte de tempo injetável para testabilidade (default: `Date.now`). */
  now?: () => number;
}

/**
 * Limiter de janela deslizante por chave: guarda os timestamps das falhas
 * registradas e responde se uma nova tentativa é permitida dentro da janela.
 * Não acopla a nenhum framework HTTP — services/auth consomem a API mínima
 * `check(chave)` / `record(chave)` (ver README da pasta).
 */
export class SlidingWindowLimiter {
  private readonly limit: number | undefined;
  private readonly windowMs: number | undefined;
  private readonly now: () => number;
  private readonly timestamps = new Map<string, number[]>();

  constructor(options: RateLimiterOptions = {}) {
    this.limit = options.limit;
    this.windowMs = options.windowMs;
    this.now = options.now ?? Date.now;
  }

  /**
   * Verifica se uma tentativa é permitida para a chave. NÃO registra nada
   * (record-on-failure): o orçamento só é consumido por `record()`.
   * `limit`/`windowMs` explícitos sobrescrevem a configuração do construtor.
   */
  check(key: string, limit?: number, windowMs?: number): RateLimitResult {
    const l = limit ?? this.limit;
    const w = windowMs ?? this.windowMs;
    if (l === undefined || w === undefined) {
      throw new Error(
        "rate-limit: limit e windowMs são obrigatórios (passe no construtor ou em check(key, limit, windowMs)).",
      );
    }

    const current = this.now();
    const cutoff = current - w;
    const recent = this.getRecent(key, cutoff);
    // Poda a janela a cada check (memória limitada a timestamps ativos).
    this.timestamps.set(key, recent);

    if (recent.length < l) {
      return { allowed: true, retryAfterSeconds: 0 };
    }

    // Bloqueado: segundos até o registro mais antigo sair da janela.
    const oldest = recent[0];
    const retryAfterMs = oldest + w - current;
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  /**
   * Registra UMA falha real para a chave. Só deve ser chamado após senha
   * inválida ou usuário não encontrado — nunca em login bem-sucedido.
   */
  record(key: string): void {
    const current = this.now();
    // Poda com a janela configurada (se houver) antes de inserir.
    const recent =
      this.windowMs === undefined
        ? (this.timestamps.get(key) ?? [])
        : this.getRecent(key, current - this.windowMs);
    recent.push(current);
    this.timestamps.set(key, recent);
  }

  /** Timestamps da chave mais recentes que `cutoff` (janela ativa). */
  private getRecent(key: string, cutoff: number): number[] {
    return (this.timestamps.get(key) ?? []).filter((t) => t > cutoff);
  }
}

export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_WINDOW_MS = 60_000; // 1 minuto (SPEC-auth A4 / :38)

export const REGISTRO_MAX_PER_HOUR = 10;
export const REGISTRO_WINDOW_MS = 3_600_000; // 1 hora (SPEC-auth A4)

/** 5 falhas/min por `${ip}:${email}` — protege o custo do argon2 no login. */
export const loginLimiter = new SlidingWindowLimiter({
  limit: LOGIN_MAX_FAILURES,
  windowMs: LOGIN_WINDOW_MS,
});

/** 10 registros/hora por `ip` — abuso de criação de contas. */
export const registroLimiter = new SlidingWindowLimiter({
  limit: REGISTRO_MAX_PER_HOUR,
  windowMs: REGISTRO_WINDOW_MS,
});
