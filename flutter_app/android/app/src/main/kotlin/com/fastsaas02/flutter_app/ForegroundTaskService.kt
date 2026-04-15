package com.fastsaas02.flutter_app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.widget.Toast
import androidx.core.app.NotificationCompat
import androidx.core.app.RemoteInput

/**
 * Foreground service that hosts the persistent quick-input notification.
 * The notification carries a RemoteInput action so the user can type a
 * transaction directly from the notification shade and submit it without
 * opening the app.
 *
 * Contract with other components:
 *  - [REMOTE_INPUT_KEY] is the key QuickEntryReceiver uses to read the typed text.
 *  - [instance] is a process-wide reference that lets MainActivity / the receiver
 *    call [updateWithResult] after the LLM call finishes.
 */
class ForegroundTaskService : Service() {

    companion object {
        // v2: bumped channel id so Android creates a fresh channel with the
        // new HIGH importance. Notification channels are immutable after
        // creation, so renaming is the only way to change importance.
        const val NOTIFICATION_CHANNEL_ID = "fastsaas_foreground_service_v2"
        const val NOTIFICATION_CHANNEL_NAME = "FastSaaS Quick Input"
        const val DEFAULT_NOTIFICATION_ID = 1
        const val REMOTE_INPUT_KEY = "key_text"
        const val DEFAULT_TITLE = "FastSaaS 가계부"
        // Multi-line body so the system lays the notification out at its
        // taller size — on One UI / most launchers this causes the action
        // button row to be rendered immediately without the user having to
        // expand the notification first.
        const val DEFAULT_BODY = "알림을 눌러 거래를 바로 입력하세요\n예) 점심 8000원 / 교통비 1250원"
        const val RESULT_RESET_DELAY_MS = 4000L

        // Process-wide reference so broadcast receivers / MainActivity can update
        // the notification after async LLM processing completes. Cleared in
        // onDestroy so it never points at a dead service.
        @Volatile
        var instance: ForegroundTaskService? = null
            private set
    }

    private var notificationManager: NotificationManager? = null
    private var currentNotificationId: Int = DEFAULT_NOTIFICATION_ID
    private val mainHandler = Handler(Looper.getMainLooper())
    private val resetToIdleRunnable = Runnable {
        updateNotification(DEFAULT_TITLE, DEFAULT_BODY, currentNotificationId)
    }

    override fun onCreate() {
        super.onCreate()
        notificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        createNotificationChannel()
        instance = this
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent != null) {
            when (intent.action) {
                "START_FOREGROUND" -> {
                    val title = intent.getStringExtra("title") ?: DEFAULT_TITLE
                    val body = intent.getStringExtra("body") ?: DEFAULT_BODY
                    val notificationId =
                        intent.getIntExtra("notificationId", DEFAULT_NOTIFICATION_ID)
                    startForegroundService(title, body, notificationId)
                }
                "UPDATE_NOTIFICATION" -> {
                    val title = intent.getStringExtra("title") ?: DEFAULT_TITLE
                    val body = intent.getStringExtra("body") ?: DEFAULT_BODY
                    val notificationId =
                        intent.getIntExtra("notificationId", DEFAULT_NOTIFICATION_ID)
                    updateNotification(title, body, notificationId)
                }
            }
        }
        return START_STICKY
    }

    /**
     * Start the foreground service with a notification.
     */
    private fun startForegroundService(title: String, body: String, notificationId: Int) {
        try {
            currentNotificationId = notificationId
            val notification = createNotification(title, body)
            startForeground(notificationId, notification)
        } catch (e: Exception) {
            Toast.makeText(
                this,
                "Failed to start foreground service: ${e.message}",
                Toast.LENGTH_SHORT
            ).show()
        }
    }

    /**
     * Update the notification content (internal).
     */
    private fun updateNotification(title: String, body: String, notificationId: Int) {
        try {
            currentNotificationId = notificationId
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
     * Show a transient processing state. Called from [QuickEntryReceiver]
     * right after it captures the user's input.
     */
    fun showProcessing(inputText: String) {
        mainHandler.removeCallbacks(resetToIdleRunnable)
        val trimmed = if (inputText.length > 40) inputText.take(40) + "…" else inputText
        updateNotification("⏳ 처리 중", trimmed, currentNotificationId)
    }

    /**
     * Show the LLM result in the notification, then revert to the idle
     * quick-input state after [RESULT_RESET_DELAY_MS].
     */
    fun updateWithResult(resultBody: String, success: Boolean) {
        mainHandler.removeCallbacks(resetToIdleRunnable)
        val title = if (success) "✅ 완료" else "❌ 실패"
        updateNotification(title, resultBody, currentNotificationId)
        mainHandler.postDelayed(resetToIdleRunnable, RESULT_RESET_DELAY_MS)
    }

    /**
     * Build the notification with an inline RemoteInput action. The action's
     * PendingIntent targets [QuickEntryReceiver], which harvests the text and
     * hands it off to Flutter.
     */
    private fun createNotification(title: String, body: String): Notification {
        val remoteInput = RemoteInput.Builder(REMOTE_INPUT_KEY)
            .setLabel("거래를 입력하세요")
            .build()

        val replyIntent = Intent(this, QuickEntryReceiver::class.java).apply {
            action = QuickEntryReceiver.ACTION_QUICK_ENTRY
            // Per-request code so each pending intent is distinct even after
            // updateNotification rebuilds the intent; FLAG_MUTABLE is required
            // on API 31+ so the system can inject RemoteInput results.
            setPackage(packageName)
        }

        val pendingFlags =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }

        val replyPendingIntent = PendingIntent.getBroadcast(
            this,
            /* requestCode = */ 100,
            replyIntent,
            pendingFlags
        )

        val replyAction = NotificationCompat.Action.Builder(
            android.R.drawable.ic_menu_edit,
            "거래 입력",
            replyPendingIntent
        )
            .addRemoteInput(remoteInput)
            .setAllowGeneratedReplies(false)
            .build()

        // BigTextStyle's bigText must be strictly longer / multi-line than
        // contentText to trigger the launcher into using the tall layout.
        // If the body is already multi-line, append a trailing hint so the
        // two strings differ and the system commits to the expanded form.
        val expanded = if (body.contains('\n')) {
            "$body\n아래 '거래 입력' 버튼을 눌러 입력을 시작하세요."
        } else {
            "$body\n아래 '거래 입력' 버튼을 눌러 입력을 시작하세요."
        }

        return NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setOngoing(true)
            .setAutoCancel(false)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            // BigTextStyle with a longer body than contentText tells the
            // system this notification wants the expanded layout. Combined
            // with a multi-line contentText and DEFAULT+ channel importance,
            // One UI / most launchers will render the action row up-front.
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .setBigContentTitle(title)
                    .bigText(expanded)
            )
            .addAction(replyAction)
            .build()
    }

    /**
     * Create notification channel for Android 8.0+.
     */
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                NOTIFICATION_CHANNEL_NAME,
                // DEFAULT is enough to expand the notification in the shade
                // without triggering intrusive heads-up banners every time
                // the content is updated (which would happen with HIGH).
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "FastSaaS 가계부 빠른 입력 알림"
                setShowBadge(false)
                // No sound/vibration — the notification updates on every
                // result and we don't want to buzz the phone each time.
                setSound(null, null)
                enableVibration(false)
            }
            notificationManager?.createNotificationChannel(channel)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        mainHandler.removeCallbacks(resetToIdleRunnable)
        instance = null
        stopForeground(STOP_FOREGROUND_REMOVE)
    }
}
