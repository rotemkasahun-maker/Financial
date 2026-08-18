const clean = (s = '') =>
  s
    .toLowerCase()
    .replace(/[\s\-״"']/g, '');

export const merchantSimilarity = (a, b) => {
  const x = clean(a);
  const y = clean(b);

  if (!x || !y) return 0;

  if (x.includes(y) || y.includes(x)) {
    return 1;
  }

  const grams = s =>
    new Set(
      [...Array(
        Math.max(0, s.length - 1)
      )].map(
        (_, i) =>
          s.slice(i, i + 2)
      )
    );

  const gx = grams(x);
  const gy = grams(y);

  const common = [...gx]
    .filter(value =>
      gy.has(value)
    )
    .length;

  return (
    common /
    Math.max(
      gx.size,
      gy.size,
      1
    )
  );
};

export const daysBetween = (a, b) =>
  Math.abs(
    (
      new Date(a) -
      new Date(b)
    ) / 86400000
  );

export function findReceiptMatches(
  receipt,
  transactions
) {
  return transactions
    .filter(
      transaction =>
        transaction.financialType ===
        'expense'
    )
    .map(transaction => {
      const amountDiff =
        Math.abs(
          Number(receipt.total) -
          Number(transaction.amount)
        );

      const amountScore =
        amountDiff < 0.01
          ? 1
          : amountDiff <= 2
            ? 0.8
            : 0;

      const dateDiff =
        daysBetween(
          receipt.purchaseDate,
          transaction.date
        );

      const dateScore =
        dateDiff === 0
          ? 1
          : dateDiff <= 2
            ? 0.65
            : 0;

      const merchantScore =
        merchantSimilarity(
          receipt.merchant,
          transaction.merchant
        );

      const score =
        amountScore * 0.5 +
        dateScore * 0.25 +
        merchantScore * 0.25;

      return {
        ...transaction,
        matchScore: score,
        confidence:
          score >= 0.85
            ? 'high'
            : score >= 0.58
              ? 'medium'
              : 'low'
      };
    })
    .filter(
      transaction =>
        transaction.confidence !==
        'low'
    )
    .sort(
      (a, b) =>
        b.matchScore -
        a.matchScore
    );
}