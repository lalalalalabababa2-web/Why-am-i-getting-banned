// Turbo League (Android, Unity IL2CPP) — ball trajectory predictor.
// Frida 17 + frida-il2cpp-bridge 0.14. Read-only on game state: it reads the ball's
// Rigidbody, simulates ahead in JS, and draws the result with its own LineRenderers.

import "frida-il2cpp-bridge";

const CONFIG = {
    horizon: 3.0, // seconds to predict ahead
    step: 1 / 60, // simulation step
    maxBounces: 4,
    restitution: 0.6, // bounce energy kept along the normal; tune until bounces line up
    friction: 0.9, // tangential speed kept on a bounce
    gravityScale: 1.0, // if the game pushes the ball with extra gravity, raise this
    lineWidth: 0.12,
    lineColor: [1.0, 0.85, 0.1, 0.9],
    markerColor: [0.1, 1.0, 0.4, 0.9],
    markerSegments: 24,
    rescanEvery: 60, // frames between ball searches while none is found
};

const POINTS = Math.ceil(CONFIG.horizon / CONFIG.step) + 1;

Il2Cpp.perform(() => {
    const core = Il2Cpp.domain.assembly("UnityEngine.CoreModule").image;
    const physicsImg = Il2Cpp.domain.assembly("UnityEngine.PhysicsModule").image;

    const UObject = core.class("UnityEngine.Object");
    const GameObject = core.class("UnityEngine.GameObject");
    const Vector3 = core.class("UnityEngine.Vector3");
    const Color = core.class("UnityEngine.Color");
    const Shader = core.class("UnityEngine.Shader");
    const Material = core.class("UnityEngine.Material");
    const LineRenderer = core.class("UnityEngine.LineRenderer");
    const Time = core.class("UnityEngine.Time");
    const Physics = physicsImg.class("UnityEngine.Physics");
    const SphereCollider = physicsImg.class("UnityEngine.SphereCollider");
    const RaycastHit = physicsImg.class("UnityEngine.RaycastHit");

    const findObjectsOfType = UObject.method<Il2Cpp.Array<Il2Cpp.Object>>("FindObjectsOfType").overload("System.Type");
    const sphereCast = Physics.method<number>("SphereCastNonAlloc").overload(
        "UnityEngine.Vector3", "System.Single", "UnityEngine.Vector3",
        "UnityEngine.RaycastHit[]", "System.Single", "System.Int32",
        "UnityEngine.QueryTriggerInteraction",
    );

    // Pinned scratch structs. The GC never sees Frida's heap, so everything we keep gets a handle.
    const pinned: Il2Cpp.GCHandle[] = [];
    const pin = <T extends Il2Cpp.Object>(o: T): T => { pinned.push(o.ref(true)); return o; };
    const scratchVec = () => pin(Vector3.alloc()).unbox();
    const setVec = (v: Il2Cpp.ValueType, x: number, y: number, z: number) => {
        v.handle.writeFloat(x).add(4).writeFloat(y).add(4).writeFloat(z);
    };
    const readVec = (v: Il2Cpp.ValueType): [number, number, number] =>
        [v.handle.readFloat(), v.handle.add(4).readFloat(), v.handle.add(8).readFloat()];
    const color = (c: number[]) => {
        const v = pin(Color.alloc()).unbox();
        c.forEach((f, i) => v.handle.add(i * 4).writeFloat(f));
        return v;
    };

    const castOrigin = scratchVec();
    const castDir = scratchVec();
    const hits = Il2Cpp.array<Il2Cpp.ValueType>(RaycastHit, 4);
    pin(hits.object);

    // ---- drawing ----

    function makeLine(name: string, rgba: number[], count: number, loop: boolean) {
        const go = pin(GameObject.alloc());
        go.method(".ctor", 1).invoke(Il2Cpp.string(name));
        UObject.method("DontDestroyOnLoad").invoke(go);
        const lr = pin(go.method<Il2Cpp.Object>("AddComponent").overload("System.Type").invoke(LineRenderer.type.object));

        for (const s of ["Sprites/Default", "Universal Render Pipeline/Unlit", "Unlit/Color", "UI/Default", "Hidden/Internal-Colored"]) {
            const shader = Shader.method<Il2Cpp.Object>("Find").invoke(Il2Cpp.string(s));
            if (shader.isNull()) continue;
            const mat = pin(Material.alloc());
            mat.method(".ctor").overload("UnityEngine.Shader").invoke(shader);
            mat.method("set_color").invoke(color(rgba));
            lr.method("set_material").invoke(mat);
            break;
        }
        const c = color(rgba);
        lr.method("set_startColor").invoke(c);
        lr.method("set_endColor").invoke(c);
        lr.method("set_startWidth").invoke(CONFIG.lineWidth);
        lr.method("set_endWidth").invoke(CONFIG.lineWidth * 0.4);
        lr.method("set_useWorldSpace").invoke(true);
        lr.method("set_loop").invoke(loop);
        lr.method("set_positionCount").invoke(0);
        lr.method("set_shadowCastingMode").invoke(0);

        const buf = Il2Cpp.array<Il2Cpp.ValueType>(Vector3, count);
        pin(buf.object);
        return { go, lr, buf, raw: buf.handle.add(Il2Cpp.Array.headerSize) };
    }

    const path = makeLine("tl_traj_path", CONFIG.lineColor, POINTS, false);
    const marker = makeLine("tl_traj_marker", CONFIG.markerColor, CONFIG.markerSegments, true);
    const setPositions = (line: typeof path, n: number) => {
        line.lr.method("set_positionCount").invoke(n);
        if (n > 0) line.lr.method("SetPositions").overload("UnityEngine.Vector3[]").invoke(line.buf);
    };

    // ---- ball ----

    let ball: { rb: Il2Cpp.Object; tf: Il2Cpp.Object; radius: number; layer: number } | null = null;

    function findBall() {
        const cols = findObjectsOfType.invoke(SphereCollider.type.object);
        let best: Il2Cpp.Object | null = null;
        let bestScore = -1;
        for (const col of cols) {
            const rb = col.method<Il2Cpp.Object>("get_attachedRigidbody").invoke();
            if (rb.isNull() || rb.method<boolean>("get_isKinematic").invoke()) continue;
            const go = col.method<Il2Cpp.Object>("get_gameObject").invoke();
            const name = go.method<Il2Cpp.String>("get_name").invoke().content?.toLowerCase() ?? "";
            const scale = readVec(go.method<Il2Cpp.Object>("get_transform").invoke().method<Il2Cpp.ValueType>("get_lossyScale").invoke());
            const radius = col.method<number>("get_radius").invoke() * Math.max(...scale.map(Math.abs));
            const score = (name.includes("ball") ? 1000 : 0) + radius;
            if (score > bestScore) { bestScore = score; best = col; }
        }
        if (!best) return;
        const go = best.method<Il2Cpp.Object>("get_gameObject").invoke();
        const tf = go.method<Il2Cpp.Object>("get_transform").invoke();
        const scale = readVec(tf.method<Il2Cpp.ValueType>("get_lossyScale").invoke());
        ball = {
            rb: pin(best.method<Il2Cpp.Object>("get_attachedRigidbody").invoke()),
            tf: pin(tf),
            radius: best.method<number>("get_radius").invoke() * Math.max(...scale.map(Math.abs)),
            layer: go.method<number>("get_layer").invoke(),
        };
        console.log(`[traj] ball: "${go.method<Il2Cpp.String>("get_name").invoke().content}" r=${ball.radius.toFixed(2)} layer=${ball.layer}`);
    }

    // Unity 6 renamed velocity/drag to linearVelocity/linearDamping; take whichever exists.
    const rbGet = (rb: Il2Cpp.Object, ...names: string[]) => {
        for (const n of names) { const m = rb.tryMethod<any>(n, 0); if (m) return m.invoke(); }
        throw new Error(`no ${names.join("/")}`);
    };

    // ---- simulation ----

    function predict() {
        if (!ball) return;
        if (ball.rb.isNull() || ball.tf.method<Il2Cpp.Object>("get_gameObject").invoke().isNull()) { ball = null; return; }

        let [px, py, pz] = readVec(ball.tf.method<Il2Cpp.ValueType>("get_position").invoke());
        let [vx, vy, vz] = readVec(rbGet(ball.rb, "get_linearVelocity", "get_velocity"));
        const drag: number = rbGet(ball.rb, "get_linearDamping", "get_drag");
        const useGravity = ball.rb.method<boolean>("get_useGravity").invoke();
        const [gx, gy, gz] = useGravity
            ? readVec(Physics.method<Il2Cpp.ValueType>("get_gravity").invoke()).map(g => g * CONFIG.gravityScale)
            : [0, 0, 0];

        const dt = CONFIG.step;
        const mask = ~(1 << ball.layer);
        const damp = Math.max(0, 1 - drag * dt);
        const out = path.raw;
        let n = 0;
        let bounces = 0;
        let landing: [number, number, number, number, number, number] | null = null;

        const push = (x: number, y: number, z: number) => {
            out.add(n * 12).writeFloat(x).add(4).writeFloat(y).add(4).writeFloat(z);
            n++;
        };
        push(px, py, pz);

        for (let i = 1; i < POINTS; i++) {
            vx = (vx + gx * dt) * damp;
            vy = (vy + gy * dt) * damp;
            vz = (vz + gz * dt) * damp;
            const dist = Math.hypot(vx, vy, vz) * dt;
            if (dist < 1e-5) break;

            setVec(castOrigin, px, py, pz);
            setVec(castDir, vx * dt / dist, vy * dt / dist, vz * dt / dist);
            const count = sphereCast.invoke(castOrigin, ball.radius, castDir, hits, dist, mask, 1);

            let hit: Il2Cpp.ValueType | null = null;
            let hitDist = Infinity;
            for (let h = 0; h < count; h++) {
                const rh = hits.get(h);
                const d = rh.field<number>("m_Distance").value;
                if (d <= 0 || d >= hitDist) continue; // 0 = started inside it
                // Cars and other moving bodies are not part of the arena; ignore them.
                const other = rh.method<Il2Cpp.Object>("get_rigidbody").invoke();
                if (!other.isNull() && !other.method<boolean>("get_isKinematic").invoke()) continue;
                hit = rh; hitDist = d;
            }

            if (!hit) {
                px += vx * dt; py += vy * dt; pz += vz * dt;
            } else {
                const k = hitDist / dist;
                px += vx * dt * k; py += vy * dt * k; pz += vz * dt * k;
                const [nx, ny, nz] = readVec(hit.field<Il2Cpp.ValueType>("m_Normal").value);
                const vn = vx * nx + vy * ny + vz * nz;
                // Split into normal and tangent parts: flip and shrink the normal, rub the tangent.
                const tx = vx - vn * nx, ty = vy - vn * ny, tz = vz - vn * nz;
                const r = -vn * CONFIG.restitution;
                vx = tx * CONFIG.friction + r * nx;
                vy = ty * CONFIG.friction + r * ny;
                vz = tz * CONFIG.friction + r * nz;
                if (!landing && ny > 0.7) {
                    const [hx, hy, hz] = readVec(hit.field<Il2Cpp.ValueType>("m_Point").value);
                    landing = [hx, hy + 0.05, hz, nx, ny, nz];
                }
                if (++bounces > CONFIG.maxBounces) { push(px, py, pz); break; }
            }
            push(px, py, pz);
        }
        setPositions(path, n);

        if (landing) {
            const [cx, cy, cz] = landing;
            const segs = CONFIG.markerSegments;
            for (let s = 0; s < segs; s++) {
                const a = (s / segs) * Math.PI * 2;
                marker.raw.add(s * 12)
                    .writeFloat(cx + Math.cos(a) * ball.radius).add(4)
                    .writeFloat(cy).add(4)
                    .writeFloat(cz + Math.sin(a) * ball.radius);
            }
            setPositions(marker, segs);
        } else {
            setPositions(marker, 0);
        }
    }

    // ---- per-frame driver ----
    // Unity APIs must run on the main thread, so piggyback on something that runs every frame there.
    // EventSystem.Update exists in any game with on-screen controls; fall back to a game MonoBehaviour.

    let frame = 0;
    const tick = () => {
        try {
            if (Time.method<number>("get_timeScale").invoke() === 0) return;
            if (!ball && frame++ % CONFIG.rescanEvery === 0) findBall();
            predict();
        } catch (e) {
            ball = null;
            console.log(`[traj] ${e}`);
        }
    };

    const ui = Il2Cpp.domain.tryAssembly("UnityEngine.UI")?.image.tryClass("UnityEngine.EventSystems.EventSystem");
    let driver = ui?.tryMethod<void>("Update", 0) ?? null;
    if (!driver) {
        const game = Il2Cpp.domain.assembly("Assembly-CSharp").image;
        driver = game.classes.map(c => c.tryMethod<void>("Update", 0)).find(m => m && !m.isStatic && !m.virtualAddress.isNull()) ?? null;
    }
    if (!driver) throw new Error("no per-frame method to hook");

    let lastFrame = -1;
    driver.implementation = function () {
        (this as Il2Cpp.Object).method<void>("Update", 0).invoke();
        const f = Time.method<number>("get_frameCount").invoke();
        if (f !== lastFrame) { lastFrame = f; tick(); } // several instances may share the hook
    };
    console.log(`[traj] driving from ${driver.class.type.name}.Update — waiting for a ball`);
});
