package ai.gxeon.edge

import android.Manifest
import android.app.ActivityManager
import android.content.ContentUris
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.BatteryManager
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.os.StatFs
import android.provider.MediaStore
import android.provider.ContactsContract
import android.provider.Settings
import android.widget.Toast
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.exifinterface.media.ExifInterface
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import java.text.DateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.roundToInt

class MainActivity : FragmentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { MaterialTheme { Surface(Modifier.fillMaxSize()) { AgentFiMobileHome(this) } } }
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

@Composable
fun AgentFiMobileHome(activity: MainActivity) {
    val context: Context = activity
    var localTools by remember { mutableStateOf(false) }
    if (localTools) {
        Column(Modifier.fillMaxSize()) {
            OutlinedButton(
                onClick = { localTools = false },
                modifier = Modifier.padding(12.dp)
            ) { Text("← GXEON AgentFi") }
            Box(Modifier.fillMaxSize()) { EdgeDashboard(activity) }
        }
        return
    }
    LazyColumn(
        Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("GXEON AgentFi OS", style = MaterialTheme.typography.headlineMedium)
            Text("XPeX Systems AI • Private Operator Console")
            Text("AGENTS • WORK • MONEY • TREASURY • APPROVALS", style = MaterialTheme.typography.bodySmall)
        }
        item {
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("COMMAND CENTER", style = MaterialTheme.typography.titleLarge)
                    Text("Operate the complete GXEON control plane from your phone. Financial signing stays isolated and protected.")
                    Button(
                        onClick = {
                            activity.verifyOperator("Abrir GXEON AgentFi Command Center") {
                                AgentFiGateway.open(context)
                                audit(context, "AgentFi Command Center aberto após verificação do operador")
                            }
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) { Text("ABRIR SISTEMA COMPLETO") }
                }
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                MetricCard("MODE", "PRIVATE", Modifier.weight(1f))
                MetricCard("SIGNING", "ISOLATED", Modifier.weight(1f))
            }
        }
        item {
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("OPERAÇÃO", style = MaterialTheme.typography.titleMedium)
                    Text("Command Center • Agent Economy • Task Market • Money Truth • Wallets • Treasury • Security")
                    OutlinedButton(onClick = { localTools = true }, modifier = Modifier.fillMaxWidth()) {
                        Text("FERRAMENTAS LOCAIS DO DISPOSITIVO")
                    }
                }
            }
        }
        item {
            Text("Evidence First • O executor não aprova sua própria entrega.", style = MaterialTheme.typography.bodySmall)
        }
    }
}

data class DeviceSnapshot(val model: String, val androidVersion: String, val ramUsedPercent: Int, val storageUsedPercent: Int, val batteryPercent: Int, val sensorCount: Int, val apps: List<AppEntry>, val capturedAt: Long = System.currentTimeMillis())
data class AppEntry(val label: String, val packageName: String)
data class SystemNode(val name: String, val role: String, val integration: String)
data class IntegrationNode(val name: String, val capability: String, val state: String)
data class VaultContact(val key: String, val name: String, val phones: String, val emails: String, val removed: Boolean, val lastSeen: Long)
data class PhotoEntry(
    val id: Long,
    val uri: Uri,
    val name: String,
    val width: Int,
    val height: Int,
    val sizeBytes: Long,
    val dateTaken: Long,
    val orientation: Int?,
    val qualityScore: Int,
    val tier: String,
    val reasons: List<String>
)

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

