"""A fake Roblox for the Luau interpreter in luau.py: datatypes, instances, services, signals,
an executor's extras (getconnections, firesignal, gethui, files) and VirtualInputManager.

Reading a property that doesn't exist raises like Roblox does ("X is not a valid member of Y"),
and so does writing one, so a typo in the script fails the test instead of reading nil.
"""
import json
import math

from luau import LuaError, LuaTable, Multi, luatype, tostr, truthy

SCREEN_W, SCREEN_H, INSET = 1560, 720, 36


# ---------------------------------------------------------------- datatypes

class Host:
    TYPE = "userdata"
    PROPS = ()

    def lua_type(self):
        return self.TYPE

    def lua_tostring(self):
        return self.TYPE

    def lua_index(self, key):
        if key in self.PROPS:
            return getattr(self, key.lower() if hasattr(self, key.lower()) else key)
        m = getattr(self, "m_" + str(key), None)
        if m is not None:
            return lambda _self, *a: m(*a)
        raise LuaError(f"{tostr(key)} is not a valid member of {self.TYPE}")

    def lua_newindex(self, key, value):
        raise LuaError(f"{tostr(key)} cannot be assigned to")

    def lua_eq(self, other):
        return self is other


def num(v, what="number"):
    if type(v) in (int, float):
        return v
    raise LuaError(f"invalid argument ({what} expected, got {luatype(v)})")


class Vector3(Host):
    TYPE = "Vector3"
    __slots__ = ("x", "y", "z")

    def __init__(self, x=0.0, y=0.0, z=0.0):
        self.x, self.y, self.z = float(x), float(y), float(z)

    def lua_index(self, key):
        if key == "X":
            return self.x
        if key == "Y":
            return self.y
        if key == "Z":
            return self.z
        if key == "Magnitude":
            return math.sqrt(self.x * self.x + self.y * self.y + self.z * self.z)
        if key == "Unit":
            m = self.lua_index("Magnitude")
            return Vector3(self.x / m, self.y / m, self.z / m) if m > 0 else Vector3(math.nan, math.nan, math.nan)
        if key == "Dot":
            return lambda a, b: a.x * b.x + a.y * b.y + a.z * b.z
        if key == "Cross":
            return lambda a, b: Vector3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x)
        if key == "Lerp":
            return lambda a, b, t: a + (b - a) * t
        raise LuaError(f"{tostr(key)} is not a valid member of Vector3")

    def __add__(self, o):
        if not isinstance(o, Vector3):
            raise LuaError(f"attempt to perform arithmetic (add) on Vector3 and {luatype(o)}")
        return Vector3(self.x + o.x, self.y + o.y, self.z + o.z)

    def __sub__(self, o):
        if not isinstance(o, Vector3):
            raise LuaError(f"attempt to perform arithmetic (sub) on Vector3 and {luatype(o)}")
        return Vector3(self.x - o.x, self.y - o.y, self.z - o.z)

    def __mul__(self, o):
        if isinstance(o, Vector3):
            return Vector3(self.x * o.x, self.y * o.y, self.z * o.z)
        o = num(o)
        return Vector3(self.x * o, self.y * o, self.z * o)

    __rmul__ = __mul__

    def __truediv__(self, o):
        if isinstance(o, Vector3):
            return Vector3(self.x / o.x, self.y / o.y, self.z / o.z)
        o = num(o)
        return Vector3(self.x / o, self.y / o, self.z / o) if o != 0 else Vector3(math.inf, math.inf, math.inf)

    def __neg__(self):
        return Vector3(-self.x, -self.y, -self.z)

    def lua_eq(self, o):
        return isinstance(o, Vector3) and (self.x, self.y, self.z) == (o.x, o.y, o.z)

    def lua_tostring(self):
        return f"{self.x:g}, {self.y:g}, {self.z:g}"

    def mag(self):
        return math.sqrt(self.x * self.x + self.y * self.y + self.z * self.z)

    def flat(self):
        return Vector3(self.x, 0, self.z)

    def unit(self):
        m = self.mag()
        return Vector3(self.x / m, self.y / m, self.z / m) if m > 0 else Vector3()

    def __repr__(self):
        return f"V3({self.x:.2f},{self.y:.2f},{self.z:.2f})"


class Vector2(Host):
    TYPE = "Vector2"
    __slots__ = ("x", "y")

    def __init__(self, x=0.0, y=0.0):
        self.x, self.y = float(x), float(y)

    def lua_index(self, key):
        if key == "X":
            return self.x
        if key == "Y":
            return self.y
        if key == "Magnitude":
            return math.hypot(self.x, self.y)
        if key == "Unit":
            m = math.hypot(self.x, self.y)
            return Vector2(self.x / m, self.y / m) if m else Vector2(math.nan, math.nan)
        if key == "Dot":
            return lambda a, b: a.x * b.x + a.y * b.y
        raise LuaError(f"{tostr(key)} is not a valid member of Vector2")

    def __add__(self, o):
        if not isinstance(o, Vector2):
            raise LuaError(f"attempt to perform arithmetic (add) on Vector2 and {luatype(o)}")
        return Vector2(self.x + o.x, self.y + o.y)

    def __sub__(self, o):
        if not isinstance(o, Vector2):
            raise LuaError(f"attempt to perform arithmetic (sub) on Vector2 and {luatype(o)}")
        return Vector2(self.x - o.x, self.y - o.y)

    def __mul__(self, o):
        if isinstance(o, Vector2):
            return Vector2(self.x * o.x, self.y * o.y)
        o = num(o)
        return Vector2(self.x * o, self.y * o)

    __rmul__ = __mul__

    def __truediv__(self, o):
        o = num(o)
        return Vector2(self.x / o, self.y / o)

    def __neg__(self):
        return Vector2(-self.x, -self.y)

    def lua_eq(self, o):
        return isinstance(o, Vector2) and (self.x, self.y) == (o.x, o.y)

    def __repr__(self):
        return f"V2({self.x:.1f},{self.y:.1f})"


