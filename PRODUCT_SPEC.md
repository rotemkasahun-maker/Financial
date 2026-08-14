# Product Specification — ניהול פיננסי משפחתי

## 1. Purpose
A simple family finance app that replaces scattered spreadsheets, receipts and manual checking with one convenient interface.

The first version should sit on top of the existing Google Sheets data and add a better mobile and desktop experience.

## 2. Main screens

### Dashboard
Show:
- Total income this month
- Total expenses this month
- Net cash flow
- Reimbursements
- Spending versus previous month
- Top spending categories
- Unusual expenses
- Recent receipts

### Transactions
A searchable list of all transactions with:
- date
- merchant
- amount
- type
- category
- subcategory
- source
- receipt link
- reimbursement status
- notes

Filters:
- month/date range
- category
- merchant
- account/card
- expense/income/reimbursement/transfer
- receipt attached / missing receipt

### Receipts
A gallery/list of uploaded receipts.

Each receipt detail page should show:
- original image/PDF
- merchant
- purchase date
- total
- linked transaction
- extracted items
- categories
- confidence / needs review status

### Add receipt
Mobile-first flow:
1. Tap "+"
2. Choose "צלמי קבלה" or "העלי קובץ"
3. Capture photo or choose image/PDF
4. Upload
5. Extract data
6. Show review screen
7. Suggest match to imported transaction
8. User confirms/edits
9. Save

The review screen must allow editing every extracted field.

### Grocery view
Item-level analytics:
- spending by supermarket
- spending by micro-category
- repeated items
- average purchase price when enough data exists
- high-spend products/categories
- potential areas to cut

Examples of micro-categories:
- פירות
- ירקות
- מוצרי חלב
- קטניות
- דגנים
- מאפים
- חטיפים ומתוקים
- שתייה
- ניקיון
- טואלטיקה
- מוצרים לבית
- מזון לבעלי חיים
- other

### Recurring
Show recurring charges and standing orders.
Allow:
- expected monthly amount
- last charge
- next expected charge
- active/inactive
- alert for unexpected price change

### Reimbursements
A dedicated view for expenses later reimbursed by:
- landlady
- friends
- family
- other

A reimbursement can be linked to one or more expenses.

### Insights
Examples:
- "הוצאות הסופר עלו ב־12% לעומת החודש שעבר"
- "החודש הוצאתם יותר מהממוצע על דברים לבית"
- "יש 3 חיובים ללא קבלה"
- "נראה שקבלה זו מתאימה לחיוב שכבר קיים"

## 3. Data model

### Transaction
- id
- date
- merchant
- description
- amount
- currency
- direction: debit / credit
- financial_type: expense / income / reimbursement / transfer / refund
- category
- subcategory
- source
- account_id
- receipt_id
- linked_transaction_id
- notes
- created_at
- updated_at

### Receipt
- id
- file_url
- file_type
- merchant
- purchase_date
- total
- currency
- payment_method
- extraction_status
- review_status
- linked_transaction_id
- created_at

### ReceiptItem
- id
- receipt_id
- raw_name
- normalized_name
- quantity
- unit_price
- total_price
- category
- subcategory
- confidence

### ReimbursementLink
- id
- expense_transaction_id
- reimbursement_transaction_id
- amount

### CategoryRule
- id
- match_type
- pattern
- category
- subcategory
- priority
- active

## 4. Deduplication
Before saving a receipt as a new expense, compare against imported transactions using:
- amount
- purchase date
- merchant similarity
- card/account when available

If confidence is high:
- propose linking the receipt to the existing transaction

If confidence is medium:
- ask user to choose

Never merge automatically when confidence is low.

## 5. Receipt extraction
The extraction layer should be replaceable.

Suggested interface:
`extractReceipt(file) -> structured receipt JSON`

Returned structure should include:
- merchant
- date
- total
- payment method
- line items
- confidence per field

Important: OCR/extraction results are proposals, not final financial data, until reviewed or confidently matched.

## 6. Source of truth — phase 1
Google Sheets remains the primary financial source initially.

The app should:
- read existing rows
- map them to the app's canonical data model
- write approved new records back safely
- avoid duplicating rows
- use stable IDs

Later migration to Postgres/Supabase should be possible without redesigning the UI.

## 7. UI direction
- Hebrew
- RTL
- calm, simple financial dashboard
- not visually cluttered
- mobile-first
- accessible tap targets
- clear ₪ amounts
- green/red should not be the only way to convey meaning
- quick-edit interactions
- receipt upload reachable in one tap

## 8. MVP
MVP must include:
1. Dashboard
2. Transaction list
3. Receipt photo/upload
4. Receipt extraction review
5. Receipt-to-transaction matching
6. Categories
7. Google Sheets integration abstraction
8. Basic grocery item view
9. Responsive Hebrew RTL UI

Do not start with banking APIs or a complex native mobile app.