private fun Context.loadPhotos(limit: Int = 500): List<PhotoEntry> {
    if (android.os.Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_IMAGES) != PackageManager.PERMISSION_GRANTED) return emptyList()
    val projection = arrayOf(
        MediaStore.Images.Media._ID,
        MediaStore.Images.Media.DISPLAY_NAME,
        MediaStore.Images.Media.WIDTH,
        MediaStore.Images.Media.HEIGHT,
        MediaStore.Images.Media.SIZE,
        MediaStore.Images.Media.DATE_TAKEN
    )
    val items = mutableListOf<PhotoEntry>()
    contentResolver.query(
        MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
        projection,
        null,
        null,
        MediaStore.Images.Media.DATE_TAKEN + " DESC"
    )?.use { cursor ->
        val idCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media._ID)
        val nameCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DISPLAY_NAME)
        val widthCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.WIDTH)
        val heightCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.HEIGHT)
        val sizeCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.SIZE)
        val dateCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_TAKEN)
        while (cursor.moveToNext() && items.size < limit) {
            val id = cursor.getLong(idCol)
            val uri = ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, id)
            val name = cursor.getString(nameCol) ?: ("Imagem " + id)
            var width = cursor.getInt(widthCol)
            var height = cursor.getInt(heightCol)
            val size = cursor.getLong(sizeCol)
            val date = cursor.getLong(dateCol)
            var orientation: Int? = null
            if (width <= 0 || height <= 0) {
                runCatching {
                    contentResolver.openInputStream(uri)?.use { input ->
                        val opts = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                        BitmapFactory.decodeStream(input, null, opts)
                        width = opts.outWidth
                        height = opts.outHeight
                    }
                }
            }
            runCatching {
                contentResolver.openInputStream(uri)?.use { input ->
                    orientation = ExifInterface(input).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_UNDEFINED)
                }
            }
            val result = qualifyPhoto(width, height, size, date)
            items += PhotoEntry(id, uri, name, width, height, size, date, orientation, result.first, result.second, result.third)
        }
    }
    return items
}

private fun qualifyPhoto(width: Int, height: Int, sizeBytes: Long, dateTaken: Long): Triple<Int, String, List<String>> {
    var score = 0
    val reasons = mutableListOf<String>()
    val longSide = maxOf(width, height)
    val shortSide = minOf(width, height)
    val megapixels = if (width > 0 && height > 0) (width.toDouble() * height.toDouble()) / 1_000_000.0 else 0.0

    when {
        megapixels >= 12 -> { score += 45; reasons += "alta resolução (" + String.format(Locale.getDefault(), "%.1f", megapixels) + " MP)" }
        megapixels >= 8 -> { score += 36; reasons += "boa resolução (" + String.format(Locale.getDefault(), "%.1f", megapixels) + " MP)" }
        megapixels >= 4 -> { score += 25; reasons += "resolução média (" + String.format(Locale.getDefault(), "%.1f", megapixels) + " MP)" }
        megapixels > 0 -> { score += 10; reasons += "baixa resolução (" + String.format(Locale.getDefault(), "%.1f", megapixels) + " MP)" }
        else -> reasons += "resolução não disponível"
    }
    when {
        longSide >= 3840 && shortSide >= 2160 -> { score += 25; reasons += "dimensão 4K ou superior" }
        longSide >= 1920 && shortSide >= 1080 -> { score += 18; reasons += "dimensão Full HD ou superior" }
        longSide >= 1280 -> { score += 10; reasons += "dimensão utilizável" }
        else -> reasons += "dimensão pequena"
    }
    when {
        sizeBytes >= 4_000_000 -> { score += 20; reasons += "arquivo com boa densidade de dados" }
        sizeBytes >= 1_500_000 -> { score += 14; reasons += "arquivo com densidade moderada" }
        sizeBytes >= 500_000 -> { score += 8; reasons += "arquivo leve" }
        else -> reasons += "arquivo muito comprimido/pequeno"
    }
    if (dateTaken > 0) { score += 10; reasons += "data de captura disponível" }
    score = score.coerceIn(0, 100)
    val tier = when {
        score >= 85 -> "A • PREMIUM"
        score >= 70 -> "B • BOA"
        score >= 50 -> "C • USÁVEL"
        else -> "D • REVISAR"
    }
    return Triple(score, tier, reasons)
}


