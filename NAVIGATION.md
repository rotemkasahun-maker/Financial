# Navigation architecture

The current mobile information architecture deliberately keeps only four frequent destinations in the persistent bottom bar:

- `dashboard` — בית
- `transactions` — עסקאות
- `madridGoal` — מדריד
- `tasks` — המשימות שלי

Receipt capture is independent of route placement. The global camera action opens the same receipt-capture flow from every main screen, and task/deep links may open that flow with a preselected transaction.

Receipt capture remains globally available through the camera action, while the receipts list is available in the RTL drawer. Lower-frequency screens remain routable and are exposed through that drawer. Desktop keeps the broader sidebar while using the same route IDs, so existing routes and deep links do not change.

## Reserved future destination: הדרך למדריד

`madridGoal` is now the major gamified household destination: `בית | עסקאות | מדריד | משימות`. Financial savings progress and Madrid XP are separate domains; XP never changes financial balances. The global receipt-camera action remains permanently available.
