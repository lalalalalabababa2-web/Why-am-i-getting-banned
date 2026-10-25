"""A small Luau interpreter in Python, enough to run the scripts here against a fake Roblox.

Covers what the scripts use: locals and closures, multiple returns, varargs, tables with
metatables (__index), numeric and generic for, while/repeat, break/continue, compound assignment,
if-expressions, method calls, string/table/math libraries, pcall/error, and threads for
task.spawn / task.wait / task.delay (Python threads handing one baton around, so only one runs).

Host objects (the fake Roblox) plug in through three methods: lua_index(key),
lua_newindex(key, value) and lua_type() (the typeof name). Python callables are Lua functions;
a host method gets the object it was called on as its first argument, like Lua's `:` call.
"""
import math
import os
import re
import sys
import threading

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from check import lex, LuaSyntaxError  # noqa: E402


# ---------------------------------------------------------------- values

class LuaError(Exception):
    def __init__(self, value, line=None):
        super().__init__(value)
        self.value, self.line = value, line

    def __str__(self):
        msg = self.value if isinstance(self.value, str) else tostr(self.value)
        return f"line {self.line}: {msg}" if self.line else msg


class LuaTable:
    __slots__ = ("hash", "meta", "__weakref__")

    def __init__(self, items=None):
        self.hash = {}
        self.meta = None
        if items:
            for i, v in enumerate(items, 1):
                if v is not None:
                    self.hash[i] = v

    def get(self, key):
        return self.hash.get(normkey(key))

    def set(self, key, value):
        key = normkey(key)
        if key is None:
            raise LuaError("table index is nil")
        if value is None:
            self.hash.pop(key, None)
        else:
            self.hash[key] = value

    def length(self):
        n = 0
        while (n + 1) in self.hash:
            n += 1
        return n

    def array(self):
        return [self.hash[i] for i in range(1, self.length() + 1)]


def normkey(k):
    if type(k) is float and k.is_integer():
        return int(k)
    return k


class LuaFunction:
    __slots__ = ("params", "vararg", "body", "env", "name", "interp", "chunk")

    def __init__(self, params, vararg, body, env, name, interp, chunk=None):
        self.params, self.vararg, self.body, self.env, self.name, self.interp = params, vararg, body, env, name, interp
        self.chunk = chunk  # which loaded script it came from (checkcaller tells the executor's apart)

    def __call__(self, *args):
        # host code calling a Lua function gets its first result, like a Python call would
        res = self.interp.call(self, list(args))
        return res[0] if res else None


class BreakEx(Exception):
    pass


class ContinueEx(Exception):
    pass


class ReturnEx(Exception):
    def __init__(self, values):
        self.values = values


def truthy(v):
    return v is not None and v is not False


def isnum(v):
    return type(v) in (int, float)


def fmtnum(n):
    if type(n) is int:
        return str(n)
    if n != n:
        return "nan"
    if n in (math.inf, -math.inf):
        return "inf" if n > 0 else "-inf"
    if n.is_integer() and abs(n) < 1e15:
        return str(int(n))
    return "%.14g" % n


def tostr(v):
    if v is None:
        return "nil"
    if v is True:
        return "true"
    if v is False:
        return "false"
    if isnum(v):
        return fmtnum(v)
    if isinstance(v, str):
        return v
    if isinstance(v, LuaTable):
        mt = v.meta
        if mt is not None and mt.get("__tostring") is not None:
            return tostr(INTERP.call1(mt.get("__tostring"), [v]))
        return "table: 0x%08x" % (id(v) & 0xffffffff)
    if isinstance(v, (LuaFunction,)) or callable(v) and not hasattr(v, "lua_index"):
        return "function: 0x%08x" % (id(v) & 0xffffffff)
    if hasattr(v, "lua_tostring"):
        return v.lua_tostring()
    return str(v)


def luatype(v):
    if v is None:
        return "nil"
    if type(v) is bool:
        return "boolean"
    if isnum(v):
        return "number"
    if isinstance(v, str):
        return "string"
    if isinstance(v, LuaTable):
        return "table"
    if isinstance(v, LuaFunction) or (callable(v) and not hasattr(v, "lua_index")):
        return "function"
    if isinstance(v, LThread):
        return "thread"
    return "userdata"


def lua_eq(a, b):
    if a is b:
        return True
    ta, tb = type(a), type(b)
    if ta is bool or tb is bool:
        return False
    if isnum(a) and isnum(b):
        return a == b
    if ta is str and tb is str:
        return a == b
    if isinstance(a, (LuaTable, LuaFunction)) or isinstance(b, (LuaTable, LuaFunction)):
        return False
    if a is None or b is None:
        return False
    if hasattr(a, "lua_eq"):
        return a.lua_eq(b)
    return False


def tonum(v):
    if isnum(v):
        return v
    if isinstance(v, str):
        try:
            s = v.strip()
            return int(s, 16) if s.lower().startswith("0x") else (float(s) if any(c in s for c in ".eEn") else int(s))
        except ValueError:
            return None
    return None


def arith_check(a, b, op):
    if a is None or b is None or type(a) is bool or type(b) is bool or isinstance(a, (str, LuaTable)) or isinstance(b, (str, LuaTable)):
        bad = a if (a is None or type(a) is bool or isinstance(a, (str, LuaTable))) else b
        raise LuaError(f"attempt to perform arithmetic ({op}) on {luatype(bad)}")


# ---------------------------------------------------------------- threads