class CFrame(Host):
    """Position plus a rotation (columns: right, up, back), like Roblox's."""
    TYPE = "CFrame"

    def __init__(self, pos, look=None, rot=None):
        self.pos = pos
        if rot is not None:
            self.rot = rot
        else:
            look = (look or Vector3(0, 0, -1)).unit()
            up = Vector3(0, 1, 0)
            if abs(look.y) > 0.999:
                up = Vector3(0, 0, 1)
            right = Vector3(look.y * up.z - look.z * up.y, look.z * up.x - look.x * up.z, look.x * up.y - look.y * up.x).unit()
            up2 = Vector3(right.y * look.z - right.z * look.y, right.z * look.x - right.x * look.z, right.x * look.y - right.y * look.x)
            self.rot = (right, up2, -look)

    @property
    def look(self):
        return -self.rot[2]

    def apply(self, v):
        r, u, b = self.rot
        return Vector3(r.x * v.x + u.x * v.y + b.x * v.z, r.y * v.x + u.y * v.y + b.y * v.z, r.z * v.x + u.z * v.y + b.z * v.z)

    def __mul__(self, o):
        if isinstance(o, CFrame):
            return CFrame(self.pos + self.apply(o.pos), rot=tuple(self.apply(c) for c in o.rot))
        if isinstance(o, Vector3):
            return self.pos + self.apply(o)
        raise LuaError(f"attempt to multiply a CFrame with {luatype(o)}")

    def lua_index(self, key):
        if key in ("Position", "p"):
            return self.pos
        if key == "LookVector":
            return self.look
        if key == "RightVector":
            return self.rot[0]
        if key == "UpVector":
            return self.rot[1]
        raise LuaError(f"{tostr(key)} is not a valid member of CFrame")


class UDim(Host):
    TYPE = "UDim"

    def __init__(self, scale=0, offset=0):
        self.scale, self.offset = float(scale), float(offset)

    def lua_index(self, key):
        if key == "Scale":
            return self.scale
        if key == "Offset":
            return self.offset
        raise LuaError(f"{tostr(key)} is not a valid member of UDim")

    def lua_eq(self, o):
        return isinstance(o, UDim) and (self.scale, self.offset) == (o.scale, o.offset)


class UDim2(Host):
    TYPE = "UDim2"

    def __init__(self, xs=0, xo=0, ys=0, yo=0):
        self.X, self.Y = UDim(xs, xo), UDim(ys, yo)

    def lua_index(self, key):
        if key in ("X", "Width"):
            return self.X
        if key in ("Y", "Height"):
            return self.Y
        raise LuaError(f"{tostr(key)} is not a valid member of UDim2")

    def lua_eq(self, o):
        return isinstance(o, UDim2) and self.X.lua_eq(o.X) and self.Y.lua_eq(o.Y)


class Color3(Host):
    TYPE = "Color3"

    def __init__(self, r=0, g=0, b=0):
        self.r, self.g, self.b = float(r), float(g), float(b)

    def lua_index(self, key):
        if key == "R":
            return self.r
        if key == "G":
            return self.g
        if key == "B":
            return self.b
        raise LuaError(f"{tostr(key)} is not a valid member of Color3")

    def lua_eq(self, o):
        return isinstance(o, Color3) and (self.r, self.g, self.b) == (o.r, o.g, o.b)


class EnumItem(Host):
    TYPE = "EnumItem"

    def __init__(self, enum, name):
        self.enum, self.name = enum, name

    def lua_index(self, key):
        if key == "Name":
            return self.name
        if key == "EnumType":
            return self.enum
        if key == "Value":
            return 0
        raise LuaError(f"{tostr(key)} is not a valid member of EnumItem")

    def lua_tostring(self):
        return f"Enum.{self.enum.name}.{self.name}"

    def __repr__(self):
        return self.lua_tostring()


class EnumType(Host):
    TYPE = "Enum"

    def __init__(self, name):
        self.name, self.items = name, {}

    def lua_index(self, key):
        if key == "GetEnumItems":
            return lambda _s: LuaTable(list(self.items.values()))
        if key not in self.items:
            self.items[key] = EnumItem(self, key)
        return self.items[key]


class Enums(Host):
    TYPE = "Enums"

    def __init__(self):
        self.types = {}

    def lua_index(self, key):
        if key not in self.types:
            self.types[key] = EnumType(key)
        return self.types[key]

    def item(self, enum, name):
        return self.lua_index(enum).lua_index(name)


ENUM = Enums()


class RaycastParams(Host):
    TYPE = "RaycastParams"

    def __init__(self):
        self.props = {"FilterType": None, "FilterDescendantsInstances": LuaTable(), "IgnoreWater": False}

    def lua_index(self, key):
        if key in self.props:
            return self.props[key]
        raise LuaError(f"{tostr(key)} is not a valid member of RaycastParams")

    def lua_newindex(self, key, value):
        if key not in self.props:
            raise LuaError(f"{tostr(key)} is not a valid member of RaycastParams")
        self.props[key] = value


# ---------------------------------------------------------------- signals

class Connection(Host):
    TYPE = "RBXScriptConnection"

    def __init__(self, signal, fn):
        self.signal, self.fn, self.connected = signal, fn, True

    def lua_index(self, key):
        if key == "Connected":
            return self.connected
        if key == "Disconnect":
            return lambda _s: self.disconnect()
        raise LuaError(f"{tostr(key)} is not a valid member of RBXScriptConnection")

    def disconnect(self):
        if self.connected:
            self.connected = False
            self.signal.conns.remove(self)


class Signal(Host):
    TYPE = "RBXScriptSignal"

    def __init__(self, world, name):
        self.world, self.name, self.conns = world, name, []

    def lua_index(self, key):
        if key == "Connect":
            return lambda _s, fn: self.connect(fn)
        if key == "Once":
            def once(_s, fn):
                c = None

                def wrapper(*a):
                    c.disconnect()
                    return self.world.interp.call(fn, list(a))
                c = self.connect(wrapper)
                return c
            return once
        raise LuaError(f"{tostr(key)} is not a valid member of RBXScriptSignal")

    def connect(self, fn):
        if not (luatype(fn) == "function"):
            raise LuaError(f"Attempt to connect failed: Passed value is not a function")
        c = Connection(self, fn)
        self.conns.append(c)
        return c

    def fire(self, *args):
        for c in list(self.conns):
            if c.connected:
                self.world.sched.spawn(c.fn, list(args))


class ConnInfo(Host):
    """What an executor's getconnections hands back for one connection."""
    TYPE = "Connection"

    def __init__(self, world, conn):
        self.world, self.conn = world, conn

    def lua_index(self, key):
        if key == "Function":
            return self.conn.fn
        if key == "Enabled":
            return self.conn.connected
        if key == "ForeignState":
            return False
        if key == "LuaConnection":
            return True
        if key == "Thread":
            return None
        if key == "Fire":
            return lambda _s, *a: self.world.interp.call(self.conn.fn, list(a))
        if key == "Disconnect":
            return lambda _s: self.conn.disconnect()
        raise LuaError(f"{tostr(key)} is not a valid member of Connection")


