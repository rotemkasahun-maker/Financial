import type {
  AiReceiptExtraction,
  AiReceiptItem
} from './aiReceiptExtractor.ts';

export type ReceiptValidationIssue = {
  field: string;
  severity: 'warning' | 'error';
  code: string;
  message: string;
};

export type ReceiptValidationResult = {
  valid: boolean;
  safeForAutomaticSave: boolean;
  requiresReview: boolean;
  confidence: number;
  issues: ReceiptValidationIssue[];
  receipt: AiReceiptExtraction;
};

const AUTO_SAVE_CONFIDENCE = 0.90;
const MIN_ACCEPTABLE_CONFIDENCE = 0.70;

export function validateReceiptExtraction(
  receipt: AiReceiptExtraction
): ReceiptValidationResult {
  const issues: ReceiptValidationIssue[] = [];

  validateRequiredFields(receipt, issues);
  validateConfidence(receipt, issues);
  validateDate(receipt.purchaseDate, issues);
  validateMoneyField('total', receipt.total, issues, true);
  validateMoneyField('vat', receipt.vat, issues);
  validateMoneyField(
    'subtotalBeforeVat',
    receipt.subtotalBeforeVat,
    issues
  );
  validateCard(receipt, issues);
  validateItems(receipt.items, issues);
  validateArithmetic(receipt, issues);

  for (const warning of receipt.warnings ?? []) {
    issues.push({
      field: 'ai',
      severity: 'warning',
      code: 'ai_warning',
      message: warning
    });
  }

  const hasErrors = issues.some(
    issue => issue.severity === 'error'
  );

  const hasWarnings = issues.some(
    issue => issue.severity === 'warning'
  );

  const safeForAutomaticSave =
    !hasErrors &&
    !hasWarnings &&
    receipt.confidence >= AUTO_SAVE_CONFIDENCE;

  return {
    valid: !hasErrors,
    safeForAutomaticSave,
    requiresReview: !safeForAutomaticSave,
    confidence: receipt.confidence,
    issues,
    receipt
  };
}

function validateRequiredFields(
  receipt: AiReceiptExtraction,
  issues: ReceiptValidationIssue[]
): void {
  if (!receipt.merchant && !receipt.rawMerchant) {
    error(
      issues,
      'merchant',
      'missing_merchant',
      'Merchant could not be identified'
    );
  }

  if (!receipt.purchaseDate) {
    error(
      issues,
      'purchaseDate',
      'missing_date',
      'Purchase date could not be identified'
    );
  }

  if (!receipt.total) {
    error(
      issues,
      'total',
      'missing_total',
      'Final receipt total could not be identified'
    );
  }

  if (!receipt.currency) {
    warning(
      issues,
      'currency',
      'missing_currency',
      'Currency could not be identified'
    );
  }
}

function validateConfidence(
  receipt: AiReceiptExtraction,
  issues: ReceiptValidationIssue[]
): void {
  if (
    typeof receipt.confidence !== 'number' ||
    !Number.isFinite(receipt.confidence) ||
    receipt.confidence < 0 ||
    receipt.confidence > 1
  ) {
    error(
      issues,
      'confidence',
      'invalid_confidence',
      'AI confidence must be between 0 and 1'
    );

    return;
  }

  if (receipt.confidence < MIN_ACCEPTABLE_CONFIDENCE) {
    error(
      issues,
      'confidence',
      'low_confidence',
      'AI extraction confidence is too low'
    );

    return;
  }

  if (receipt.confidence < AUTO_SAVE_CONFIDENCE) {
    warning(
      issues,
      'confidence',
      'review_confidence',
      'AI extraction requires review because confidence is below the automatic-save threshold'
    );
  }
}

