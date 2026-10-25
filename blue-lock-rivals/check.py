#!/usr/bin/env python3
"""Static check for the Luau scripts here, for machines with no Luau toolchain.

Parses Luau (the subset these scripts use: compound assignment, `continue`, if-expressions,
string interpolation is rejected) and reports:
  - syntax errors, with line numbers
  - globals that aren't Roblox, Luau or executor globals (a typo reads as nil at runtime)
  - writes to globals
  - locals that are never read
  - calls to local functions with a different number of arguments than they take
  - `...` outside a vararg function, `break`/`continue` outside a loop, code after `return`
  - the same key set twice in one table constructor (the later one silently wins)

Usage: python3 check.py AutoDribble.lua [more.lua ...]   (exit status 1 on errors)
"""
import re
import sys

KEYWORDS = {
    "and", "break", "do", "else", "elseif", "end", "false", "for", "function", "if", "in",
    "local", "nil", "not", "or", "repeat", "return", "then", "true", "until", "while",
}

KNOWN_GLOBALS = {
    # Luau
    "assert", "error", "getmetatable", "ipairs", "next", "pairs", "pcall", "print", "rawequal",
    "rawget", "rawlen", "rawset", "select", "setmetatable", "tonumber", "tostring", "type",
    "unpack", "xpcall", "_G", "_VERSION", "bit32", "coroutine", "debug", "math", "os", "string",
    "table", "utf8", "buffer", "vector", "newproxy", "gcinfo",
    # Roblox
    "game", "workspace", "Workspace", "script", "plugin", "shared", "Enum", "Instance", "Vector3",
    "Vector2", "Vector3int16", "Vector2int16", "CFrame", "Color3", "ColorSequence",
    "ColorSequenceKeypoint", "NumberSequence", "NumberSequenceKeypoint", "NumberRange", "UDim",
    "UDim2", "Rect", "Ray", "RaycastParams", "OverlapParams", "Region3", "TweenInfo",
    "BrickColor", "PhysicalProperties", "Random", "DateTime", "Font", "Faces", "Axes", "task",
    "typeof", "tick", "time", "wait", "delay", "spawn", "elapsedTime", "require", "warn",
    "settings", "UserSettings", "PathWaypoint", "SharedTable",
    # executors (sUNC and common extras)
    "getgenv", "getrenv", "getsenv", "gethui", "getconnections", "firesignal", "fireclickdetector",
    "firetouchinterest", "fireproximityprompt", "hookfunction", "hookmetamethod", "newcclosure",
    "checkcaller", "getnamecallmethod", "readfile", "writefile", "appendfile", "isfile",
    "listfiles", "makefolder", "delfile", "isfolder", "setclipboard", "identifyexecutor",
    "getrawmetatable", "setreadonly", "cloneref", "getgc", "getinstances", "getnilinstances",
    "loadstring", "request", "http_request", "queue_on_teleport", "Drawing", "crypt", "replicatesignal",
}


class LuaSyntaxError(Exception):
    def __init__(self, line, msg):
        super().__init__(f"line {line}: {msg}")
        self.line = line


# ---------------------------------------------------------------- lexer

TOKEN_RE = re.compile(r"""
    (?P<ws>[ \t\r]+)
  | (?P<nl>\n)
  | (?P<longcomment>--\[(?P<lceq>=*)\[)
  | (?P<comment>--[^\n]*)
  | (?P<longstring>\[(?P<lseq>=*)\[)
  | (?P<number>0[xX][0-9a-fA-F_]+|0[bB][01_]+|(?:[0-9][0-9_]*\.?[0-9_]*|\.[0-9][0-9_]*)(?:[eE][+-]?[0-9_]+)?)
  | (?P<name>[A-Za-z_][A-Za-z0-9_]*)
  | (?P<string>"|')
  | (?P<backtick>`)
  | (?P<op>\.\.\.|\.\.=|//=|\.\.|==|~=|<=|>=|\+=|-=|\*=|/=|%=|\^=|//|::|->|[-+*/%^\#<>=(){}\[\];:,.?|&])
""", re.VERBOSE)


