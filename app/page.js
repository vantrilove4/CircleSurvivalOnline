export default function Home() {
  return (
    <main style={styles.container}>
      <h1 style={styles.title}>🎮 MY GAME</h1>

      <a href="/game">
        <button style={styles.button}>▶ PLAY GAME</button>
      </a>
    </main>
  );
}

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    background: "#0f172a",
    color: "#fff",
  },
  title: {
    fontSize: "32px",
    marginBottom: "30px",
  },
  button: {
    fontSize: "22px",
    padding: "15px 40px",
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
    background: "#22c55e",
  },
};
