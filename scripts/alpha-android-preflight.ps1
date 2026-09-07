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
Write-Output 'ALPHA_PREFLIGHT: PASS'
Write-Output 'RELEASE GATES: NOT_READY -> READY_TO_BUILD (READY_TO_INSTALL requires device/signature checks)'
