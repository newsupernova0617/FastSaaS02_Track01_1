import 'package:flutter/widgets.dart';

import 'quick_entry_handler.dart';

/// Headless Dart entrypoint spawned by QuickEntryReceiver via
/// FlutterEngineGroup when the main app process is dead. Must be top-level
/// and annotated with `vm:entry-point` so the Dart tree-shaker keeps it.
///
/// The entrypoint does nothing on its own — it just initializes the binding
/// and installs the quick-entry handler. Kotlin then invokes
/// `onQuickEntrySubmit` over the MethodChannel, the handler runs the LLM
/// pipeline, and reports back via `notifyQuickEntryResult`. After that,
/// Kotlin destroys this engine (see QuickEntryReceiver.dispatchToEngine).
@pragma('vm:entry-point')
void quickEntryMain() {
  WidgetsFlutterBinding.ensureInitialized();
  installQuickEntryHandler();
}