# ---------------------------------------------------------------- instances

class Inst(Host):
    TYPE = "Instance"
    CLASS = "Instance"
    ISA = ("Instance",)
    DEFAULTS = {}
    EVENTS = ("ChildAdded", "ChildRemoved", "DescendantAdded", "DescendantRemoving", "AncestryChanged",
              "Changed", "Destroying", "AttributeChanged")

    def __init__(self, world, name=None, **props):
        self.world = world
        self.name = name or self.CLASS
        self.parent = None
        self.children = []
        self.props = {}
        for cls in reversed(type(self).__mro__):
            self.props.update(getattr(cls, "DEFAULTS", {}))
        self.props = {k: (v() if callable(v) else v) for k, v in self.props.items()}
        self.signals = {}
        self.attrs = {}
        self.destroyed = False
        for k, v in props.items():
            self.props[k] = v

    def __repr__(self):
        return f"<{self.CLASS} {self.full_name()}>"

    def lua_tostring(self):
        return self.name

    def full_name(self):
        parts, cur = [], self
        while cur is not None:
            parts.append(cur.name)
            cur = cur.parent
        return ".".join(reversed(parts))

    def isa(self, cls):
        return any(cls in c.__dict__.get("ISA", ()) for c in type(self).__mro__)

    def signal(self, name):
        if name not in self.signals:
            self.signals[name] = Signal(self.world, f"{self.name}.{name}")
        return self.signals[name]

    def all_events(self):
        out = set()
        for c in type(self).__mro__:
            out.update(c.__dict__.get("EVENTS", ()))
        return out

    def get(self, key):
        if key == "Name":
            return self.name
        if key == "ClassName":
            return self.CLASS
        if key == "Parent":
            return self.parent
        getter = getattr(self, "get_" + key, None)
        if getter is not None:
            return getter()
        if key in self.props:
            return self.props[key]
        raise KeyError(key)

    def lua_index(self, key):
        try:
            return self.get(key)
        except KeyError:
            pass
        m = getattr(self, "m_" + str(key), None)
        if m is not None:
            return lambda _self, *a: m(*a)
        if key in self.all_events():
            return self.signal(key)
        for c in self.children:
            if c.name == key:
                return c
        raise LuaError(f"{tostr(key)} is not a valid member of {self.CLASS} \"{self.full_name()}\"")

    def lua_newindex(self, key, value):
        if key == "Name":
            self.name = tostr(value)
            return
        if key == "Parent":
            self.set_parent(value)
            return
        setter = getattr(self, "set_" + key, None)
        if setter is not None:
            setter(value)
            return
        if key not in self.props:
            raise LuaError(f"{tostr(key)} is not a valid member of {self.CLASS} \"{self.full_name()}\"")
        self.props[key] = value

    def set_parent(self, parent):
        if self.destroyed:
            raise LuaError(f"The Parent property of {self.name} is locked")
        if self.parent is not None:
            self.parent.children.remove(self)
        self.parent = parent
        if parent is not None:
            parent.children.append(self)
            for d in [self] + self.descendants():
                anc = parent
                while anc is not None:
                    if "DescendantAdded" in anc.signals:
                        anc.signals["DescendantAdded"].fire(d)
                    anc = anc.parent

    def descendants(self):
        out = []
        for c in self.children:
            out.append(c)
            out.extend(c.descendants())
        return out

    def ancestors(self):
        cur = self.parent
        while cur is not None:
            yield cur
            cur = cur.parent

    # Lua methods
    def m_IsA(self, cls):
        return self.isa(cls)

    def m_FindFirstChild(self, name, recursive=False):
        for c in (self.descendants() if truthy(recursive) else self.children):
            if c.name == name:
                return c
        return None

    def m_FindFirstChildOfClass(self, cls):
        for c in self.children:
            if c.CLASS == cls:
                return c
        return None

    def m_FindFirstChildWhichIsA(self, cls, recursive=False):
        for c in (self.descendants() if truthy(recursive) else self.children):
            if c.isa(cls):
                return c
        return None

    def m_FindFirstAncestorWhichIsA(self, cls):
        for a in self.ancestors():
            if a.isa(cls):
                return a
        return None

    def m_FindFirstAncestorOfClass(self, cls):
        for a in self.ancestors():
            if a.CLASS == cls:
                return a
        return None

    def m_FindFirstAncestor(self, name):
        for a in self.ancestors():
            if a.name == name:
                return a
        return None

    def m_GetChildren(self):
        return LuaTable(list(self.children))

    def m_GetDescendants(self):
        return LuaTable(self.descendants())

    def m_IsDescendantOf(self, other):
        if other is None:
            raise LuaError("Argument 1 missing or nil")
        return any(a is other for a in self.ancestors())

    def m_IsAncestorOf(self, other):
        return other is not None and any(a is self for a in other.ancestors())

    def m_Destroy(self):
        if self.parent is not None:
            self.set_parent(None)
        self.destroyed = True
        for c in list(self.children):
            c.m_Destroy()

    def m_ClearAllChildren(self):
        for c in list(self.children):
            c.m_Destroy()

    def m_GetAttribute(self, name):
        return self.attrs.get(name)

    def m_GetAttributes(self):
        t = LuaTable()
        for k, v in self.attrs.items():
            t.set(k, v)
        return t

    def m_SetAttribute(self, name, value):
        self.attrs[name] = value

    def m_WaitForChild(self, name, timeout=None):
        c = self.m_FindFirstChild(name)
        if c is None:
            raise LuaError(f"WaitForChild({name}) would wait forever in the test world")
        return c

    def m_GetFullName(self):
        return self.full_name()

    def m_Clone(self):
        raise LuaError("Clone isn't supported in the test world")


class Folder(Inst):
    CLASS = "Folder"
    ISA = ("Folder",)


class Model(Inst):
    CLASS = "Model"
    ISA = ("Model", "PVInstance")
    DEFAULTS = {"PrimaryPart": None}


class Team(Inst):
    CLASS = "Team"
    ISA = ("Team",)


