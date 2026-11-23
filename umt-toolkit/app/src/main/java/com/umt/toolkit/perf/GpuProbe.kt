package com.umt.toolkit.perf

import android.opengl.EGL14
import android.opengl.EGLConfig
import android.opengl.GLES20

data class GpuInfo(val renderer: String, val vendor: String, val version: String, val extensions: Int)

/** Reads the GPU strings from a throwaway 1x1 off-screen OpenGL ES context. */
object GpuProbe {
    fun probe(): GpuInfo? {
        val display = EGL14.eglGetDisplay(EGL14.EGL_DEFAULT_DISPLAY)
        if (display == null || display == EGL14.EGL_NO_DISPLAY) return null
        val version = IntArray(2)
        if (!EGL14.eglInitialize(display, version, 0, version, 1)) return null
        try {
            val attribs = intArrayOf(
                EGL14.EGL_RENDERABLE_TYPE, EGL14.EGL_OPENGL_ES2_BIT,
                EGL14.EGL_SURFACE_TYPE, EGL14.EGL_PBUFFER_BIT,
                EGL14.EGL_RED_SIZE, 8, EGL14.EGL_GREEN_SIZE, 8, EGL14.EGL_BLUE_SIZE, 8,
                EGL14.EGL_NONE,
            )
            val configs = arrayOfNulls<EGLConfig>(1)
            val num = IntArray(1)
            if (!EGL14.eglChooseConfig(display, attribs, 0, configs, 0, 1, num, 0) || num[0] == 0) return null
            val config = configs[0] ?: return null
            val ctx = EGL14.eglCreateContext(display, config, EGL14.EGL_NO_CONTEXT,
                intArrayOf(EGL14.EGL_CONTEXT_CLIENT_VERSION, 2, EGL14.EGL_NONE), 0)
            if (ctx == null || ctx == EGL14.EGL_NO_CONTEXT) return null
            val surface = EGL14.eglCreatePbufferSurface(display, config, intArrayOf(EGL14.EGL_WIDTH, 1, EGL14.EGL_HEIGHT, 1, EGL14.EGL_NONE), 0)
            try {
                if (surface == null || !EGL14.eglMakeCurrent(display, surface, surface, ctx)) return null
                val ext = GLES20.glGetString(GLES20.GL_EXTENSIONS).orEmpty()
                return GpuInfo(
                    renderer = GLES20.glGetString(GLES20.GL_RENDERER) ?: "unknown",
                    vendor = GLES20.glGetString(GLES20.GL_VENDOR) ?: "unknown",
                    version = GLES20.glGetString(GLES20.GL_VERSION) ?: "unknown",
                    extensions = ext.split(' ').count { it.isNotBlank() },
                )
            } finally {
                EGL14.eglMakeCurrent(display, EGL14.EGL_NO_SURFACE, EGL14.EGL_NO_SURFACE, EGL14.EGL_NO_CONTEXT)
                if (surface != null) EGL14.eglDestroySurface(display, surface)
                EGL14.eglDestroyContext(display, ctx)
            }
        } finally {
            EGL14.eglTerminate(display)
        }
    }
}
