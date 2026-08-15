# Codex kickoff prompt

Build the first working version of this project.

Read `AGENTS.md` and `PRODUCT_SPEC.md` before writing code.

Start by creating a mobile-first Hebrew RTL web app for household finance management.

Priorities for the first iteration:
1. Create the project structure.
2. Build the main app shell and navigation.
3. Implement Dashboard and Transactions screens with realistic demo data.
4. Implement the full Add Receipt UX:
   - mobile camera input
   - image/PDF upload
   - receipt preview
   - mock extraction state
   - editable review form
   - transaction matching UI
   - save confirmation
5. Create clean TypeScript interfaces for Transaction, Receipt, ReceiptItem and ReimbursementLink.
6. Create a service abstraction for Google Sheets, but keep the first version runnable without credentials using mock data.
7. Add deduplication logic based on date, amount and merchant similarity.
8. Add tests for deduplication and reimbursement/net-expense behavior.
9. Make sure the app works well at common phone widths.

Do not add real secrets or credentials.
Do not make destructive changes to external data.
When the first version is ready, run the project and tests, fix errors, and summarize what you built and what should be connected next.
