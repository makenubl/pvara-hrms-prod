import crypto from 'crypto';

/**
 * OpenAI Request Manager with circuit breaker, caching, and rate limiting
 */

// Configuration - use getters to ensure env vars are read at runtime
const getConfig = () => ({
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o',
  OPENAI_GLOBAL_DAILY_BUDGET_TOKENS: parseInt(process.env.OPENAI_GLOBAL_DAILY_BUDGET_TOKENS || '500000', 10),
  OPENAI_TENANT_DAILY_QUOTA_TOKENS: parseInt(process.env.OPENAI_TENANT_DAILY_QUOTA_TOKENS || '100000', 10),
  OPENAI_MAX_RETRIES: parseInt(process.env.OPENAI_MAX_RETRIES || '3', 10),
  OPENAI_CIRCUIT_BREAK_THRESHOLD: parseInt(process.env.OPENAI_CIRCUIT_BREAK_THRESHOLD || '5', 10),
  OPENAI_CIRCUIT_BREAK_COOLDOWN_MS: parseInt(process.env.OPENAI_CIRCUIT_BREAK_COOLDOWN_MS || (5 * 60 * 1000).toString(), 10),
  OPENAI_CACHE_TTL_MS: parseInt(process.env.OPENAI_CACHE_TTL_MS || (60 * 60 * 1000).toString(), 10),
  OPENAI_DEFAULT_TENANT_ID: process.env.OPENAI_DEFAULT_TENANT_ID || 'global',
});

// Export a proxy that always reads fresh config values
const openAIConfig = new Proxy({}, {
  get(target, prop) {
    return getConfig()[prop];
  }
});

class OpenAIRequestManager {
  constructor() {
    this.tenantUsage = new Map();
    this.globalUsage = { tokensUsed: 0, resetAt: this.getNextResetTimestamp() };
    this.cache = new Map();
    this.failureCount = 0;
    this.breakerOpenUntil = 0;
  }

  buildCacheKey(requestName, ...parts) {
    const hash = crypto.createHash('sha256');
    hash.update(requestName);
    for (const part of parts) {
      if (part === undefined || part === null) {
        continue;
      }
      const serialized = typeof part === 'string' ? part : JSON.stringify(part);
      hash.update(serialized);
    }
    return hash.digest('hex');
  }

