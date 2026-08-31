import React from "react";
import Modal from "react-modal";

export default function NewChatModal({ open, onClose, onConfirm }) {
  return <Modal isOpen={open} onRequestClose={onClose} contentLabel="Confirm new chat" className="new-chat-confirm-card" overlayClassName="new-chat-confirm-overlay">
    <h2>Start a new chat?</h2><p>The current conversation will be cleared.</p>
    <div className="new-chat-confirm-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button type="button" className="primary" onClick={onConfirm}>New chat</button></div>
  </Modal>;
}
