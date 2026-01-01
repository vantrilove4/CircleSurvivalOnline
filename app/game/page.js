"use client";

export default function GamePage() {
  return (
    <iframe
      src="/game.html"
      style={{ width: "100vw", height: "100vh", border: "none" }}
    />
  );
}

const styles = {
  score: {
    position: "fixed",
    top: 10,
    left: "50%",
    transform: "translateX(-50%)",
    background: "#000",
    color: "#0f0",
    padding: "8px 16px",
    borderRadius: "8px",
    zIndex: 9999,
  },
};
