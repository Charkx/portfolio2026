import { NextResponse } from "next/server"

// Envoi via Web3Forms. Clé dans l'env WEB3FORMS_ACCESS_KEY (Vercel).
// Sans clé → 501 : l'UI bascule sur le repli mailto. Pour changer de provider,
// il suffit de modifier ce fichier (le client passe toujours par /api/contact).
export async function POST(req: Request) {
  const key = process.env.WEB3FORMS_ACCESS_KEY

  let body: { name?: string; email?: string; message?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 })
  }

  const name = body.name?.trim()
  const message = body.message?.trim()
  if (!name || !message) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 })
  }
  if (!key) {
    // En local (dev) sans clé → succès simulé pour prévisualiser le finale (rien n'est envoyé).
    // En prod → 501 : l'UI bascule sur le repli mailto tant que la clé n'est pas configurée.
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({ ok: true, simulated: true })
    }
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 501 })
  }

  try {
    const r = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_key: key,
        subject: `Contact portfolio — ${name}`,
        from_name: name,
        name,
        email: body.email?.trim() || "—",
        message,
      }),
    })
    const data = await r.json().catch(() => ({}))
    return NextResponse.json({ ok: r.ok && data?.success === true })
  } catch {
    return NextResponse.json({ ok: false, error: "upstream" }, { status: 502 })
  }
}
