package expo.modules.guideaudio

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.media.MediaMetadata
import android.media.session.MediaSession
import android.media.session.PlaybackState
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class GuideAudioModule : Module() {
  private val main = Handler(Looper.getMainLooper())
  private var session: MediaSession? = null
  private var focusRequest: AudioFocusRequest? = null

  override fun definition() = ModuleDefinition {
    Name("GuideAudio")
    Events("onMediaButton")

    Function("activate") { title: String, subtitle: String ->
      main.post { activate(title, subtitle) }
      Unit
    }
    Function("setPlaying") { playing: Boolean ->
      main.post { setPlaying(playing) }
      Unit
    }
    Function("deactivate") {
      main.post { release() }
      Unit
    }
    Function("duck") {
      main.post { requestDuck() }
      Unit
    }
    Function("unduck") {
      main.post { abandonDuck() }
      Unit
    }

    OnDestroy { main.post { release() } }
  }

  private val context: Context?
    get() = appContext.reactContext?.applicationContext

  private fun activate(title: String, subtitle: String) {
    val ctx = context ?: return
    val s = session ?: MediaSession(ctx, "TourGuide").also { created ->
      created.setCallback(object : MediaSession.Callback() {
        override fun onPlay() = emit("playPause")
        override fun onPause() = emit("playPause")
        override fun onSkipToNext() = emit("next")
        override fun onSkipToPrevious() = emit("previous")
      }, main)
      session = created
    }
    s.setMetadata(
      MediaMetadata.Builder()
        .putString(MediaMetadata.METADATA_KEY_TITLE, title)
        .putString(MediaMetadata.METADATA_KEY_ARTIST, subtitle)
        .build()
    )
    s.isActive = true
    setPlaying(false)
    claimMediaButtons()
  }

  private fun setPlaying(playing: Boolean) {
    val s = session ?: return
    val actions = PlaybackState.ACTION_PLAY or PlaybackState.ACTION_PAUSE or PlaybackState.ACTION_PLAY_PAUSE or
      PlaybackState.ACTION_SKIP_TO_NEXT or PlaybackState.ACTION_SKIP_TO_PREVIOUS
    val state = if (playing) PlaybackState.STATE_PLAYING else PlaybackState.STATE_PAUSED
    s.setPlaybackState(PlaybackState.Builder().setActions(actions).setState(state, 0L, 1f).build())
  }

  private fun emit(action: String) {
    sendEvent("onMediaButton", mapOf("action" to action))
  }

  // Android sends headset buttons to the app that last played audio; speech is played by the TTS engine's process.
  private fun claimMediaButtons() {
    try {
      val rate = 8000
      val silence = ShortArray(rate / 10)
      val track = AudioTrack.Builder()
        .setAudioAttributes(
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_MEDIA)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
            .build()
        )
        .setAudioFormat(
          AudioFormat.Builder()
            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
            .setSampleRate(rate)
            .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
            .build()
        )
        .setBufferSizeInBytes(silence.size * 2)
        .setTransferMode(AudioTrack.MODE_STATIC)
        .build()
      track.write(silence, 0, silence.size)
      track.play()
      main.postDelayed({ track.release() }, 500L)
    } catch (e: Exception) {
      Log.w("GuideAudio", "Could not claim media buttons", e)
    }
  }

  private fun audioManager(): AudioManager? =
    context?.getSystemService(Context.AUDIO_SERVICE) as? AudioManager

  private fun requestDuck() {
    val am = audioManager() ?: return
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val request = focusRequest ?: AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
        .setAudioAttributes(
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
            .build()
        )
        .build()
        .also { focusRequest = it }
      am.requestAudioFocus(request)
    } else {
      @Suppress("DEPRECATION")
      am.requestAudioFocus(null, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
    }
  }

  private fun abandonDuck() {
    val am = audioManager() ?: return
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      focusRequest?.let { am.abandonAudioFocusRequest(it) }
    } else {
      @Suppress("DEPRECATION")
      am.abandonAudioFocus(null)
    }
  }

  private fun release() {
    abandonDuck()
    session?.isActive = false
    session?.release()
    session = null
  }
}
