package expo.modules.mlkittranslate

import android.content.Context
import com.google.mlkit.common.MlKit
import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.nl.translate.TranslateLanguage
import com.google.mlkit.nl.translate.Translation
import com.google.mlkit.nl.translate.Translator
import com.google.mlkit.nl.translate.TranslatorOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.ConcurrentHashMap

class MlKitTranslateModule : Module() {
  private val translators = ConcurrentHashMap<String, Translator>()

  override fun definition() = ModuleDefinition {
    Name("MlKitTranslate")

    OnDestroy {
      translators.values.forEach { it.close() }
      translators.clear()
    }

    AsyncFunction("translate") { text: String, from: String, to: String, promise: Promise ->
      try {
        val context = appContext.reactContext?.applicationContext
          ?: return@AsyncFunction promise.reject("E_NO_CONTEXT", "Android context is not available", null)
        ensureMlKitInitialised(context)
        val source = TranslateLanguage.fromLanguageTag(from)
          ?: return@AsyncFunction promise.reject("E_UNSUPPORTED", "ML Kit cannot translate from '$from'", null)
        val target = TranslateLanguage.fromLanguageTag(to)
          ?: return@AsyncFunction promise.reject("E_UNSUPPORTED", "ML Kit cannot translate to '$to'", null)
        val translator = translatorFor(source, target)
        translator.downloadModelIfNeeded(DownloadConditions.Builder().build())
          .continueWithTask { download ->
            download.exception?.let { throw it }
            translator.translate(text)
          }
          .addOnSuccessListener { translated -> promise.resolve(translated) }
          .addOnFailureListener { e -> promise.reject("E_TRANSLATE", describe(e), e) }
      } catch (e: Throwable) {
        promise.reject("E_TRANSLATE", describe(e), e)
      }
    }
  }

  private fun translatorFor(source: String, target: String): Translator =
    translators.getOrPut("$source>$target") {
      Translation.getClient(
        TranslatorOptions.Builder().setSourceLanguage(source).setTargetLanguage(target).build()
      )
    }

  // ML Kit normally self-initialises via a content provider; do it explicitly in case it did not.
  private fun ensureMlKitInitialised(context: Context) {
    try {
      MlKit.initialize(context)
    } catch (_: IllegalStateException) {
      // Already initialised.
    }
  }

  private fun describe(e: Throwable): String {
    val chain = generateSequence(e) { it.cause }.take(4)
      .joinToString(" <- ") { "${it.javaClass.name}: ${it.message}" }
    val frames = e.stackTrace.take(4).joinToString(" | ") { "${it.className}.${it.methodName}:${it.lineNumber}" }
    return "$chain @ $frames"
  }
}
