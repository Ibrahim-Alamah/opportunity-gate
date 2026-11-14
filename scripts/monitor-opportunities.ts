import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  DeadlineEvaluation,
  OpportunitiesDataset,
  Opportunity,
} from '../src/types/opportunity.ts';
import {
  evaluateOpportunityDeadline,
  parseCalendarDateToUtcMs,
  validateOfficialHttpsUrl,
  validateOpportunitiesDataset,
} from '../src/utils/validateOpportunities.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

export const DEFAULT_DATA_PATH = path.join(
  PROJECT_ROOT,
  'public',
  'data',
  'opportunities.json'
);
export const DEFAULT_BASELINE_PATH = path.join(
  PROJECT_ROOT,
  'scripts',
  '.monitor-baseline.json'
);

export const MS_PER_DAY = 86_400_000;
export const CLOSING_SOON_DAYS = 14;
export const STALE_VERIFICATION_DAYS = 90;
export const DEFAULT_FETCH_TIMEOUT_MS = 10_000;
export const DEFAULT_MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
export const DEFAULT_MAX_REDIRECTS = 5;

export type MonitorStatusCode =
  | 'OK'
  | 'CLOSING_SOON'
  | 'EXPIRED'
  | 'STALE_VERIFICATION'
  | 'INVALID_URL'
  | 'REDIRECTED'
  | 'CONTENT_CHANGED'
  | 'NEEDS_MANUAL_REVIEW';

export interface BaselineEntry {
  url: string;
  finalUrl: string;
  contentHash: string;
  checkedAt: string;
}

export type BaselineMap = Record<string, BaselineEntry>;

export interface OnlineCheckResult {
  checked: boolean;
  httpStatus: number | null;
  finalUrl: string | null;
  redirected: boolean;
  contentHash: string | null;
  baselineAvailable: boolean;
  contentChanged: boolean;
  needsManualReview: boolean;
  note: string;
}

export interface OpportunityMonitorFinding {
  id: string;
  title: string;
  officialUrl: string;
  deadlineType: Opportunity['deadlineType'];
  deadline: string | null;
  deadlineEvaluation: DeadlineEvaluation;
  verifiedAt: string;
  verificationAgeDays: number | null;
  urlValid: boolean;
  urlError: string | null;
  onlineResult: OnlineCheckResult | null;
  statuses: MonitorStatusCode[];
  changesDetected: string[];
  humanAction: string;
}

export interface MonitorReport {
  generatedAtUtc: string;
  referenceUtcDate: string;
  onlineEnabled: boolean;
  baselinePath: string | null;
  baselineExists: boolean;
  baselineUpdated: boolean;
  datasetValid: boolean;
  datasetValidationErrors: string[];
  totalOpportunities: number;
  findings: OpportunityMonitorFinding[];
}

export type FetchLike = (
  input: string,
  init?: RequestInit
) => Promise<Response>;

export interface MonitorOptions {
  dataPath?: string;
  baselinePath?: string;
  online?: boolean;
  updateBaseline?: boolean;
  referenceDate?: Date | string;
  timeoutMs?: number;
  maxResponseBytes?: number;
  maxRedirects?: number;
  fetchImpl?: FetchLike;
}

/**
 * Normalizes a Date or YYYY-MM-DD string to UTC midnight milliseconds.
 */