class BasePart(Inst):
    CLASS = "Part"
    ISA = ("BasePart", "PVInstance", "Part")
    DEFAULTS = {"Position": lambda: Vector3(), "Size": lambda: Vector3(2, 2, 2), "AssemblyLinearVelocity": lambda: Vector3(),
                "Anchored": False, "CanCollide": True, "Transparency": 0, "Color": lambda: Color3(1, 1, 1),
                "Material": None, "Shape": None, "CanTouch": True, "CanQuery": True, "CastShadow": True}
    EVENTS = ("Touched", "TouchEnded")

    def __init__(self, world, name=None, **props):
        super().__init__(world, name, **props)
        self.look = Vector3(0, 0, -1)

    def get_CFrame(self):
        return CFrame(self.props["Position"], self.look)

    def set_CFrame(self, cf):
        if not isinstance(cf, CFrame):
            raise LuaError(f"Unable to assign property CFrame. CFrame expected, got {luatype(cf)}")
        self.props["Position"] = cf.pos
        self.look = cf.look
        self.world.cframe_writes.append((self.world.sched.now, self, cf))

    def get_Velocity(self):
        return self.props["AssemblyLinearVelocity"]

    def set_Position(self, v):
        if not isinstance(v, Vector3):
            raise LuaError(f"Unable to assign property Position. Vector3 expected, got {luatype(v)}")
        self.props["Position"] = v


class Humanoid(Inst):
    CLASS = "Humanoid"
    ISA = ("Humanoid",)
    DEFAULTS = {"Health": 100, "MaxHealth": 100, "WalkSpeed": 16, "JumpPower": 50, "JumpHeight": 7.2,
                "UseJumpPower": True, "AutoRotate": True, "Jump": False, "MoveDirection": lambda: Vector3(),
                "HipHeight": 2, "Sit": False, "PlatformStand": False, "DisplayName": ""}
    EVENTS = ("Died", "StateChanged", "Jumping", "Running")

    def __init__(self, world, name=None, **props):
        super().__init__(world, name, **props)
        self.moves = []  # (time, Vector3) from Move()
        self.jumps = []  # times Jump was set to true

    def set_Jump(self, v):
        self.props["Jump"] = bool(truthy(v))
        if truthy(v):
            self.jumps.append(self.world.sched.now)

    def m_Move(self, direction, relative=False):
        if not isinstance(direction, Vector3):
            raise LuaError("Unable to cast to Vector3")
        self.moves.append((self.world.sched.now, direction))

    def m_GetState(self):
        return ENUM.item("HumanoidStateType", "Running")

    def m_ChangeState(self, state):
        pass


class Animation(Inst):
    CLASS = "Animation"
    ISA = ("Animation",)
    DEFAULTS = {"AnimationId": ""}


class AnimationTrack(Inst):
    CLASS = "AnimationTrack"
    ISA = ("AnimationTrack",)
    DEFAULTS = {"Priority": None, "Animation": None, "IsPlaying": True, "Length": 1, "Speed": 1, "TimePosition": 0,
                "Looped": False, "WeightCurrent": 1}
    EVENTS = ("Stopped", "Ended", "KeyframeReached")


class Animator(Inst):
    CLASS = "Animator"
    ISA = ("Animator",)

    def __init__(self, world, name=None, **props):
        super().__init__(world, name, **props)
        self.playing = []  # (track, until)

    def play(self, name, priority="Action", length=0.5):
        anim = Animation(self.world, name)
        tr = AnimationTrack(self.world, name, Priority=ENUM.item("AnimationPriority", priority), Animation=anim)
        self.playing.append((tr, self.world.sched.now + length))
        return tr

    def tick(self):
        now = self.world.sched.now
        self.playing = [(t, u) for t, u in self.playing if u > now]

    def m_GetPlayingAnimationTracks(self):
        return LuaTable([t for t, _ in self.playing])


class Player(Inst):
    CLASS = "Player"
    ISA = ("Player",)
    DEFAULTS = {"Character": None, "Team": None, "UserId": 1, "DisplayName": "", "TeamColor": None, "Neutral": False}
    EVENTS = ("CharacterAdded", "CharacterRemoving")

    def m_GetNetworkPing(self):
        return self.world.ping

    def m_GetMouse(self):
        raise LuaError("GetMouse isn't supported in the test world")


class LayerCollector(Inst):
    ISA = ("LayerCollector", "GuiBase2d", "GuiBase")
    DEFAULTS = {"Enabled": True, "ResetOnSpawn": True, "ZIndexBehavior": None}

    def abs_rect(self):
        return (0.0, 0.0, float(SCREEN_W), float(SCREEN_H))

    def get_AbsolutePosition(self):
        return Vector2(0, 0)

    def get_AbsoluteSize(self):
        x, y, w, h = self.abs_rect()
        return Vector2(w, h)


class ScreenGui(LayerCollector):
    CLASS = "ScreenGui"
    ISA = ("ScreenGui",)
    DEFAULTS = {"IgnoreGuiInset": False, "DisplayOrder": 0, "ScreenInsets": None, "SafeAreaCompatibility": None,
                "ClipToDeviceSafeArea": True}

    def abs_rect(self):
        if self.props["IgnoreGuiInset"]:
            return (0.0, 0.0, float(SCREEN_W), float(SCREEN_H))
        return (0.0, 0.0, float(SCREEN_W), float(SCREEN_H - INSET))


class PlayerGui(Inst):
    CLASS = "PlayerGui"
    ISA = ("PlayerGui", "BasePlayerGui")

    def abs_rect(self):
        return (0.0, 0.0, float(SCREEN_W), float(SCREEN_H))