def lex(src):
    tokens = []  # (kind, value, line)
    i, line, n = 0, 1, len(src)
    while i < n:
        m = TOKEN_RE.match(src, i)
        if not m:
            raise LuaSyntaxError(line, f"unexpected character {src[i]!r}")
        kind = m.lastgroup
        if kind in ("lceq", "lseq"):
            kind = "longcomment" if m.group("longcomment") else "longstring"
        text = m.group(0)
        if kind == "ws":
            i = m.end()
            continue
        if kind == "nl":
            line += 1
            i = m.end()
            continue
        if kind == "comment":
            i = m.end()
            continue
        if kind in ("longcomment", "longstring"):
            eq = m.group("lceq") if kind == "longcomment" else m.group("lseq")
            close = "]" + eq + "]"
            end = src.find(close, m.end())
            if end < 0:
                raise LuaSyntaxError(line, "unfinished long " + ("comment" if kind == "longcomment" else "string"))
            body = src[m.end():end]
            if kind == "longstring":
                tokens.append(("string", body, line))
            line += body.count("\n")
            i = end + len(close)
            continue
        if kind == "string":
            q = text
            j = m.end()
            buf = []
            while True:
                if j >= n or src[j] == "\n":
                    raise LuaSyntaxError(line, "unfinished string")
                c = src[j]
                if c == "\\":
                    if j + 1 < n and src[j + 1] == "\n":
                        line += 1
                    buf.append(src[j:j + 2])
                    j += 2
                    continue
                if c == q:
                    break
                buf.append(c)
                j += 1
            tokens.append(("string", "".join(buf), line))
            i = j + 1
            continue
        if kind == "backtick":
            raise LuaSyntaxError(line, "interpolated strings aren't supported by this checker")
        if kind == "name" and text in KEYWORDS:
            tokens.append(("kw", text, line))
        else:
            tokens.append((kind, text, line))
        i = m.end()
    tokens.append(("eof", "<eof>", line))
    return tokens


# ---------------------------------------------------------------- scopes

class Local:
    def __init__(self, name, line, kind="local"):
        self.name, self.line, self.kind = name, line, kind
        self.reads = 0
        self.sig = None  # (nparams, vararg) when it holds a function literal


class FuncState:
    def __init__(self, parent, vararg):
        self.parent, self.vararg = parent, vararg
        self.scopes = [{}]
        self.loops = 0


# ---------------------------------------------------------------- parser

BINARY = {
    "or": (1, 1), "and": (2, 2),
    "<": (3, 3), ">": (3, 3), "<=": (3, 3), ">=": (3, 3), "~=": (3, 3), "==": (3, 3),
    "..": (5, 4),  # right associative
    "+": (6, 6), "-": (6, 6),
    "*": (7, 7), "/": (7, 7), "//": (7, 7), "%": (7, 7),
    "^": (10, 9),  # right associative, above unary
}
UNARY_PRIORITY = 8
COMPOUND = {"+=", "-=", "*=", "/=", "//=", "%=", "^=", "..="}


