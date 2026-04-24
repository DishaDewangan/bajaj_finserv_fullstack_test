import { useMemo, useState } from "react";
import "./App.css";

const sampleInput = `A->B
A->C
B->D
C->E
E->F
X->Y
Y->Z
Z->X
G->H
G->H
hello`;

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

function parseInput(value) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function App() {
  const [rawInput, setRawInput] = useState(sampleInput);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const parsedCount = useMemo(() => parseInput(rawInput).length, [rawInput]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setResponse(null);

    const data = parseInput(rawInput);
    if (!data.length) {
      setError("Please enter at least one node entry like A->B.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/bfhl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.error || "API request failed.");
      }

      const json = await res.json();
      setResponse(json);
    } catch (requestError) {
      setError(requestError.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <section className="hero">
        <h1>BFHL Hierarchy Visualizer</h1>
        <p>
          Submit node relationships to your hosted <code>/bfhl</code> API and
          inspect trees, cycles, invalid entries, and summary metrics.
        </p>
      </section>

      <section className="card">
        <form onSubmit={handleSubmit}>
          <label htmlFor="node-input">Node input (comma or newline separated)</label>
          <textarea
            id="node-input"
            value={rawInput}
            onChange={(event) => setRawInput(event.target.value)}
            placeholder="Example: A->B, A->C, B->D"
            rows={10}
          />
          <div className="form-row">
            <span>{parsedCount} entries detected</span>
            <button type="submit" disabled={loading}>
              {loading ? "Processing..." : "Submit to API"}
            </button>
          </div>
        </form>
        {error ? <p className="error">{error}</p> : null}
      </section>

      {response ? (
        <section className="results">
          <article className="card">
            <h2>Identity</h2>
            <p>
              <strong>User ID:</strong> {response.user_id}
            </p>
            <p>
              <strong>Email:</strong> {response.email_id}
            </p>
            <p>
              <strong>Roll Number:</strong> {response.college_roll_number}
            </p>
          </article>

          <article className="card">
            <h2>Summary</h2>
            <p>
              <strong>Total Trees:</strong> {response.summary?.total_trees ?? 0}
            </p>
            <p>
              <strong>Total Cycles:</strong> {response.summary?.total_cycles ?? 0}
            </p>
            <p>
              <strong>Largest Tree Root:</strong>{" "}
              {response.summary?.largest_tree_root || "-"}
            </p>
          </article>

          <article className="card">
            <h2>Invalid & Duplicate</h2>
            <p>
              <strong>Invalid Entries:</strong>{" "}
              {response.invalid_entries?.length
                ? response.invalid_entries.join(", ")
                : "None"}
            </p>
            <p>
              <strong>Duplicate Edges:</strong>{" "}
              {response.duplicate_edges?.length
                ? response.duplicate_edges.join(", ")
                : "None"}
            </p>
          </article>

          <article className="card full">
            <h2>Hierarchies</h2>
            <div className="hierarchy-grid">
              {(response.hierarchies || []).map((item, index) => (
                <div className="hierarchy-item" key={`${item.root}-${index}`}>
                  <p>
                    <strong>Root:</strong> {item.root}
                  </p>
                  <p>
                    <strong>Status:</strong>{" "}
                    {item.has_cycle ? "Cycle detected" : "Valid tree"}
                  </p>
                  {!item.has_cycle ? (
                    <p>
                      <strong>Depth:</strong> {item.depth}
                    </p>
                  ) : null}
                  <pre>{JSON.stringify(item.tree, null, 2)}</pre>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}
    </main>
  );
}

export default App;