export function toUtcCalendarDayMs(referenceDate: Date | string = new Date()): number {
  if (typeof referenceDate === 'string') {
    const parsed = parseCalendarDateToUtcMs(referenceDate);
    if (parsed !== null) {
      return parsed;
    }
  }
  const date = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/**
 * Formats UTC midnight milliseconds as YYYY-MM-DD.
 */
export function formatUtcDate(utcDayMs: number): string {
  return new Date(utcDayMs).toISOString().slice(0, 10);
}

/**
 * Computes how many UTC calendar days have elapsed since verifiedAt.
 */
export function calculateVerificationAgeDays(
  verifiedAt: unknown,
  referenceDate: Date | string = new Date()
): number | null {
  const verifiedUtcMs = parseCalendarDateToUtcMs(verifiedAt);
  if (verifiedUtcMs === null) {
    return null;
  }
  const refUtcMs = toUtcCalendarDayMs(referenceDate);
  return Math.round((refUtcMs - verifiedUtcMs) / MS_PER_DAY);
}

/**
 * Validates that a URL (including redirect targets) is a safe public HTTPS URL.
 */
export function isSafeOfficialRedirectTarget(urlString: string): {
  safe: boolean;
  reason?: string;
} {
  const baseCheck = validateOfficialHttpsUrl(urlString);
  if (!baseCheck.valid) {
    return { safe: false, reason: baseCheck.reason || 'Invalid redirect URL' };
  }

  try {
    const parsed = new URL(urlString);
    const host = parsed.hostname.toLowerCase();

    if (
      host === 'localhost' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host === '[::1]' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host.startsWith('127.') ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('169.254.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      return {
        safe: false,
        reason: `Unsafe private/loopback redirect destination "${host}"`,
      };
    }

    return { safe: true };
  } catch {
    return { safe: false, reason: 'Malformed redirect URL' };
  }
}

/**
 * Computes a normalized SHA-256 hash of fetched HTML/text for change detection.
 */
export function computeNormalizedContentHash(bodyText: string): string {
  const normalized = bodyText
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

function looksLikeJsRenderedShell(bodyText: string): boolean {
  const strippedText = bodyText
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (strippedText.length < 80) {
    return true;
  }

  return /enable javascript|requires javascript|please turn on javascript/i.test(
    strippedText
  );
}

async function readResponseTextWithLimit(
  response: Response,
  maxBytes: number
): Promise<{ text: string; truncated: boolean }> {
  const contentLengthHeader = response.headers?.get?.('content-length');
  if (contentLengthHeader) {
    const declaredLength = Number(contentLengthHeader);
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      return { text: '', truncated: true };
    }
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > maxBytes) {
    return { text: '', truncated: true };
  }

  return {
    text: new TextDecoder('utf-8', { fatal: false }).decode(buffer),
    truncated: false,
  };
}

/**
 * Fetches an official HTTPS URL safely with manual redirect checks, timeout, and size limits.
 */
export async function checkOfficialUrlOnline(
  opportunityId: string,
  officialUrl: string,
  baseline: BaselineMap | null,
  options: {
    timeoutMs?: number;
    maxResponseBytes?: number;
    maxRedirects?: number;
    fetchImpl?: FetchLike;
  } = {}
): Promise<OnlineCheckResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const maxResponseBytes = options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as FetchLike);

  let currentUrl = officialUrl;
  let redirectCount = 0;

  while (true) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetchImpl(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'OpportunityGate-ReadOnlyMonitor/1.0',
          Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        },
      });
    } catch (error) {
      clearTimeout(timer);
      const isAbort =
        error instanceof Error &&
        (error.name === 'AbortError' || error.message.toLowerCase().includes('abort'));
      return {
        checked: true,
        httpStatus: null,
        finalUrl: currentUrl,
        redirected: currentUrl !== officialUrl,
        contentHash: null,
        baselineAvailable: Boolean(baseline && baseline[opportunityId]),
        contentChanged: false,
        needsManualReview: true,
        note: isAbort
          ? `Request timed out after ${timeoutMs}ms; manual browser check required.`
          : `Network error (${error instanceof Error ? error.message : String(error)}); manual check required.`,
      };
    } finally {
      clearTimeout(timer);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers?.get?.('location');
      if (!location) {
        return {
          checked: true,
          httpStatus: response.status,
          finalUrl: currentUrl,
          redirected: currentUrl !== officialUrl,
          contentHash: null,
          baselineAvailable: Boolean(baseline && baseline[opportunityId]),
          contentChanged: false,
          needsManualReview: true,
          note: `HTTP ${response.status} redirect without Location header.`,
        };
      }

      if (redirectCount >= maxRedirects) {
        return {
          checked: true,
          httpStatus: response.status,
          finalUrl: currentUrl,
          redirected: true,
          contentHash: null,
          baselineAvailable: Boolean(baseline && baseline[opportunityId]),
          contentChanged: false,
          needsManualReview: true,
          note: `Exceeded max redirects (${maxRedirects}); manual check required.`,
        };
      }

      let resolvedNextUrl: string;
      try {
        resolvedNextUrl = new URL(location, currentUrl).href;
      } catch {
        return {
          checked: true,
          httpStatus: response.status,
          finalUrl: currentUrl,
          redirected: true,
          contentHash: null,
          baselineAvailable: Boolean(baseline && baseline[opportunityId]),
          contentChanged: false,
          needsManualReview: true,
          note: 'Malformed redirect Location URL; manual check required.',
        };
      }

      const safeCheck = isSafeOfficialRedirectTarget(resolvedNextUrl);
      if (!safeCheck.safe) {
        return {
          checked: true,
          httpStatus: response.status,
          finalUrl: resolvedNextUrl,
          redirected: true,
          contentHash: null,
          baselineAvailable: Boolean(baseline && baseline[opportunityId]),
          contentChanged: false,
          needsManualReview: true,
          note: `Rejected unsafe redirect (${safeCheck.reason}); manual check required.`,
        };
      }

      currentUrl = resolvedNextUrl;
      redirectCount += 1;
      continue;
    }

    const redirected = currentUrl !== officialUrl;
    const priorBaseline = baseline ? baseline[opportunityId] : undefined;
    const baselineAvailable = Boolean(priorBaseline);

    if (response.status === 403 || response.status === 429 || response.status >= 400) {
      return {
        checked: true,
        httpStatus: response.status,
        finalUrl: currentUrl,
        redirected,
        contentHash: null,
        baselineAvailable,
        contentChanged: false,
        needsManualReview: true,
        note: `HTTP ${response.status} received (do not assume closed); manual browser review required.`,
      };
    }

    const { text, truncated } = await readResponseTextWithLimit(
      response,
      maxResponseBytes
    );
    if (truncated) {
      return {
        checked: true,
        httpStatus: response.status,
        finalUrl: currentUrl,
        redirected,
        contentHash: null,
        baselineAvailable,
        contentChanged: false,
        needsManualReview: true,
        note: `Response exceeded ${maxResponseBytes} byte limit; manual review required.`,
      };
    }

    const jsShell = looksLikeJsRenderedShell(text);
    const contentHash = computeNormalizedContentHash(text);
    const contentChanged = Boolean(
      priorBaseline && priorBaseline.contentHash !== contentHash
    );

    let note = `HTTP ${response.status} OK`;
    if (jsShell) {
      note = `HTTP ${response.status} appears JS-rendered or minimal; manual browser verification recommended.`;
    } else if (!baselineAvailable) {
      note = `HTTP ${response.status} OK (no baseline; content-change comparison unavailable).`;
    } else if (contentChanged) {
      note = `HTTP ${response.status} content hash changed compared to baseline.`;
    }

    return {
      checked: true,
      httpStatus: response.status,
      finalUrl: currentUrl,
      redirected,
      contentHash,
      baselineAvailable,
      contentChanged,
      needsManualReview: jsShell,
      note,
    };
  }
}

