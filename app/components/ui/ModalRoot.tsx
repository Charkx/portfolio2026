"use client"

import { useModalStore } from "../../store/modalStore"
import Modal from "./Modal"

/** Monté une seule fois : affiche la modale globale selon le store. */
export default function ModalRoot() {
  const modal = useModalStore((s) => s.modal)
  const close = useModalStore((s) => s.close)
  if (!modal) return null
  return (
    <Modal title={modal.title} size={modal.size} onClose={close}>
      {modal.content}
    </Modal>
  )
}