private fun Context.syncContactsVault(): List<VaultContact> {
    if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) return loadContactsVault()
    val current = linkedMapOf<String, VaultContact>()
    val uri = ContactsContract.CommonDataKinds.Phone.CONTENT_URI
    val projection = arrayOf(
        ContactsContract.CommonDataKinds.Phone.CONTACT_ID,
        ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
        ContactsContract.CommonDataKinds.Phone.NUMBER
    )
    contentResolver.query(uri, projection, null, null, ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " ASC")?.use { cursor ->
        val idCol = cursor.getColumnIndexOrThrow(ContactsContract.CommonDataKinds.Phone.CONTACT_ID)
        val nameCol = cursor.getColumnIndexOrThrow(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
        val phoneCol = cursor.getColumnIndexOrThrow(ContactsContract.CommonDataKinds.Phone.NUMBER)
        while (cursor.moveToNext()) {
            val id = cursor.getLong(idCol).toString()
            val name = cursor.getString(nameCol) ?: "Sem nome"
            val phone = cursor.getString(phoneCol) ?: ""
            val old = current[id]
            val phones = ((old?.phones?.split(" • ") ?: emptyList()) + phone).filter { it.isNotBlank() }.distinct().joinToString(" • ")
            current[id] = VaultContact(id, name, phones, "", false, System.currentTimeMillis())
        }
    }
    val emailsById = mutableMapOf<String, MutableList<String>>()
    contentResolver.query(
        ContactsContract.CommonDataKinds.Email.CONTENT_URI,
        arrayOf(ContactsContract.CommonDataKinds.Email.CONTACT_ID, ContactsContract.CommonDataKinds.Email.ADDRESS),
        null, null, null
    )?.use { cursor ->
        val idCol = cursor.getColumnIndexOrThrow(ContactsContract.CommonDataKinds.Email.CONTACT_ID)
        val emailCol = cursor.getColumnIndexOrThrow(ContactsContract.CommonDataKinds.Email.ADDRESS)
        while (cursor.moveToNext()) {
            val id = cursor.getLong(idCol).toString()
            val email = cursor.getString(emailCol) ?: ""
            if (email.isNotBlank()) emailsById.getOrPut(id) { mutableListOf() }.add(email)
        }
    }
    current.keys.toList().forEach { id ->
        val v = current.getValue(id)
        current[id] = v.copy(emails = emailsById[id]?.distinct()?.joinToString(" • ") ?: "")
    }
    val previous = loadContactsVault().associateBy { it.key }
    val merged = linkedMapOf<String, VaultContact>()
    previous.values.forEach { old ->
        merged[old.key] = current[old.key] ?: old.copy(removed = true)
    }
    current.values.forEach { now -> merged[now.key] = now.copy(removed = false) }
    saveContactsVault(merged.values.toList())
    return merged.values.sortedWith(compareBy<VaultContact> { !it.removed }.thenBy { it.name.lowercase(Locale.getDefault()) })
}

private fun Context.saveContactsVault(items: List<VaultContact>) {
    val encoded = items.joinToString("\n") {
        listOf(it.key, it.name, it.phones, it.emails, if (it.removed) "1" else "0", it.lastSeen.toString())
            .joinToString("\t") { field -> android.util.Base64.encodeToString(field.toByteArray(), android.util.Base64.NO_WRAP) }
    }
    getSharedPreferences("gxeon_contacts_vault", Context.MODE_PRIVATE).edit().putString("contacts", encoded).apply()
}

