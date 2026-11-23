package com.umt.toolkit.plugins

object PluginTemplates {
    data class Template(val name: String, val description: String, val json: String)

    val overlayPanel = Template(
        "Overlay quick panel",
        "Toggles and sliders for the toolkit's own overlay layers, a telemetry readout and presets.",
        """
{
  "schema": 1,
  "id": "com.example.quickpanel",
  "name": "Quick Panel",
  "version": "1.0.0",
  "author": "you",
  "description": "Controls for the toolkit's overlay layers.",
  "permissions": ["SYSTEM_ALERT_WINDOW"],
  "refreshMs": 1000,
  "panel": { "title": "Quick Panel", "x": 24, "y": 220, "widthDp": 240, "opacity": 0.95 },
  "tabs": [
    {
      "title": "Layers",
      "sections": [
        {
          "id": "reticle",
          "title": "Reticle",
          "controls": [
            { "type": "toggle", "id": "ret_on", "label": "Show reticle", "bind": "overlay.reticle.enabled" },
            { "type": "dropdown", "id": "ret_style", "label": "Style", "bind": "overlay.reticle.style" },
            { "type": "slider", "id": "ret_size", "label": "Size", "bind": "overlay.reticle.size", "min": 8, "max": 80, "step": 2 }
          ]
        },
        {
          "id": "screen",
          "title": "Screen",
          "controls": [
            { "type": "toggle", "id": "dim_on", "label": "Dimmer", "bind": "overlay.dimmer.enabled" },
            { "type": "slider", "id": "dim_level", "label": "Dim level", "bind": "overlay.dimmer.level", "min": 0, "max": 0.8, "step": 0.05 },
            { "type": "toggle", "id": "guide_on", "label": "Safe-area guide", "bind": "overlay.guide.enabled" }
          ]
        }
      ]
    },
    {
      "title": "Info",
      "controls": [
        { "type": "toggle", "id": "hud_on", "label": "Telemetry HUD", "bind": "overlay.hud.enabled" },
        { "type": "value", "id": "temp", "label": "Battery", "source": "telemetry.batteryTempC", "format": "%.1f °C" },
        { "type": "value", "id": "mem", "label": "Free RAM", "source": "telemetry.memAvailMb", "format": "%.0f MB" },
        { "type": "value", "id": "clock", "label": "Time", "source": "clock.time" },
        { "type": "button", "id": "night", "label": "Night preset", "action": "preset.apply", "arg": "Night" },
        { "type": "button", "id": "stop", "label": "Stop all overlays", "action": "overlay.stopAll" }
      ]
    }
  ],
  "presets": [
    { "name": "Night", "values": { "dim_on": true, "dim_level": 0.5, "ret_on": false } },
    { "name": "Day", "values": { "dim_on": false, "ret_on": true } }
  ]
}
""".trimIndent(),
    )

    val integrationPanel = Template(
        "Integration debug panel",
        "Drives values of the bundled SDK demo app (com.umt.sample) through umt-sdk; change the target for your own app.",
        """
{
  "schema": 1,
  "id": "com.example.demodebug",
  "name": "Demo Debug",
  "version": "1.0.0",
  "author": "you",
  "permissions": ["SYSTEM_ALERT_WINDOW", "POST_NOTIFICATIONS"],
  "refreshMs": 500,
  "target": "com.umt.sample",
  "panel": { "title": "Demo debug", "widthDp": 250 },
  "tabs": [
    {
      "title": "World",
      "controls": [
        { "type": "slider", "id": "count", "label": "Entities", "bind": "bridge:entity_count" },
        { "type": "slider", "id": "speed", "label": "Speed", "bind": "bridge:speed" },
        { "type": "slider", "id": "time", "label": "Time scale", "bind": "bridge:time_scale" },
        { "type": "toggle", "id": "colliders", "label": "Show colliders", "bind": "bridge:show_colliders" },
        { "type": "dropdown", "id": "palette", "label": "Palette", "bind": "bridge:palette" }
      ]
    },
    {
      "title": "Overlay",
      "controls": [
        { "type": "toggle", "id": "esp", "label": "Entity overlay", "bind": "overlay.esp.enabled" },
        { "type": "dropdown", "id": "src", "label": "Source", "bind": "esp.source" },
        { "type": "toggle", "id": "radar", "label": "Radar", "bind": "esp.radar" },
        { "type": "value", "id": "rate", "label": "Frames/s", "source": "esp.frameHz", "format": "%.0f" },
        { "type": "button", "id": "reconnect", "label": "Reconnect", "action": "bridge.reconnect" },
        { "type": "button", "id": "ping", "label": "Send test notification", "action": "notify", "arg": "Demo debug panel is working" }
      ]
    }
  ],
  "presets": [
    { "name": "Calm", "values": { "speed": 0.5, "time": 1.0 } }
  ]
}
""".trimIndent(),
    )

    val blank = Template(
        "Blank",
        "One tab with a single toggle to start from.",
        """
{
  "schema": 1,
  "id": "com.example.myplugin",
  "name": "My Plugin",
  "version": "0.1.0",
  "permissions": ["SYSTEM_ALERT_WINDOW"],
  "refreshMs": 1000,
  "tabs": [
    {
      "title": "Main",
      "controls": [
        { "type": "toggle", "id": "hud", "label": "Telemetry HUD", "bind": "overlay.hud.enabled" }
      ]
    }
  ]
}
""".trimIndent(),
    )

    val all = listOf(overlayPanel, integrationPanel, blank)
}
