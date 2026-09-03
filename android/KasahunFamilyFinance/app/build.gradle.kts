import java.net.URI
import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.familyfinance.app"
    compileSdk {
        version = release(37)
    }

    defaultConfig {
        applicationId = "com.familyfinance.app"
        minSdk = 24
        targetSdk = 37
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        val localProperties = Properties().apply {
            val file = rootProject.file("local.properties")
            if (file.isFile) file.inputStream().use { load(it) }
        }
        val backendUrl = providers.gradleProperty("FAMILY_FINANCE_BACKEND_URL")
            .orElse(localProperties.getProperty("familyFinanceBackendUrl", "http://10.0.2.2:8080"))
            .get()
        val connectorToken = providers.gradleProperty("FAMILY_FINANCE_CONNECTOR_TOKEN")
            .orElse(localProperties.getProperty("familyFinanceConnectorToken", "local-test-token"))
            .get()
        val webUrl = providers.gradleProperty("FAMILY_FINANCE_WEB_URL")
            .orElse(localProperties.getProperty("familyFinanceWebUrl", ""))
            .map { configured ->
                configured.ifBlank {
                    val backend = URI(backendUrl)
                    URI(backend.scheme, null, backend.host, 4173, null, null, null).toString()
                }
            }
            .get()
        val householdUser = providers.gradleProperty("FAMILY_FINANCE_HOUSEHOLD_USER")
            .orElse(localProperties.getProperty("familyFinanceHouseholdUser", ""))
            .get()
        val householdCredential = providers.gradleProperty("FAMILY_FINANCE_HOUSEHOLD_CREDENTIAL")
            .orElse(localProperties.getProperty("familyFinanceHouseholdCredential", ""))
            .get()
        buildConfigField("String", "FAMILY_FINANCE_BACKEND_URL", "\"$backendUrl\"")
        buildConfigField("String", "FAMILY_FINANCE_CONNECTOR_TOKEN", "\"$connectorToken\"")
        buildConfigField("String", "FAMILY_FINANCE_WEB_URL", "\"$webUrl\"")
        buildConfigField("String", "FAMILY_FINANCE_HOUSEHOLD_USER", "\"$householdUser\"")
        buildConfigField("String", "FAMILY_FINANCE_HOUSEHOLD_CREDENTIAL", "\"$householdCredential\"")
    }

    buildTypes {
        release {
            optimization {
                enable = false
            }
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.work.runtime.ktx)
    testImplementation(libs.junit)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(libs.androidx.junit)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
    debugImplementation(libs.androidx.compose.ui.tooling)
}
