package ai.gxeon.edge

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent

object AgentFiGateway {
    const val COMMAND_URL = "https://gxeon-wallet-command-center.vercel.app/"
    fun open(context: Context) {
        val uri = Uri.parse(COMMAND_URL)
        runCatching {
            CustomTabsIntent.Builder().setShowTitle(true).build().launchUrl(context, uri)
        }.onFailure {
            context.startActivity(Intent(Intent.ACTION_VIEW, uri))
        }
    }
}