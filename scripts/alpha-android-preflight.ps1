param([switch]$Build)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$android=Join-Path $root 'android/KasahunFamilyFinance'
$jdk='C:\Program Files\Android\Android Studio\jbr'
$expectedBackend='https://family-finance-alpha-233568917860.europe-west1.run.app'
if(!(Test-Path (Join-Path $jdk 'bin/java.exe'))){throw "NOT_READY: Android Studio JDK missing"}
$env:JAVA_HOME=$jdk; $env:GRADLE_USER_HOME=(Join-Path $root '.gradle-local')
Push-Location $android
try { $gradle = & .\gradlew.bat --version } finally { Pop-Location }
if($LASTEXITCODE -ne 0){throw 'NOT_READY: Gradle unavailable'}
$buildArgs=@('-PFAMILY_FINANCE_ALPHA=true',"-PFAMILY_FINANCE_BACKEND_URL=$expectedBackend",'-PFAMILY_FINANCE_WEB_URL=https://family-finance-web-233568917860.europe-west1.run.app')
Push-Location $android
try { & .\gradlew.bat :app:testDebugUnitTest --no-daemon; if($LASTEXITCODE){throw 'NOT_READY: Android tests failed'}; if($Build){& .\gradlew.bat :app:assembleDebug --no-daemon @buildArgs; if($LASTEXITCODE){throw 'NOT_READY: APK build failed'}} } finally { Pop-Location }
$gradleToml=Get-Content (Join-Path $android 'gradle/libs.versions.toml') -Raw
$appGradle=Get-Content (Join-Path $android 'app/build.gradle.kts') -Raw
if($gradleToml -notmatch 'agp\s*=\s*"9\.3\.1"'){throw 'NOT_READY: unexpected AGP version'}
if($appGradle -match '10\.0\.2\.2|localhost|127\.0\.0\.1'){Write-Warning 'Local fallback exists for non-Alpha builds; Alpha guard requires explicit production properties'}
$persistence=Join-Path $android 'app/src/main/java/com/familyfinance/app/evidence/FinancialEvidencePersistence.kt'
$diagnostics=Join-Path $android 'app/src/main/java/com/familyfinance/app/evidence/AlphaDiagnostics.kt'
$manifest=Get-Content (Join-Path $android 'app/src/main/AndroidManifest.xml') -Raw
if(!(Test-Path $persistence) -or (Get-Content $persistence -Raw) -notmatch 'CURRENT_SCHEMA_VERSION\s*=\s*2'){throw 'NOT_READY: versioned evidence outbox missing'}
if(!(Test-Path $diagnostics)){throw 'NOT_READY: sanitized diagnostics projection missing'}
if((Get-Content $diagnostics -Raw) -match 'HOUSEHOLD_CREDENTIAL|CONNECTOR_TOKEN|rawSms|cardLastFour|merchant|receipt'){throw 'NOT_READY: diagnostics projection contains sensitive fields'}
if($manifest -notmatch 'RECEIVE_BOOT_COMPLETED' -or $manifest -notmatch 'MY_PACKAGE_REPLACED'){throw 'NOT_READY: boot/update recovery receiver missing'}
if((Get-Content $persistence -Raw) -match 'catch \(.*\)\s*\{\s*Log\.e.*emptyList'){throw 'NOT_READY: outbox corruption may map to empty queue'}
if($Build){
  $apk=Join-Path $android 'app/build/outputs/apk/debug/app-debug.apk'
  if(!(Test-Path $apk)){throw 'NOT_READY: APK missing'}
  $buildConfig=Join-Path $android 'app/build/generated/source/buildConfig/debug/com/familyfinance/app/BuildConfig.java'
  if(!(Test-Path $buildConfig)){throw 'NOT_READY: compiled BuildConfig missing'}
  $compiled=Get-Content $buildConfig -Raw
  if($compiled -notmatch ('FAMILY_FINANCE_BACKEND_URL = "'+[regex]::Escape($expectedBackend)+'"')){throw 'NOT_READY: compiled backend URL is not approved'}
  if($compiled -match 'FAMILY_FINANCE_CONNECTOR_TOKEN = "local-test-token"' -or $compiled -match 'FAMILY_FINANCE_HOUSEHOLD_CREDENTIAL = "[^" ]+"'){throw 'NOT_READY: packaged Alpha contains prototype auth fallback'}
  $deviceAuth=Join-Path $android 'app/src/main/java/com/familyfinance/app/auth/DeviceAuthStore.kt'
  if(!(Test-Path $deviceAuth) -or (Get-Content $deviceAuth -Raw) -notmatch 'AndroidKeyStore'){throw 'NOT_READY: device auth is not Keystore-backed'}
  Write-Output 'APK_BACKEND: approved production URL verified in compiled APK'
}
Write-Output 'ALPHA_PREFLIGHT: PASS'
Write-Output 'RELEASE GATES: NOT_READY -> READY_TO_BUILD (READY_TO_INSTALL requires device/signature checks)'
