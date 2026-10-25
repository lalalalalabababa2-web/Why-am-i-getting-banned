// Turbo League ball prediction line
// BepInEx 5 plugin, C# (net472), for Unity Mono builds.
//
// Simulates the ball forward with Unity's own gravity, drag and the arena's colliders,
// then draws the path with a LineRenderer plus a ring where it next touches something.
// Nothing is written to the game; it only reads the ball's state.

using System.Collections.Generic;
using BepInEx;
using BepInEx.Configuration;
using UnityEngine;

namespace TurboLeaguePredict
{
    [BepInPlugin("nyx.turboleague.predict", "Turbo League Prediction", "1.0.0")]
    public class Plugin : BaseUnityPlugin
    {
        ConfigEntry<bool> drawLine;
        ConfigEntry<KeyboardShortcut> toggleKey;
        ConfigEntry<string> ballName;
        ConfigEntry<float> seconds;
        ConfigEntry<float> lineWidth;
        ConfigEntry<float> tangentKeep;
        ConfigEntry<bool> showDebug;

        Rigidbody ball;
        float radius;
        float bounciness;
        float nextSearch;

        // For a kinematic (network-driven) ball, velocity comes from position deltas.
        Vector3 lastPos;
        Vector3 derivedVel;
        bool hasLastPos;

        LineRenderer path;
        LineRenderer ring;
        readonly List<Vector3> points = new List<Vector3>(512);
        readonly RaycastHit[] hits = new RaycastHit[16];

        void Awake()
        {
            drawLine = Config.Bind("General", "Enabled", true, "Draw the prediction line.");
            toggleKey = Config.Bind("General", "ToggleKey", new KeyboardShortcut(KeyCode.F1), "Turns the line on and off.");
            ballName = Config.Bind("General", "BallNameContains", "ball", "The ball is the first Rigidbody with a SphereCollider whose name contains this (any case).");
            seconds = Config.Bind("Prediction", "Seconds", 2.5f, "How far ahead to simulate.");
            tangentKeep = Config.Bind("Prediction", "TangentKeep", 0.92f, "Share of sliding speed kept on each bounce. Tune until the line matches the ball.");
            lineWidth = Config.Bind("Look", "LineWidth", 0.12f, "Line width in world units.");
            showDebug = Config.Bind("Look", "ShowDebug", false, "Shows what the plugin found on screen.");

            path = MakeLine("TL_PredictPath", lineWidth.Value);
            ring = MakeLine("TL_PredictRing", lineWidth.Value * 0.8f);
            ring.loop = true;
            ring.positionCount = 0;

            Logger.LogInfo("Prediction loaded. Toggle: " + toggleKey.Value);
        }

        LineRenderer MakeLine(string name, float width)
        {
            var go = new GameObject(name);
            DontDestroyOnLoad(go);
            go.hideFlags = HideFlags.HideAndDontSave;

            var lr = go.AddComponent<LineRenderer>();
            lr.useWorldSpace = true;
            lr.startWidth = width;
            lr.endWidth = width * 0.4f;
            lr.numCapVertices = 4;
            lr.numCornerVertices = 2;
            lr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            lr.receiveShadows = false;
            lr.material = new Material(FindShader());

            var g = new Gradient();
            g.SetKeys(
                new[] { new GradientColorKey(new Color(0.2f, 1f, 0.9f), 0f), new GradientColorKey(new Color(1f, 0.3f, 0.8f), 1f) },
                new[] { new GradientAlphaKey(1f, 0f), new GradientAlphaKey(0.15f, 1f) });
            lr.colorGradient = g;
            return lr;
        }

        // Builds often strip shaders; take the first unlit one that survived.
        static Shader FindShader()
        {
            foreach (var n in new[] { "Sprites/Default", "Hidden/Internal-Colored", "Unlit/Color", "UI/Default", "Legacy Shaders/Particles/Alpha Blended" })
            {
                var s = Shader.Find(n);
                if (s != null) return s;
            }
            return Shader.Find("Standard");
        }

        void Update()
        {
            if (toggleKey.Value.IsDown()) drawLine.Value = !drawLine.Value;

            if (ball == null && Time.unscaledTime >= nextSearch)
            {
                nextSearch = Time.unscaledTime + 1f;
                FindBall();
            }

            if (!drawLine.Value || ball == null || !ball.gameObject.activeInHierarchy)
            {
                path.positionCount = 0;
                ring.positionCount = 0;
                return;
            }

            Simulate();
        }

        void FixedUpdate()
        {
            if (ball == null) { hasLastPos = false; return; }
            var p = ball.position;
            if (hasLastPos) derivedVel = (p - lastPos) / Time.fixedDeltaTime;
            lastPos = p;
            hasLastPos = true;
        }

