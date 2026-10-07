plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "ai.gxeon.edge"
    compileSdk = 36
    defaultConfig {
        applicationId = "ai.gxeon.agentfi.mobile"
        minSdk = 29
        targetSdk = 36
        versionCode = 10
        versionName = "1.2.0-complete"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables { useSupportLibrary = true }
    }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { compose = true }
    packaging { resources.excludes += "/META-INF/{AL2.0,LGPL2.1}" }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2025.08.00"))
    implementation("androidx.activity:activity-compose:1.10.1")
    implementation("androidx.fragment:fragment-ktx:1.8.9")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.9.2")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.9.2")
    implementation("androidx.biometric:biometric:1.1.0")
    implementation("androidx.browser:browser:1.8.0")
    implementation("androidx.camera:camera-core:1.4.2")
    implementation("androidx.camera:camera-camera2:1.4.2")
    implementation("androidx.camera:camera-lifecycle:1.4.2")
    implementation("androidx.camera:camera-view:1.4.2")
    implementation("androidx.work:work-runtime-ktx:2.10.3")
    implementation("androidx.exifinterface:exifinterface:1.3.7")
    debugImplementation("androidx.compose.ui:ui-tooling")
}