// Abstraction d'envoi du formulaire de contact → route serveur (provider swappable).
export interface ContactPayload {
  name: string
  email: string
  message: string
}

export async function sendMessage(p: ContactPayload): Promise<boolean> {
  try {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    })
    const data = await res.json().catch(() => ({}))
    return res.ok && data?.ok === true
  } catch {
    return false // repli mailto géré côté UI
  }
}