class GuiObject(Inst):
    ISA = ("GuiObject", "GuiBase2d", "GuiBase")
    DEFAULTS = {"Size": lambda: UDim2(), "Position": lambda: UDim2(), "AnchorPoint": lambda: Vector2(),
                "Visible": True, "BackgroundTransparency": 0, "BackgroundColor3": lambda: Color3(1, 1, 1),
                "BorderSizePixel": 1, "Active": False, "ZIndex": 1, "LayoutOrder": 0, "Rotation": 0,
                "ClipsDescendants": False, "AutomaticSize": None, "SizeConstraint": None, "Selectable": False,
                "BorderColor3": lambda: Color3()}
    EVENTS = ("InputBegan", "InputEnded", "InputChanged", "MouseEnter", "MouseLeave", "TouchTap",
              "TouchLongPress", "TouchPan", "TouchPinch", "TouchSwipe", "TouchRotate", "SelectionGained",
              "SelectionLost", "MouseMoved", "MouseWheelForward", "MouseWheelBackward")

    def abs_rect(self):
        p = self.parent
        if p is not None and hasattr(p, "abs_rect"):
            px, py, pw, ph = p.abs_rect()
        else:
            px, py, pw, ph = 0.0, 0.0, 0.0, 0.0
        s, pos, a = self.props["Size"], self.props["Position"], self.props["AnchorPoint"]
        w = pw * s.X.scale + s.X.offset
        h = ph * s.Y.scale + s.Y.offset
        x = px + pw * pos.X.scale + pos.X.offset - a.x * w
        y = py + ph * pos.Y.scale + pos.Y.offset - a.y * h
        return (x, y, w, h)

    def get_AbsolutePosition(self):
        x, y, w, h = self.abs_rect()
        return Vector2(x, y)

    def get_AbsoluteSize(self):
        x, y, w, h = self.abs_rect()
        return Vector2(w, h)

    def screen_gui(self):
        for a in self.ancestors():
            if isinstance(a, LayerCollector):
                return a
        return None

    def on_screen(self):
        """Visible and enabled all the way up (what Roblox renders)."""
        cur = self
        while cur is not None:
            if isinstance(cur, GuiObject) and not cur.props["Visible"]:
                return False
            if isinstance(cur, LayerCollector) and not cur.props["Enabled"]:
                return False
            cur = cur.parent
        return True

    def screen_rect(self):
        x, y, w, h = self.abs_rect()
        sg = self.screen_gui()
        if sg is not None and isinstance(sg, ScreenGui) and not sg.props["IgnoreGuiInset"]:
            y += INSET
        return (x, y, w, h)


class Frame(GuiObject):
    CLASS = "Frame"
    ISA = ("Frame",)
    DEFAULTS = {"Style": None}


class ScrollingFrame(GuiObject):
    CLASS = "ScrollingFrame"
    ISA = ("ScrollingFrame",)
    DEFAULTS = {"CanvasSize": lambda: UDim2(), "CanvasPosition": lambda: Vector2(), "ScrollBarThickness": 12,
                "ScrollingDirection": None, "ScrollingEnabled": True}


TEXT = {"Text": "", "TextColor3": lambda: Color3(), "TextSize": 14, "Font": None, "TextXAlignment": None,
        "TextYAlignment": None, "TextTransparency": 0, "TextScaled": False, "TextWrapped": False, "RichText": False,
        "TextStrokeTransparency": 1, "TextStrokeColor3": lambda: Color3(), "LineHeight": 1, "FontFace": None,
        "MaxVisibleGraphemes": -1, "TextTruncate": None}
IMAGE = {"Image": "", "ImageColor3": lambda: Color3(1, 1, 1), "ImageTransparency": 0, "ScaleType": None,
         "ImageRectOffset": lambda: Vector2(), "ImageRectSize": lambda: Vector2(), "SliceCenter": None,
         "TileSize": None, "ResampleMode": None}


class TextLabel(GuiObject):
    CLASS = "TextLabel"
    ISA = ("TextLabel",)
    DEFAULTS = dict(TEXT)

    def get_ContentText(self):
        return self.props["Text"]


class TextBox(GuiObject):
    CLASS = "TextBox"
    ISA = ("TextBox",)
    DEFAULTS = dict(TEXT, PlaceholderText="", ClearTextOnFocus=True)
    EVENTS = ("FocusLost", "Focused")

    def get_ContentText(self):
        return self.props["Text"]


class ImageLabel(GuiObject):
    CLASS = "ImageLabel"
    ISA = ("ImageLabel",)
    DEFAULTS = dict(IMAGE)


class GuiButton(GuiObject):
    ISA = ("GuiButton",)
    DEFAULTS = {"AutoButtonColor": True, "Modal": False, "Selected": False, "Active": True, "Style": None}
    EVENTS = ("Activated", "MouseButton1Down", "MouseButton1Up", "MouseButton1Click", "MouseButton2Down",
              "MouseButton2Up", "MouseButton2Click")


class TextButton(GuiButton):
    CLASS = "TextButton"
    ISA = ("TextButton",)
    DEFAULTS = dict(TEXT)

    def get_ContentText(self):
        return self.props["Text"]


class ImageButton(GuiButton):
    CLASS = "ImageButton"
    ISA = ("ImageButton",)
    DEFAULTS = dict(IMAGE, HoverImage="", PressedImage="")


class UICorner(Inst):
    CLASS = "UICorner"
    ISA = ("UICorner", "UIComponent", "UIBase")
    DEFAULTS = {"CornerRadius": lambda: UDim()}


class UIStroke(Inst):
    CLASS = "UIStroke"
    ISA = ("UIStroke", "UIComponent", "UIBase")
    DEFAULTS = {"Thickness": 1, "Color": lambda: Color3(), "Transparency": 0, "ApplyStrokeMode": None}


class UIScale(Inst):
    CLASS = "UIScale"
    ISA = ("UIScale", "UIComponent", "UIBase")
    DEFAULTS = {"Scale": 1}


class UITextSizeConstraint(Inst):
    CLASS = "UITextSizeConstraint"
    ISA = ("UITextSizeConstraint", "UIConstraint", "UIComponent", "UIBase")
    DEFAULTS = {"MaxTextSize": 100, "MinTextSize": 1}


class NumberValue(Inst):
    CLASS = "NumberValue"
    ISA = ("NumberValue", "ValueBase")
    DEFAULTS = {"Value": 0}


class StringValue(Inst):
    CLASS = "StringValue"
    ISA = ("StringValue", "ValueBase")
    DEFAULTS = {"Value": ""}
    EVENTS = ("Changed",)


class RemoteFunction(Inst):
    CLASS = "RemoteFunction"
    ISA = ("RemoteFunction",)

    def __init__(self, world, name=None, **props):
        super().__init__(world, name, **props)
        self.server = None  # the fake server's handler; its return is the answer

    def m_InvokeServer(self, *args):
        self.world.fired.append((self.world.sched.now, self, args))
        return self.server(*args) if self.server else None


class IntValue(Inst):
    CLASS = "IntValue"
    ISA = ("IntValue", "ValueBase")
    DEFAULTS = {"Value": 0}


class BodyVelocity(Inst):
    CLASS = "BodyVelocity"
    ISA = ("BodyVelocity", "BodyMover")
    DEFAULTS = {"Velocity": lambda: Vector3(), "MaxForce": lambda: Vector3(4000, 4000, 4000), "P": 1250}


