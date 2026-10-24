package app.offlineai.chat

import android.os.SystemClock
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import app.offlineai.chat.data.ChatMode
import app.offlineai.chat.lua.LuaEnv
import app.offlineai.chat.lua.LuaScript
import app.offlineai.chat.lua.LuaTools
import app.offlineai.chat.lua.RunOptions
import app.offlineai.chat.ui.LuaEditorActivity
import app.offlineai.chat.ui.MainActivity
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * The Lua tools on the phone: the native library runs plain Lua and the Roblox test place from
 * the app's own assets, the checker works, and in the chat a Lua block's Run button shows what
 * the code printed.
 */
@RunWith(AndroidJUnit4::class)
class LuaToolsTest {
    private val inst = InstrumentationRegistry.getInstrumentation()
    private val app = inst.targetContext.applicationContext as App

    private fun onMain(block: () -> Unit) = inst.runOnMainSync { block() }

    @Before
    fun setUp() {
        TestDevice.wake()
        app.settings.markdown = true
        onMain { app.chat.newChat() }
    }

    @After
    fun tearDown() {
        onMain {
            app.chat.testFinish()
            app.chat.newChat()
        }
    }

    @Test
    fun plainLuaRuns() {
        val r = LuaTools.runNow(app, listOf(LuaScript("script", "local t = {}\nfor i = 1, 3 do t[#t + 1] = i * i end\nprint(table.concat(t, ','))\nprint(nil .. 'x')")),
            LuaEnv.LUA, RunOptions())
        assertTrue("printed: ${r.lines}", r.lines.any { it.text == "1,4,9" })
        assertFalse(r.ok)
        assertEquals("the error's line", 4, r.errorLine)
    }

    @Test
    fun robloxScriptsRunTogether() {
        val server = """
            -- Script in ServerScriptService
            local e = Instance.new("RemoteEvent")
            e.Name = "Hello"
            e.Parent = game.ReplicatedStorage
            e.OnServerEvent:Connect(function(player, msg) print("server got", msg, "from", player.Name) end)
        """.trimIndent()
        val client = """
            -- LocalScript in StarterPlayerScripts
            game.ReplicatedStorage:WaitForChild("Hello"):FireServer("hi")
        """.trimIndent()
        val r = LuaTools.runNow(app, listOf(LuaScript("script", server), LuaScript("script", client)), LuaEnv.ROBLOX, RunOptions(gameSeconds = 10))
        assertTrue("output: ${r.lines.map { it.text }} ${r.error}", r.lines.any { it.text == "server got hi from Player1" })
        assertTrue(r.ok)
        assertEquals(listOf("ServerScriptService.Script", "Players.Player1.PlayerScripts.LocalScript"), r.scripts)
    }

    @Test
    fun checkerFindsProblems() {
        val c = LuaTools.checkNow("local x = 1\npirnt(x)\n", LuaEnv.ROBLOX)
        assertFalse(c.ok)
        assertTrue("problems: ${c.problems}", c.problems.any { it.line == 2 && it.message.contains("pirnt") })
    }

    private fun findText(v: View, s: String): TextView? {
        if (v is TextView && v.text.toString() == s && v.visibility == View.VISIBLE) return v
        if (v is ViewGroup) for (i in 0 until v.childCount) findText(v.getChildAt(i), s)?.let { return it }
        return null
    }

    private fun findTextContaining(v: View, s: String): TextView? {
        if (v is TextView && v.text.toString().contains(s) && v.visibility == View.VISIBLE) return v
        if (v is ViewGroup) for (i in 0 until v.childCount) findTextContaining(v.getChildAt(i), s)?.let { return it }
        return null
    }

    private fun findRecycler(v: View): RecyclerView? {
        if (v is RecyclerView) return v
        if (v is ViewGroup) for (i in 0 until v.childCount) findRecycler(v.getChildAt(i))?.let { return it }
        return null
    }

    /** A reply with a Lua block: Run prints under the block, and "Ask AI to fix" fills the message box. */
    @Test
    fun runButtonInTheChat() {
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            onMain {
                app.chat.setMode(ChatMode.LUA)
                app.chat.testStartReply("Write a loop")
                app.chat.testUpdate("Here you go:\n```lua\nfor i = 1, 3 do\n  print('line ' .. i)\nend\nerror('oops')\n```\nDone.")
                app.chat.testFinish()
            }
            var root: View? = null
            scenario.onActivity { root = it.window.decorView }
            val deadline = SystemClock.uptimeMillis() + 10_000
            var run: TextView? = null
            while (run == null && SystemClock.uptimeMillis() < deadline) {
                onMain { run = findText(root!!, "Run") }
                if (run == null) Thread.sleep(100)
            }
            assertNotNull("a Run button on the Lua block", run)
            onMain { run!!.performClick() }
            var out: TextView? = null
            val end = SystemClock.uptimeMillis() + 20_000
            while (out == null && SystemClock.uptimeMillis() < end) {
                onMain { out = findTextContaining(root!!, "line 3") }
                if (out == null) Thread.sleep(100)
            }
            assertNotNull("the output under the block", out)
            var fix: TextView? = null
            onMain { fix = findText(root!!, "Ask AI to fix") }
            assertNotNull("a failed run offers a fix", fix)
            onMain { fix!!.performClick() }
            var composed = ""
            scenario.onActivity { a ->
                composed = (findRecycler(a.window.decorView)?.rootView?.let { r ->
                    fun edit(v: View): android.widget.EditText? {
                        if (v is android.widget.EditText) return v
                        if (v is ViewGroup) for (i in 0 until v.childCount) edit(v.getChildAt(i))?.let { return it }
                        return null
                    }
                    edit(r)?.text?.toString()
                }) ?: ""
            }
            assertTrue("the message box asks for a fix: $composed", composed.contains("oops") && composed.contains("Fix it"))
        }
    }

    @Test
    fun editorOpens() {
        ActivityScenario.launch(LuaEditorActivity::class.java).use { Thread.sleep(1500) }
    }
}
