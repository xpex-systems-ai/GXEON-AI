package ai.gxeon.edge

import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.BatteryManager
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.os.StatFs
import android.provider.Settings
import android.widget.Toast
import androidx.activity.compose.setContent
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import java.text.DateFormat
import java.util.Date
import java.util.Locale

class MainActivity : FragmentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { MaterialTheme { Surface(Modifier.fillMaxSize()) { EdgeDashboard(this) } } }
    }

    fun verifyOperator(reason: String, onApproved: () -> Unit) {
        val authenticators = BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.DEVICE_CREDENTIAL
        val capability = BiometricManager.from(this).canAuthenticate(authenticators)
        if (capability != BiometricManager.BIOMETRIC_SUCCESS) {
            audit(this, "Operação protegida bloqueada: autenticação do dispositivo indisponível")
            Toast.makeText(this, "Configure biometria ou bloqueio de tela para autorizar esta ação.", Toast.LENGTH_LONG).show()
            return
        }
        val prompt = BiometricPrompt(this, ContextCompat.getMainExecutor(this), object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                super.onAuthenticationSucceeded(result); audit(this@MainActivity, "Operador verificado: $reason"); onApproved()
            }
            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                super.onAuthenticationError(errorCode, errString); audit(this@MainActivity, "Autorização cancelada/bloqueada: $reason")
            }
        })
        val info = BiometricPrompt.PromptInfo.Builder().setTitle("Verificar operador GXEON").setSubtitle(reason).setAllowedAuthenticators(authenticators).build()
        prompt.authenticate(info)
    }
}

data class DeviceSnapshot(val model: String, val androidVersion: String, val ramUsedPercent: Int, val storageUsedPercent: Int, val batteryPercent: Int, val sensorCount: Int, val apps: List<AppEntry>, val capturedAt: Long = System.currentTimeMillis())
data class AppEntry(val label: String, val packageName: String)
data class SystemNode(val name: String, val role: String, val integration: String)
data class IntegrationNode(val name: String, val capability: String, val state: String)

private fun Context.snapshot(): DeviceSnapshot {
    val am = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
    val mem = ActivityManager.MemoryInfo().also(am::getMemoryInfo)
    val ramUsed = if (mem.totalMem > 0) (((mem.totalMem - mem.availMem) * 100) / mem.totalMem).toInt() else 0
    val stat = StatFs(Environment.getDataDirectory().absolutePath); val total = stat.totalBytes; val free = stat.availableBytes
    val storageUsed = if (total > 0) (((total - free) * 100) / total).toInt() else 0
    val battery = (getSystemService(Context.BATTERY_SERVICE) as BatteryManager).getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY).coerceIn(0, 100)
    val sensorCount = (getSystemService(Context.SENSOR_SERVICE) as android.hardware.SensorManager).getSensorList(android.hardware.Sensor.TYPE_ALL).size
    val launcherIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
    val apps = packageManager.queryIntentActivities(launcherIntent, PackageManager.MATCH_ALL).map { AppEntry(it.loadLabel(packageManager).toString(), it.activityInfo.packageName) }.distinctBy { it.packageName }.sortedBy { it.label.lowercase(Locale.getDefault()) }
    return DeviceSnapshot("${Build.MANUFACTURER} ${Build.MODEL}", Build.VERSION.RELEASE, ramUsed, storageUsed, battery, sensorCount, apps)
}

private fun healthAdvice(s: DeviceSnapshot): List<String> = buildList {
    if (s.storageUsedPercent >= 85) add("Armazenamento alto: revise arquivos grandes e apps sem uso.") else add("Armazenamento dentro da faixa operacional definida pelo EDGE.")
    if (s.ramUsedPercent >= 85) add("Memória sob pressão: identifique apps pesados antes de fechar processos.") else add("Memória sem pressão crítica no momento da leitura.")
    if (s.batteryPercent <= 20) add("Bateria baixa: conecte energia antes de tarefas longas.")
    add("Nenhuma ação destrutiva será executada sem sua aprovação.")
}

private fun audit(context: Context, event: String) {
    val prefs = context.getSharedPreferences("gxeon_edge_audit", Context.MODE_PRIVATE); val old = prefs.getString("events", "") ?: ""
    val stamp = DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.MEDIUM).format(Date())
    prefs.edit().putString("events", ("$stamp — $event\n$old").lineSequence().take(30).joinToString("\n")).apply()
}

