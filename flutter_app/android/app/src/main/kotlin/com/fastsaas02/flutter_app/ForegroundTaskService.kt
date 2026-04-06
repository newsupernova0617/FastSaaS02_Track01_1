package com.fastsaas02.flutter_app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.widget.Toast
import androidx.core.app.NotificationCompat

/**
 * Foreground service that runs persistent background tasks with a notification.
 * Requires FOREGROUND_SERVICE and POST_NOTIFICATIONS permissions.
 */
class ForegroundTaskService : Service() {

    companion object {
        private const val NOTIFICATION_CHANNEL_ID = "fastsaas_foreground_service"
        private const val NOTIFICATION_CHANNEL_NAME = "FastSaaS Foreground Service"
        private const val DEFAULT_NOTIFICATION_ID = 1
    }

    private var notificationManager: NotificationManager? = null

    override fun onCreate() {
        super.onCreate()
        notificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent != null) {
            when (intent.action) {
                "START_FOREGROUND" -> {
                    val title = intent.getStringExtra("title") ?: "FastSaaS"
                    val body = intent.getStringExtra("body") ?: "Service running"
                    val notificationId =
                        intent.getIntExtra("notificationId", DEFAULT_NOTIFICATION_ID)
                    startForegroundService(title, body, notificationId)
                }
                "UPDATE_NOTIFICATION" -> {
                    val title = intent.getStringExtra("title") ?: "FastSaaS"
                    val body = intent.getStringExtra("body") ?: "Service running"
                    val notificationId =
                        intent.getIntExtra("notificationId", DEFAULT_NOTIFICATION_ID)
                    updateNotification(title, body, notificationId)
                }
            }
        }
        return START_STICKY
    }

    /**
     * Start the foreground service with a notification
     */
    private fun startForegroundService(title: String, body: String, notificationId: Int) {
        try {
            val notification = createNotification(title, body)
            startForeground(notificationId, notification)
            Toast.makeText(this, "Foreground service started", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            Toast.makeText(
                this,
                "Failed to start foreground service: ${e.message}",
                Toast.LENGTH_SHORT
            ).show()
        }
    }

    /**
     * Update the notification content
     */
    private fun updateNotification(title: String, body: String, notificationId: Int) {
        try {
            val notification = createNotification(title, body)
            notificationManager?.notify(notificationId, notification)
        } catch (e: Exception) {
            Toast.makeText(
                this,
                "Failed to update notification: ${e.message}",
                Toast.LENGTH_SHORT
            ).show()
        }
    }

    /**
     * Create a notification with the given title and body
     */
    private fun createNotification(title: String, body: String): Notification {
        return NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setOngoing(true)
            .setAutoCancel(false)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    /**
     * Create notification channel for Android 8.0+
     */
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                NOTIFICATION_CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "FastSaaS foreground service notification"
                setShowBadge(false)
            }
            notificationManager?.createNotificationChannel(channel)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        stopForeground(STOP_FOREGROUND_REMOVE)
        Toast.makeText(this, "Foreground service stopped", Toast.LENGTH_SHORT).show()
    }
}
