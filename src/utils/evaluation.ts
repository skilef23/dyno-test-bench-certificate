import type { SpecType, PassFailStatus, TestResultItem } from '../types';

const normalized = (value: unknown) => String(value ?? '').trim().toUpperCase().replace(/\s+/g, ' ');
const specName = (value: unknown) => normalized(value).replace(/-/g, '_');
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
export const isTextSpec = (value: unknown) => ['TEXT', 'QUALITATIVE'].includes(specName(value));
export const hasReading = (value: unknown) => value !== undefined && value !== null && String(value).trim() !== '';

export function parseReading(value: unknown): number | undefined {
  if (finite(value)) return value;
  if (typeof value !== 'string' || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())) return undefined;
  const number = Number(value);
  return finite(number) ? number : undefined;
}

export function specificationError(item: Pick<TestResultItem, 'specType' | 'minValue' | 'maxValue' | 'targetValue' | 'tolerance'>): string | undefined {
  switch (specName(item.specType)) {
    case 'MIN': case 'MINIMUM':
      return finite(item.minValue) ? undefined : 'Minimum is missing or invalid.';
    case 'MAX': case 'MAXIMUM':
      return finite(item.maxValue) ? undefined : 'Maximum is missing or invalid.';
    case 'MIN_MAX':
      return finite(item.minValue) && finite(item.maxValue) && item.minValue <= item.maxValue ? undefined : 'A valid minimum and maximum are required.';
    case 'TARGET_TOLERANCE':
      return finite(item.targetValue) && finite(item.tolerance) && item.tolerance >= 0 && finite(item.targetValue - item.tolerance) && finite(item.targetValue + item.tolerance) ? undefined : 'A finite target and non-negative tolerance are required.';
    case 'TEXT': case 'QUALITATIVE': return undefined;
    default: return 'Unsupported specification type.';
  }
}

export function evaluateValue(val: number | undefined | null, specType: SpecType | string, minValue?: number, maxValue?: number, targetValue?: number, tolerance?: number): PassFailStatus {
  if (!finite(val) || specificationError({specType: specType as SpecType, minValue, maxValue, targetValue, tolerance})) return 'PENDING';
  switch (specName(specType)) {
    case 'MIN': case 'MINIMUM': return val >= minValue! ? 'PASS' : 'FAIL';
    case 'MAX': case 'MAXIMUM': return val <= maxValue! ? 'PASS' : 'FAIL';
    case 'MIN_MAX': return val >= minValue! && val <= maxValue! ? 'PASS' : 'FAIL';
    case 'TARGET_TOLERANCE': {
      const epsilon = Number.EPSILON * Math.max(1, Math.abs(val), Math.abs(targetValue!), tolerance!) * 8;
      return val >= targetValue! - tolerance! - epsilon && val <= targetValue! + tolerance! + epsilon ? 'PASS' : 'FAIL';
    }
    default: return 'PENDING';
  }
}

export function evaluateItemStatus(item: TestResultItem): {status: PassFailStatus; statusRh?: PassFailStatus; statusLh?: PassFailStatus} {
  const evaluate = (value: unknown): PassFailStatus => {
    if (isTextSpec(item.specType)) {
      const valueText = normalized(value);
      if (!valueText) return 'PENDING';
      const pass = (item.textPassValues ?? ['GOOD', 'OK', 'PASS', 'NORMAL']).map(normalized);
      const fail = (item.textFailValues ?? ['NOT GOOD', 'NG', 'NOK', 'FAIL', 'REJECT']).map(normalized);
      if (pass.includes(valueText) && fail.includes(valueText)) return 'PENDING';
      if (fail.includes(valueText)) return 'FAIL';
      if (pass.includes(valueText)) return 'PASS';
      return 'PENDING';
    }
    return evaluateValue(parseReading(value), item.specType, item.minValue, item.maxValue, item.targetValue, item.tolerance);
  };
  if (item.bankConfig === 'RH_LH') {
    const statusRh = evaluate(item.actualRh);
    const statusLh = evaluate(item.actualLh);
    const status = statusRh === 'FAIL' || statusLh === 'FAIL' ? 'FAIL' : statusRh === 'PASS' && statusLh === 'PASS' ? 'PASS' : 'PENDING';
    return {status, statusRh, statusLh};
  }
  return {status: evaluate(item.actualValue)};
}

export function isOptionalBlank(item: TestResultItem): boolean {
  return item.required === false && !(item.bankConfig === 'RH_LH' ? hasReading(item.actualRh) || hasReading(item.actualLh) : hasReading(item.actualValue));
}

export function normalizeResults(items: TestResultItem[]): TestResultItem[] {
  return items.map(item => ({...item, ...evaluateItemStatus(item)}));
}

export function calculateOverallResults(items: TestResultItem[]) {
  let passedParameters = 0, failedParameters = 0, pendingParameters = 0, skippedParameters = 0;
  for (const item of items) {
    if (specificationError(item)) { pendingParameters++; continue; }
    if (isOptionalBlank(item)) { skippedParameters++; continue; }
    const {status} = evaluateItemStatus(item);
    if (status === 'PASS') passedParameters++;
    else if (status === 'FAIL') failedParameters++;
    else pendingParameters++;
  }
  const overallResult: PassFailStatus = failedParameters > 0 ? 'FAIL' : pendingParameters > 0 || passedParameters === 0 ? 'PENDING' : 'PASS';
  return {overallResult, totalParameters: items.length, passedParameters, failedParameters, pendingParameters, skippedParameters};
}

export function formatSpecificationDisplay(item: {
  specType: SpecType | string;
  specText?: string;
  minValue?: number;
  maxValue?: number;
  targetValue?: number;
  tolerance?: number;
  unit: string;
}): string {
  if (item.specText && item.specText.trim().length > 0) {
    return item.specText;
  }

  const normalized = String(item.specType).toUpperCase();
  switch (normalized) {
    case 'MIN':
    case 'MINIMUM':
      return `Min. ${item.minValue} ${item.unit}`;
    case 'MAX':
    case 'MAXIMUM':
      return `Max. ${item.maxValue} ${item.unit}`;
    case 'MIN_MAX':
    case 'MIN-MAX':
      return `${item.minValue} ~ ${item.maxValue} ${item.unit}`;
    case 'TARGET_TOLERANCE':
    case 'TARGET-TOLERANCE':
      return `${item.targetValue} ± ${item.tolerance} ${item.unit}`;
    case 'TEXT':
    case 'QUALITATIVE':
      return 'Standard Visual / Function Inspection';
    default:
      return '-';
  }
}
