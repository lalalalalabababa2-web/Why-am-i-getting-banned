package com.umt.toolkit.core

import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import java.security.SecureRandom
import java.util.Base64
import javax.crypto.AEADBadTagException
import javax.crypto.Cipher
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

class ProtectedExportException(message: String) : Exception(message)

/**
 * Password-protected export files: PBKDF2WithHmacSHA256 derives a 256-bit key from the
 * password and a random salt, AES/GCM/NoPadding encrypts with a random 96-bit IV and a
 * 128-bit tag. The header fields are bound to the ciphertext as associated data, so changing
 * any of them makes decryption fail instead of silently using other parameters.
 */
object ProtectedExport {
    const val FORMAT = "umt-protected"
    const val VERSION = 1
    const val DEFAULT_ITERATIONS = 210_000
    private const val KDF = "PBKDF2WithHmacSHA256"
    private const val CIPHER = "AES/GCM/NoPadding"
    private const val KEY_BITS = 256
    private const val SALT_BYTES = 16
    private const val IV_BYTES = 12
    private const val TAG_BITS = 128

    @Serializable
    data class Envelope(
        val format: String,
        val version: Int,
        val contentType: String,
        val kdf: String,
        val iterations: Int,
        val cipher: String,
        val salt: String,
        val iv: String,
        val data: String,
    )

    fun encrypt(
        plain: String,
        password: CharArray,
        contentType: String,
        iterations: Int = DEFAULT_ITERATIONS,
        random: SecureRandom = SecureRandom(),
    ): String {
        require(password.isNotEmpty()) { "password is empty" }
        val salt = ByteArray(SALT_BYTES).also(random::nextBytes)
        val iv = ByteArray(IV_BYTES).also(random::nextBytes)
        val cipher = Cipher.getInstance(CIPHER)
        cipher.init(Cipher.ENCRYPT_MODE, deriveKey(password, salt, iterations), GCMParameterSpec(TAG_BITS, iv))
        cipher.updateAAD(aad(contentType, iterations))
        val ct = cipher.doFinal(plain.toByteArray(Charsets.UTF_8))
        val b64 = Base64.getEncoder()
        val env = Envelope(FORMAT, VERSION, contentType, KDF, iterations, CIPHER,
            b64.encodeToString(salt), b64.encodeToString(iv), b64.encodeToString(ct))
        return UmtJson.encodeToString(env)
    }

    fun decrypt(text: String, password: CharArray): Pair<String, String> {
        val env = try {
            UmtJson.decodeFromString<Envelope>(text)
        } catch (e: Exception) {
            throw ProtectedExportException("Not a protected export file")
        }
        if (env.format != FORMAT) throw ProtectedExportException("Not a protected export file")
        if (env.version != VERSION) throw ProtectedExportException("Unsupported protected export version ${env.version}")
        if (env.kdf != KDF || env.cipher != CIPHER) throw ProtectedExportException("Unsupported encryption (${env.kdf}, ${env.cipher})")
        if (env.iterations !in 10_000..5_000_000) throw ProtectedExportException("Unreasonable key-derivation iteration count ${env.iterations}")
        val b64 = Base64.getDecoder()
        val salt: ByteArray
        val iv: ByteArray
        val ct: ByteArray
        try {
            salt = b64.decode(env.salt); iv = b64.decode(env.iv); ct = b64.decode(env.data)
        } catch (e: IllegalArgumentException) {
            throw ProtectedExportException("The file is damaged (bad base64)")
        }
        if (iv.size != IV_BYTES || salt.size < 8) throw ProtectedExportException("The file is damaged (bad header)")
        return try {
            val cipher = Cipher.getInstance(CIPHER)
            cipher.init(Cipher.DECRYPT_MODE, deriveKey(password, salt, env.iterations), GCMParameterSpec(TAG_BITS, iv))
            cipher.updateAAD(aad(env.contentType, env.iterations))
            env.contentType to String(cipher.doFinal(ct), Charsets.UTF_8)
        } catch (e: AEADBadTagException) {
            throw ProtectedExportException("Wrong password, or the file was changed")
        }
    }

    fun isProtected(text: String): Boolean =
        text.length < 20_000_000 && text.contains("\"format\"") && text.contains("\"$FORMAT\"")

    private fun aad(contentType: String, iterations: Int) =
        "$FORMAT|$VERSION|$contentType|$KDF|$iterations|$CIPHER".toByteArray(Charsets.UTF_8)

    private fun deriveKey(password: CharArray, salt: ByteArray, iterations: Int): SecretKeySpec {
        val spec = PBEKeySpec(password, salt, iterations, KEY_BITS)
        try {
            val bytes = SecretKeyFactory.getInstance(KDF).generateSecret(spec).encoded
            return SecretKeySpec(bytes, "AES")
        } finally {
            spec.clearPassword()
        }
    }
}
