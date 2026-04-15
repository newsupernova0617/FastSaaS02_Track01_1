package com.fastsaas02.flutter_app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.core.app.RemoteInput
import io.flutter.FlutterInjector
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.embedding.engine.FlutterEngineCache
import io.flutter.embedding.engine.FlutterEngineGroup
import io.flutter.embedding.engine.dart.DartExecutor
import io.flutter.plugin.common.MethodChannel

/**
 * Handles the user's RemoteInput submission from the persistent quick-input
 * notification. Two delivery paths:
 *
 *  1. Main app process is alive (FlutterEngine cached in [FlutterEngineCache]
 *     under [MAIN_ENGINE_KEY]): invoke `onQuickEntrySubmit` on its channel.
 *
 *  2. Main app process is dead: spawn a headless FlutterEngine via
 *     [FlutterEngineGroup] running the Dart entrypoint `quickEntryMain`, read
 *     auth + session id from SharedPreferences, and hand it the text. The
 *     receiver tears the engine down once Dart calls back
 *     `notifyQuickEntryResult`.
 */
class QuickEntryReceiver : BroadcastReceiver() {

    companion object {
        const val ACTION_QUICK_ENTRY = "com.fastsaas02.flutter_app.ACTION_QUICK_ENTRY"
        const val MAIN_ENGINE_KEY = "main_engine"
        // Channel used to push quick-entry submissions INTO Dart. Shared with
        // the main app's foreground_service channel so the alive-app path can
        // reuse the already-installed Dart-side handler.
        const val CHANNEL_INBOUND = "com.fastsaas02.app/foreground_service"

        // Separate channel used for Dart → native result callbacks
        // (notifyQuickEntryResult). Keeping this distinct avoids overwriting
        // the main app's handler on CHANNEL_INBOUND.
        const val CHANNEL_RESULT = "com.fastsaas02.app/quick_entry_result"

        private const val TAG = "QuickEntryReceiver"

        // Keys written by Flutter's shared_preferences plugin. The plugin
        // prepends "flutter." to every key and stores them in the
        // FlutterSharedPreferences xml file.
        private const val PREFS_FILE = "FlutterSharedPreferences"
        private const val KEY_JWT = "flutter.fastsaas.jwt"
        private const val KEY_USER_ID = "flutter.fastsaas.user_id"
        private const val KEY_SESSION_ID = "flutter.fastsaas.session_id"
        private const val KEY_API_BASE_URL = "flutter.fastsaas.api_base_url"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val results = RemoteInput.getResultsFromIntent(intent)
        val text = results?.getCharSequence(ForegroundTaskService.REMOTE_INPUT_KEY)?.toString()
        if (text.isNullOrBlank()) {
            Log.w(TAG, "Empty RemoteInput payload, ignoring")
            return
        }

        // Immediately update notification so the user gets visual feedback.
        ForegroundTaskService.instance?.showProcessing(text)

        val prefs = context.getSharedPreferences(PREFS_FILE, Context.MODE_PRIVATE)
        val jwt = prefs.getString(KEY_JWT, null)
        val userId = prefs.getString(KEY_USER_ID, null)
        // shared_preferences stores Dart ints as Long.
        val sessionId = prefs.getLong(KEY_SESSION_ID, -1L)
        val apiBaseUrl = prefs.getString(KEY_API_BASE_URL, null)

        if (jwt.isNullOrBlank() || sessionId <= 0 || apiBaseUrl.isNullOrBlank()) {
            Log.w(
                TAG,
                "Missing auth/session state: jwt=${jwt != null}, sessionId=$sessionId, apiBaseUrl=${apiBaseUrl != null}"
            )
            ForegroundTaskService.instance?.updateWithResult(
                "로그인 후 세션을 선택해주세요",
                success = false
            )
            return
        }

        val args = mapOf(
            "text" to text,
            "jwt" to jwt,
            "userId" to (userId ?: ""),
            "sessionId" to sessionId,
            "apiBaseUrl" to apiBaseUrl
        )

        val cachedEngine = FlutterEngineCache.getInstance().get(MAIN_ENGINE_KEY)
        if (cachedEngine != null) {
            Log.d(TAG, "Dispatching quick entry via cached main FlutterEngine")
            dispatchToEngine(cachedEngine, args, destroyOnDone = false)
        } else {
            Log.d(TAG, "No cached engine, spawning headless FlutterEngine")
            dispatchHeadless(context, args)
        }
    }

    private fun dispatchToEngine(
        engine: FlutterEngine,
        args: Map<String, Any>,
        destroyOnDone: Boolean
    ) {
        val inboundChannel =
            MethodChannel(engine.dartExecutor.binaryMessenger, CHANNEL_INBOUND)
        val resultChannel =
            MethodChannel(engine.dartExecutor.binaryMessenger, CHANNEL_RESULT)

        // Dart reports completion on a dedicated result channel so the main
        // app's handler on CHANNEL_INBOUND isn't overwritten.
        resultChannel.setMethodCallHandler { call, result ->
            when (call.method) {
                "notifyQuickEntryResult" -> {
                    val success = call.argument<Boolean>("success") ?: false
                    val body = call.argument<String>("body") ?: ""
                    ForegroundTaskService.instance?.updateWithResult(body, success)
                    result.success(null)
                    if (destroyOnDone) {
                        // Give the platform channel reply a moment to flush
                        // before tearing down the engine.
                        Handler(Looper.getMainLooper()).postDelayed({
                            engine.destroy()
                        }, 250)
                    }
                }
                else -> result.notImplemented()
            }
        }

        // Invoking onQuickEntrySubmit must happen on the main thread.
        Handler(Looper.getMainLooper()).post {
            inboundChannel.invokeMethod("onQuickEntrySubmit", args, object : MethodChannel.Result {
                override fun success(result: Any?) {
                    // No-op; real result comes back via notifyQuickEntryResult.
                }

                override fun error(errorCode: String, errorMessage: String?, errorDetails: Any?) {
                    Log.e(TAG, "onQuickEntrySubmit error: $errorCode $errorMessage")
                    ForegroundTaskService.instance?.updateWithResult(
                        errorMessage ?: errorCode,
                        success = false
                    )
                    if (destroyOnDone) {
                        Handler(Looper.getMainLooper()).postDelayed({
                            engine.destroy()
                        }, 250)
                    }
                }

                override fun notImplemented() {
                    Log.e(TAG, "onQuickEntrySubmit not implemented on Dart side")
                    ForegroundTaskService.instance?.updateWithResult(
                        "Dart 핸들러 미등록",
                        success = false
                    )
                }
            })
        }
    }

    private fun dispatchHeadless(context: Context, args: Map<String, Any>) {
        Handler(Looper.getMainLooper()).post {
            try {
                val loader = FlutterInjector.instance().flutterLoader()
                if (!loader.initialized()) {
                    loader.startInitialization(context.applicationContext)
                }
                loader.ensureInitializationComplete(context.applicationContext, null)

                val group = FlutterEngineGroup(context.applicationContext)
                val entrypoint = DartExecutor.DartEntrypoint(
                    loader.findAppBundlePath(),
                    "quickEntryMain"
                )
                val engine = group.createAndRunEngine(context.applicationContext, entrypoint)
                dispatchToEngine(engine, args, destroyOnDone = true)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to spawn headless engine", e)
                ForegroundTaskService.instance?.updateWithResult(
                    "백그라운드 처리 실패: ${e.message}",
                    success = false
                )
            }
        }
    }
}