class Parser:
    def __init__(self, tokens):
        self.t, self.p = tokens, 0
        self.fs = FuncState(None, True)  # the main chunk is vararg
        self.globals_read, self.globals_written = {}, {}
        self.unused, self.arity, self.duplicates = [], [], []

    # tokens
    def peek(self, k=0):
        return self.t[self.p + k]

    def line(self):
        return self.peek()[2]

    def check(self, kind, value=None):
        tok = self.peek()
        return tok[0] == kind and (value is None or tok[1] == value)

    def op(self, value):
        return self.check("op", value)

    def kw(self, value):
        return self.check("kw", value)

    def next(self):
        tok = self.t[self.p]
        self.p += 1
        return tok

    def expect(self, kind, value=None, what=None):
        if not self.check(kind, value):
            tok = self.peek()
            raise LuaSyntaxError(tok[2], f"expected {what or value or kind}, got {tok[1]!r}")
        return self.next()

    def expect_op(self, value):
        return self.expect("op", value)

    def expect_kw(self, value, opener=None):
        if not self.kw(value):
            tok = self.peek()
            extra = f" (to close {opener[0]!r} at line {opener[1]})" if opener else ""
            raise LuaSyntaxError(tok[2], f"expected {value!r}{extra}, got {tok[1]!r}")
        return self.next()

    def name(self):
        return self.expect("name", what="a name")

    # scopes
    def open_scope(self):
        self.fs.scopes.append({})

    def close_scope(self):
        for loc in self.fs.scopes.pop().values():
            self.finish_local(loc)

    def finish_local(self, loc):
        if loc.reads == 0 and not loc.name.startswith("_") and loc.kind != "param":
            self.unused.append(loc)

    def declare(self, name, line, kind="local"):
        scope = self.fs.scopes[-1]
        if name in scope:
            self.finish_local(scope[name])  # shadowed in the same scope
        loc = Local(name, line, kind)
        scope[name] = loc
        return loc

    def resolve(self, name):
        fs = self.fs
        while fs:
            for scope in reversed(fs.scopes):
                if name in scope:
                    return scope[name]
            fs = fs.parent
        return None

    def read_name(self, name, line):
        loc = self.resolve(name)
        if loc:
            loc.reads += 1
        else:
            self.globals_read.setdefault(name, line)
        return loc

    def write_name(self, name, line):
        loc = self.resolve(name)
        if not loc:
            self.globals_written.setdefault(name, line)
        return loc

    # blocks
    def block_follow(self):
        tok = self.peek()
        return tok[0] == "eof" or (tok[0] == "kw" and tok[1] in ("end", "else", "elseif", "until"))

    def block(self):
        while not self.block_follow():
            if self.kw("return"):
                self.next()
                if not self.block_follow() and not self.op(";"):
                    self.explist()
                if self.op(";"):
                    self.next()
                if not self.block_follow():
                    raise LuaSyntaxError(self.line(), "code after 'return' (it must be the last statement)")
                return
            self.statement()

    def statement(self):
        tok = self.peek()
        line = tok[2]
        if self.op(";"):
            self.next()
        elif self.kw("if"):
            self.next()
            self.expr()
            self.expect_kw("then")
            self.scoped_block()
            while self.kw("elseif"):
                self.next()
                self.expr()
                self.expect_kw("then")
                self.scoped_block()
            if self.kw("else"):
                self.next()
                self.scoped_block()
            self.expect_kw("end", ("if", line))
        elif self.kw("while"):
            self.next()
            self.expr()
            self.expect_kw("do")
            self.loop_block()
            self.expect_kw("end", ("while", line))
        elif self.kw("do"):
            self.next()
            self.scoped_block()
            self.expect_kw("end", ("do", line))
        elif self.kw("for"):
            self.next()
            first = self.name()
            if self.op("="):
                self.next()
                self.expr()
                self.expect_op(",")
                self.expr()
                if self.op(","):
                    self.next()
                    self.expr()
                names = [first]
            else:
                names = [first]
                while self.op(","):
                    self.next()
                    names.append(self.name())
                self.expect_kw("in")
                self.explist()
            self.expect_kw("do")
            self.open_scope()
            for nm in names:
                self.declare(nm[1], nm[2], "param")  # loop variables needn't be read
            self.loop_block()
            self.close_scope()
            self.expect_kw("end", ("for", line))
        elif self.kw("repeat"):
            self.next()
            self.open_scope()
            self.fs.loops += 1
            self.block()
            self.fs.loops -= 1
            self.expect_kw("until", ("repeat", line))
            self.expr()  # sees the block's locals
            self.close_scope()
        elif self.kw("function"):
            self.next()
            nm = self.name()
            is_method = path = False
            while self.op("."):
                self.next()
                self.name()
                path = True
            if self.op(":"):
                self.next()
                self.name()
                is_method = path = True
            # `function a.b()` reads a; `function a()` assigns a
            target = self.read_name(nm[1], nm[2]) if path else self.write_name(nm[1], nm[2])
            sig = self.funcbody(line, is_method)
            if target is not None and not path:
                target.sig = sig
        elif self.kw("local"):
            self.next()
            if self.kw("function"):
                self.next()
                nm = self.name()
                loc = self.declare(nm[1], nm[2])
                loc.sig = self.funcbody(line, False)
            else:
                names = [self.name()]
                self.skip_attrib()
                while self.op(","):
                    self.next()
                    names.append(self.name())
                    self.skip_attrib()
                sigs = []
                if self.op("="):
                    self.next()
                    sigs = self.explist()
                for i, nm in enumerate(names):
                    loc = self.declare(nm[1], nm[2])
                    if i < len(sigs) and isinstance(sigs[i], tuple):
                        loc.sig = sigs[i]
        elif self.kw("break"):
            self.next()
            if self.fs.loops == 0:
                raise LuaSyntaxError(line, "'break' outside a loop")
        elif tok[0] == "name" and tok[1] == "continue" and self.continue_here():
            self.next()
            if self.fs.loops == 0:
                raise LuaSyntaxError(line, "'continue' outside a loop")
        elif tok[0] == "kw":
            raise LuaSyntaxError(line, f"unexpected {tok[1]!r}")
        else:
            self.expr_statement()

    def continue_here(self):
        nxt = self.peek(1)
        # `continue` is only a keyword when it stands alone as a statement
        return not (nxt[0] == "op" and nxt[1] in ("=", "(", ".", ":", "[", ",", "+=", "-=", "{")) and nxt[0] != "string"

    def skip_attrib(self):
        if self.op("<"):
            self.next()
            self.name()
            self.expect_op(">")

    def scoped_block(self):
        self.open_scope()
        self.block()
        self.close_scope()

    def loop_block(self):
        self.fs.loops += 1
        self.scoped_block()
        self.fs.loops -= 1

    def expr_statement(self):
        line = self.line()
        first, kind = self.suffixedexp()
        if self.op("=") or self.op(","):
            targets = [(first, kind)]
            while self.op(","):
                self.next()
                targets.append(self.suffixedexp())
            self.expect_op("=")
            for target, tkind in targets:
                if tkind == "call":
                    raise LuaSyntaxError(line, "can't assign to a function call")
                self.assign_target(target)
            self.explist()
        elif self.peek()[0] == "op" and self.peek()[1] in COMPOUND:
            if kind == "call":
                raise LuaSyntaxError(line, "can't assign to a function call")
            self.next()
            self.assign_target(first)
            self.expr()
        elif kind != "call":
            raise LuaSyntaxError(line, "syntax error: an expression on its own isn't a statement")

    def assign_target(self, target):
        # a bare name being assigned: undo the read the parse counted and record a write
        if target and target[0] == "name":
            loc = self.resolve(target[1])
            if loc:
                loc.reads -= 1
            else:
                if self.globals_read.get(target[1]) == target[2]:
                    del self.globals_read[target[1]]
                self.write_name(target[1], target[2])

    def funcbody(self, line, is_method):
        self.expect_op("(")
        parent = self.fs
        params, vararg = [], False
        if not self.op(")"):
            while True:
                if self.op("..."):
                    self.next()
                    vararg = True
                    break
                params.append(self.name())
                if self.op(":"):
                    raise LuaSyntaxError(self.line(), "type annotations aren't supported by this checker")
                if not self.op(","):
                    break
                self.next()
        self.expect_op(")")
        self.fs = FuncState(parent, vararg)
        if is_method:
            self.declare("self", line, "param")
        for p in params:
            self.declare(p[1], p[2], "param")
        self.block()
        self.expect_kw("end", ("function", line))
        for scope in self.fs.scopes:
            for loc in scope.values():
                self.finish_local(loc)
        self.fs = parent
        return (len(params), vararg)

    # expressions; each returns a descriptor: ("name", n, line), a function signature tuple,
    # "call", "vararg" or None
    def explist(self):
        out = [self.expr()]
        while self.op(","):
            self.next()
            out.append(self.expr())
        return out

    def expr(self, limit=0):
        tok = self.peek()
        if (tok[0] == "kw" and tok[1] == "not") or (tok[0] == "op" and tok[1] in ("-", "#")):
            self.next()
            self.expr(UNARY_PRIORITY)
            desc = None
        else:
            desc = self.simpleexp()
        while True:
            tok = self.peek()
            opname = tok[1] if tok[0] in ("op", "kw") else None
            if opname not in BINARY or BINARY[opname][0] <= limit:
                break
            self.next()
            self.expr(BINARY[opname][1])
            desc = None
        return desc

    def simpleexp(self):
        tok = self.peek()
        if tok[0] in ("number", "string"):
            self.next()
            return None
        if tok[0] == "kw" and tok[1] in ("nil", "true", "false"):
            self.next()
            return None
        if self.op("..."):
            self.next()
            if not self.fs.vararg:
                raise LuaSyntaxError(tok[2], "'...' outside a vararg function")
            return "vararg"
        if self.op("{"):
            self.table()
            return None
        if self.kw("function"):
            self.next()
            return self.funcbody(tok[2], False)
        if self.kw("if"):
            # if-expression
            self.next()
            self.expr()
            self.expect_kw("then")
            self.expr()
            while self.kw("elseif"):
                self.next()
                self.expr()
                self.expect_kw("then")
                self.expr()
            self.expect_kw("else")
            self.expr()
            return None
        desc, kind = self.suffixedexp()
        return "call" if kind == "call" else desc

    def primaryexp(self):
        tok = self.peek()
        if tok[0] == "name":
            self.next()
            self.read_name(tok[1], tok[2])
            return ("name", tok[1], tok[2])
        if self.op("("):
            self.next()
            self.expr()
            self.expect_op(")")
            return None
        raise LuaSyntaxError(tok[2], f"unexpected {tok[1]!r}")

    def suffixedexp(self):
        desc = self.primaryexp()
        kind = "name" if desc else "paren"
        while True:
            tok = self.peek()
            if self.op("."):
                self.next()
                self.name()
                desc, kind = None, "field"
            elif self.op("["):
                self.next()
                self.expr()
                self.expect_op("]")
                desc, kind = None, "index"
            elif self.op(":"):
                self.next()
                self.name()
                self.call_args()
                desc, kind = None, "call"
            elif self.op("(") or self.op("{") or tok[0] == "string":
                if self.op("(") and tok[2] != self.t[self.p - 1][2]:
                    raise LuaSyntaxError(tok[2], "ambiguous syntax: a call's '(' must be on the line of the function")
                nargs, open_ended = self.call_args()
                if desc and desc[0] == "name":
                    loc = self.resolve(desc[1])
                    if loc and loc.sig:
                        nparams, vararg = loc.sig
                        if (nargs > nparams and not vararg) or (nargs < nparams and not open_ended):
                            self.arity.append((tok[2], desc[1], nargs, nparams, open_ended))
                desc, kind = None, "call"
            else:
                return desc, kind

    def call_args(self):
        tok = self.peek()
        if tok[0] == "string":
            self.next()
            return 1, False
        if self.op("{"):
            self.table()
            return 1, False
        self.expect_op("(")
        if self.op(")"):
            self.next()
            return 0, False
        args = self.explist()
        self.expect_op(")")
        return len(args), args[-1] in ("call", "vararg")

    def table(self):
        self.expect_op("{")
        keys = {}
        while not self.op("}"):
            if self.peek()[0] == "name" and self.peek(1)[0] == "op" and self.peek(1)[1] == "=":
                name, line = self.peek()[1], self.peek()[2]
                if name in keys:
                    self.duplicates.append((line, name, keys[name]))
                keys[name] = line
            if self.op("["):
                self.next()
                self.expr()
                self.expect_op("]")
                self.expect_op("=")
                self.expr()
            elif self.peek()[0] == "name" and self.peek(1)[0] == "op" and self.peek(1)[1] == "=":
                self.next()
                self.next()
                self.expr()
            else:
                self.expr()
            if self.op(",") or self.op(";"):
                self.next()
            elif not self.op("}"):
                tok = self.peek()
                raise LuaSyntaxError(tok[2], f"expected ',' or '}}' in a table, got {tok[1]!r}")
        self.next()

    def chunk(self):
        self.block()
        if not self.check("eof"):
            tok = self.peek()
            raise LuaSyntaxError(tok[2], f"unexpected {tok[1]!r}")
        for scope in self.fs.scopes:
            for loc in scope.values():
                self.finish_local(loc)


