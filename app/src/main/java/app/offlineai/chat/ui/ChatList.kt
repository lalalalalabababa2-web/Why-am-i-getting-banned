package app.offlineai.chat.ui

import android.content.Context
import android.graphics.Rect
import android.view.View
import android.view.ViewTreeObserver
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView

/**
 * The chat list's layout. Laid out from the top: when a message grows or shrinks, the message at
 * the top of the screen keeps its place (a list stacked from the bottom would instead push
 * everything you are reading upwards as the reply grows). It also refuses the requests views
 * make to be scrolled into sight (a text cursor, a focused view): in a chat, only you and the
 * follow-the-reply logic move the list.
 */
class ChatLayoutManager(context: Context) : LinearLayoutManager(context, RecyclerView.VERTICAL, false) {
    override fun requestChildRectangleOnScreen(
        parent: RecyclerView, child: View, rect: Rect, immediate: Boolean, focusedChildVisible: Boolean,
    ): Boolean = false

    override fun requestChildRectangleOnScreen(parent: RecyclerView, child: View, rect: Rect, immediate: Boolean): Boolean = false

    @Deprecated("Deprecated in Java")
    override fun onRequestChildFocus(parent: RecyclerView, child: View, focused: View?): Boolean = true

    override fun onRequestChildFocus(parent: RecyclerView, state: RecyclerView.State, child: View, focused: View?): Boolean = true
}

/**
 * Follows the reply while you are at the bottom, and only then.
 *
 *  - Following: before each frame is drawn, the bottom of the last message is lined up with the
 *    bottom of the list, so growing text stays in view with no animation per token.
 *  - Your finger moving the list up stops following at once. The list then stays exactly where
 *    you left it while the reply keeps growing below.
 *  - Following resumes only when you scroll back to the very bottom yourself, or tap the
 *    jump-to-bottom button, or send a message.
 */
class ChatScroller(
    private val list: RecyclerView,
    private val lm: ChatLayoutManager,
    private val enabled: () -> Boolean,
    private val onChange: () -> Unit,
) {
    var following = true
        private set
    private var userScrolling = false
    private var animating = false
    private var pendingJump = 0

    private val preDraw = ViewTreeObserver.OnPreDrawListener {
        pin()
    }

    init {
        list.addOnScrollListener(object : RecyclerView.OnScrollListener() {
            override fun onScrollStateChanged(rv: RecyclerView, newState: Int) {
                when (newState) {
                    RecyclerView.SCROLL_STATE_DRAGGING -> {
                        userScrolling = true
                        animating = false
                    }
                    RecyclerView.SCROLL_STATE_IDLE -> {
                        if (userScrolling && isAtBottom()) following = true
                        userScrolling = false
                        animating = false
                    }
                }
                onChange()
            }

            override fun onScrolled(rv: RecyclerView, dx: Int, dy: Int) {
                if (userScrolling) {
                    if (dy < 0) following = false else if (dy > 0 && isAtBottom()) following = true
                }
                onChange()
            }
        })
        list.viewTreeObserver.addOnPreDrawListener(preDraw)
    }

    fun detach() {
        list.viewTreeObserver.removeOnPreDrawListener(preDraw)
    }

    private val count: Int get() = list.adapter?.itemCount ?: 0

    /** The end of the last message is on screen. */
    fun isAtBottom(): Boolean {
        val n = count
        if (n == 0) return true
        val last = lm.findViewByPosition(n - 1) ?: return false
        return lm.getDecoratedBottom(last) <= list.height - list.paddingBottom + list.dp(2)
    }

    /** Lines the last message's end up with the bottom of the list. Returns false to skip this frame. */
    private fun pin(): Boolean {
        if (!following || userScrolling || animating || !enabled()) return true
        val n = count
        if (n == 0 || list.height == 0) return true
        val last = lm.findViewByPosition(n - 1)
        if (last == null) {
            // not laid out yet (far below): bring it in, and line it up on the next pass
            if (pendingJump++ < 3) {
                lm.scrollToPositionWithOffset(n - 1, 0)
                return false
            }
            return true
        }
        pendingJump = 0
        val dy = lm.getDecoratedBottom(last) - (list.height - list.paddingBottom)
        // dy < 0 when the last message ends above the bottom: show more of what is above it,
        // as far as there is any (the list cannot be pulled past its top)
        if (dy != 0) list.scrollBy(0, dy)
        return true
    }

    /** Back to the newest text, and follow it again. */
    fun jumpToBottom(smooth: Boolean) {
        following = true
        userScrolling = false
        val n = count
        if (n == 0) return
        val last = lm.findViewByPosition(n - 1)
        if (smooth && last != null) {
            val dy = lm.getDecoratedBottom(last) - (list.height - list.paddingBottom)
            if (dy > 0 && dy < list.height * 4) {
                animating = true
                list.smoothScrollBy(0, dy)
                onChange()
                return
            }
        }
        list.stopScroll()
        lm.scrollToPositionWithOffset(n - 1, 0)
        list.invalidate()
        onChange()
    }

    /** Starts following without moving (for example, after you send a message). */
    fun follow() {
        following = true
    }

    /**
     * Keeps [anchor] at the same place on screen across a change you made inside a message
     * (folding the thinking or a code block), so the change happens below or above your eye
     * line rather than under it.
     */
    fun keepInPlace(anchor: View, change: () -> Unit) {
        val before = IntArray(2).also { anchor.getLocationInWindow(it) }[1]
        val wasFollowing = following
        following = false
        change()
        list.viewTreeObserver.addOnPreDrawListener(object : ViewTreeObserver.OnPreDrawListener {
            override fun onPreDraw(): Boolean {
                list.viewTreeObserver.removeOnPreDrawListener(this)
                if (anchor.isAttachedToWindow) {
                    val after = IntArray(2).also { anchor.getLocationInWindow(it) }[1]
                    if (after != before) list.scrollBy(0, after - before)
                }
                following = wasFollowing && isAtBottom()
                onChange()
                return true
            }
        })
    }
}