class BodyGyro(Inst):
    CLASS = "BodyGyro"
    ISA = ("BodyGyro", "BodyMover")
    DEFAULTS = {"MaxTorque": lambda: Vector3(400000, 0, 400000), "P": 3000, "D": 500,
                "CFrame": lambda: CFrame(Vector3())}


class LinearVelocity(Inst):
    CLASS = "LinearVelocity"
    ISA = ("LinearVelocity", "Constraint")
    DEFAULTS = {"Enabled": True, "VectorVelocity": lambda: Vector3(), "MaxForce": 1000}


class RemoteEvent(Inst):
    CLASS = "RemoteEvent"
    ISA = ("RemoteEvent", "BaseRemoteEvent")
    EVENTS = ("OnClientEvent", "OnServerEvent")

    def __init__(self, world, name=None, **props):
        super().__init__(world, name, **props)
        self.server = []  # the fake server's handlers

    def m_FireServer(self, *args):
        self.world.fired.append((self.world.sched.now, self, args))
        for h in self.server:
            h(*args)


class CylinderHandleAdornment(Inst):
    CLASS = "CylinderHandleAdornment"
    ISA = ("CylinderHandleAdornment", "HandleAdornment", "PVAdornment", "GuiBase3d")
    DEFAULTS = {"Radius": 1, "InnerRadius": 0, "Height": 1, "Angle": 360, "Color3": lambda: Color3(),
                "Transparency": 0, "Adornee": None, "CFrame": lambda: CFrame(Vector3()), "AlwaysOnTop": False,
                "ZIndex": -1, "Visible": True}


class SelectionBox(Inst):
    CLASS = "SelectionBox"
    ISA = ("SelectionBox", "InstanceAdornment", "GuiBase3d")
    DEFAULTS = {"Adornee": None, "LineThickness": 0.15, "Color3": lambda: Color3(), "SurfaceColor3": lambda: Color3(),
                "SurfaceTransparency": 1, "Transparency": 0, "Visible": True}


class BindableEvent(Inst):
    CLASS = "BindableEvent"
    ISA = ("BindableEvent",)
    EVENTS = ("Event",)

    def m_Fire(self, *args):
        self.signal("Event").fire(*args)


class InputObject(Inst):
    CLASS = "InputObject"
    ISA = ("InputObject",)
    DEFAULTS = {"UserInputType": None, "UserInputState": None, "KeyCode": None, "Position": lambda: Vector3(),
                "Delta": lambda: Vector3()}

    def m_IsModifierKeyDown(self, key):
        return False


class Camera(Inst):
    CLASS = "Camera"
    ISA = ("Camera",)
    DEFAULTS = {"ViewportSize": lambda: Vector2(SCREEN_W, SCREEN_H), "FieldOfView": 70, "CameraType": None,
                "CameraSubject": None,
                # behind you and above, looking down the pitch (-z) at about 20 degrees
                "CFrame": lambda: CFrame(Vector3(0, 8, 12), Vector3(0, -0.342, -0.940))}


class RaycastResult(Host):
    TYPE = "RaycastResult"

    def __init__(self, inst, pos, normal):
        self.inst, self.pos, self.normal = inst, pos, normal

    def lua_index(self, key):
        if key == "Instance":
            return self.inst
        if key == "Position":
            return self.pos
        if key == "Normal":
            return self.normal
        if key == "Distance":
            return 0
        raise LuaError(f"{tostr(key)} is not a valid member of RaycastResult")


class Workspace(Model):
    CLASS = "Workspace"
    ISA = ("Workspace", "WorldRoot")
    DEFAULTS = {"Gravity": 196.2, "CurrentCamera": None, "DistributedGameTime": 0}

    def m_Raycast(self, origin, direction, params=None):
        return self.world.raycast(origin, direction, params)


class Service(Inst):
    ISA = ("Service",)


class TeleportServiceC(Service):
    CLASS = "TeleportService"
    ISA = ("TeleportService",)

    def m_Teleport(self, place_id, player=None, *rest):
        self.world.teleports.append(("Teleport", place_id, player))

    def m_TeleportToPlaceInstance(self, place_id, job_id, player=None, *rest):
        self.world.teleports.append(("TeleportToPlaceInstance", place_id, job_id, player))


class StarterGuiC(Service):
    CLASS = "StarterGui"
    ISA = ("StarterGui",)

    def m_SetCore(self, name, value=None):
        if name == "SendNotification" and isinstance(value, LuaTable):
            self.world.notes.append(tostr(value.get("Text")))


class PlayersService(Service):
    CLASS = "Players"
    ISA = ("Players",)
    DEFAULTS = {"LocalPlayer": None, "MaxPlayers": 12}
    EVENTS = ("PlayerAdded", "PlayerRemoving")

    def m_GetPlayers(self):
        return LuaTable([c for c in self.children if isinstance(c, Player)])


class RunServiceC(Service):
    CLASS = "RunService"
    ISA = ("RunService",)
    EVENTS = ("Heartbeat", "Stepped", "RenderStepped", "PreSimulation", "PostSimulation", "PreRender")

    def __init__(self, world, name=None, **props):
        super().__init__(world, name, **props)
        self.render = {}  # name -> (priority, fn)

    def m_BindToRenderStep(self, name, priority, fn):
        self.render[name] = (priority, fn)

    def m_UnbindFromRenderStep(self, name):
        self.render.pop(name, None)

    def m_IsClient(self):
        return True

    def m_IsStudio(self):
        return False


class UISC(Service):
    CLASS = "UserInputService"
    ISA = ("UserInputService",)
    DEFAULTS = {"TouchEnabled": True, "KeyboardEnabled": False, "MouseEnabled": False, "GamepadEnabled": False,
                "MouseBehavior": None}
    EVENTS = ("InputBegan", "InputEnded", "InputChanged", "JumpRequest", "TouchStarted", "TouchEnded",
              "TouchMoved", "LastInputTypeChanged", "TextBoxFocused", "TextBoxFocusReleased")

    def m_GetFocusedTextBox(self):
        return None

    def m_IsKeyDown(self, key):
        return False

    def m_GetLastInputType(self):
        return ENUM.item("UserInputType", "Touch")


