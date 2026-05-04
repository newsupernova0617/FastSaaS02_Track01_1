package com.fastsaas02.flutter_app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.app.RemoteInput

/**
 * Handles the user's inline text submission from the persistent quick-input
 * notification and forwards it to the shared Flutter quick-entry pipeline.
 */
class QuickEntryReceiver : BroadcastReceiver() {

    companion object {
        const val ACTION_QUICK_ENTRY = "com.fastsaas02.flutter_app.ACTION_QUICK_ENTRY"
        private const val TAG = "QuickEntryReceiver"
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

        val state = QuickEntryDispatcher.loadPrefState(context)
        if (state == null) {
            ForegroundTaskService.instance?.updateWithResult(
                "로그인 후 세션을 선택해주세요",
                success = false
            )
            return
        }

        QuickEntryDispatcher.dispatch(context, QuickEntryDispatcher.buildArgs(text, state))
    }
}