class LThread:
    """A Lua thread on its own Python thread; resume() hands it the baton until it yields or ends."""

    def __init__(self, sched, fn, args):
        self.sched, self.fn, self.args = sched, fn, args
        self.go = threading.Semaphore(0)
        self.back = threading.Semaphore(0)
        self.done = False
        self.started = False
        self.wake = None
        self.waited_from = 0.0
        # whose thread this is (checkcaller): the script of the function it runs, or else whoever
        # started it
        self.origin = fn.chunk if isinstance(fn, LuaFunction) else getattr(sched.tls, "thread_chunk", None)

    def _run(self):
        self.go.acquire()
        self.sched.tls.current = self
        self.sched.tls.thread_chunk = self.origin
        try:
            self.sched.interp.call(self.fn, self.args)
        except LuaError as e:
            self.sched.report(e)
        except Exception as e:  # interpreter or host bug: report it like a script error
            import traceback
            self.sched.report(LuaError("host error: " + "".join(traceback.format_exception(e))[-1500:]))
        finally:
            self.done = True
            self.back.release()

    def resume(self):
        prev = getattr(self.sched.tls, "current", None)
        if not self.started:
            self.started = True
            threading.Thread(target=self._run, daemon=True).start()
        self.go.release()
        self.back.acquire()
        self.sched.tls.current = prev

    def yield_(self):
        self.back.release()
        self.go.acquire()
        self.sched.tls.current = self


class Scheduler:
    def __init__(self, interp):
        self.interp = interp
        self.now = 0.0
        self.sleeping = []  # (wake, seq, thread, args-for-start or None)
        self.seq = 0
        self.errors = []
        self.tls = threading.local()

    def report(self, err):
        self.errors.append(err)

    def current(self):
        return getattr(self.tls, "current", None)

    def spawn(self, fn, args):
        th = LThread(self, fn, args)
        th.resume()
        return th

    def delay(self, t, fn, args):
        th = LThread(self, fn, args)
        self.seq += 1
        self.sleeping.append((self.now + max(t, 0), self.seq, th))
        return th

    def defer(self, fn, args):
        return self.delay(0, fn, args)

    def wait(self, t):
        th = self.current()
        if th is None:
            raise LuaError("task.wait called outside a thread (the test driver can't yield)")
        start = self.now
        self.seq += 1
        # task.wait() waits at least one frame
        self.sleeping.append((self.now + (t if t and t > 0 else 1e-9), self.seq, th))
        th.yield_()
        return self.now - start

    def run_due(self):
        while True:
            due = [s for s in self.sleeping if s[0] <= self.now + 1e-12]
            if not due:
                return
            due.sort(key=lambda s: (s[0], s[1]))
            first = due[0]
            self.sleeping.remove(first)
            th = first[2]
            if not th.done:
                th.resume()


# ---------------------------------------------------------------- string library

def lua_pattern_to_re(pat):
    out, i, n = [], 0, len(pat)
    classes = {"a": r"A-Za-z", "d": r"0-9", "l": r"a-z", "s": r"\s", "u": r"A-Z", "w": r"A-Za-z0-9",
               "x": r"A-Fa-f0-9", "p": r"!-/:-@\[-`{-~", "c": r"\x00-\x1f"}

    def cls(c, inset=False):
        lo = c.lower()
        if lo in classes:
            body = classes[lo]
            if c.isupper():
                return ("" if inset else "") + "^" + body if not inset else None
            return body if inset else "[" + body + "]"
        return re.escape(c)

    while i < n:
        c = pat[i]
        if c == "%":
            i += 1
            d = pat[i]
            lo = d.lower()
            if lo in classes:
                out.append("[" + ("^" if d.isupper() else "") + classes[lo] + "]")
            elif d == "b" or d == "f":
                raise LuaError("pattern item %" + d + " not supported")
            else:
                out.append(re.escape(d))
            i += 1
        elif c == "[":
            j = i + 1
            buf = "["
            if j < n and pat[j] == "^":
                buf += "^"
                j += 1
            while j < n and pat[j] != "]":
                if pat[j] == "%":
                    d = pat[j + 1]
                    lo = d.lower()
                    buf += classes[lo] if lo in classes and not d.isupper() else re.escape(d)
                    j += 2
                else:
                    buf += "\\" + pat[j] if pat[j] in "\\^" else pat[j]
                    j += 1
            out.append(buf + "]")
            i = j + 1
        elif c == "-":
            out.append("*?")
            i += 1
        elif c in ".^$*+?()":
            out.append(c if c != "$" or i == n - 1 else re.escape(c))
            i += 1
        else:
            out.append(re.escape(c))
            i += 1
    return "".join(out)


def s_find(s, pat, init=1, plain=False):
    s, pat = tostr(s), tostr(pat)
    init = int(init or 1)
    if init < 0:
        init = max(len(s) + init + 1, 1)
    start = init - 1
    if truthy(plain):
        k = s.find(pat, start)
        return [k + 1, k + len(pat)] if k >= 0 else [None]
    m = re.compile(lua_pattern_to_re(pat)).search(s, start)
    if not m:
        return [None]
    return [m.start() + 1, m.end()] + [g for g in m.groups()]


def s_match(s, pat, init=1):
    m = re.compile(lua_pattern_to_re(tostr(pat))).search(tostr(s), int(init or 1) - 1)
    if not m:
        return [None]
    return list(m.groups()) or [m.group(0)]


def s_gsub(s, pat, repl, maxn=None):
    s = tostr(s)
    rx = re.compile(lua_pattern_to_re(tostr(pat)))
    count = [0]

    def sub(m):
        if maxn is not None and count[0] >= maxn:
            return m.group(0)
        count[0] += 1
        if isinstance(repl, str):
            return re.sub(r"%(\d)", lambda mm: m.group(int(mm.group(1))) if mm.group(1) != "0" else m.group(0), repl).replace("%%", "%")
        key = m.group(1) if m.groups() else m.group(0)
        if isinstance(repl, LuaTable):
            v = repl.get(key)
        else:
            v = INTERP.call1(repl, [key])
        return m.group(0) if not truthy(v) else tostr(v)

    return [rx.sub(sub, s), count[0]]