async function readBaselineIfPresent(
  baselinePath: string
): Promise<{ exists: boolean; data: BaselineMap | null }> {
  try {
    const raw = await fs.readFile(baselinePath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { exists: true, data: parsed as BaselineMap };
    }
    return { exists: true, data: null };
  } catch {
    return { exists: false, data: null };
  }
}

/**
 * Runs read-only monitoring checks over the opportunities dataset and returns a structured report.
 */
export async function monitorOpportunities(
  options: MonitorOptions = {}
): Promise<MonitorReport> {
  const dataPath = options.dataPath ?? DEFAULT_DATA_PATH;
  const baselinePath = options.baselinePath ?? DEFAULT_BASELINE_PATH;
  const onlineEnabled = Boolean(options.online);
  const updateBaseline = Boolean(options.updateBaseline);

  const refUtcMs = toUtcCalendarDayMs(options.referenceDate ?? new Date());
  const referenceUtcDate = formatUtcDate(refUtcMs);
  const generatedAtUtc = new Date().toISOString();

  const rawJson = await fs.readFile(dataPath, 'utf8');
  const parsedDataset = JSON.parse(rawJson) as OpportunitiesDataset;
  const validation = validateOpportunitiesDataset(parsedDataset, referenceUtcDate);

  const baselineState = await readBaselineIfPresent(baselinePath);
  const nextBaseline: BaselineMap = { ...(baselineState.data ?? {}) };
  const findings: OpportunityMonitorFinding[] = [];

  for (const opp of parsedDataset.opportunities) {
    const deadlineEvaluation = evaluateOpportunityDeadline(opp, referenceUtcDate);
    const verificationAgeDays = calculateVerificationAgeDays(
      opp.verifiedAt,
      referenceUtcDate
    );
    const urlCheck = validateOfficialHttpsUrl(opp.officialUrl);

    const statuses: MonitorStatusCode[] = [];
    const changesDetected: string[] = [];
    const actions: string[] = [];

    if (!urlCheck.valid) {
      statuses.push('INVALID_URL');
      actions.push(`Fix invalid officialUrl (${urlCheck.reason || 'invalid URL'})`);
    }

    if (deadlineEvaluation.status === 'closing_soon') {
      statuses.push('CLOSING_SOON');
      actions.push(
        `Verify deadline (${opp.deadline}, ${deadlineEvaluation.remainingDays}d left) on official source`
      );
    } else if (deadlineEvaluation.status === 'expired') {
      statuses.push('EXPIRED');
      actions.push(
        `Check official source for new cycle or keep archived as expired (${opp.deadline})`
      );
    }

    if (verificationAgeDays === null || verificationAgeDays > STALE_VERIFICATION_DAYS) {
      statuses.push('STALE_VERIFICATION');
      actions.push(
        `Re-verify against official source (verifiedAt ${opp.verifiedAt}, ${verificationAgeDays ?? 'unknown'}d old > ${STALE_VERIFICATION_DAYS}d)`
      );
    }

    let onlineResult: OnlineCheckResult | null = null;
    if (onlineEnabled && urlCheck.valid) {
      onlineResult = await checkOfficialUrlOnline(
        opp.id,
        opp.officialUrl,
        baselineState.data,
        {
          timeoutMs: options.timeoutMs,
          maxResponseBytes: options.maxResponseBytes,
          maxRedirects: options.maxRedirects,
          fetchImpl: options.fetchImpl,
        }
      );

      if (onlineResult.redirected) {
        statuses.push('REDIRECTED');
        changesDetected.push(
          `Official URL redirected: ${opp.officialUrl} -> ${onlineResult.finalUrl}`
        );
        actions.push('Confirm whether official application link moved permanently');
      }

      if (onlineResult.contentChanged) {
        statuses.push('CONTENT_CHANGED');
        changesDetected.push('Official page content SHA-256 hash changed vs. baseline');
        actions.push('Review official page for deadline, eligibility, or status updates');
      }

      if (onlineResult.needsManualReview) {
        statuses.push('NEEDS_MANUAL_REVIEW');
        actions.push(onlineResult.note);
      }

      if (updateBaseline && onlineResult.contentHash && onlineResult.finalUrl) {
        nextBaseline[opp.id] = {
          url: opp.officialUrl,
          finalUrl: onlineResult.finalUrl,
          contentHash: onlineResult.contentHash,
          checkedAt: generatedAtUtc,
        };
      }
    }

    if (statuses.length === 0) {
      statuses.push('OK');
    }

    findings.push({
      id: opp.id,
      title: opp.title?.en || opp.title?.ar || opp.id,
      officialUrl: opp.officialUrl,
      deadlineType: opp.deadlineType,
      deadline: opp.deadline,
      deadlineEvaluation,
      verifiedAt: opp.verifiedAt,
      verificationAgeDays,
      urlValid: urlCheck.valid,
      urlError: urlCheck.reason ?? null,
      onlineResult,
      statuses,
      changesDetected,
      humanAction:
        actions.length > 0 ? actions.join(' | ') : 'None required.',
    });
  }

  let baselineUpdated = false;
  if (onlineEnabled && updateBaseline) {
    await fs.writeFile(
      baselinePath,
      `${JSON.stringify(nextBaseline, null, 2)}\n`,
      'utf8'
    );
    baselineUpdated = true;
  }

  return {
    generatedAtUtc,
    referenceUtcDate,
    onlineEnabled,
    baselinePath: onlineEnabled ? baselinePath : null,
    baselineExists: baselineState.exists,
    baselineUpdated,
    datasetValid: validation.valid,
    datasetValidationErrors: validation.errors.map(
      (err) => `${err.opportunityId ?? err.recordIndex ?? 'dataset'}: ${err.field} - ${err.message}`
    ),
    totalOpportunities: findings.length,
    findings,
  };
}

