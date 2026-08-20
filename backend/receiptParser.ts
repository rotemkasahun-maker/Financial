export type ParsedReceiptItem = {
    lineNumber: number | null;
    name: string;
    quantity: number | null;
    unitPrice: string | null;
    totalPrice: string | null;
};

export type ParsedReceiptDiscount = {
    lineNumber: number | null;
    description: string;
    amount: string;
};

export type ParsedReceipt = {
    merchant: string | null;
    rawMerchant: string | null;
    purchaseDate: string | null;
    purchaseTime: string | null;
    total: string | null;
    currency: string | null;
    invoiceNumber: string | null;
    receiptNumber: string | null;
    paymentMethod: string | null;
    cardLast4: string | null;
    vat: string | null;
    subtotalBeforeVat: string | null;
    items: ParsedReceiptItem[];
    discounts: ParsedReceiptDiscount[];
    rawText: string;
    warnings: string[];
};

export function parseReceiptText(rawText: string): ParsedReceipt {
    if (typeof rawText !== 'string' || rawText.trim().length === 0) {
        throw new TypeError('parseReceiptText expects non-empty text');
    }

    const text = normalizeText(rawText);
    const warnings: string[] = [];

    const rawMerchant = extractMerchant(text);
    const purchaseDate = extractDate(text);
    const purchaseTime = extractTime(text);

    const total = extractMoneyAfterLabels(text, [
        'סה"כ לתשלום',
        'סכום כולל',
        'סה"כ אשראי',
        'שולם / זוכה'
    ]);

    const invoiceNumber =
        firstMatch(text, /חשבונית(?:\s+מס)?\s+(\d{4,})/i) ||
        firstMatch(text, /חשבונית\s+מספר\s+(\d{4,})/i);

    const receiptNumber =
        firstMatch(text, /קבלה\s+מספר\s+(\d{4,})/i) ||
        firstMatch(text, /מס[׳']?\s*קבלה\s*[:\-]?\s*(\d{4,})/i);

    const vat = extractVat(text);

    const subtotalBeforeVat = extractMoneyAfterLabels(text, [
        'סה"כ חייב מע"מ',
        'סה"כ לפני מע"מ'
    ]);

    const card = extractCardDetails(text);
    const { items, discounts } = extractLineItems(text);

    if (!rawMerchant) {
        warnings.push('Could not identify merchant');
    }

    if (!purchaseDate) {
        warnings.push('Could not identify receipt date');
    }

    if (!total) {
        warnings.push('Could not identify total amount');
    }

    if (!invoiceNumber && !receiptNumber) {
        warnings.push('Could not identify invoice or receipt number');
    }

    if (items.length === 0) {
        warnings.push('Could not identify receipt line items');
    }

    return {
        merchant: rawMerchant,
        rawMerchant,
        purchaseDate,
        purchaseTime,
        total,
        currency: total ? 'ILS' : null,
        invoiceNumber,
        receiptNumber,
        paymentMethod: card.paymentMethod,
        cardLast4: card.cardLast4,
        vat,
        subtotalBeforeVat,
        items,
        discounts,
        rawText,
        warnings
    };
}

function normalizeText(value: string): string {
    return value
        .replace(/\u00a0/g, ' ')
        .replace(/[ \t]+/g, ' ')
        .replace(/\r/g, '')
        .trim();
}

function extractMerchant(text: string): string | null {
    const beginning = text.slice(0, 500);

    const stopTokens = [
        ' לכבוד:',
        ' שם לקוח:',
        ' תאריך:',
        ' חשבונית ',
        ' קבלה מספר'
    ];

    let end = beginning.length;

    for (const token of stopTokens) {
        const index = beginning.indexOf(token);

        if (index >= 0 && index < end) {
            end = index;
        }
    }

    const candidate = beginning
        .slice(0, end)
        .replace(/\s+/g, ' ')
        .trim();

    return candidate.length >= 2 ? candidate : null;
}

function extractDate(text: string): string | null {
    const match = text.match(
        /תאריך\s*:\s*(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/
    );

    if (!match) {
        return null;
    }

    const [, dayRaw, monthRaw, yearRaw] = match;

    const day = Number(dayRaw);
    const month = Number(monthRaw);
    const year = Number(
        yearRaw.length === 2 ? `20${yearRaw}` : yearRaw
    );

    if (
        !Number.isInteger(day) ||
        !Number.isInteger(month) ||
        !Number.isInteger(year) ||
        day < 1 ||
        day > 31 ||
        month < 1 ||
        month > 12
    ) {
        return null;
    }

    return [
        String(year).padStart(4, '0'),
        String(month).padStart(2, '0'),
        String(day).padStart(2, '0')
    ].join('-');
}

function extractTime(text: string): string | null {
    const match = text.match(
        /שעה\s*:\s*([01]?\d|2[0-3]):([0-5]\d)/
    );

    if (!match) {
        return null;
    }

    return `${match[1].padStart(2, '0')}:${match[2]}`;
}

function extractMoneyAfterLabels(
    text: string,
    labels: string[]
): string | null {
    for (const label of labels) {
        const escaped = escapeRegex(label);

        const patterns = [
            new RegExp(
                `${escaped}\\s*(?:₪|ש"ח|ILS)?\\s*([+-]?\\d[\\d,]*\\.\\d{2})`,
                'i'
            ),
            new RegExp(
                `${escaped}\\s*[:\\-]?\\s*([+-]?\\d[\\d,]*\\.\\d{2})\\s*(?:₪|ש"ח|ILS)`,
                'i'
            )
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);

            if (!match) {
                continue;
            }

            const normalized = normalizeMoney(match[1]);

            if (normalized !== null) {
                return normalized;
            }
        }
    }

    return null;
}

function extractVat(text: string): string | null {
    const match = text.match(
        /\d+(?:\.\d+)?\s*%\s*מע"מ\s*(?:₪|ש"ח|ILS)?\s*([+-]?\d[\d,]*\.\d{2})/
    );

    return match ? normalizeMoney(match[1]) : null;
}

function extractCardDetails(text: string): {
    paymentMethod: string | null;
    cardLast4: string | null;
} {
    const knownCard = text.match(
        /(?:\d+_)?((?:Visa|Mastercard|MasterCard|American Express|Amex|Diners|ישראכרט|מקס|MAX|CAL)(?:\s+(?:CAL|MAX|ישראכרט))?)\s+(\d{4})\b/i
    );

    if (knownCard) {
        return {
            paymentMethod: knownCard[1]
                .replace(/_/g, ' ')
                .trim(),
            cardLast4: knownCard[2]
        };
    }

    const last4 = firstMatch(
        text,
        /4\s*ספרות.*?\b(\d{4})\b/i
    );

    return {
        paymentMethod: null,
        cardLast4: last4
    };
}

function extractLineItems(text: string): {
    items: ParsedReceiptItem[];
    discounts: ParsedReceiptDiscount[];
} {
    const invoiceStart = text.search(
        /#\s*תיאור\s+כמות\s+מחיר/i
    );

    if (invoiceStart < 0) {
        return {
            items: [],
            discounts: []
        };
    }

    let section = text.slice(invoiceStart);

    const endMarkers = [
        'עמוד 1 מתוך',
        'סה"כ חייב מע"מ',
        'סה"כ לתשלום'
    ];

    let end = section.length;

    for (const marker of endMarkers) {
        const index = section.indexOf(marker);

        if (index >= 0 && index < end) {
            end = index;
        }
    }

    section = section.slice(0, end);
    section = section
        .replace(/משך אחריות(?:\s+\d+\s+חודשים)?/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const linePattern =
        /(?:^|\s)(\d{1,3})\s+(.+?)\s+(-?\d+(?:\.\d+)?)\s+₪\s*([+-]?\d[\d,]*\.\d{2})\s+₪\s*([+-]?\d[\d,]*\.\d{2})\s+₪\s*([+-]?\d[\d,]*\.\d{2})(?=\s+\d{4,}|\s+משך אחריות|\s+\d{1,3}\s+|$)/g;

    const items: ParsedReceiptItem[] = [];
    const discounts: ParsedReceiptDiscount[] = [];

    for (const match of section.matchAll(linePattern)) {
        const lineNumber = Number(match[1]);
        const name = cleanItemName(match[2]);

        const quantity =
            Number.isFinite(Number(match[3]))
                ? Number(match[3])
                : null;

        const unitPrice = normalizeSignedMoney(match[4]);
        const priceIncludingVat = normalizeSignedMoney(match[5]);
        const lineTotal = normalizeSignedMoney(match[6]);

        if (!name) {
            continue;
        }

        const isDiscount =
            quantity !== null &&
            quantity < 0 ||
            lineTotal?.startsWith('-') ||
            /קמפיין|החזר מתנה|הנחה|זיכוי/i.test(name);

        if (isDiscount) {
            const amount =
                absoluteMoney(lineTotal) ||
                absoluteMoney(priceIncludingVat) ||
                absoluteMoney(unitPrice);

            if (amount) {
                discounts.push({
                    lineNumber,
                    description: name,
                    amount
                });
            }

            continue;
        }

        if (shouldIgnoreItem(name, lineTotal)) {
            continue;
        }

        items.push({
            lineNumber,
            name,
            quantity,
            unitPrice,
            totalPrice:
                lineTotal ||
                priceIncludingVat
        });
    }

    return {
        items,
        discounts
    };
}

function shouldIgnoreItem(
    name: string,
    totalPrice: string | null
): boolean {
    if (
        /איסוף עצמי|הזמנה מאתר|אופן טיפול|תשלומים ללא ריבית|^Total:/i.test(name)
    ) {
        return true;
    }

    if (
        totalPrice === '0.00' ||
        totalPrice === '-0.00'
    ) {
        return true;
    }

    return false;
}

function cleanItemName(value: string): string {
    return value
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizeMoney(value: string): string | null {
    const cleaned = value
        .replace(/,/g, '')
        .trim();

    if (!/^[+-]?\d+(?:\.\d{2})$/.test(cleaned)) {
        return null;
    }

    const number = Number(cleaned);

    if (!Number.isFinite(number) || number < 0) {
        return null;
    }

    return cleaned;
}

function normalizeSignedMoney(
    value: string
): string | null {
    const cleaned = value
        .replace(/,/g, '')
        .trim();

    if (!/^[+-]?\d+(?:\.\d{2})$/.test(cleaned)) {
        return null;
    }

    const number = Number(cleaned);

    if (!Number.isFinite(number)) {
        return null;
    }

    return cleaned;
}

function absoluteMoney(
    value: string | null
): string | null {
    if (!value) {
        return null;
    }

    const normalized = normalizeSignedMoney(value);

    if (!normalized) {
        return null;
    }

    const amount = Math.abs(Number(normalized));

    return amount.toFixed(2);
}

function firstMatch(
    text: string,
    pattern: RegExp
): string | null {
    const match = text.match(pattern);

    return match?.[1]?.trim() || null;
}

function escapeRegex(value: string): string {
    return value.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
    );
}