class CASC(Service):
    CLASS = "ContextActionService"
    ISA = ("ContextActionService",)

    def __init__(self, world, name=None, **props):
        super().__init__(world, name, **props)
        self.actions = {}  # name -> (fn, inputTypes list)
        self.called = []

    def m_GetAllBoundActionInfo(self):
        t = LuaTable()
        for name, (fn, inputs) in self.actions.items():
            info = LuaTable()
            info.set("inputTypes", LuaTable(list(inputs)))
            info.set("priorityLevel", 2000)
            info.set("stackOrder", 1)
            t.set(name, info)
        return t

    def m_CallFunction(self, name, state, input_obj=None):
        if name not in self.actions:
            return None
        self.called.append((self.world.sched.now, name, state))
        fn, _ = self.actions[name]
        return self.world.interp.call(fn, [name, state, input_obj])

    def m_BindAction(self, name, fn, touch, *inputs):
        self.actions[name] = (fn, list(inputs))

    def m_UnbindAction(self, name):
        self.actions.pop(name, None)


class GuiServiceC(Service):
    CLASS = "GuiService"
    ISA = ("GuiService",)
    EVENTS = ("ErrorMessageChanged",)

    def m_GetGuiInset(self):
        return Multi([Vector2(0, INSET), Vector2(0, 0)])


class HttpServiceC(Service):
    CLASS = "HttpService"
    ISA = ("HttpService",)

    def m_JSONEncode(self, v):
        return json.dumps(to_py(v))

    def m_JSONDecode(self, s):
        try:
            return from_py(json.loads(s))
        except ValueError as e:
            raise LuaError(f"Can't parse JSON: {e}")

    def m_GenerateGUID(self, braces=True):
        return "{00000000-0000-0000-0000-000000000000}"


def to_py(v):
    if isinstance(v, LuaTable):
        n = v.length()
        if n and n == len(v.hash):
            return [to_py(x) for x in v.array()]
        return {tostr(k): to_py(x) for k, x in v.hash.items()}
    return v


def from_py(v):
    if isinstance(v, list):
        return LuaTable([from_py(x) for x in v])
    if isinstance(v, dict):
        t = LuaTable()
        for k, x in v.items():
            t.set(k, from_py(x))
        return t
    return v


class VIMC(Service):
    """VirtualInputManager: virtual touches and clicks hit the topmost button on screen, a virtual
    key goes to UserInputService.InputBegan / InputEnded like a real keyboard."""
    CLASS = "VirtualInputManager"
    ISA = ("VirtualInputManager",)

    def __init__(self, world, name=None, **props):
        super().__init__(world, name, **props)
        self.log = []
        self.blocked = set()  # method names the "executor" refuses
        self.touch_down = {}

    def guard(self, what):
        if what in self.blocked:
            raise LuaError(f"{what} is not allowed")

    def m_SendTouchEvent(self, touch_id, state, x, y):
        self.guard("SendTouchEvent")
        self.log.append((self.world.sched.now, "touch", state, x, y))
        if state == 0:
            self.touch_down[touch_id] = self.world.button_at(x, y)
        elif state == 2:
            b = self.touch_down.pop(touch_id, None)
            if b is not None and b is self.world.button_at(x, y):
                self.world.click(b)

    def m_SendKeyEvent(self, down, key, rep, layer):
        self.guard("SendKeyEvent")
        self.log.append((self.world.sched.now, "key", down, key))
        self.world.keyboard_used = True
        inp = InputObject(self.world, "InputObject", UserInputType=ENUM.item("UserInputType", "Keyboard"),
                          KeyCode=key, UserInputState=ENUM.item("UserInputState", "Begin" if truthy(down) else "End"))
        self.world.uis.signal("InputBegan" if truthy(down) else "InputEnded").fire(inp, False)

    def m_SendMouseButtonEvent(self, x, y, button, down, layer, rep):
        self.guard("SendMouseButtonEvent")
        self.log.append((self.world.sched.now, "mouse", down, x, y))
        self.world.keyboard_used = True
        if truthy(down):
            self.touch_down["mouse"] = self.world.button_at(x, y)
        else:
            b = self.touch_down.pop("mouse", None)
            if b is not None and b is self.world.button_at(x, y):
                self.world.click(b)


class DataModel(Inst):
    CLASS = "DataModel"
    ISA = ("DataModel", "ServiceProvider")
    DEFAULTS = {"PlaceId": 1, "JobId": "test", "GameId": 1}

    def m_GetService(self, name):
        s = self.world.services.get(name)
        if s is None:
            raise LuaError(f"'{name}' is not a valid Service name")
        return s

    def m_FindService(self, name):
        return self.world.services.get(name)


CLASSES = {c.CLASS: c for c in [Folder, Model, Team, BasePart, Humanoid, Animator, Animation, Player, ScreenGui,
                                 Frame, TextLabel, TextButton, ImageLabel, ImageButton, UICorner, UIStroke,
                                 BindableEvent, Camera, UIScale, UITextSizeConstraint, NumberValue, IntValue,
                                 RemoteEvent, CylinderHandleAdornment, SelectionBox, BodyVelocity, BodyGyro,
                                 LinearVelocity, TextBox, StringValue, RemoteFunction, ScrollingFrame]}
CLASSES["Part"] = BasePart


# ---------------------------------------------------------------- the world