def s_format(fmt, *args):
    fmt = tostr(fmt)
    out, ai, i = [], 0, 0
    spec = re.compile(r"%([-+ #0]*)(\d*)(?:\.(\d+))?([diouxXeEfgGqscaA%])")
    pos = 0
    for m in spec.finditer(fmt):
        out.append(fmt[pos:m.start()])
        pos = m.end()
        flags, width, prec, conv = m.groups()
        if conv == "%":
            out.append("%")
            continue
        if ai >= len(args):
            raise LuaError(f"bad argument #{ai + 2} to 'format' (missing argument)")
        a = args[ai]
        ai += 1
        p = "%" + flags + width + ("." + prec if prec is not None else "")
        if conv in "di":
            n = tonum(a)
            if n is None:
                raise LuaError(f"bad argument #{ai + 1} to 'format' (number expected, got {luatype(a)})")
            out.append((p + "d") % int(n))
        elif conv in "ouxX":
            out.append((p + conv) % int(tonum(a)))
        elif conv in "eEfgG":
            n = tonum(a)
            if n is None:
                raise LuaError(f"bad argument #{ai + 1} to 'format' (number expected, got {luatype(a)})")
            out.append((p + conv) % n)
        elif conv == "s":
            out.append((p + "s") % tostr(a))
        elif conv == "q":
            out.append('"' + tostr(a).replace("\\", "\\\\").replace('"', '\\"') + '"')
        elif conv == "c":
            out.append(chr(int(a)))
        else:
            raise LuaError("format option %" + conv + " not supported")
    out.append(fmt[pos:])
    return "".join(out)


# ---------------------------------------------------------------- parser + compiler

class E:
    """A compiled expression: one(env) gives its first value, many(env) all of them."""
    __slots__ = ("kind", "one", "many", "extra")

    def __init__(self, kind, one, many=None, extra=None):
        self.kind, self.one, self.extra = kind, one, extra
        self.many = many or (lambda env, one=one: [one(env)])


class Env:
    __slots__ = ("vars", "parent")

    def __init__(self, parent):
        self.vars = {}
        self.parent = parent


BINPRI = {
    "or": (1, 1), "and": (2, 2),
    "<": (3, 3), ">": (3, 3), "<=": (3, 3), ">=": (3, 3), "~=": (3, 3), "==": (3, 3),
    "..": (5, 4), "+": (6, 6), "-": (6, 6), "*": (7, 7), "/": (7, 7), "//": (7, 7), "%": (7, 7),
    "^": (10, 9),
}
COMPOUND = {"+=": "+", "-=": "-", "*=": "*", "/=": "/", "//=": "//", "%=": "%", "^=": "^", "..=": ".."}

ESCAPES = {"n": "\n", "t": "\t", "r": "\r", "a": "\a", "b": "\b", "f": "\f", "v": "\v", "\\": "\\",
           '"': '"', "'": "'", "\n": "\n", "0": "\0"}


def unescape(s):
    out, i = [], 0
    while i < len(s):
        c = s[i]
        if c == "\\" and i + 1 < len(s):
            d = s[i + 1]
            if d.isdigit():
                j = i + 1
                while j < len(s) and j < i + 4 and s[j].isdigit():
                    j += 1
                out.append(chr(int(s[i + 1:j])))
                i = j
                continue
            if d == "x":
                out.append(chr(int(s[i + 2:i + 4], 16)))
                i += 4
                continue
            if d == "z":
                i += 2
                while i < len(s) and s[i].isspace():
                    i += 1
                continue
            out.append(ESCAPES.get(d, d))
            i += 2
        else:
            out.append(c)
            i += 1
    return "".join(out)


def parse_number(text):
    t = text.replace("_", "")
    if t.lower().startswith("0x"):
        return int(t, 16)
    if t.lower().startswith("0b"):
        return int(t[2:], 2)
    if any(c in t for c in ".eE"):
        return float(t)
    return int(t)


