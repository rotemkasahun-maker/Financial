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
        buildConfigField("String", "FAMILY_FINANCE_BACKEND_URL", "\"$backendUrl\"")
        buildConfigField("String", "FAMILY_FINANCE_CONNECTOR_TOKEN", "\"$connectorToken\"")
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
    testImplementation(libs.junit)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(libs.androidx.junit)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
    debugImplementation(libs.androidx.compose.ui.tooling)
}