/**
 * Formats a MonitorReport into a concise human-readable CLI report.
 */
export function formatMonitorReport(report: MonitorReport): string {
  const lines: string[] = [
    'Opportunity Gate – Read-Only Opportunity Monitoring Report',
    '============================================================',
    `Reference UTC Date : ${report.referenceUtcDate}`,
    `Mode               : ${report.onlineEnabled ? 'Local + Official URL (--online)' : 'Local Checks Only (Offline)'}`,
    `Dataset Valid      : ${report.datasetValid ? 'YES' : `NO (${report.datasetValidationErrors.length} errors)`}`,
    `Total Opportunities: ${report.totalOpportunities}`,
  ];

  if (report.onlineEnabled) {
    lines.push(
      `Baseline           : ${report.baselineExists ? 'Loaded' : 'Missing (content-change comparison unavailable)'}${report.baselineUpdated ? ' [Updated via --update-baseline]' : ''}`
    );
  }

  if (report.datasetValidationErrors.length > 0) {
    lines.push('', 'Dataset Validation Errors:');
    for (const err of report.datasetValidationErrors) {
      lines.push(`  - ${err}`);
    }
  }

  lines.push('------------------------------------------------------------');

  for (const item of report.findings) {
    const deadlineLabel =
      item.deadlineEvaluation.remainingDays !== null
        ? `${item.deadlineEvaluation.status} (${item.deadline ?? 'null'}, ${item.deadlineEvaluation.remainingDays}d)`
        : `${item.deadlineEvaluation.status} (${item.deadlineType})`;

    const ageLabel =
      item.verificationAgeDays !== null
        ? `${item.verificationAgeDays}d (verifiedAt: ${item.verifiedAt})`
        : `invalid (verifiedAt: ${item.verifiedAt})`;

    const urlLabel = !item.urlValid
      ? `INVALID_URL (${item.urlError ?? 'invalid'})`
      : item.onlineResult
        ? item.onlineResult.note
        : 'Valid HTTPS (not fetched; run with --online to check)';

    lines.push(`[${item.statuses.join(', ')}] ${item.id}`);
    lines.push(`  Title           : ${item.title}`);
    lines.push(`  Deadline        : ${deadlineLabel}`);
    lines.push(`  Verification Age: ${ageLabel}`);
    lines.push(`  Official URL    : ${urlLabel}`);
    lines.push(
      `  Changes         : ${item.changesDetected.length > 0 ? item.changesDetected.join('; ') : 'None'}`
    );
    lines.push(`  Human Action    : ${item.humanAction}`);
    lines.push('');
  }

  return lines.join('\n');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const online = args.includes('--online');
  const updateBaseline = args.includes('--update-baseline');

  if (updateBaseline && !online) {
    console.error('Error: --update-baseline requires --online.');
    process.exit(1);
  }

  const report = await monitorOpportunities({ online, updateBaseline });
  console.log(formatMonitorReport(report));
  process.exit(report.datasetValid ? 0 : 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error: unknown) => {
    console.error(
      'Monitoring failed:',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  });
}