def check(path):
    src = open(path, encoding="utf-8").read()
    try:
        parser = Parser(lex(src))
        parser.chunk()
    except LuaSyntaxError as e:
        print(f"{path}: SYNTAX ERROR {e}")
        return False
    ok = True
    for name, line in sorted(parser.globals_read.items(), key=lambda kv: kv[1]):
        if name not in KNOWN_GLOBALS:
            print(f"{path}:{line}: ERROR unknown global '{name}' (a typo, or a local used before it's declared)")
            ok = False
    for name, line in sorted(parser.globals_written.items(), key=lambda kv: kv[1]):
        print(f"{path}:{line}: ERROR assigns global '{name}'")
        ok = False
    for line, name, first in parser.duplicates:
        print(f"{path}:{line}: ERROR '{name}' is set twice in one table (first at line {first}); the later one wins")
        ok = False
    for line, name, nargs, nparams, open_ended in parser.arity:
        print(f"{path}:{line}: WARN {name}() takes {nparams} argument(s), called with {nargs}"
              + (" or more" if open_ended else ""))
    for loc in sorted(parser.unused, key=lambda l: l.line):
        print(f"{path}:{loc.line}: note: local '{loc.name}' is never read")
    print(f"{path}: {'ok' if ok else 'FAILED'} ({src.count(chr(10)) + 1} lines)")
    return ok


if __name__ == "__main__":
    results = [check(p) for p in sys.argv[1:]]
    sys.exit(0 if results and all(results) else 1)
