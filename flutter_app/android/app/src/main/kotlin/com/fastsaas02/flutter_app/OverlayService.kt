package com.fastsaas02.flutter_app

import android.app.Service
import android.content.Intent
import android.content.res.Resources
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.LayoutInflater
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageButton
import android.widget.TextView
import android.widget.Toast

/**
 * Service that manages a floating overlay window on top of other applications.
 * Requires SYSTEM_ALERT_WINDOW permission.
 */
class OverlayService : Service() {

    private var windowManager: WindowManager? = null
    private var overlayView: FrameLayout? = null
    private var titleView: TextView? = null
    private var messageView: TextView? = null
    private var isVisible = false

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent != null) {
            when (intent.action) {
                "START_OVERLAY" -> {
                    val title = intent.getStringExtra("title") ?: "Overlay"
                    val message = intent.getStringExtra("message") ?: ""
                    startOverlay(title, message)
                }
                "STOP_OVERLAY" -> {
                    stopOverlay()
                    stopSelf()
                }
                "SEND_MESSAGE" -> {
                    val message = intent.getStringExtra("message") ?: ""
                    updateMessage(message)
                }
            }
        }
        return START_STICKY
    }

    /**
     * Start the overlay window
     */
    private fun startOverlay(title: String, message: String) {
        if (isVisible) {
            return // Already visible
        }

        try {
            // Create overlay view container
            overlayView = FrameLayout(this).apply {
                setBackgroundColor(0xCC000000.toInt()) // Semi-transparent black
            }

            // Add title
            titleView = TextView(this).apply {
                text = title
                setTextColor(0xFFFFFFFF.toInt())
                textSize = 16f
                setPadding(20, 20, 20, 10)
            }
            overlayView?.addView(titleView)

            // Add message
            messageView = TextView(this).apply {
                text = message
                setTextColor(0xFFCCCCCC.toInt())
                textSize = 12f
                setPadding(20, 10, 20, 10)
            }
            overlayView?.addView(messageView)

            // Add close button
            val closeButton = ImageButton(this).apply {
                setImageResource(android.R.drawable.ic_menu_close_clear_cancel)
                setBackgroundColor(0xFF333333.toInt())
                setOnClickListener {
                    stopOverlay()
                    stopSelf()
                }
            }

            val params = WindowManager.LayoutParams().apply {
                type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                } else {
                    @Suppress("DEPRECATION")
                    WindowManager.LayoutParams.TYPE_PHONE
                }
                format = PixelFormat.RGBA_8888
                flags =
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
                width = 400
                height = 200
                gravity = Gravity.TOP or Gravity.RIGHT
                x = 0
                y = 100
            }

            windowManager?.addView(overlayView, params)
            isVisible = true
            Toast.makeText(this, "Overlay started", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            Toast.makeText(
                this,
                "Failed to create overlay: ${e.message}",
                Toast.LENGTH_SHORT
            ).show()
        }
    }

    /**
     * Stop the overlay window
     */
    private fun stopOverlay() {
        if (!isVisible) {
            return
        }

        try {
            if (overlayView != null && windowManager != null) {
                windowManager?.removeView(overlayView)
            }
            isVisible = false
            Toast.makeText(this, "Overlay stopped", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            Toast.makeText(
                this,
                "Failed to stop overlay: ${e.message}",
                Toast.LENGTH_SHORT
            ).show()
        }
    }

    /**
     * Update the message in the overlay
     */
    private fun updateMessage(message: String) {
        try {
            messageView?.text = message
        } catch (e: Exception) {
            Toast.makeText(
                this,
                "Failed to update message: ${e.message}",
                Toast.LENGTH_SHORT
            ).show()
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        stopOverlay()
    }
}