private fun Context.loadContactsVault(): List<VaultContact> {
    val raw = getSharedPreferences("gxeon_contacts_vault", Context.MODE_PRIVATE).getString("contacts", "") ?: ""
    return raw.lineSequence().filter { it.isNotBlank() }.mapNotNull { line ->
        runCatching {
            val p = line.split("\t").map { String(android.util.Base64.decode(it, android.util.Base64.NO_WRAP)) }
            VaultContact(p[0], p[1], p[2], p[3], p[4] == "1", p[5].toLong())
        }.getOrNull()
    }.toList()
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
    var photos by remember { mutableStateOf<List<PhotoEntry>>(emptyList()) }
    var photoScanStatus by remember { mutableStateOf("Ainda não analisado") }
    var vaultContacts by remember { mutableStateOf(context.loadContactsVault()) }
    var contactsStatus by remember { mutableStateOf("Vault ainda não sincronizado") }
    val permissionLauncher = androidx.activity.compose.rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) {
            photos = context.loadPhotos()
            photoScanStatus = photos.size.toString() + " fotos qualificadas"
            audit(context, "Photo Qualifier analisou " + photos.size + " imagens locais")
        } else {
            photoScanStatus = "Permissão de fotos negada"
            audit(context, "Photo Qualifier sem permissão de leitura de imagens")
        }
    }
    val contactsPermissionLauncher = androidx.activity.compose.rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) {
            vaultContacts = context.syncContactsVault()
            contactsStatus = vaultContacts.size.toString() + " contatos protegidos no Vault"
            audit(context, "GX Contacts Vault sincronizado")
        } else {
            contactsStatus = "Permissão de contatos negada"
            audit(context, "GX Contacts Vault sem permissão de leitura")
        }
    }
    fun syncContacts() {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
            contactsPermissionLauncher.launch(Manifest.permission.READ_CONTACTS)
        } else {
            vaultContacts = context.syncContactsVault()
            contactsStatus = vaultContacts.size.toString() + " contatos protegidos no Vault"
            audit(context, "GX Contacts Vault sincronizado; removidos preservados")
        }
    }
    var auditText by remember { mutableStateOf(context.getSharedPreferences("gxeon_edge_audit", Context.MODE_PRIVATE).getString("events", "") ?: "") }
    fun reloadAudit() { auditText = context.getSharedPreferences("gxeon_edge_audit", Context.MODE_PRIVATE).getString("events", "") ?: "" }
    fun refresh() { state = context.snapshot(); audit(context, "Device Agent atualizou telemetria"); reloadAudit() }
    fun scanPhotos() {
        if (android.os.Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(context, Manifest.permission.READ_MEDIA_IMAGES) != PackageManager.PERMISSION_GRANTED) {
            permissionLauncher.launch(Manifest.permission.READ_MEDIA_IMAGES)
        } else {
            photos = context.loadPhotos()
            photoScanStatus = photos.size.toString() + " fotos qualificadas"
            audit(context, "Photo Qualifier analisou " + photos.size + " imagens locais")
            reloadAudit()
        }
    }

    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { Text("GXEON EDGE-01", style = MaterialTheme.typography.headlineMedium); Text("Command Node V0.5 • ${state.model} • Android ${state.androidVersion}"); Text("Última leitura: ${DateFormat.getTimeInstance(DateFormat.MEDIUM).format(Date(state.capturedAt))}", style = MaterialTheme.typography.bodySmall) }
        item { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) { MetricCard("RAM", "${state.ramUsedPercent}%", Modifier.weight(1f)); MetricCard("Storage", "${state.storageUsedPercent}%", Modifier.weight(1f)); MetricCard("Battery", "${state.batteryPercent}%", Modifier.weight(1f)) } }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("COMMAND" to "CMD", "DEVICE" to "DEVICE", "PHOTOS" to "FOTOS", "CONTACTS" to "CONTATOS", "SYSTEMS" to "SIST.").forEach { (key, label) ->
                    if (section == key) Button(onClick = { section = key }, modifier = Modifier.weight(1f)) { Text(label, maxLines = 1, fontSize = 10.sp) }
                    else OutlinedButton(onClick = { section = key }, modifier = Modifier.weight(1f)) { Text(label, maxLines = 1, fontSize = 10.sp) }
                }
            }
        }
        when (section) {
            "DEVICE" -> {
                item { Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) { Text("GX Device Agent", style = MaterialTheme.typography.titleMedium); Text("Sensores: ${state.sensorCount} • Apps inicializáveis: ${state.apps.size}"); healthAdvice(state).forEach { Text("• $it") }; Button(onClick = { refresh() }) { Text("Atualizar diagnóstico") } } } }
                item { Text("App Commander", style = MaterialTheme.typography.titleLarge) }
                items(state.apps.take(60)) { app -> Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(12.dp)) { Text(app.label, style = MaterialTheme.typography.titleSmall); Text(app.packageName, style = MaterialTheme.typography.bodySmall); Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { OutlinedButton(onClick = { context.packageManager.getLaunchIntentForPackage(app.packageName)?.let { context.startActivity(it); audit(context, "Abriu ${app.label}") } }) { Text("Abrir") }; Button(onClick = { activity.verifyOperator("Gerenciar ${app.label}") { context.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${app.packageName}"))); audit(context, "Acesso protegido ao gerenciamento de ${app.label}"); reloadAudit() } }) { Text("Gerenciar") } } } } }
            }
            "PHOTOS" -> {
                item {
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("GX Photo Qualifier", style = MaterialTheme.typography.titleMedium)
                            Text("Lê as fotos locais autorizadas pelo Android e classifica qualidade técnica. Nada é apagado.")
                            Button(onClick = { scanPhotos() }) { Text("Analisar minhas fotos") }
                            Text(photoScanStatus, style = MaterialTheme.typography.bodySmall)
                            if (photos.isNotEmpty()) {
                                val premium = photos.count { it.qualityScore >= 85 }
                                val good = photos.count { it.qualityScore in 70..84 }
                                val review = photos.count { it.qualityScore < 50 }
                                Text("Premium: " + premium + " • Boas: " + good + " • Revisar: " + review)
                            }
                        }
                    }
                }
                items(photos.take(200)) { photo ->
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(photo.name, style = MaterialTheme.typography.titleSmall)
                            Text(photo.tier + " • " + photo.qualityScore + "/100")
                            val sizeMb = ((photo.sizeBytes / 1024.0 / 1024.0) * 10).roundToInt() / 10.0
                            Text(photo.width.toString() + "×" + photo.height + " • " + sizeMb + " MB", style = MaterialTheme.typography.bodySmall)
                            Text(photo.reasons.take(3).joinToString(" • "), style = MaterialTheme.typography.bodySmall)
                            OutlinedButton(onClick = {
                                val intent = Intent(Intent.ACTION_VIEW).setDataAndType(photo.uri, "image/*").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                runCatching { context.startActivity(intent) }
                            }) { Text("Abrir foto") }
                        }
                    }
                }
            }
            "CONTACTS" -> {
                item {
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("GX Contacts Vault", style = MaterialTheme.typography.titleMedium)
                            Text("Mantém uma cópia local dos contatos já sincronizados. Se um deles sumir da agenda, o GXEON preserva nome, telefone e e-mail disponível como REMOVIDO.")
                            Button(onClick = { syncContacts(); reloadAudit() }) { Text("Sincronizar e proteger contatos") }
                            Text(contactsStatus, style = MaterialTheme.typography.bodySmall)
                            Text("Ativos: " + vaultContacts.count { !it.removed } + " • Removidos preservados: " + vaultContacts.count { it.removed })
                        }
                    }
                }
                items(vaultContacts) { contact ->
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                            Text((if (contact.removed) "REMOVIDO • " else "ATIVO • ") + contact.name, style = MaterialTheme.typography.titleSmall)
                            if (contact.phones.isNotBlank()) Text("Telefone: " + contact.phones)
                            Text("E-mail: " + if (contact.emails.isBlank()) "não cadastrado" else contact.emails, style = MaterialTheme.typography.bodySmall)
                            if (contact.removed) Text("Preservado no GX Vault após desaparecer da agenda.", style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
            "SYSTEMS" -> item { SystemsCommand(context) { reloadAudit() } }
            else -> {
                item { Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) { Text("GX Commander", style = MaterialTheme.typography.titleMedium); Text("Detectar → recomendar → aprovar → executar → registrar"); Button(onClick = { refresh() }) { Text("Executar diagnóstico local") }; OutlinedButton(onClick = { context.startActivity(Intent(Settings.ACTION_INTERNAL_STORAGE_SETTINGS)); audit(context, "Abriu controles de armazenamento"); reloadAudit() }) { Text("Controles de armazenamento") }; OutlinedButton(onClick = { context.startActivity(Intent(Settings.ACTION_SETTINGS)); audit(context, "Abriu plano de controle Android"); reloadAudit() }) { Text("Plano de controle Android") } } } }
                item { IntegrationHub() }
                item { Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp)) { Text("Módulos GXEON", style = MaterialTheme.typography.titleMedium); Text("DEVICE • PHOTOS • CONTACTS • SYSTEMS • SOCIAL • VISION • VOICE • BUSINESS • DEV • ACADEMY"); Text("Photo Qualifier V0.4 classifica fotos locais. Contacts Vault V0.5 preserva localmente contatos previamente sincronizados mesmo quando depois são removidos da agenda.", style = MaterialTheme.typography.bodySmall) } } }
                item { Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp)) { Text("Audit Ledger", style = MaterialTheme.typography.titleMedium); Text(if (auditText.isBlank()) "Nenhuma ação registrada ainda." else auditText, style = MaterialTheme.typography.bodySmall) } } }
            }
        }
    }
}

