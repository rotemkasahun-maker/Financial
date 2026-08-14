# AGENTS.md — Family Finance

## Project goal
Build a Hebrew-first household finance web app for managing family expenses, income, receipts, reimbursements, recurring payments, and spending insights.

## Core principles
- Hebrew UI, RTL by default.
- Mobile-first, but comfortable on desktop.
- Google Sheets is the initial source of truth for financial data.
- Never silently delete or overwrite user financial data.
- Any destructive action must require confirmation.
- Imported bank/card transactions and uploaded receipts must be deduplicated whenever possible.
- Preserve original receipt files/images.
- Every receipt can have both:
  1. receipt-level transaction data
  2. item-level data

## Receipt workflow
The app must support:
- Take a photo directly from mobile camera.
- Upload image(s) or PDF.
- Extract merchant, date, total, payment method when available.
- For grocery/retail receipts, extract line items.
- Suggest categories and subcategories.
- Show a review screen before committing.
- Let user edit extracted values before save.
- Attempt to match the receipt to an already imported card/bank transaction.
- If a likely match exists, suggest linking instead of creating a duplicate expense.
- Keep the original uploaded file attached to the saved record.

## Financial logic
- Expense and reimbursement must be distinguishable.
- Reimbursements should offset the related expense rather than inflate income.
- Transfers between the user's own accounts should not count as income or expense.
- Refunds from friends for shared purchases should offset the relevant shared expense when possible.
- Keep gross and net views available.

## Known household classification rules
- "מקפ״ת" / "מקפת - מרכזים קהילתי" -> category: איתן
- SACARA / סקארה -> category: איפור וטיפוח
- "לאגו שיווק" -> category: בית; faucet purchase; reimbursed by landlady, so net household expense should be zero after reimbursement
- "עזיזו לבנדר" / "עזיזו לבנדר מהגולן" -> category: פנאי ובילויים
- Football-related expenses for Shmuel should have a dedicated football category when relevant.
- Grocery receipts should retain item-level micro-categories.
- Dates should be stored in ISO format internally and rendered in Israeli format in the UI.
- Currency default: ILS / ₪

## UX
Main navigation:
- Dashboard
- Transactions
- Receipts
- Groceries
- Recurring
- Reimbursements
- Insights
- Settings

Primary mobile action:
- Large "+" button
- First action: "צלמי קבלה"

## Engineering expectations
- Prefer a simple, maintainable architecture.
- Add migrations/schema definitions if using a database.
- Keep external service credentials in environment variables.
- Do not hardcode secrets.
- Add tests for financial classification and deduplication logic.
- Add realistic seed/demo data that contains no sensitive real account identifiers.
