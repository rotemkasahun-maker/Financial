const REVIEW_CATEGORY_OPTIONS = [
  'סופר',
  'בית',
  'פנאי ובילויים',
  'איפור וטיפוח'
];

export function displayReviewValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
}

export function coerceReviewPrice(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : '';
}

export function resolveReviewLineTotal(item = {}) {
  const explicitTotal = coerceReviewPrice(item.totalPrice);
  if (explicitTotal !== '') {
    return explicitTotal;
  }

  const quantity = Number(item.quantity);
  const unitPrice = coerceReviewPrice(item.unitPrice);

  if (
    unitPrice !== '' &&
    Number.isFinite(quantity) &&
    quantity > 0
  ) {
    return Math.round(quantity * unitPrice * 100) / 100;
  }

  return '';
}

export function resolveReviewMerchant(extraction = {}) {
  const normalized = displayReviewValue(extraction.merchant);
  if (normalized) {
    return normalized;
  }

  return displayReviewValue(extraction.rawMerchant);
}

export function mapBackendItemToReviewItem(item = {}) {
  const rawName =
    item.rawName ??
    item.name ??
    '';

  return {
    rawName: displayReviewValue(rawName),
    category: displayReviewValue(item.category),
    totalPrice: resolveReviewLineTotal(item),
    quantity:
      item.quantity === null || item.quantity === undefined
        ? null
        : Number(item.quantity),
    unitPrice: coerceReviewPrice(item.unitPrice),
    discount: coerceReviewPrice(item.discount)
  };
}

export function buildReviewStatusStrip({
  confidence = 0,
  requiresReview = false,
  validationIssueCodes = []
} = {}) {
  const percent = Math.round(Number(confidence || 0) * 100);

  if (requiresReview) {
    const noteCount = validationIssueCodes.length;
    const notesSuffix =
      noteCount > 0 ? ` · ${noteCount} הערות לבדיקה` : '';
    return `⚠ החילוץ הסתיים · נדרשת בדיקה${notesSuffix} · ביטחון ${percent}%`;
  }

  return `✓ החילוץ הסתיים · ביטחון ${percent}%`;
}

export function mapAnalyzeResultToReviewState(
  result,
  { fileName = '', fileUrl = '', fileType = 'image' } = {}
) {
  const extraction = result?.extraction || {};
  const validation = result?.validation || null;
  const validationIssueCodes = Array.isArray(validation?.issues)
    ? validation.issues.map(issue => issue.code)
    : [];

  const merchant = resolveReviewMerchant(extraction);
  const rawMerchant = displayReviewValue(extraction.rawMerchant);

  const items = Array.isArray(extraction.items)
    ? extraction.items.map(mapBackendItemToReviewItem)
    : [];

  return {
    merchant,
    rawMerchant,
    merchantHint:
      rawMerchant && rawMerchant !== merchant ? rawMerchant : '',
    purchaseDate: displayReviewValue(extraction.purchaseDate),
    total: extraction.total ? Number(extraction.total) : 0,
    paymentMethod: displayReviewValue(extraction.paymentMethod),
    currency: displayReviewValue(extraction.currency),
    category: '',
    confidence: Number(extraction.confidence || 0),
    items,
    fileName,
    fileUrl,
    fileType,
    requiresReview: Boolean(
      result?.status === 'review_required' ||
        validation?.requiresReview
    ),
    validationIssueCodes,
    reviewStatusStrip: buildReviewStatusStrip({
      confidence: extraction.confidence,
      requiresReview:
        result?.status === 'review_required' ||
        validation?.requiresReview,
      validationIssueCodes
    })
  };
}

export function renderReviewCategoryOptions(selectedCategory = '') {
  const selected = displayReviewValue(selectedCategory);

  return [
    `<option value=""${selected ? '' : ' selected'}>בחרו קטגוריה</option>`,
    ...REVIEW_CATEGORY_OPTIONS.map(option => {
      const isSelected = selected === option ? ' selected' : '';
      return `<option${isSelected}>${option}</option>`;
    })
  ].join('');
}