@Composable private fun IntegrationHub() {
    val integrations = listOf(IntegrationNode("Android Control Plane", "telemetria e configurações autorizadas", "LOCAL ATIVO"), IntegrationNode("GX Photo Qualifier", "inventário e classificação técnica de fotos locais", "LOCAL ATIVO"), IntegrationNode("GX Contacts Vault", "snapshot local de contatos e preservação de removidos", "LOCAL ATIVO"), IntegrationNode("GX Systems Registry", "catálogo dos sistemas do ecossistema", "LOCAL ATIVO"), IntegrationNode("GX Watchtower", "health/version/build/eventos", "AGUARDANDO ENDPOINTS"), IntegrationNode("GitHub Bridge", "repos, Actions, PRs e releases", "AGUARDANDO AUTH SEGURA"), IntegrationNode("Social Command", "conteúdo, aprovação e publicação oficial", "BLOQUEADO ATÉ CONECTOR"))
    Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) { Text("GXEON Integration Hub", style = MaterialTheme.typography.titleMedium); integrations.forEach { node -> Text("${node.name} — ${node.state}", style = MaterialTheme.typography.titleSmall); Text(node.capability, style = MaterialTheme.typography.bodySmall) }; Text("Nenhum token privado é armazenado no APK.", style = MaterialTheme.typography.bodySmall) } }
}

