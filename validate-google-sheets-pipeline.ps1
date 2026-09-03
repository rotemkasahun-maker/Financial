$ErrorActionPreference = 'Stop'
$base = 'https://family-finance-alpha-233568917860.europe-west1.run.app'
$credential = Get-Credential -Message 'Family Finance credentials'
$body = @{ userId = $credential.UserName; credential = $credential.GetNetworkCredential().Password } | ConvertTo-Json
$sessionResponse = Invoke-WebRequest -UseBasicParsing -Method Post -Uri "$base/api/auth/session" -ContentType 'application/json' -Body $body
$session = ($sessionResponse.Content | ConvertFrom-Json).session
$credential = $null; $body = $null
if ([string]::IsNullOrWhiteSpace($session)) { throw 'Authentication failed' }
$headers = @{ Authorization = "Bearer $session" }
$periods = @(@{ name='JUNE'; startDate='2026-06-01'; endDate='2026-06-30' }, @{ name='JULY'; startDate='2026-07-01'; endDate='2026-07-31' }, @{ name='AUGUST'; startDate='2026-08-01'; endDate='2026-08-31' })
function Invoke-DryRun($period) {
  $payload = @{ startDate=$period.startDate; endDate=$period.endDate } | ConvertTo-Json
  $result = Invoke-RestMethod -UseBasicParsing -Method Post -Uri "$base/api/finance/google-sheets/dry-run" -Headers $headers -ContentType 'application/json' -Body $payload
  [pscustomobject]@{ period=$period.name; sourceRowsByTab=($result.sourceRowsByTab | ConvertTo-Json -Compress); transactionCandidatesByTab=($result.transactionCandidatesByTab | ConvertTo-Json -Compress); evidenceRowsByTab=($result.evidenceRowsByTab | ConvertTo-Json -Compress); reviewRowsByTab=($result.reviewRowsByTab | ConvertTo-Json -Compress); sourceRows=$result.sourceRows; normalizedCandidates=$result.candidateInventory.totalCandidates; importable=$result.importableRows; review=$result.reviewRows; malformedFinancialRows=$result.malformedFinancialRows; semantics=($result.semanticCounts | ConvertTo-Json -Compress); semanticDiagnostics=(@($result.semanticDiagnostics) | ConvertTo-Json -Compress -Depth 4); malformedDiagnostics=(@($result.malformedDiagnostics) | ConvertTo-Json -Compress -Depth 4); pendingReimbursementDiagnostics=(@($result.pendingReimbursementDiagnostics) | ConvertTo-Json -Compress -Depth 4); reconciliation=($result.reconciliation | ConvertTo-Json -Compress); exclusionSummary=($result.exclusionSummary | ConvertTo-Json -Compress); finalSafeImport=($result.finalSafeImport | ConvertTo-Json -Compress); rerunIdentity=($result.rerunIdentity | ConvertTo-Json -Compress); validationSafety=($result.validationSafety | ConvertTo-Json -Compress) }
}
try { $results = @($periods | ForEach-Object { Invoke-DryRun $_ }); $results += [pscustomobject]@{ period='JUNE_RERUN'; sourceRows=(Invoke-DryRun $periods[0]).sourceRows }; $results | ConvertTo-Json -Compress } finally { $headers=$null; $session=$null }