  async execute(options) {
    const tenantId = options.tenantId || getConfig().OPENAI_DEFAULT_TENANT_ID || 'global';
    this.resetUsageWindow(this.globalUsage);
    this.resetUsageWindow(this.ensureTenantTracker(tenantId));

    if (this.isCircuitOpen()) {
      return this.returnCachedOrThrow(options.cacheKey, `[OpenAI][${options.requestName}] circuit breaker active`);
    }

    if (this.isGlobalBudgetExceeded()) {
      return this.returnCachedOrThrow(options.cacheKey, '[OpenAI] Global token budget exhausted');
    }

    if (this.isTenantBudgetExceeded(tenantId)) {
      return this.returnCachedOrThrow(options.cacheKey, `[OpenAI][tenant=${tenantId}] quota exhausted`);
    }

    const maxRetries = Math.max(1, getConfig().OPENAI_MAX_RETRIES || 3);
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt += 1;
      const startedAt = Date.now();
      try {
        const { value, usage } = await options.operation();
        const durationMs = Date.now() - startedAt;
        this.failureCount = 0;
        this.recordUsage(tenantId, usage);
        this.logSuccess(options.requestName, tenantId, durationMs, usage, options.promptSnippet);
        if (options.cacheKey) {
          this.cacheResult(options.cacheKey, value);
        }
        return value;
      } catch (error) {
        const durationMs = Date.now() - startedAt;
        this.failureCount += 1;
        this.logFailure(options.requestName, tenantId, attempt, durationMs, error, options.promptSnippet);
        if (this.failureCount >= getConfig().OPENAI_CIRCUIT_BREAK_THRESHOLD) {
          this.openCircuit();
        }
        if (attempt >= maxRetries) {
          return this.returnCachedOrThrow(
            options.cacheKey,
            `[OpenAI][${options.requestName}] failed after ${attempt} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
        await this.sleep(Math.pow(2, attempt - 1) * 250);
      }
    }

    return this.returnCachedOrThrow(options.cacheKey, `[OpenAI][${options.requestName}] execution aborted`);
  }

  recordUsage(tenantId, usage) {
    if (!usage) return;
    const tokens = usage.total_tokens || (usage.input_tokens || 0) + (usage.output_tokens || 0);
    if (!tokens) return;
    this.globalUsage.tokensUsed += tokens;
    const tenantTracker = this.ensureTenantTracker(tenantId);
    tenantTracker.tokensUsed += tokens;
  }

  logSuccess(requestName, tenantId, durationMs, usage, promptSnippet) {
    const tokens = usage?.total_tokens ?? 'n/a';
    console.log(
      `[OpenAI][${requestName}] tenant=${tenantId} duration=${durationMs}ms tokens=${tokens} prompt="${this.formatPrompt(promptSnippet)}"`
    );
  }

  logFailure(requestName, tenantId, attempt, durationMs, error, promptSnippet) {
    console.warn(
      `[OpenAI][${requestName}] tenant=${tenantId} attempt=${attempt} duration=${durationMs}ms error=${
        error instanceof Error ? error.message : String(error)
      } prompt="${this.formatPrompt(promptSnippet)}"`
    );
  }

  formatPrompt(snippet) {
    if (!snippet) return '';
    const trimmed = snippet.replace(/\s+/g, ' ').trim();
    return trimmed.length > 120 ? `${trimmed.substring(0, 117)}...` : trimmed;
  }

  isCircuitOpen() {
    if (!this.breakerOpenUntil) return false;
    if (Date.now() >= this.breakerOpenUntil) {
      this.breakerOpenUntil = 0;
      this.failureCount = 0;
      return false;
    }
    return true;
  }

  openCircuit() {
    if (this.breakerOpenUntil && Date.now() < this.breakerOpenUntil) return;
    const cooldown = getConfig().OPENAI_CIRCUIT_BREAK_COOLDOWN_MS || 300000;
    this.breakerOpenUntil = Date.now() + cooldown;
    console.warn(`[OpenAI] Circuit breaker opened for ${cooldown}ms after repeated failures.`);
  }

  returnCachedOrThrow(cacheKey, reason) {
    const cached = this.getCached(cacheKey);
    if (cached !== undefined) {
      console.warn(`${reason}; returning cached response.`);
      return cached;
    }
    throw new Error(reason);
  }

  cacheResult(cacheKey, value) {
    const ttl = getConfig().OPENAI_CACHE_TTL_MS || 3600000;
    this.cache.set(cacheKey, { value, expiresAt: Date.now() + ttl });
  }

  getCached(cacheKey) {
    if (!cacheKey) return undefined;
    const entry = this.cache.get(cacheKey);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(cacheKey);
      return undefined;
    }
    return entry.value;
  }

  isGlobalBudgetExceeded() {
    const limit = getConfig().OPENAI_GLOBAL_DAILY_BUDGET_TOKENS;
    if (!limit) return false;
    return this.globalUsage.tokensUsed >= limit;
  }

  isTenantBudgetExceeded(tenantId) {
    const limit = getConfig().OPENAI_TENANT_DAILY_QUOTA_TOKENS;
    if (!limit) return false;
    const tracker = this.ensureTenantTracker(tenantId);
    return tracker.tokensUsed >= limit;
  }

  ensureTenantTracker(tenantId) {
    const existing = this.tenantUsage.get(tenantId);
    if (existing) return existing;
    const tracker = { tokensUsed: 0, resetAt: this.getNextResetTimestamp() };
    this.tenantUsage.set(tenantId, tracker);
    return tracker;
  }

  resetUsageWindow(tracker) {
    if (Date.now() >= tracker.resetAt) {
      tracker.tokensUsed = 0;
      tracker.resetAt = this.getNextResetTimestamp();
    }
  }

  getNextResetTimestamp() {
    return Date.now() + 24 * 60 * 60 * 1000;
  }

  async sleep(ms) {
    await new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const openAIRequestManager = new OpenAIRequestManager();
export { openAIConfig };