function validateDate(
  value: string | null,
  issues: ReceiptValidationIssue[]
): void {
  if (!value) {
    return;
  }

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (!match) {
    error(
      issues,
      'purchaseDate',
      'invalid_date_format',
      'Purchase date must use YYYY-MM-DD format'
    );

    return;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  const valid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  if (!valid) {
    error(
      issues,
      'purchaseDate',
      'invalid_date',
      'Purchase date is not a valid calendar date'
    );

    return;
  }

  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  if (date.getTime() > tomorrow.getTime()) {
    warning(
      issues,
      'purchaseDate',
      'future_date',
      'Purchase date appears to be in the future'
    );
  }
}

function validateMoneyField(
  field: string,
  value: string | null,
  issues: ReceiptValidationIssue[],
  mustBePositive = false
): void {
  if (value === null) {
    return;
  }

  if (!/^-?\d+(?:\.\d{2})$/.test(value)) {
    error(
      issues,
      field,
      'invalid_money_format',
      `${field} must be a decimal monetary string`
    );

    return;
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    error(
      issues,
      field,
      'invalid_money_value',
      `${field} is not a valid monetary value`
    );

    return;
  }

  if (mustBePositive && amount <= 0) {
    error(
      issues,
      field,
      'non_positive_total',
      'Receipt total must be greater than zero'
    );
  }
}

function validateCard(
  receipt: AiReceiptExtraction,
  issues: ReceiptValidationIssue[]
): void {
  if (
    receipt.cardLast4 &&
    !/^\d{4}$/.test(receipt.cardLast4)
  ) {
    warning(
      issues,
      'cardLast4',
      'invalid_card_last4',
      'Card suffix should contain exactly four digits'
    );
  }
}

function validateItems(
  items: AiReceiptItem[],
  issues: ReceiptValidationIssue[]
): void {
  if (!Array.isArray(items)) {
    error(
      issues,
      'items',
      'invalid_items',
      'Receipt items must be an array'
    );

    return;
  }

  for (let index = 0; index < items.length; index++) {
    const item = items[index];

    if (!item.name?.trim()) {
      warning(
        issues,
        `items.${index}.name`,
        'missing_item_name',
        `Item ${index + 1} has no name`
      );
    }

    if (
      item.quantity !== null &&
      (
        typeof item.quantity !== 'number' ||
        !Number.isFinite(item.quantity) ||
        item.quantity <= 0
      )
    ) {
      warning(
        issues,
        `items.${index}.quantity`,
        'invalid_item_quantity',
        `Item ${index + 1} has an invalid quantity`
      );
    }

    validateOptionalItemMoney(
      `items.${index}.unitPrice`,
      item.unitPrice,
      issues
    );

    validateOptionalItemMoney(
      `items.${index}.totalPrice`,
      item.totalPrice,
      issues
    );

    validateOptionalItemMoney(
      `items.${index}.discount`,
      item.discount,
      issues
    );
  }
}

function validateOptionalItemMoney(
  field: string,
  value: string | null,
  issues: ReceiptValidationIssue[]
): void {
  if (value === null) {
    return;
  }

  if (!/^-?\d+(?:\.\d{2})$/.test(value)) {
    warning(
      issues,
      field,
      'invalid_item_money',
      `${field} is not a valid monetary value`
    );
  }
}

function validateArithmetic(
  receipt: AiReceiptExtraction,
  issues: ReceiptValidationIssue[]
): void {
  if (
    receipt.total &&
    receipt.subtotalBeforeVat &&
    receipt.vat
  ) {
    const total = Number(receipt.total);
    const subtotal = Number(receipt.subtotalBeforeVat);
    const vat = Number(receipt.vat);

    if (
      Number.isFinite(total) &&
      Number.isFinite(subtotal) &&
      Number.isFinite(vat)
    ) {
      const difference = Math.abs(
        total - (subtotal + vat)
      );

      if (difference > 0.05) {
        warning(
          issues,
          'total',
          'vat_arithmetic_mismatch',
          'Subtotal plus VAT does not match the final total'
        );
      }
    }
  }
}

function error(
  issues: ReceiptValidationIssue[],
  field: string,
  code: string,
  message: string
): void {
  issues.push({
    field,
    severity: 'error',
    code,
    message
  });
}

function warning(
  issues: ReceiptValidationIssue[],
  field: string,
  code: string,
  message: string
): void {
  issues.push({
    field,
    severity: 'warning',
    code,
    message
  });
}