class Compiler:
    def __init__(self, interp, tokens, chunkname):
        self.I = interp
        self.t, self.p = tokens, 0
        self.chunkname = chunkname

    # ---- tokens
    def peek(self, k=0):
        return self.t[self.p + k]

    def check(self, kind, value=None):
        tok = self.t[self.p]
        return tok[0] == kind and (value is None or tok[1] == value)

    def op(self, v):
        return self.check("op", v)

    def kw(self, v):
        return self.check("kw", v)

    def next(self):
        tok = self.t[self.p]
        self.p += 1
        return tok

    def expect(self, kind, value=None):
        if not self.check(kind, value):
            tok = self.peek()
            raise LuaSyntaxError(tok[2], f"expected {value or kind}, got {tok[1]!r}")
        return self.next()

    # ---- blocks
    def block_follow(self):
        tok = self.peek()
        return tok[0] == "eof" or (tok[0] == "kw" and tok[1] in ("end", "else", "elseif", "until"))

    def block(self):
        stmts = []
        while not self.block_follow():
            if self.kw("return"):
                line = self.next()[2]
                exprs = []
                if not self.block_follow() and not self.op(";"):
                    exprs = self.explist()
                if self.op(";"):
                    self.next()
                many = self.multi(exprs)

                def run_return(env, many=many):
                    raise ReturnEx(many(env))
                stmts.append(self.wrap(line, run_return))
                break
            stmts.append(self.statement())
        return stmts

    @staticmethod
    def run_block(stmts, env):
        for s in stmts:
            s(env)

    def scoped(self, stmts):
        def run(env, stmts=stmts):
            e = Env(env)
            for s in stmts:
                s(e)
        return run

    def wrap(self, line, fn):
        def run(env):
            try:
                fn(env)
            except LuaError as e:
                if e.line is None:
                    e.line = line
                raise
            except (BreakEx, ContinueEx, ReturnEx):
                raise
            except RecursionError:
                raise LuaError("stack overflow", line)
            except Exception as e:
                import traceback
                tb = traceback.format_exc()
                raise LuaError(f"{type(e).__name__}: {e}\n{tb[-1200:]}", line)
        return run

    def statement(self):
        tok = self.peek()
        line = tok[2]
        I = self.I
        if self.op(";"):
            self.next()
            return lambda env: None
        if self.kw("if"):
            self.next()
            conds, blocks = [], []
            conds.append(self.expr().one)
            self.expect("kw", "then")
            blocks.append(self.scoped(self.block()))
            while self.kw("elseif"):
                self.next()
                conds.append(self.expr().one)
                self.expect("kw", "then")
                blocks.append(self.scoped(self.block()))
            other = None
            if self.kw("else"):
                self.next()
                other = self.scoped(self.block())
            self.expect("kw", "end")
            pairs_ = list(zip(conds, blocks))

            def run_if(env):
                for c, b in pairs_:
                    if truthy(c(env)):
                        b(env)
                        return
                if other:
                    other(env)
            return self.wrap(line, run_if)
        if self.kw("while"):
            self.next()
            cond = self.expr().one
            self.expect("kw", "do")
            body = self.block()
            self.expect("kw", "end")

            def run_while(env):
                while truthy(cond(env)):
                    e = Env(env)
                    try:
                        for s in body:
                            s(e)
                    except BreakEx:
                        break
                    except ContinueEx:
                        continue
            return self.wrap(line, run_while)
        if self.kw("do"):
            self.next()
            body = self.scoped(self.block())
            self.expect("kw", "end")
            return body
        if self.kw("repeat"):
            self.next()
            body = self.block()
            self.expect("kw", "until")
            cond = self.expr().one

            def run_repeat(env):
                while True:
                    e = Env(env)
                    try:
                        for s in body:
                            s(e)
                    except BreakEx:
                        break
                    except ContinueEx:
                        pass
                    if truthy(cond(e)):
                        break
            return self.wrap(line, run_repeat)
        if self.kw("for"):
            self.next()
            first = self.expect("name")[1]
            if self.op("="):
                self.next()
                a = self.expr().one
                self.expect("op", ",")
                b = self.expr().one
                c = None
                if self.op(","):
                    self.next()
                    c = self.expr().one
                self.expect("kw", "do")
                body = self.block()
                self.expect("kw", "end")

                def run_numfor(env):
                    start, stop = a(env), b(env)
                    step = c(env) if c else 1
                    if not (isnum(start) and isnum(stop) and isnum(step)):
                        raise LuaError("'for' initial value must be a number")
                    i = start
                    while (step > 0 and i <= stop) or (step < 0 and i >= stop):
                        e = Env(env)
                        e.vars[first] = i
                        try:
                            for s in body:
                                s(e)
                        except BreakEx:
                            break
                        except ContinueEx:
                            pass
                        i += step
                return self.wrap(line, run_numfor)
            names = [first]
            while self.op(","):
                self.next()
                names.append(self.expect("name")[1])
            self.expect("kw", "in")
            exprs = self.explist()
            many = self.multi(exprs)
            self.expect("kw", "do")
            body = self.block()
            self.expect("kw", "end")

            def run_genfor(env):
                vals = many(env) + [None, None, None]
                f, st, ctl = vals[0], vals[1], vals[2]
                while True:
                    res = I.call(f, [st, ctl])
                    if not res or res[0] is None:
                        break
                    ctl = res[0]
                    e = Env(env)
                    for k, nm in enumerate(names):
                        e.vars[nm] = res[k] if k < len(res) else None
                    try:
                        for s in body:
                            s(e)
                    except BreakEx:
                        break
                    except ContinueEx:
                        pass
            return self.wrap(line, run_genfor)
        if self.kw("function"):
            self.next()
            nm = self.expect("name")[1]
            keys, method = [], None
            while self.op("."):
                self.next()
                keys.append(self.expect("name")[1])
            if self.op(":"):
                self.next()
                method = self.expect("name")[1]
            fn = self.funcbody(method is not None, nm)
            if not keys and method is None:
                return self.wrap(line, lambda env: I.assign(env, nm, fn(env)))

            def run_fieldfn(env):
                obj = I.lookup(env, nm)
                for k in keys[:-1] if method is None else keys:
                    obj = I.index(obj, k)
                I.setindex(obj, method if method is not None else keys[-1], fn(env))
            return self.wrap(line, run_fieldfn)
        if self.kw("local"):
            self.next()
            if self.kw("function"):
                self.next()
                nm = self.expect("name")[1]
                fn = self.funcbody(False, nm)

                def run_localfn(env):
                    env.vars[nm] = None
                    env.vars[nm] = fn(env)
                return self.wrap(line, run_localfn)
            names = [self.expect("name")[1]]
            self.attrib()
            while self.op(","):
                self.next()
                names.append(self.expect("name")[1])
                self.attrib()
            exprs = []
            if self.op("="):
                self.next()
                exprs = self.explist()
            if len(names) == 1 and len(exprs) == 1:
                one = exprs[0].one
                nm0 = names[0]

                def run_local1(env):
                    env.vars[nm0] = one(env)
                return self.wrap(line, run_local1)
            many = self.multi(exprs)

            def run_local(env):
                vals = many(env)
                for k, nm in enumerate(names):
                    env.vars[nm] = vals[k] if k < len(vals) else None
            return self.wrap(line, run_local)
        if self.kw("break"):
            self.next()

            def run_break(env):
                raise BreakEx()
            return run_break
        if tok[0] == "name" and tok[1] == "continue" and self.continue_here():
            self.next()

            def run_continue(env):
                raise ContinueEx()
            return run_continue
        return self.wrap(line, self.expr_statement())

    def continue_here(self):
        nxt = self.peek(1)
        return not (nxt[0] == "op" and nxt[1] in ("=", "(", ".", ":", "[", ",", "+=", "-=", "{")) and nxt[0] != "string"

    def attrib(self):
        if self.op("<"):
            self.next()
            self.expect("name")
            self.expect("op", ">")

    def expr_statement(self):
        I = self.I
        first = self.suffixedexp()
        if self.op("=") or self.op(","):
            targets = [first]
            while self.op(","):
                self.next()
                targets.append(self.suffixedexp())
            self.expect("op", "=")
            exprs = self.explist()
            setters = [self.setter(t) for t in targets]
            if len(targets) == 1 and len(exprs) == 1:
                one, st = exprs[0].one, setters[0]
                return lambda env: st(env, one(env))
            many = self.multi(exprs)

            def run_assign(env):
                # Lua evaluates all right-hand values before assigning
                vals = many(env)
                for k, st in enumerate(setters):
                    st(env, vals[k] if k < len(vals) else None)
            return run_assign
        tok = self.peek()
        if tok[0] == "op" and tok[1] in COMPOUND:
            self.next()
            opname = COMPOUND[tok[1]]
            rhs = self.expr().one
            if first.kind == "name":
                nm = first.extra

                def run_compound_name(env):
                    I.assign(env, nm, I.binary(opname, I.lookup(env, nm), rhs(env)))
                return run_compound_name
            if first.kind == "index":
                objf, keyf = first.extra

                def run_compound_index(env):
                    obj, key = objf(env), keyf(env)
                    I.setindex(obj, key, I.binary(opname, I.index(obj, key), rhs(env)))
                return run_compound_index
            raise LuaSyntaxError(tok[2], "can't assign to that")
        if first.kind != "call":
            raise LuaSyntaxError(tok[2], "syntax error: an expression on its own isn't a statement")
        many = first.many
        return lambda env: many(env)

    def setter(self, e):
        I = self.I
        if e.kind == "name":
            nm = e.extra
            return lambda env, v: I.assign(env, nm, v)
        if e.kind == "index":
            objf, keyf = e.extra
            return lambda env, v: I.setindex(objf(env), keyf(env), v)
        raise LuaSyntaxError(self.peek()[2], "can't assign to that")

    def funcbody(self, is_method, name):
        I = self.I
        self.expect("op", "(")
        params, vararg = [], False
        if is_method:
            params.append("self")
        if not self.op(")"):
            while True:
                if self.op("..."):
                    self.next()
                    vararg = True
                    break
                params.append(self.expect("name")[1])
                if not self.op(","):
                    break
                self.next()
        self.expect("op", ")")
        body = self.block()
        self.expect("kw", "end")

        chunk = self.chunkname

        def make(env):
            return LuaFunction(params, vararg, body, env, name, I, chunk)
        return make

    # ---- expressions
    def explist(self):
        out = [self.expr()]
        while self.op(","):
            self.next()
            out.append(self.expr())
        return out

    def multi(self, exprs):
        if not exprs:
            return lambda env: []
        ones = [e.one for e in exprs[:-1]]
        last = exprs[-1]
        if last.kind in ("call", "vararg"):
            lastm = last.many
            if not ones:
                return lastm
            return lambda env: [f(env) for f in ones] + lastm(env)
        allones = ones + [last.one]
        if len(allones) == 1:
            o = allones[0]
            return lambda env: [o(env)]
        return lambda env: [f(env) for f in allones]

    def expr(self, limit=0):
        I = self.I
        tok = self.peek()
        if (tok[0] == "kw" and tok[1] == "not") or (tok[0] == "op" and tok[1] in ("-", "#")):
            self.next()
            operand = self.expr(8).one
            if tok[1] == "not":
                left = E("other", lambda env: not truthy(operand(env)))
            elif tok[1] == "-":
                left = E("other", lambda env: I.neg(operand(env)))
            else:
                left = E("other", lambda env: I.length(operand(env)))
        else:
            left = self.simpleexp()
        while True:
            tok = self.peek()
            opname = tok[1] if tok[0] in ("op", "kw") else None
            if opname not in BINPRI or BINPRI[opname][0] <= limit:
                break
            self.next()
            right = self.expr(BINPRI[opname][1])
            left = self.binop(opname, left, right)
        return left

    def binop(self, opname, left, right):
        I = self.I
        l, r = left.one, right.one
        if opname == "and":
            return E("other", lambda env: (lambda a: r(env) if truthy(a) else a)(l(env)))
        if opname == "or":
            return E("other", lambda env: (lambda a: a if truthy(a) else r(env))(l(env)))
        if opname == "==":
            return E("other", lambda env: lua_eq(l(env), r(env)))
        if opname == "~=":
            return E("other", lambda env: not lua_eq(l(env), r(env)))
        if opname in ("<", ">", "<=", ">="):
            return E("other", lambda env: I.compare(opname, l(env), r(env)))
        if opname == "..":
            return E("other", lambda env: I.concat(l(env), r(env)))
        return E("other", lambda env: I.arith(opname, l(env), r(env)))

    def simpleexp(self):
        I = self.I
        tok = self.peek()
        if tok[0] == "number":
            self.next()
            v = parse_number(tok[1])
            return E("other", lambda env: v)
        if tok[0] == "string":
            self.next()
            v = unescape(tok[1])
            return E("other", lambda env: v)
        if tok[0] == "kw" and tok[1] in ("nil", "true", "false"):
            self.next()
            v = {"nil": None, "true": True, "false": False}[tok[1]]
            return E("other", lambda env: v)
        if self.op("..."):
            self.next()

            def va_many(env):
                return list(I.lookup_raw(env, "...") or [])

            def va_one(env):
                v = I.lookup_raw(env, "...") or []
                return v[0] if v else None
            return E("vararg", va_one, va_many)
        if self.op("{"):
            return self.table()
        if self.kw("function"):
            line = self.next()[2]
            make = self.funcbody(False, f"<anonymous:{line}>")
            return E("other", make)
        if self.kw("if"):
            self.next()
            conds, vals = [self.expr().one], []
            self.expect("kw", "then")
            vals.append(self.expr().one)
            while self.kw("elseif"):
                self.next()
                conds.append(self.expr().one)
                self.expect("kw", "then")
                vals.append(self.expr().one)
            self.expect("kw", "else")
            other = self.expr().one

            def run_ifexpr(env):
                for c, v in zip(conds, vals):
                    if truthy(c(env)):
                        return v(env)
                return other(env)
            return E("other", run_ifexpr)
        return self.suffixedexp()

    def primaryexp(self):
        I = self.I
        tok = self.peek()
        if tok[0] == "name":
            self.next()
            nm = tok[1]
            return E("name", lambda env: I.lookup(env, nm), extra=nm)
        if self.op("("):
            self.next()
            inner = self.expr().one
            self.expect("op", ")")
            return E("paren", inner)
        raise LuaSyntaxError(tok[2], f"unexpected {tok[1]!r}")

    def suffixedexp(self):
        I = self.I
        e = self.primaryexp()
        while True:
            tok = self.peek()
            if self.op("."):
                self.next()
                key = self.expect("name")[1]
                objf = e.one
                e = E("index", lambda env, objf=objf, key=key: I.index(objf(env), key),
                      extra=(objf, lambda env, key=key: key))
            elif self.op("["):
                self.next()
                keyf = self.expr().one
                self.expect("op", "]")
                objf = e.one
                e = E("index", lambda env, objf=objf, keyf=keyf: I.index(objf(env), keyf(env)), extra=(objf, keyf))
            elif self.op(":"):
                self.next()
                name = self.expect("name")[1]
                args = self.callargs()
                objf = e.one

                def many_m(env, objf=objf, name=name, args=args):
                    obj = objf(env)
                    if I.namecall_hook is not None and hasattr(obj, "lua_index"):
                        # an executor's __namecall hook sees every method call on an instance
                        I.sched.tls.namecall = name
                        return I.call(I.namecall_hook, [obj] + args(env))
                    f = I.index(obj, name)
                    if f is None:
                        raise LuaError(f"attempt to call missing method '{name}' of {luatype(obj)}")
                    return I.call(f, [obj] + args(env))
                e = E("call", lambda env, m=many_m: (lambda r: r[0] if r else None)(m(env)), many_m)
            elif self.op("(") or self.op("{") or tok[0] == "string":
                args = self.callargs()
                fexp = e

                def many_c(env, fexp=fexp, args=args):
                    f = fexp.one(env)
                    if f is None:
                        what = f" '{fexp.extra}'" if fexp.kind == "name" else ""
                        raise LuaError(f"attempt to call a nil value{what}")
                    return I.call(f, args(env))
                e = E("call", lambda env, m=many_c: (lambda r: r[0] if r else None)(m(env)), many_c)
            else:
                return e

    def callargs(self):
        tok = self.peek()
        if tok[0] == "string":
            self.next()
            v = unescape(tok[1])
            return lambda env: [v]
        if self.op("{"):
            t = self.table().one
            return lambda env: [t(env)]
        self.expect("op", "(")
        if self.op(")"):
            self.next()
            return lambda env: []
        exprs = self.explist()
        self.expect("op", ")")
        return self.multi(exprs)

    def table(self):
        I = self.I
        self.expect("op", "{")
        items = []  # ("pos", E) | ("key", keyf, valf)
        while not self.op("}"):
            if self.op("["):
                self.next()
                k = self.expr().one
                self.expect("op", "]")
                self.expect("op", "=")
                items.append(("key", k, self.expr().one))
            elif self.peek()[0] == "name" and self.peek(1)[0] == "op" and self.peek(1)[1] == "=":
                k = self.next()[1]
                self.next()
                items.append(("key", (lambda env, k=k: k), self.expr().one))
            else:
                items.append(("pos", self.expr()))
            if self.op(",") or self.op(";"):
                self.next()
        self.next()

        def build(env):
            t = LuaTable()
            n = 0
            for idx, it in enumerate(items):
                if it[0] == "key":
                    t.set(it[1](env), it[2](env))
                else:
                    e = it[1]
                    if idx == len(items) - 1 and e.kind in ("call", "vararg"):
                        for v in e.many(env):
                            n += 1
                            t.set(n, v)
                    else:
                        n += 1
                        t.set(n, e.one(env))
            return t
        return E("other", build)


