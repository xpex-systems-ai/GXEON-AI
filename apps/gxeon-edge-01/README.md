# GXEON EDGE-01

Android Command Node for the GXEON ecosystem.\n\nCurrent shell: GXEON Wallet + Agent Economy OS gateway (`https://gxeon-wallet-command-center.vercel.app/`).

## V0.1 implemented
- Native Android app in Kotlin + Jetpack Compose
- Can act as a HOME/launcher candidate
- Reads device model, Android version, RAM usage, storage usage, battery level and sensor count
- Lists launchable apps visible to Android and can open them
- Provides safe shortcuts to Android storage and system settings
- Uses the GXEON guardrail model: detect → recommend → approve → execute → log
- No root required
- No destructive automation

## Planned next
- Biometric confirmation for sensitive actions
- App detail / uninstall request flow via Android system UI
- Camera/QR (GX Vision)
- Voice command bar (GX Voice)
- Local audit ledger
- GXEON Cloud / PC Node adapters
- Android Enterprise / Device Owner research for dedicated managed mode

## Build
Open `apps/gxeon-edge-01` in Android Studio or build with Gradle after wrapper/toolchain setup.

Target: Android 16 / API 36. Minimum: Android 10 / API 29.

## Security
The app intentionally avoids IMEI/MAC collection, root, hidden APIs and silent destructive actions. Android remains the security substrate; EDGE-01 is the GXEON operational layer above it.
