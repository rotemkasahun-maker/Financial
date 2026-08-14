# Navigation architecture

The current mobile information architecture deliberately keeps only four frequent destinations in the persistent bottom bar:

- `dashboard` — בית
- `transactions` — עסקאות
- `receipts` — קבלות
- `tasks` — המשימות שלי

Receipt capture is independent of route placement. The global camera action opens the same receipt-capture flow from every main screen, and task/deep links may open that flow with a preselected transaction.

Lower-frequency screens remain routable and are exposed through the RTL management drawer. Desktop keeps the broader sidebar while using the same route IDs, so existing routes and deep links do not change.

## Reserved future destination: הדרך למדריד

`madridGoal` is reserved as a future major route for a gamified household savings goal. It is intentionally not rendered or added to navigation yet. When the experience is mature, the primary navigation can become `בית | עסקאות | מדריד | משימות`, while the global receipt-camera action remains permanently available. Adding this route must not reuse or rename an existing route ID.

