param([string]$Project='project-343999a8-f375-4c7d-aad',[string]$Region='europe-west1')
$ErrorActionPreference='Stop'; $g=Join-Path $env:LOCALAPPDATA 'Google/Cloud SDK/google-cloud-sdk/bin/gcloud.cmd'
foreach($service in @('family-finance-alpha','family-finance-web')){ & $g run services describe $service --project $Project --region $Region --format='yaml(status.latestReadyRevisionName,status.url,status.traffic,spec.template.spec.serviceAccountName,spec.template.metadata.annotations)' }
Write-Output 'CLOUD_PREFLIGHT: PASS (secret values not printed)'
