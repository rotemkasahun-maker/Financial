# Local financial export profiles

CSV import is profile-assisted but remains generic. The current-account profile recognizes common Hebrew variants for transaction date, value date, description, debit, credit, signed amount, reference, account/card and status fields. It does not depend on a bank name or filename.

Detection evaluates combinations of:

- UTF-8 (with or without BOM), Windows-1255 and BOM-marked UTF-16;
- comma, semicolon, tab and pipe delimiters, including `sep=` declarations;
- quoted fields and doubled quotes;
- up to 80 leading rows so bank title/metadata blocks can precede the table;
- normalized Hebrew punctuation, bidi markers, whitespace and common header variants.

Structural diagnostics may contain encoding, BOM, delimiter, row numbers, column counts and the detected header names. They must never contain values from transaction rows.

If automatic mapping remains uncertain, the retained local mapping context is intended to feed a future manual column-mapping screen. Manual mapping must require date, description and either signed amount or debit/credit columns before preview can proceed. It must never turn a failed parse into an empty valid preview.