class World:
    def __init__(self, interp):
        self.interp = interp
        self.sched = interp.sched
        self.ping = 0.05
        self.cframe_writes = []
        self.keyboard_used = False
        self.files = {}
        self.ground = None
        self.game = DataModel(self, "Game")
        self.workspace = Workspace(self, "Workspace")
        self.workspace.set_parent(self.game)
        cam = Camera(self, "Camera")
        cam.set_parent(self.workspace)
        self.workspace.props["CurrentCamera"] = cam
        self.players = PlayersService(self, "Players")
        self.run = RunServiceC(self, "Run Service")
        self.uis = UISC(self, "UserInputService")
        self.cas = CASC(self, "ContextActionService")
        self.guisvc = GuiServiceC(self, "GuiService")
        self.http = HttpServiceC(self, "HttpService")
        self.vim = VIMC(self, "VirtualInputManager")
        self.rs = Service(self, "ReplicatedStorage")
        self.rs.CLASS = "ReplicatedStorage"
        self.coregui = Service(self, "CoreGui")
        self.coregui.CLASS = "CoreGui"
        self.teleport = TeleportServiceC(self, "TeleportService")
        self.teleports = []
        self.startergui = StarterGuiC(self, "StarterGui")
        self.notes = []
        self.hui = Folder(self, "HiddenUI")
        self.hui.set_parent(self.coregui)
        self.services = {"Workspace": self.workspace, "Players": self.players, "RunService": self.run,
                         "UserInputService": self.uis, "ContextActionService": self.cas,
                         "GuiService": self.guisvc, "HttpService": self.http,
                         "VirtualInputManager": self.vim, "CoreGui": self.coregui, "ReplicatedStorage": self.rs,
                         "TeleportService": self.teleport, "StarterGui": self.startergui}
        for s in self.services.values():
            if s.parent is None:
                s.set_parent(self.game)
        self.install()

    def raycast(self, origin, direction, params):
        g = self.ground
        if g is None:
            return None
        if direction.y < 0 and origin.y + direction.y <= g.props["Position"].y + g.props["Size"].y / 2 <= origin.y:
            top = g.props["Position"].y + g.props["Size"].y / 2
            return RaycastResult(g, Vector3(origin.x, top, origin.z), Vector3(0, 1, 0))
        return None

    def new(self, cls, parent=None):
        c = CLASSES.get(cls)
        if c is None:
            raise LuaError(f"Unable to create an Instance of type \"{cls}\"")
        inst = c(self)
        if parent is not None:
            inst.set_parent(parent)
        return inst

    def gui_buttons(self, root):
        return [d for d in root.descendants() if isinstance(d, GuiButton)]

    def button_at(self, x, y):
        """The topmost on-screen button under a screen point (last drawn wins)."""
        hit = None
        roots = [self.local_player_gui()] + [self.hui]
        for root in roots:
            if root is None:
                continue
            for b in self.gui_buttons(root):
                if not b.on_screen():
                    continue
                bx, by, bw, bh = b.screen_rect()
                if bx <= x <= bx + bw and by <= y <= by + bh:
                    hit = b
        return hit

    def click(self, b):
        b.signal("MouseButton1Down").fire(0, 0)
        b.signal("MouseButton1Up").fire(0, 0)
        b.signal("MouseButton1Click").fire()
        b.signal("Activated").fire(None, 1)

    def local_player_gui(self):
        lp = self.players.props["LocalPlayer"]
        return lp.m_FindFirstChildOfClass("PlayerGui") if lp else None

    def install(self):
        I, G = self.interp, self.interp.G
        G.set("game", self.game)
        G.set("workspace", self.workspace)
        G.set("Enum", ENUM)

        def static(**fns):
            t = LuaTable()
            for k, v in fns.items():
                t.set(k, v)
            return t

        G.set("Vector3", static(new=lambda x=0, y=0, z=0: Vector3(x, y, z), zero=Vector3(), one=Vector3(1, 1, 1),
                                xAxis=Vector3(1, 0, 0), yAxis=Vector3(0, 1, 0), zAxis=Vector3(0, 0, 1)))
        G.set("Vector2", static(new=lambda x=0, y=0: Vector2(x, y), zero=Vector2(), one=Vector2(1, 1)))

        def look_at(pos, target, up=None):
            d = target - pos
            return CFrame(pos, d.unit() if d.mag() > 0 else Vector3(0, 0, -1))
        def angles(rx=0, ry=0, rz=0):
            import math as m
            cx, sx, cy, sy, cz, sz = m.cos(rx), m.sin(rx), m.cos(ry), m.sin(ry), m.cos(rz), m.sin(rz)
            # Roblox: Angles(rx, ry, rz) = Rx * Ry * Rz; columns of that matrix
            rot = (Vector3(cy * cz, cx * sz + sx * sy * cz, sx * sz - cx * sy * cz),
                   Vector3(-cy * sz, cx * cz - sx * sy * sz, sx * cz + cx * sy * sz),
                   Vector3(sy, -sx * cy, cx * cy))
            return CFrame(Vector3(), rot=rot)
        G.set("CFrame", static(lookAt=look_at, Angles=angles, fromEulerAnglesXYZ=angles,
                               new=lambda *a: CFrame(Vector3(*a) if a and not isinstance(a[0], Vector3) else (a[0] if a else Vector3()))))
        G.set("UDim", static(new=lambda s=0, o=0: UDim(s, o)))
        G.set("UDim2", static(new=lambda xs=0, xo=0, ys=0, yo=0: UDim2(xs, xo, ys, yo),
                              fromOffset=lambda x=0, y=0: UDim2(0, x, 0, y),
                              fromScale=lambda x=0, y=0: UDim2(x, 0, y, 0)))
        G.set("Color3", static(new=lambda r=0, g=0, b=0: Color3(r, g, b),
                               fromRGB=lambda r=0, g=0, b=0: Color3(r / 255, g / 255, b / 255)))
        G.set("RaycastParams", static(new=lambda: RaycastParams()))
        G.set("Instance", static(new=lambda cls, parent=None: self.new(cls, parent)))

        # executor extras
        genv = LuaTable()
        G.set("getgenv", lambda: genv)
        G.set("gethui", lambda: self.hui)

        def getconnections(signal):
            if not isinstance(signal, Signal):
                raise LuaError("getconnections expects a signal")
            return LuaTable([ConnInfo(self, c) for c in signal.conns])
        G.set("getconnections", getconnections)

        def firesignal(signal, *args):
            if not isinstance(signal, Signal):
                raise LuaError("firesignal expects a signal")
            signal.fire(*args)
        G.set("firesignal", firesignal)

        def readfile(path):
            if path not in self.files:
                raise LuaError(f"file {path} does not exist")
            return self.files[path]

        def writefile(path, data):
            self.files[path] = tostr(data)
        G.set("readfile", readfile)
        self.fired = []
        self.touches = []

        def firetouchinterest(a, b, toggle):
            self.touches.append((self.sched.now, a, b, toggle))
        G.set("firetouchinterest", firetouchinterest)
        G.set("writefile", writefile)


def install_hooks(world, script_chunk="AutoDribble"):
    """hookmetamethod(game, "__namecall"), getnamecallmethod, checkcaller and newcclosure."""
    I, G = world.interp, world.interp.G

    def hookmetamethod(obj, name, fn):
        if obj is not world.game or name != "__namecall":
            raise LuaError("only game's __namecall can be hooked in the test world")
        prev = I.namecall_hook

        def old(o, *a):
            if prev is not None:
                return Multi(I.call(prev, [o] + list(a)))
            f = I.index(o, I.sched.tls.namecall)
            return Multi(I.call(f, [o] + list(a)))
        I.namecall_hook = fn
        return old

    G.set("hookmetamethod", hookmetamethod)
    G.set("getnamecallmethod", lambda: getattr(I.sched.tls, "namecall", None))
    G.set("checkcaller", lambda: getattr(I.sched.tls, "thread_chunk", None) == script_chunk)
    G.set("newcclosure", lambda f: f)
