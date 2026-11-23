-keepattributes *Annotation*, InnerClasses, Signature
-keep class com.umt.toolkit.model.** { *; }
-keep class com.umt.sdk.** { *; }
# Everything the toolkit stores or exports is @Serializable; keep those classes and their generated serializers.
-keep @kotlinx.serialization.Serializable class com.umt.toolkit.** { *; }
-keep class com.umt.toolkit.**$$serializer { *; }
-keepclassmembers class com.umt.toolkit.** { *** Companion; }
-dontwarn kotlinx.serialization.**
