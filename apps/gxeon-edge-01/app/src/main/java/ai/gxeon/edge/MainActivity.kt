package ai.gxeon.edge

import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.BatteryManager
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.os.StatFs
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import java.util.Locale

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    EdgeDashboard(this)
                }
            }
        }
    }
}

data class DeviceSnapshot(
    val model: String,
    val androidVersion: String,
    val ramUsedPercent: Int,
    val storageUsedPercent: Int,
    val batteryPercent: Int,
    val sensorCount: Int,
    val apps: List<AppEntry>
)

data class AppEntry(val label: String, val packageName: String)

private fun Context.snapshot(): DeviceSnapshot {
    val am = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
    val mem = ActivityManager.MemoryInfo().also(am::getMemoryInfo)
    val ramUsed = if (mem.totalMem > 0) (((mem.totalMem - mem.availMem) * 100) / mem.totalMem).toInt() else 0

    val stat = StatFs(Environment.getDataDirectory().absolutePath)
    val total = stat.totalBytes
    val free = stat.availableBytes
    val storageUsed = if (total > 0) (((total - free) * 100) / total).toInt() else 0

    val battery = (getSystemService(Context.BATTERY_SERVICE) as BatteryManager)
        .getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        .coerceIn(0, 100)

    val sensorCount = (getSystemService(Context.SENSOR_SERVICE) as android.hardware.SensorManager)
        .getSensorList(android.hardware.Sensor.TYPE_ALL).size

    val launcherIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
    val apps = packageManager.queryIntentActivities(launcherIntent, PackageManager.MATCH_ALL)
        .map {
            AppEntry(
                label = it.loadLabel(packageManager).toString(),
                packageName = it.activityInfo.packageName
            )
        }
        .distinctBy { it.packageName }
        .sortedBy { it.label.lowercase(Locale.getDefault()) }

    return DeviceSnapshot(
        model = "${Build.MANUFACTURER} ${Build.MODEL}",
        androidVersion = Build.VERSION.RELEASE,
        ramUsedPercent = ramUsed,
        storageUsedPercent = storageUsed,
        batteryPercent = battery,
        sensorCount = sensorCount,
        apps = apps
    )
}

@Composable
fun EdgeDashboard(context: Context) {
    val state = remember { context.snapshot() }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("GXEON EDGE-01", style = MaterialTheme.typography.headlineMedium)
            Text("Command Node • ${state.model} • Android ${state.androidVersion}")
        }

        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                MetricCard("RAM", "${state.ramUsedPercent}%", Modifier.weight(1f))
                MetricCard("Storage", "${state.storageUsedPercent}%", Modifier.weight(1f))
                MetricCard("Battery", "${state.batteryPercent}%", Modifier.weight(1f))
            }
        }

        item {
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Device Intelligence", style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(6.dp))
                    Text("Sensors detected: ${state.sensorCount}")
                    Text("Installed launchable apps: ${state.apps.size}")
                    Text("Mode: detect → recommend → approve → execute → log")
                }
            }
        }

        item {
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Command Center", style = MaterialTheme.typography.titleMedium)
                    Button(onClick = {
                        context.startActivity(Intent(Settings.ACTION_INTERNAL_STORAGE_SETTINGS))
                    }) { Text("Open storage controls") }
                    OutlinedButton(onClick = {
                        context.startActivity(Intent(Settings.ACTION_SETTINGS))
                    }) { Text("Open Android control plane") }
                }
            }
        }

        item { Text("Applications", style = MaterialTheme.typography.titleLarge) }

        items(state.apps.take(60)) { app ->
            Card(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(app.label, style = MaterialTheme.typography.titleSmall)
                        Text(app.packageName, style = MaterialTheme.typography.bodySmall)
                    }
                    OutlinedButton(onClick = {
                        val launch = context.packageManager.getLaunchIntentForPackage(app.packageName)
                        if (launch != null) context.startActivity(launch)
                    }) { Text("Open") }
                }
            }
        }
    }
}

@Composable
private fun MetricCard(title: String, value: String, modifier: Modifier = Modifier) {
    Card(modifier = modifier) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(title, style = MaterialTheme.typography.labelMedium)
            Text(value, style = MaterialTheme.typography.headlineSmall)
        }
    }
}
