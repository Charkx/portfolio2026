import { PROFILE } from "../utils/constants"

// Génère et télécharge une vCard depuis PROFILE (client, via Blob — aucune dépendance).
export function downloadVCard() {
  const parts = PROFILE.name.trim().split(/\s+/)
  const first = parts[0] ?? ""
  const last = parts.slice(1).join(" ")
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${last};${first};;;`,
    `FN:${PROFILE.name}`,
    `TITLE:${PROFILE.title}`,
    `EMAIL;TYPE=INTERNET:${PROFILE.email}`,
    PROFILE.phone ? `TEL;TYPE=CELL:${PROFILE.phone}` : "",
    `URL:${PROFILE.linkedin}`,
    `URL:${PROFILE.github}`,
    `ADR;TYPE=HOME:;;${PROFILE.location};;;;`,
    "END:VCARD",
  ].filter(Boolean)

  const blob = new Blob([lines.join("\r\n")], { type: "text/vcard;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "Charly_Menthiller.vcf"
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
