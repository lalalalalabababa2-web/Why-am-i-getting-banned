# The release APK is shrunk and its code renamed (R8): a decompiler shows short meaningless
# names instead of the app's own. Only what the native engine reaches by name keeps its name.

# JNI: the C++ side exports functions named after these classes and methods
# (Java_app_offlineai_chat_engine_NativeEngine_nativeChat and so on).
-keepclasseswithmembernames,includedescriptorclasses class * {
    native <methods>;
}

# Callbacks the C++ side finds by name and signature (GetMethodID): jni_bridge.cpp, pictures.cpp.
-keep interface app.offlineai.chat.engine.LoadListener { *; }
-keep interface app.offlineai.chat.engine.ChatListener { *; }
-keep interface app.offlineai.chat.engine.PictureListener { *; }

# Crash reports (Settings shows them; CI keeps mapping.txt to read them) keep their line numbers.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
