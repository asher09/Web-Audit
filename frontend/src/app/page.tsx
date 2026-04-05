"use client";

import { useState } from "react";
import {
  Search, Loader2, CheckCircle2, AlertCircle,
  Code2, FileText, Image, Heading1, Globe
} from "lucide-react";

interface ScrapedData {
  title: string | null;
  meta_description: string | null;
  headings: { h1: string[]; h2: string[]; h3: string[] };
  image_urls: string[];
}

interface AuditResult {
  url: string;
  scraped_data: ScrapedData;
  json_ld: Record<string, unknown>;
  schema_type: string;
  geo_score: {
    score: number;
    max: number;
    checks: { label: string; passed: boolean; points: number }[];
  };
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleAudit() {
    if (!url.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Audit failed.");
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result.json_ld, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: "3rem", borderBottom: "1px solid var(--border)", paddingBottom: "1.5rem" }}>
          <p className="mono" style={{ color: "var(--accent)", fontSize: 12, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>
            Web Audit — Internal Tool
          </p>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, lineHeight: 1.1 }}>
            Web Audit &<br />
            <span style={{ color: "var(--accent)" }}>Schema Recommender</span>
          </h1>
          <p style={{ color: "var(--muted)", marginTop: 12, fontSize: 15 }}>
            Paste any URL — we scrape it, analyze it, and return production-ready JSON-LD.
          </p>
        </div>

        {/* ── Input Row ── */}
        <div style={{ display: "flex", gap: 10, marginBottom: "2rem" }}>
          <div style={{
            flex: 1, display: "flex", alignItems: "center", gap: 10,
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 8, padding: "0 16px",
          }}>
            <Globe size={16} color="var(--muted)" />
            <input
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAudit()}
              className="mono"
              style={{
                flex: 1, background: "transparent", border: "none",
                outline: "none", color: "var(--text)", fontSize: 14, padding: "14px 0",
              }}
            />
          </div>
          <button
            onClick={handleAudit}
            disabled={loading || !url.trim()}
            style={{
              background: loading ? "var(--accent-dim)" : "var(--accent)",
              color: "#fff", border: "none", borderRadius: 8,
              padding: "0 24px", fontFamily: "Syne, sans-serif",
              fontWeight: 600, fontSize: 14,
              cursor: loading || !url.trim() ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 8,
              transition: "background 0.2s", whiteSpace: "nowrap",
            }}
          >
            {loading
              ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Scanning...</>
              : <><Search size={16} /> Audit</>
            }
          </button>
        </div>

        {/* ── Loading Skeleton ── */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} style={{
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: 10, padding: "1rem", height: 90,
                  animation: "pulse 1.5s ease-in-out infinite",
                  opacity: 1 - i * 0.1,
                }} />
              ))}
            </div>
            <div style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 10, height: 240,
              animation: "pulse 1.5s ease-in-out infinite",
            }} />
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "#1a0a0a", border: "1px solid #4a1515",
            borderRadius: 8, padding: "14px 16px", marginBottom: "1.5rem",
          }}>
            <AlertCircle size={16} color="#f87171" />
            <p className="mono" style={{ color: "#f87171", fontSize: 13 }}>{error}</p>
          </div>
        )}

        {/* ── Results ── */}
        {result && !loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

            {/* Status badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <CheckCircle2 size={20} color="var(--success)" />
              <span style={{ color: "var(--success)", fontWeight: 600, fontSize: 15 }}>
                Audit complete
              </span>
              <span style={{
                background: "var(--accent-dim)", color: "var(--accent)",
                padding: "3px 10px", borderRadius: 20,
                fontSize: 12, fontWeight: 600, letterSpacing: 1,
              }}>
                @type: {result.schema_type}
              </span>
            </div>

            {/* GEO score panel */}
            <Card icon={<CheckCircle2 size={14} />} label="GEO Citation Readiness">
              <p className="mono" style={{
                fontSize: 44,
                fontWeight: 700,
                lineHeight: 1,
                marginBottom: 8,
                color:
                  result.geo_score.score >= 70
                    ? "var(--success)"
                    : result.geo_score.score >= 40
                      ? "#facc15"
                      : "#ef4444",
              }}>
                {result.geo_score.score} / {result.geo_score.max}
              </p>
              <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6, marginBottom: 14 }}>
                Structured data signals help AI engines like ChatGPT and Perplexity
                cite your content accurately.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {result.geo_score.checks.map((check) => (
                  <div
                    key={check.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 10px",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.01)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: check.passed ? "var(--success)" : "#ef4444", fontSize: 14 }}>
                        {check.passed ? "✅" : "❌"}
                      </span>
                      <span style={{ fontSize: 13, color: "var(--text)" }}>{check.label}</span>
                    </div>
                    <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
                      {check.points} pts
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Info cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

              <Card icon={<FileText size={14} />} label="Page Title">
                <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6 }}>
                  {result.scraped_data.title ?? <Muted>Not found</Muted>}
                </p>
              </Card>

              <Card icon={<FileText size={14} />} label="Meta Description">
                <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6 }}>
                  {result.scraped_data.meta_description ?? <Muted>Not found</Muted>}
                </p>
              </Card>

              <Card icon={<Heading1 size={14} />} label="Headings Extracted">
                <div style={{ display: "flex", gap: 20 }}>
                  {(["h1", "h2", "h3"] as const).map(h => (
                    <div key={h} style={{ textAlign: "center" }}>
                      <p className="mono" style={{ fontSize: 26, fontWeight: 600, color: "var(--accent)" }}>
                        {result.scraped_data.headings[h].length}
                      </p>
                      <p style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1 }}>
                        {h}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card icon={<Image size={14} />} label="Images Found">
                <p className="mono" style={{ fontSize: 36, fontWeight: 600, color: "var(--accent)" }}>
                  {result.scraped_data.image_urls.length}
                </p>
                <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                  {result.scraped_data.image_urls.length > 0
                    ? "First used as JSON-LD image"
                    : "No images detected"}
                </p>
              </Card>

            </div>

            {/* JSON-LD block */}
            <div style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 10, overflow: "hidden",
            }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px", borderBottom: "1px solid var(--border)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Code2 size={14} color="var(--accent)" />
                  <span className="mono" style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 2, textTransform: "uppercase" }}>
                    JSON-LD Recommendation
                  </span>
                </div>
                <button
                  onClick={handleCopy}
                  style={{
                    background: copied ? "var(--accent-dim)" : "transparent",
                    border: "1px solid var(--border)",
                    color: copied ? "var(--accent)" : "var(--muted)",
                    borderRadius: 6, padding: "4px 12px",
                    fontSize: 11, cursor: "pointer",
                    fontFamily: "IBM Plex Mono, monospace",
                    transition: "all 0.2s",
                  }}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <pre className="mono" style={{
                padding: "1.25rem", fontSize: 13, lineHeight: 1.8,
                color: "#a8b0c8", overflowX: "auto",
                whiteSpace: "pre-wrap", wordBreak: "break-word",
                maxHeight: 500, overflowY: "auto",
              }}>
                {JSON.stringify(result.json_ld, null, 2)}
              </pre>
            </div>

          </div>
        )}

        {/* Pulse keyframe */}
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 0.8; }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>

      </div>
    </main>
  );
}

function Card({ icon, label, children }: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 10, padding: "1rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <span style={{ color: "var(--accent)" }}>{icon}</span>
        <span className="mono" style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1.5 }}>
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <span style={{ color: "var(--muted)", fontStyle: "italic" }}>{children}</span>;
}