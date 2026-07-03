import { ImageResponse } from "next/og";

// Image OG générée par le serveur (next/og) — aucun asset ni dépendance à maintenir,
// toujours raccord avec la DA. Reprise par X/Discord/LinkedIn via og:image.
export const alt = "Charly Menthiller — Développeur Full Stack · alternance sept. 2026";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CYAN = "#22d3ee";

// coin HUD (satori : flexbox uniquement, pas de ::before → 4 divs absolues)
function corner(pos: React.CSSProperties): React.CSSProperties {
  return { position: "absolute", width: 48, height: 48, borderColor: CYAN, borderStyle: "solid", borderWidth: 0, ...pos };
}

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #01030a 0%, #05131c 60%, #0a1a24 100%)",
          fontFamily: "monospace",
        }}
      >
        {/* scanlines subtiles */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "repeating-linear-gradient(0deg, transparent, transparent 5px, rgba(34,211,238,0.05) 5px, rgba(34,211,238,0.05) 7px)",
          }}
        />
        {/* coins HUD */}
        <div style={corner({ top: 32, left: 32, borderLeftWidth: 4, borderTopWidth: 4 })} />
        <div style={corner({ top: 32, right: 32, borderRightWidth: 4, borderTopWidth: 4 })} />
        <div style={corner({ bottom: 32, left: 32, borderLeftWidth: 4, borderBottomWidth: 4 })} />
        <div style={corner({ bottom: 32, right: 32, borderRightWidth: 4, borderBottomWidth: 4 })} />

        <div style={{ display: "flex", color: "#f472b6", fontSize: 26, letterSpacing: 10, marginBottom: 28 }}>
          &gt; ID: MENTHILLER_009 · ACCÈS AUTORISÉ
        </div>

        <div
          style={{
            display: "flex",
            color: CYAN,
            fontSize: 92,
            fontWeight: 700,
            letterSpacing: 6,
            textShadow: `0 0 30px ${CYAN}`,
          }}
        >
          CHARLY MENTHILLER
        </div>

        <div style={{ display: "flex", color: "#e5e7eb", fontSize: 38, letterSpacing: 14, marginTop: 24 }}>
          DÉVELOPPEUR FULL STACK
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            marginTop: 52,
            color: "rgba(34,211,238,0.75)",
            fontSize: 26,
            letterSpacing: 4,
          }}
        >
          <div style={{ display: "flex" }}>REACT · NEXT.JS · THREE.JS</div>
          <div style={{ display: "flex", color: "#4ade80" }}>— ALTERNANCE 09/2026</div>
        </div>
      </div>
    ),
    size,
  );
}
