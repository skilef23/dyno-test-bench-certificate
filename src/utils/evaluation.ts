import { SpecType, PassFailStatus, TestResultItem } from '../types';

export function evaluateValue(
  val: number | undefined | null,
  specType: SpecType | string,
  minValue?: number,
  maxValue?: number,
  targetValue?: number,
  tolerance?: number
): PassFailStatus {
  if (val === undefined || val === null || isNaN(val)) {
    return 'PENDING';
  }

  const normalizedSpec = String(specType).toUpperCase();

  switch (normalizedSpec) {
    case 'MIN':
    case 'MINIMUM':
      if (minValue !== undefined) {
        return val >= minValue ? 'PASS' : 'FAIL';
      }
      break;

    case 'MAX':
    case 'MAXIMUM':
      if (maxValue !== undefined) {
        return val <= maxValue ? 'PASS' : 'FAIL';
      }
      break;

    case 'MIN_MAX':
    case 'MIN-MAX':
      if (minValue !== undefined && maxValue !== undefined) {
        return val >= minValue && val <= maxValue ? 'PASS' : 'FAIL';
      } else if (minValue !== undefined) {
        return val >= minValue ? 'PASS' : 'FAIL';
      } else if (maxValue !== undefined) {
        return val <= maxValue ? 'PASS' : 'FAIL';
      }
      break;

    case 'TARGET_TOLERANCE':
    case 'TARGET-TOLERANCE':
      if (targetValue !== undefined && tolerance !== undefined) {
        const lowerBound = targetValue - tolerance;
        const upperBound = targetValue + tolerance;
        const roundedVal = Math.round(val * 1000) / 1000;
        return roundedVal >= lowerBound - 0.0001 && roundedVal <= upperBound + 0.0001
          ? 'PASS'
          : 'FAIL';
      }
      break;

    case 'TEXT':
    case 'QUALITATIVE':
      return 'PASS';
  }

  return 'PASS';
}

export function evaluateItemStatus(item: TestResultItem): {
  status: PassFailStatus;
  statusRh?: PassFailStatus;
  statusLh?: PassFailStatus;
} {
  const isRhLh = item.bankConfig === 'RH_LH';

  if (isRhLh) {
    const statusRh = evaluateValue(
      item.actualRh,
      item.specType,
      item.minValue,
      item.maxValue,
      item.targetValue,
      item.tolerance
    );

    const statusLh = evaluateValue(
      item.actualLh,
      item.specType,
      item.minValue,
      item.maxValue,
      item.targetValue,
      item.tolerance
    );

    let status: PassFailStatus = 'PENDING';
    if (statusRh === 'PENDING' || statusLh === 'PENDING') {
      status = 'PENDING';
    } else if (statusRh === 'PASS' && statusLh === 'PASS') {
      status = 'PASS';
    } else {
      status = 'FAIL';
    }

    return { status, statusRh, statusLh };
  } else {
    const numVal =
      typeof item.actualValue === 'number'
        ? item.actualValue
        : item.actualValue !== undefined && item.actualValue !== ''
        ? parseFloat(String(item.actualValue))
        : undefined;

    const normalizedSpec = String(item.specType).toUpperCase();
    if (normalizedSpec === 'TEXT' || normalizedSpec === 'QUALITATIVE') {
      if (!item.actualValue || String(item.actualValue).trim() === '') {
        return { status: 'PENDING' };
      }
      const valUpper = String(item.actualValue).toUpperCase();
      const status: PassFailStatus =
        valUpper.includes('FAIL') || valUpper.includes('NOK') || valUpper.includes('REJECT')
          ? 'FAIL'
          : 'PASS';
      return { status };
    }

    const status = evaluateValue(
      numVal,
      item.specType,
      item.minValue,
      item.maxValue,
      item.targetValue,
      item.tolerance
    );

    return { status };
  }
}

export function calculateOverallResults(items: TestResultItem[]): {
  overallResult: PassFailStatus;
  totalParameters: number;
  passedParameters: number;
  failedParameters: number;
  pendingParameters: number;
} {
  const totalParameters = items.length;
  let passedParameters = 0;
  let failedParameters = 0;
  let pendingParameters = 0;

  for (const item of items) {
    if (item.status === 'FAIL') {
      failedParameters++;
    } else if (item.status === 'PASS') {
      passedParameters++;
    } else {
      pendingParameters++;
    }
  }

  let overallResult: PassFailStatus = 'PENDING';
  if (failedParameters > 0) {
    overallResult = 'FAIL';
  } else if (pendingParameters > 0) {
    overallResult = 'PENDING';
  } else if (totalParameters > 0 && passedParameters === totalParameters) {
    overallResult = 'PASS';
  }

  return {
    overallResult,
    totalParameters,
    passedParameters,
    failedParameters,
    pendingParameters,
  };
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
