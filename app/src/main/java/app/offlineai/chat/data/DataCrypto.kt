package app.offlineai.chat.data

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import android.util.Log
import java.io.File
import java.security.KeyStore
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * What the app keeps on the phone (chats, Memory, characters, paired phones) is encrypted with
 * AES-256-GCM. The key that does it is random and is itself kept encrypted by a key that lives in
 * Android's Keystore (the phone's secure hardware where it has some): that one never leaves it, so
 * a copy of the app's files read anywhere else, or by anything but this app, is noise.
 *
 * Text written before encryption came in (no magic at its start) still reads, and is encrypted
 * the next time it is saved. If the Keystore cannot be used on a phone, the app keeps working
 * with plain files, as before, and says so in its log.
 */
class DataCrypto(context: Context) {
    private val wrappedFile = File(context.noBackupFilesDir, "data.key")
    private val random = SecureRandom()

    /** The data key, unwrapped once; null if the Keystore could not be used. */
    private val key: SecretKey? by lazy {
        try {
            val master = masterKey()
            if (wrappedFile.isFile) {
                val all = wrappedFile.readBytes()
                val c = Cipher.getInstance(GCM)
                c.init(Cipher.DECRYPT_MODE, master, GCMParameterSpec(128, all, 0, IV))
                SecretKeySpec(c.doFinal(all, IV, all.size - IV), "AES")
            } else {
                val raw = ByteArray(32).also { random.nextBytes(it) }
                val c = Cipher.getInstance(GCM)
                c.init(Cipher.ENCRYPT_MODE, master)
                val tmp = File(wrappedFile.path + ".tmp")
                tmp.writeBytes(c.iv + c.doFinal(raw))
                if (!tmp.renameTo(wrappedFile)) throw IllegalStateException("could not keep the data key")
                SecretKeySpec(raw, "AES")
            }
        } catch (e: Exception) {
            Log.w("OfflineAI", "data encryption unavailable, files stay plain: $e")
            null
        }
    }

    /** Whether what is saved from now on is encrypted. */
    val enabled: Boolean get() = key != null

    private fun masterKey(): SecretKey {
        val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (ks.getKey(ALIAS, null) as? SecretKey)?.let { return it }
        val gen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        gen.init(
            KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build(),
        )
        return gen.generateKey()
    }

    /** [text] encrypted (magic, nonce, ciphertext with its tag); the text as UTF-8 if encryption is off. */
    fun seal(text: String): ByteArray {
        val k = key ?: return text.toByteArray(Charsets.UTF_8)
        val iv = ByteArray(IV).also { random.nextBytes(it) }
        val c = Cipher.getInstance(GCM)
        c.init(Cipher.ENCRYPT_MODE, k, GCMParameterSpec(128, iv))
        return MAGIC + iv + c.doFinal(text.toByteArray(Charsets.UTF_8))
    }

    /** What [seal] made, or plain text from before encryption; throws if it was sealed and cannot be opened. */
    fun open(bytes: ByteArray): String {
        if (!isSealed(bytes)) return String(bytes, Charsets.UTF_8)
        val k = key ?: throw IllegalStateException("encrypted, and the key cannot be used")
        val c = Cipher.getInstance(GCM)
        c.init(Cipher.DECRYPT_MODE, k, GCMParameterSpec(128, bytes, MAGIC.size, IV))
        return String(c.doFinal(bytes, MAGIC.size + IV, bytes.size - MAGIC.size - IV), Charsets.UTF_8)
    }

    /** The same for a short value kept in SharedPreferences (as Base64 text). */
    fun sealString(text: String): String =
        if (!enabled) text else PREFIX + Base64.encodeToString(seal(text), Base64.NO_WRAP)

    fun openString(stored: String): String =
        if (!stored.startsWith(PREFIX)) stored else open(Base64.decode(stored.substring(PREFIX.length), Base64.NO_WRAP))

    fun isSealed(bytes: ByteArray): Boolean =
        bytes.size > MAGIC.size + IV && bytes.copyOfRange(0, MAGIC.size).contentEquals(MAGIC)

    companion object {
        private const val ALIAS = "nyx-data"
        private const val GCM = "AES/GCM/NoPadding"
        private const val IV = 12
        private val MAGIC = "NYXE1".toByteArray(Charsets.US_ASCII)
        /** Marks an encrypted value in SharedPreferences. */
        private const val PREFIX = "nyxe1:"
    }
}
