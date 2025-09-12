import { useState } from "react";

export default function Onboarding() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("http://localhost:8000/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      setResult(data.user ? `Welcome, ${data.user.name}!` : "Error: " + data.error);
    } catch (err) {
      setResult("Network error");
    }
    setLoading(false);
  }

  return (
    <main style={{ maxWidth: 400, margin: "2rem auto", padding: 24, background: "#fff", borderRadius: 8, boxShadow: "0 2px 8px #eee" }}>
      <h1>Brokerage Onboarding</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Name<br />
          <input value={name} onChange={e => setName(e.target.value)} required style={{ width: "100%", marginBottom: 12 }} />
        </label>
        <label>
          Email<br />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: "100%", marginBottom: 12 }} />
        </label>
        <button type="submit" disabled={loading} style={{ width: "100%", padding: 10, background: "#171717", color: "#fff", border: "none", borderRadius: 4 }}>
          {loading ? "Submitting..." : "Start"}
        </button>
      </form>
      {result && <p style={{ marginTop: 16 }}>{result}</p>}
    </main>
  );
}