@Composable private fun SystemsCommand(context: Context, onAuditChanged: () -> Unit) {
    val systems = listOf(SystemNode("XPeX Academy", "Educação / operação", "Registry ready"), SystemNode("Senara", "Aplicativo do ecossistema", "Registry ready"), SystemNode("GXEON-AI", "Core / Commander", "Registry ready"))
    Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) { Text("GX Systems Command", style = MaterialTheme.typography.titleMedium); Text("Watchtower seguro: nenhum sistema será marcado online sem telemetria real."); systems.forEach { node -> Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) { Text(node.name, style = MaterialTheme.typography.titleSmall); Text(node.role); Text(node.integration, style = MaterialTheme.typography.bodySmall); OutlinedButton(onClick = { audit(context, "Watchtower solicitou verificação de ${node.name}; endpoint ainda não configurado"); onAuditChanged() }) { Text("Registrar verificação") } } } }; Text("Próximo passo de integração: cadastrar endpoints autenticados de health/version/build por sistema.", style = MaterialTheme.typography.bodySmall) } }
}

@Composable private fun MetricCard(title: String, value: String, modifier: Modifier = Modifier) { Card(modifier) { Column(Modifier.padding(12.dp)) { Text(title, style = MaterialTheme.typography.labelMedium); Text(value, style = MaterialTheme.typography.headlineSmall) } } }