        void FindBall()
        {
            string key = ballName.Value.ToLowerInvariant();
            foreach (var rb in FindObjectsOfType<Rigidbody>())
            {
                if (!rb.name.ToLowerInvariant().Contains(key)) continue;
                var sc = rb.GetComponentInChildren<SphereCollider>();
                if (sc == null) continue;

                ball = rb;
                var s = sc.transform.lossyScale;
                radius = sc.radius * Mathf.Max(Mathf.Abs(s.x), Mathf.Abs(s.y), Mathf.Abs(s.z));
                bounciness = sc.sharedMaterial != null ? sc.sharedMaterial.bounciness : 0.6f;
                hasLastPos = false;
                Logger.LogInfo($"Ball: '{rb.name}' r={radius:F2} bounce={bounciness:F2} kinematic={rb.isKinematic} drag={rb.drag:F3}");
                return;
            }
        }

        void Simulate()
        {
            float dt = Time.fixedDeltaTime;
            int steps = Mathf.Clamp(Mathf.CeilToInt(seconds.Value / dt), 1, 500);

            Vector3 pos = ball.position;
            Vector3 vel = ball.isKinematic ? derivedVel : ball.velocity;
            Vector3 g = ball.useGravity || ball.isKinematic ? Physics.gravity : Vector3.zero;
            float dragMul = Mathf.Clamp01(1f - ball.drag * dt);

            points.Clear();
            points.Add(pos);
            bool ringPlaced = false;

            for (int i = 0; i < steps; i++)
            {
                vel += g * dt;
                vel *= dragMul;

                // Move along the step, bouncing at most a few times inside it.
                float remaining = vel.magnitude * dt;
                for (int b = 0; b < 3 && remaining > 1e-5f; b++)
                {
                    Vector3 dir = vel.normalized;
                    if (!CastStatic(pos, dir, remaining, out RaycastHit hit))
                    {
                        pos += dir * remaining;
                        break;
                    }

                    pos += dir * Mathf.Max(hit.distance - 0.01f, 0f);
                    remaining -= hit.distance;

                    float e = Combine(bounciness, hit.collider.sharedMaterial);
                    Vector3 vn = Vector3.Project(vel, hit.normal);
                    Vector3 vt = vel - vn;
                    vel = vt * tangentKeep.Value - vn * e;

                    if (!ringPlaced)
                    {
                        PlaceRing(hit.point, hit.normal);
                        ringPlaced = true;
                    }
                    points.Add(pos);
                }

                points.Add(pos);
            }

            if (!ringPlaced) ring.positionCount = 0;
            path.positionCount = points.Count;
            path.SetPositions(points.ToArray());
        }

        // Only walls, floor and goals count; cars and the ball itself are skipped.
        bool CastStatic(Vector3 from, Vector3 dir, float dist, out RaycastHit best)
        {
            best = default;
            int n = Physics.SphereCastNonAlloc(from, radius, dir, hits, dist, ~0, QueryTriggerInteraction.Ignore);
            float bestDist = float.MaxValue;
            bool found = false;
            for (int i = 0; i < n; i++)
            {
                var h = hits[i];
                if (h.rigidbody == ball) continue;
                if (h.rigidbody != null && !h.rigidbody.isKinematic) continue;
                if (h.distance <= 0f && h.point == Vector3.zero) continue; // started overlapping
                if (h.distance < bestDist) { bestDist = h.distance; best = h; found = true; }
            }
            return found;
        }

        // Unity's default bounce combine is the average of the two materials.
        static float Combine(float ballBounce, PhysicMaterial other)
        {
            if (other == null) return ballBounce * 0.5f;
            return (ballBounce + other.bounciness) * 0.5f;
        }

        void PlaceRing(Vector3 center, Vector3 normal)
        {
            const int seg = 28;
            Vector3 a = Vector3.Cross(normal, Vector3.up);
            if (a.sqrMagnitude < 1e-4f) a = Vector3.Cross(normal, Vector3.right);
            a.Normalize();
            Vector3 b = Vector3.Cross(normal, a);

            ring.positionCount = seg;
            Vector3 c = center + normal * 0.03f;
            for (int i = 0; i < seg; i++)
            {
                float t = i / (float)seg * Mathf.PI * 2f;
                ring.SetPosition(i, c + (a * Mathf.Cos(t) + b * Mathf.Sin(t)) * radius);
            }
        }

        void OnGUI()
        {
            if (!showDebug.Value) return;
            string s = ball == null
                ? "Prediction: no ball found (BallNameContains = '" + ballName.Value + "')"
                : $"Prediction: {(drawLine.Value ? "ON" : "OFF")}  ball='{ball.name}'  v={(ball.isKinematic ? derivedVel : ball.velocity).magnitude:F1}";
            GUI.Label(new Rect(10, 10, 700, 24), s);
        }
    }
}