@Composable
fun EdgeDashboard(activity: MainActivity) {
    val context: Context = activity
    var state by remember { mutableStateOf(context.snapshot()) }; var section by remember { mutableStateOf("COMMAND") }
    var auditText by remember { mutableStateOf(context.getSharedPreferences("gxeon_edge_audit", Context.MODE_PRIVATE).getString("events", "") ?: "") }
    fun reloadAudit() { auditText = context.getSharedPreferences("gxeon_edge_audit", Context.MODE_PRIVATE).getString("events", "") ?: "" }
    fun refresh() { state = context.snapshot(); audit(context, "Device Agent atualizou telemetria"); reloadAudit() }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { Text("GXEON EDGE-01", style = MaterialTheme.typography.headlineMedium); Text("Command Node V0.3 • ${state.model} • Android ${state.androidVersion}"); Text("Última leitura: ${DateFormat.getTimeInstance(DateFormat.MEDIUM).format(Date(state.capturedAt))}", style = MaterialTheme.typography.bodySmall) }
        item { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) { MetricCard("RAM", "${state.ramUsedPercent}%", Modifier.weight(1f)); MetricCard("Storage", "${state.storageUsedPercent}%", Modifier.weight(1f)); MetricCard("Battery", "${state.batteryPercent}%", Modifier.weight(1f)) } }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("COMMAND" to "COMANDO", "DEVICE" to "DEVICE", "SYSTEMS" to "SISTEMAS").forEach { (key, label) ->
                    if (section == key) Button(onClick = { section = key }, modifier = Modifier.weight(1f)) { Text(label, maxLines = 1, fontSize = 11.sp) }
                    else OutlinedButton(onClick = { section = key }, modifier = Modifier.weight(1f)) { Text(label, maxLines = 1, fontSize = 11.sp) }
                }
            }
        }
        when (section) {
            "DEVICE" -> {
                item { Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) { Text("GX Device Agent", style = MaterialTheme.typography.titleMedium); Text("Sensores: ${state.sensorCount} • Apps inicializáveis: ${state.apps.size}"); healthAdvice(state).forEach { Text("• $it") }; Button(onClick = { refresh() }) { Text("Atualizar diagnóstico") } } } }
                item { Text("App Commander", style = MaterialTheme.typography.titleLarge) }
                items(state.apps.take(60)) { app -> Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(12.dp)) { Text(app.label, style = MaterialTheme.typography.titleSmall); Text(app.packageName, style = MaterialTheme.typography.bodySmall); Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { OutlinedButton(onClick = { context.packageManager.getLaunchIntentForPackage(app.packageName)?.let { context.startActivity(it); audit(context, "Abriu ${app.label}") } }) { Text("Abrir") }; Button(onClick = { activity.verifyOperator("Gerenciar ${app.label}") { context.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${app.packageName}"))); audit(context, "Acesso protegido ao gerenciamento de ${app.label}"); reloadAudit() } }) { Text("Gerenciar") } } } } }
            }
            "SYSTEMS" -> item { SystemsCommand(context) { reloadAudit() } }
            else -> {
                item { Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) { Text("GX Commander", style = MaterialTheme.typography.titleMedium); Text("Detectar → recomendar → aprovar → executar → registrar"); Button(onClick = { refresh() }) { Text("Executar diagnóstico local") }; OutlinedButton(onClick = { context.startActivity(Intent(Settings.ACTION_INTERNAL_STORAGE_SETTINGS)); audit(context, "Abriu controles de armazenamento"); reloadAudit() }) { Text("Controles de armazenamento") }; OutlinedButton(onClick = { context.startActivity(Intent(Settings.ACTION_SETTINGS)); audit(context, "Abriu plano de controle Android"); reloadAudit() }) { Text("Plano de controle Android") } } } }
                item { IntegrationHub() }
                item { Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp)) { Text("Módulos GXEON", style = MaterialTheme.typography.titleMedium); Text("DEVICE • SYSTEMS • SOCIAL • VISION • VOICE • BUSINESS • DEV • ACADEMY"); Text("Device, Security, Integration Hub e Systems estão na base V0.3. Integrações externas continuam bloqueadas até autenticação real.", style = MaterialTheme.typography.bodySmall) } } }
                item { Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp)) { Text("Audit Ledger", style = MaterialTheme.typography.titleMedium); Text(if (auditText.isBlank()) "Nenhuma ação registrada ainda." else auditText, style = MaterialTheme.typography.bodySmall) } } }
            }
        }
    }
}

@Composable private fun IntegrationHub() {
    val integrations = listOf(IntegrationNode("Android Control Plane", "telemetria e configurações autorizadas", "LOCAL ATIVO"), IntegrationNode("GX Systems Registry", "catálogo dos sistemas do ecossistema", "LOCAL ATIVO"), IntegrationNode("GX Watchtower", "health/version/build/eventos", "AGUARDANDO ENDPOINTS"), IntegrationNode("GitHub Bridge", "repos, Actions, PRs e releases", "AGUARDANDO AUTH SEGURA"), IntegrationNode("Social Command", "conteúdo, aprovação e publicação oficial", "BLOQUEADO ATÉ CONECTOR"))
    Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) { Text("GXEON Integration Hub", style = MaterialTheme.typography.titleMedium); integrations.forEach { node -> Text("${node.name} — ${node.state}", style = MaterialTheme.typography.titleSmall); Text(node.capability, style = MaterialTheme.typography.bodySmall) }; Text("Nenhum token privado é armazenado no APK.", style = MaterialTheme.typography.bodySmall) } }
}

@Composable private fun SystemsCommand(context: Context, onAuditChanged: () -> Unit) {
    val systems = listOf(SystemNode("XPeX Academy", "Educação / operação", "Registry ready"), SystemNode("Senara", "Aplicativo do ecossistema", "Registry ready"), SystemNode("GXEON-AI", "Core / Commander", "Registry ready"))
    Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) { Text("GX Systems Command", style = MaterialTheme.typography.titleMedium); Text("Watchtower seguro: nenhum sistema será marcado online sem telemetria real."); systems.forEach { node -> Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) { Text(node.name, style = MaterialTheme.typography.titleSmall); Text(node.role); Text(node.integration, style = MaterialTheme.typography.bodySmall); OutlinedButton(onClick = { audit(context, "Watchtower solicitou verificação de ${node.name}; endpoint ainda não configurado"); onAuditChanged() }) { Text("Registrar verificação") } } } }; Text("Próximo passo de integração: cadastrar endpoints autenticados de health/version/build por sistema.", style = MaterialTheme.typography.bodySmall) } }
}

@Composable private fun MetricCard(title: String, value: String, modifier: Modifier = Modifier) { Card(modifier) { Column(Modifier.padding(12.dp)) { Text(title, style = MaterialTheme.typography.labelMedium); Text(value, style = MaterialTheme.typography.headlineSmall) } } }