# ---------------------------------------------------------------- interpreter

class Interp:
    def __init__(self):
        global INTERP
        INTERP = self
        self.G = LuaTable()
        self.sched = Scheduler(self)
        self.string_meta = LuaTable()
        self.namecall_hook = None
        self.install_stdlib()

    # variables
    def lookup(self, env, name):
        e = env
        while e is not None:
            v = e.vars
            if name in v:
                return v[name]
            e = e.parent
        return self.G.hash.get(name)

    def lookup_raw(self, env, name):
        e = env
        while e is not None:
            if name in e.vars:
                return e.vars[name]
            e = e.parent
        return None

    def assign(self, env, name, value):
        e = env
        while e is not None:
            if name in e.vars:
                e.vars[name] = value
                return
            e = e.parent
        self.G.set(name, value)

    # operations
    def index(self, obj, key):
        if isinstance(obj, LuaTable):
            v = obj.hash.get(normkey(key))
            if v is not None or obj.meta is None:
                return v
            h = obj.meta.hash.get("__index")
            if h is None:
                return None
            if isinstance(h, LuaTable):
                return self.index(h, key)
            return self.call1(h, [obj, key])
        if isinstance(obj, str):
            return self.string_lib.get(key)
        if obj is None:
            raise LuaError(f"attempt to index nil with '{tostr(key)}'")
        if hasattr(obj, "lua_index"):
            return obj.lua_index(key)
        raise LuaError(f"attempt to index {luatype(obj)} with '{tostr(key)}'")

    def setindex(self, obj, key, value):
        if isinstance(obj, LuaTable):
            if obj.meta is not None and obj.hash.get(normkey(key)) is None:
                h = obj.meta.hash.get("__newindex")
                if h is not None:
                    if isinstance(h, LuaTable):
                        return self.setindex(h, key, value)
                    self.call(h, [obj, key, value])
                    return
            obj.set(key, value)
            return
        if obj is None:
            raise LuaError(f"attempt to index nil with '{tostr(key)}'")
        if hasattr(obj, "lua_newindex"):
            obj.lua_newindex(key, value)
            return
        raise LuaError(f"attempt to index {luatype(obj)} with '{tostr(key)}'")

    def call(self, f, args):
        if isinstance(f, LuaFunction):
            tls = self.sched.tls
            prev = getattr(tls, "chunk", None)
            tls.chunk = f.chunk
            try:
                return self.call_lua(f, args)
            finally:
                tls.chunk = prev
        return self.call_other(f, args)

    def call_lua(self, f, args):
        if True:
            env = Env(f.env)
            v = env.vars
            np = len(f.params)
            for k in range(np):
                v[f.params[k]] = args[k] if k < len(args) else None
            if f.vararg:
                v["..."] = list(args[np:])
            try:
                for s in f.body:
                    s(env)
            except ReturnEx as r:
                return r.values
            except (BreakEx, ContinueEx):
                raise LuaError("break/continue outside a loop")
            return []

    def call_other(self, f, args):
        if isinstance(f, LuaTable) and f.meta is not None and f.meta.get("__call") is not None:
            return self.call(f.meta.get("__call"), [f] + list(args))
        if callable(f) and not hasattr(f, "lua_index"):
            r = f(*args)
            if r is None:
                return []
            if isinstance(r, tuple):
                return list(r)
            if isinstance(r, list) and getattr(r, "multi", False):
                return list(r)
            return [r]
        raise LuaError(f"attempt to call a {luatype(f)} value")

    def call1(self, f, args):
        r = self.call(f, args)
        return r[0] if r else None

    def arith(self, op, a, b):
        if isnum(a) and isnum(b):
            if op == "+":
                return a + b
            if op == "-":
                return a - b
            if op == "*":
                return a * b
            if op == "/":
                if b == 0:
                    return math.inf if a > 0 else (-math.inf if a < 0 else math.nan)
                return a / b
            if op == "%":
                if b == 0:
                    return math.nan
                return a - math.floor(a / b) * b
            if op == "//":
                if b == 0:
                    return math.inf if a > 0 else (-math.inf if a < 0 else math.nan)
                return float(math.floor(a / b))
            if op == "^":
                return float(a) ** b
        if isinstance(a, str) or isinstance(b, str):
            na, nb = tonum(a), tonum(b)
            if na is not None and nb is not None:
                return self.arith(op, na, nb)
        arith_check(a, b, op)
        try:
            if op == "+":
                return a + b
            if op == "-":
                return a - b
            if op == "*":
                return a * b
            if op == "/":
                return a / b
            if op == "//":
                return a // b
        except TypeError:
            pass
        raise LuaError(f"attempt to perform arithmetic ({op}) on {luatype(a)} and {luatype(b)}")

    def binary(self, op, a, b):
        return self.concat(a, b) if op == ".." else self.arith(op, a, b)

    def neg(self, a):
        if isnum(a):
            return -a
        if a is None or isinstance(a, (str, bool, LuaTable)):
            raise LuaError(f"attempt to perform arithmetic (unm) on {luatype(a)}")
        return -a

    def length(self, a):
        if isinstance(a, str):
            return len(a.encode("utf-8"))
        if isinstance(a, LuaTable):
            return a.length()
        raise LuaError(f"attempt to get length of a {luatype(a)} value")

    def compare(self, op, a, b):
        if not ((isnum(a) and isnum(b)) or (isinstance(a, str) and isinstance(b, str))):
            raise LuaError(f"attempt to compare {luatype(a)} {op} {luatype(b)}")
        if op == "<":
            return a < b
        if op == ">":
            return a > b
        if op == "<=":
            return a <= b
        return a >= b

    def concat(self, a, b):
        if (isinstance(a, str) or isnum(a)) and (isinstance(b, str) or isnum(b)):
            return tostr(a) + tostr(b)
        bad = b if (isinstance(a, str) or isnum(a)) else a
        raise LuaError(f"attempt to concatenate {luatype(bad)} with string")

    # loading
    def load(self, src, chunkname="chunk"):
        comp = Compiler(self, lex(src), chunkname)
        body = comp.block()
        if not comp.check("eof"):
            tok = comp.peek()
            raise LuaSyntaxError(tok[2], f"unexpected {tok[1]!r}")
        return LuaFunction([], True, body, None, chunkname, self, chunkname)

    # stdlib
    def install_stdlib(self):
        I, G = self, self.G

        def multi(*vals):
            r = list(vals)
            r = Multi(r)
            return r

        def ipairs(t):
            def it(t_, i):
                i = int(i) + 1
                v = I.index(t_, i)
                if v is None:
                    return None
                return Multi([i, v])
            return Multi([it, t, 0])

        def lnext(t, k=None):
            keys = list(t.hash.keys())
            if k is None:
                idx = 0
            else:
                try:
                    idx = keys.index(normkey(k)) + 1
                except ValueError:
                    raise LuaError("invalid key to 'next'")
            if idx >= len(keys):
                return None
            key = keys[idx]
            return Multi([key, t.hash[key]])

        def pairs(t):
            if not isinstance(t, LuaTable):
                raise LuaError(f"bad argument #1 to 'pairs' (table expected, got {luatype(t)})")
            snapshot = list(t.hash.items())
            state = {"i": 0}

            def it(_t, _k):
                while state["i"] < len(snapshot):
                    k, _ = snapshot[state["i"]]
                    state["i"] += 1
                    v = t.hash.get(k)
                    if v is not None:
                        return Multi([k, v])
                return None
            return Multi([it, t, None])

        def pcall(f, *args):
            try:
                return Multi([True] + I.call(f, list(args)))
            except LuaError as e:
                return Multi([False, e.value if not e.line or not isinstance(e.value, str) else f"line {e.line}: {e.value}"])
            except (ReturnEx, BreakEx, ContinueEx):
                raise
            except Exception as e:
                return Multi([False, f"{type(e).__name__}: {e}"])

        def error(msg=None, level=1):
            raise LuaError(msg)

        def lassert(v, msg="assertion failed!", *rest):
            if not truthy(v):
                raise LuaError(msg)
            return Multi([v, msg] + list(rest))

        def select(n, *args):
            if n == "#":
                return len(args)
            n = int(n)
            return Multi(list(args[n - 1:]) if n > 0 else list(args[n:]))

        def setmetatable(t, mt):
            t.meta = mt
            return t

        def getmetatable(t):
            return t.meta if isinstance(t, LuaTable) else None

        def rawget(t, k):
            return t.hash.get(normkey(k))

        def rawset(t, k, v):
            t.set(k, v)
            return t

        def unpack(t, i=1, j=None):
            j = t.length() if j is None else int(j)
            return Multi([t.get(k) for k in range(int(i), j + 1)])

        def typeof(v):
            if hasattr(v, "lua_type"):
                return v.lua_type()
            return luatype(v)

        for name, fn in {
            "print": lambda *a: print("[lua]", *[tostr(x) for x in a]),
            "warn": lambda *a: print("[lua warn]", *[tostr(x) for x in a]),
            "ipairs": ipairs, "pairs": pairs, "next": lnext, "pcall": pcall, "error": error,
            "assert": lassert, "select": select, "setmetatable": setmetatable,
            "getmetatable": getmetatable, "rawget": rawget, "rawset": rawset, "unpack": unpack,
            "tostring": tostr, "tonumber": lambda v, base=None: tonum(v) if base is None else int(tostr(v), int(base)),
            "type": luatype, "typeof": typeof, "rawequal": lambda a, b: a is b,
        }.items():
            G.set(name, fn)
        G.set("_G", G)

        # string
        sl = LuaTable()
        for name, fn in {
            "lower": lambda s: tostr(s).lower(), "upper": lambda s: tostr(s).upper(),
            "len": lambda s: len(tostr(s)), "rep": lambda s, n, sep="": tostr(sep).join([tostr(s)] * int(n)),
            "sub": lambda s, i=1, j=-1: str_sub(tostr(s), int(i), int(j)),
            "find": lambda s, p, i=1, plain=None: Multi(s_find(s, p, i, plain)),
            "match": lambda s, p, i=1: Multi(s_match(s, p, i)),
            "gsub": lambda s, p, r, n=None: Multi(s_gsub(s, p, r, n)),
            "format": s_format, "byte": lambda s, i=1: ord(tostr(s)[int(i) - 1]),
            "char": lambda *cs: "".join(chr(int(c)) for c in cs),
            "reverse": lambda s: tostr(s)[::-1],
            "split": lambda s, sep=",": LuaTable(tostr(s).split(tostr(sep))),
        }.items():
            sl.set(name, fn)
        self.string_lib = sl
        G.set("string", sl)

        # table
        def t_insert(t, a, b=None, *rest):
            if b is None and not rest:
                t.set(t.length() + 1, a)
                return
            pos, v = int(a), b
            n = t.length()
            for k in range(n, pos - 1, -1):
                t.set(k + 1, t.get(k))
            t.set(pos, v)

        def t_remove(t, pos=None):
            n = t.length()
            if n == 0:
                return None
            pos = n if pos is None else int(pos)
            v = t.get(pos)
            for k in range(pos, n):
                t.set(k, t.get(k + 1))
            t.set(n, None)
            return v

        def t_concat(t, sep="", i=1, j=None):
            j = t.length() if j is None else int(j)
            parts = []
            for k in range(int(i), j + 1):
                v = t.get(k)
                if not (isinstance(v, str) or isnum(v)):
                    raise LuaError(f"invalid value (at index {k}) in table for 'concat'")
                parts.append(tostr(v))
            return tostr(sep).join(parts)

        def t_find(t, v, init=1):
            for k in range(int(init), t.length() + 1):
                if lua_eq(t.get(k), v):
                    return k
            return None

        def t_sort(t, comp=None):
            import functools
            arr = t.array()
            if comp is None:
                arr.sort(key=functools.cmp_to_key(lambda a, b: -1 if I.compare("<", a, b) else (1 if I.compare("<", b, a) else 0)))
            else:
                arr.sort(key=functools.cmp_to_key(lambda a, b: -1 if truthy(I.call1(comp, [a, b])) else (1 if truthy(I.call1(comp, [b, a])) else 0)))
            for k, v in enumerate(arr, 1):
                t.set(k, v)

        tl = LuaTable()
        for name, fn in {
            "insert": t_insert, "remove": t_remove, "concat": t_concat, "find": t_find,
            "clear": lambda t: t.hash.clear(), "sort": t_sort, "unpack": unpack,
            "pack": lambda *a: (lambda t: (t.set("n", len(a)), t)[1])(LuaTable(list(a))),
        }.items():
            tl.set(name, fn)
        G.set("table", tl)

        # math
        ml = LuaTable()

        def clamp(x, lo, hi):
            if lo > hi:
                raise LuaError("max must be greater than or equal to min")
            return min(max(x, lo), hi)

        def m_floor(x):
            return math.floor(x) if math.isfinite(x) else x

        for name, fn in {
            "floor": m_floor, "ceil": lambda x: math.ceil(x) if math.isfinite(x) else x,
            "abs": abs, "sqrt": lambda x: math.sqrt(x) if x >= 0 else math.nan,
            "max": lambda *a: max(a), "min": lambda *a: min(a), "clamp": clamp,
            "sin": math.sin, "cos": math.cos, "tan": math.tan, "asin": math.asin, "acos": math.acos, "atan2": math.atan2, "atan": math.atan,
            "exp": math.exp, "log": lambda x, b=None: math.log(x) if b is None else math.log(x, b),
            "sign": lambda x: (x > 0) - (x < 0), "random": lambda a=None, b=None: 0.5 if a is None else int(a),
            "fmod": math.fmod, "rad": math.radians, "deg": math.degrees,
            "round": lambda x: math.floor(x + 0.5),
        }.items():
            ml.set(name, fn)
        ml.set("huge", math.inf)
        ml.set("pi", math.pi)
        G.set("math", ml)

        # os / task
        sched = self.sched
        G.set("os", LuaTable())
        G.get("os").set("clock", lambda: sched.now)
        G.get("os").set("time", lambda: int(sched.now))
        tk = LuaTable()
        tk.set("spawn", lambda f, *a: sched.spawn(f, list(a)))
        tk.set("defer", lambda f, *a: sched.defer(f, list(a)))
        tk.set("delay", lambda t, f, *a: sched.delay(t or 0, f, list(a)))
        tk.set("wait", lambda t=None: sched.wait(t))
        G.set("task", tk)
        G.set("tick", lambda: sched.now)
        G.set("time", lambda: sched.now)


class Multi(list):
    """A host function's multiple return values."""
    multi = True


def str_sub(s, i, j):
    n = len(s)
    if i < 0:
        i = max(n + i + 1, 1)
    elif i == 0:
        i = 1
    if j < 0:
        j = n + j + 1
    elif j > n:
        j = n
    return s[i - 1:j] if i <= j else ""


INTERP = None
