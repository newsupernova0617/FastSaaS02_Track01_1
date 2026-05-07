package com.fastsaas02.flutter_app

import android.content.Intent
import android.os.Build
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.embedding.engine.FlutterEngineCache
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val overlayChannelName = "com.fastsaas02.app/overlay"
    private val foregroundServiceChannelName = "com.fastsaas02.app/foreground_service"
    private var pendingForegroundTitle: String? = null
    private var pendingForegroundBody: String? = null
    private var pendingForegroundNotificationId: Int? = null
    private val notificationPermissionRequestCode = 1001

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        // Cache the main engine so QuickEntryReceiver can reuse it instead of
        // spawning a headless engine when the app is alive.
        FlutterEngineCache.getInstance().put(
            QuickEntryDispatcher.MAIN_ENGINE_KEY,
            flutterEngine
        )

        // Setup overlay channel
        MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            overlayChannelName
        ).setMethodCallHandler { call, result ->
            when (call.method) {
                "startOverlay" -> {
                    val title = call.argument<String>("title") ?: "Overlay"
                    val message = call.argument<String>("message") ?: ""
                    startOverlay(title, message)
                    result.success(null)
                }
                "stopOverlay" -> {
                    stopOverlay()
                    result.success(null)
                }
                "sendMessage" -> {
                    val message = call.argument<String>("message") ?: ""
                    sendMessageToOverlay(message)
                    result.success(null)
                }
                "isOverlayRunning" -> {
                    result.success(isOverlayRunning())
                }
                "hasOverlayPermission" -> {
                    result.success(hasOverlayPermission())
                }
                "requestOverlayPermission" -> {
                    requestOverlayPermission()
                    result.success(null)
                }
                else -> result.notImplemented()
            }
        }

        // Setup foreground service channel
        MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            foregroundServiceChannelName
        ).setMethodCallHandler { call, result ->
            when (call.method) {
                "startForegroundService" -> {
                    val title = call.argument<String>("title") ?: "FastSaaS"
                    val body = call.argument<String>("body") ?: ""
                    val notificationId = call.argument<Int>("notificationId") ?: 1
                    startForegroundService(title, body, notificationId)
                    result.success(null)
                }
                "enableQuickInput" -> {
                    val title = call.argument<String>("title") ?: "FastSaaS"
                    val body = call.argument<String>("body") ?: ""
                    val notificationId = call.argument<Int>("notificationId") ?: 1
                    enableQuickInput(title, body, notificationId)
                    result.success(null)
                }
                "stopForegroundService" -> {
                    stopForegroundService()
                    result.success(null)
                }
                "updateNotification" -> {
                    val title = call.argument<String>("title") ?: "FastSaaS"
                    val body = call.argument<String>("body") ?: ""
                    val notificationId = call.argument<Int>("notificationId") ?: 1
                    updateNotification(title, body, notificationId)
                    result.success(null)
                }
                "isForegroundServiceRunning" -> {
                    result.success(isForegroundServiceRunning())
                }
                "hasNotificationPermission" -> {
                    result.success(hasNotificationPermission())
                }
                "requestNotificationPermission" -> {
                    requestNotificationPermission()
                    result.success(null)
                }
                else -> result.notImplemented()
            }
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)

        if (requestCode == notificationPermissionRequestCode) {
            if (hasNotificationPermission()) {
                startPendingForegroundService()
            } else {
                clearPendingForegroundService()
            }
        }
    }

    // Overlay methods
    private fun startOverlay(title: String, message: String) {
        val intent = Intent(this, OverlayService::class.java).apply {
            action = "START_OVERLAY"
            putExtra("title", title)
            putExtra("message", message)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
    }

    private fun stopOverlay() {
        val intent = Intent(this, OverlayService::class.java).apply {
            action = "STOP_OVERLAY"
        }
        stopService(intent)
    }

    private fun sendMessageToOverlay(message: String) {
        val intent = Intent(this, OverlayService::class.java).apply {
            action = "SEND_MESSAGE"
            putExtra("message", message)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
    }

    private fun isOverlayRunning(): Boolean {
        // Check if OverlayService is running
        val manager =
            getSystemService(android.content.Context.ACTIVITY_SERVICE) as android.app.ActivityManager
        return manager.getRunningServices(Integer.MAX_VALUE).any {
            it.service.className == OverlayService::class.java.name
        }
    }

    private fun hasOverlayPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            android.provider.Settings.canDrawOverlays(this)
        } else {
            true
        }
    }

    private fun requestOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!android.provider.Settings.canDrawOverlays(this)) {
                val intent = Intent(
                    android.provider.Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    android.net.Uri.parse("package:$packageName")
                )
                startActivity(intent)
            }
        }
    }

    // Foreground service methods
    private fun startForegroundService(title: String, body: String, notificationId: Int) {
        val intent = Intent(this, ForegroundTaskService::class.java).apply {
            action = "START_FOREGROUND"
            putExtra("title", title)
            putExtra("body", body)
            putExtra("notificationId", notificationId)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
    }

    private fun stopForegroundService() {
        val intent = Intent(this, ForegroundTaskService::class.java)
        stopService(intent)
    }

    private fun updateNotification(title: String, body: String, notificationId: Int) {
        val intent = Intent(this, ForegroundTaskService::class.java).apply {
            action = "UPDATE_NOTIFICATION"
            putExtra("title", title)
            putExtra("body", body)
            putExtra("notificationId", notificationId)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
    }

    private fun isForegroundServiceRunning(): Boolean {
        val manager =
            getSystemService(android.content.Context.ACTIVITY_SERVICE) as android.app.ActivityManager
        return manager.getRunningServices(Integer.MAX_VALUE).any {
            it.service.className == ForegroundTaskService::class.java.name
        }
    }

    private fun hasNotificationPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) == android.content.pm.PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
    }

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                requestPermissions(
                    arrayOf(android.Manifest.permission.POST_NOTIFICATIONS),
                    notificationPermissionRequestCode
                )
            }
        }
    }

    private fun enableQuickInput(title: String, body: String, notificationId: Int) {
        if (isForegroundServiceRunning()) {
            updateNotification(title, body, notificationId)
            return
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && !hasNotificationPermission()) {
            pendingForegroundTitle = title
            pendingForegroundBody = body
            pendingForegroundNotificationId = notificationId
            requestNotificationPermission()
            return
        }

        startForegroundService(title, body, notificationId)
    }

    private fun startPendingForegroundService() {
        val title = pendingForegroundTitle ?: return
        val body = pendingForegroundBody ?: return
        val notificationId = pendingForegroundNotificationId ?: 1
        clearPendingForegroundService()
        startForegroundService(title, body, notificationId)
    }

    private fun clearPendingForegroundService() {
        pendingForegroundTitle = null
        pendingForegroundBody = null
        pendingForegroundNotificationId = null
    }

    override fun onDestroy() {
        FlutterEngineCache.getInstance().remove(QuickEntryDispatcher.MAIN_ENGINE_KEY)
        super.onDestroy()
    }
}
