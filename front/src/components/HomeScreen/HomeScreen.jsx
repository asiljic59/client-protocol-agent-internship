import { useState } from "react";
import "./HomeScreen.css";
import HttpService from "../../services/HttpService";

// ── constants ────────────────────────────────────────────────────────────────

const PROCEDURE_TYPES = [
  "General Assessment","Surgical Procedure","Diagnostic Imaging","Laboratory Test",
  "Physical Therapy","Mental Health Evaluation","Preventive Care","Emergency Care","Other",
];

const http = new HttpService();

// ── sub-components ───────────────────────────────────────────────────────────

function LoadingOverlay({ message }) {
  return (
    <div className="loading-overlay">
      <div className="spinner" />
      <p className="loading-text">{message}</p>
    </div>
  );
}

function Toast({ text }) {
  return <div className="csf-toast">{text}</div>;
}

async function downloadMarkdownPdf(markdown, fileName) {
  const { request } = http.post("api/Study/markdown-pdf", {
    text: markdown,
    fileName,
  }, "blob");
  const response = await request;
  const blob = new Blob([response.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function formatInlineMarkdown(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    return part;
  });
}

function isMarkdownTableSeparator(line) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function parseTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function MarkdownResult({ text }) {
  const lines = text.split(/\r?\n/);
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (
      trimmed.includes("|") &&
      lines[index + 1] &&
      isMarkdownTableSeparator(lines[index + 1])
    ) {
      const header = parseTableRow(trimmed);
      const rows = [];
      index += 2;

      while (index < lines.length && lines[index].trim().includes("|")) {
        rows.push(parseTableRow(lines[index]));
        index += 1;
      }

      blocks.push({ type: "table", header, rows });
      continue;
    }

    if (trimmed.startsWith("### ")) {
      blocks.push({ type: "h4", text: trimmed.slice(4) });
      index += 1;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      blocks.push({ type: "h3", text: trimmed.slice(3) });
      index += 1;
      continue;
    }

    if (trimmed.startsWith("# ")) {
      blocks.push({ type: "h3", text: trimmed.slice(2) });
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    const paragraph = [trimmed];
    index += 1;

    while (
      index < lines.length &&
      lines[index].trim() &&
      !lines[index].trim().startsWith("#") &&
      !/^[-*]\s+/.test(lines[index].trim()) &&
      !(
        lines[index].trim().includes("|") &&
        lines[index + 1] &&
        isMarkdownTableSeparator(lines[index + 1])
      )
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }

    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }

  return (
    <div className="markdown-result">
      {blocks.map((block, blockIndex) => {
        if (block.type === "h3") {
          return <h3 key={blockIndex}>{formatInlineMarkdown(block.text)}</h3>;
        }

        if (block.type === "h4") {
          return <h4 key={blockIndex}>{formatInlineMarkdown(block.text)}</h4>;
        }

        if (block.type === "list") {
          return (
            <ul key={blockIndex}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{formatInlineMarkdown(item)}</li>
              ))}
            </ul>
          );
        }

        if (block.type === "table") {
          return (
            <div className="markdown-table-wrap" key={blockIndex}>
              <table className="markdown-table">
                <thead>
                  <tr>
                    {block.header.map((cell, cellIndex) => (
                      <th key={cellIndex}>{formatInlineMarkdown(cell)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex}>{formatInlineMarkdown(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        return <p key={blockIndex}>{formatInlineMarkdown(block.text)}</p>;
      })}
    </div>
  );
}

function ResultPanel({ badgeClassName, badgeText, title, result, fileName }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await downloadMarkdownPdf(result, fileName);
    } catch (err) {
      console.error(err);
      alert("Could not download PDF. Please check if the backend is running.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="result-container">
      <div className="result-title">
        <div className="result-heading">
          <span className={`result-badge ${badgeClassName}`}>{badgeText}</span>
          {title}
        </div>
        <button
          type="button"
          className="result-download"
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? "Preparing..." : "Download PDF"}
        </button>
      </div>
      <div className="result-body">
        <MarkdownResult text={result} />
      </div>
    </div>
  );
}

// ── Tab 1: Study Registration ────────────────────────────────────────────────

function StudyTab() {
  const [synopsis, setSynopsis] = useState(null);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Generating protocol...");

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] ?? null;
    if (file && !/\.pdf$/i.test(file.name)) {
      setError("Synopsis must be a PDF file.");
      setSynopsis(null);
      e.target.value = "";
      return;
    }
    setError("");
    setSynopsis(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!synopsis && !notes.trim()) {
      setError("Upload a synopsis PDF or add notes.");
      return;
    }
    setError("");

    const formData = new FormData();
    if (synopsis) formData.append("synopsis", synopsis);
    formData.append("notes", notes);

    try {
      setLoading(true);
      setLoadingMessage("Sending synopsis...");
      const messages = ["Analyzing...", "Generating PDF...", "Almost there..."];
      let msgIdx = 0;
      const intervalId = setInterval(() => {
        if (msgIdx < messages.length) setLoadingMessage(messages[msgIdx++]);
      }, 3000);

      const { request } = http.postForm("api/Study", formData, "blob");
      const response = await request;

      clearInterval(intervalId);

      if (response && response.data) {
        const blob = new Blob([response.data], { type: "application/pdf" });
        if (pdfUrl) window.URL.revokeObjectURL(pdfUrl);
        setPdfUrl(window.URL.createObjectURL(blob));
        setSaved(true);
      } else {
        throw new Error("Response was empty");
      }
    } catch (err) {
      console.error("Error:", err);
      setError("Could not generate PDF. Please check if the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSynopsis(null);
    setNotes("");
    setSaved(false);
    setError("");
    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  };

  return (
    <>
      {loading && <LoadingOverlay message={loadingMessage} />}
      <form className="csf-form" onSubmit={handleSubmit}>
        <div className="csf-field csf-field-full">
          <label className="csf-label">Synopsis PDF</label>
          <p className="csf-hint">
            Upload the study synopsis as a PDF. The backend extracts the text and forwards it to the protocol agent.
          </p>
          <input
            className="csf-input"
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleFileChange}
          />
          {synopsis && (
            <span className="csf-hint" style={{ marginTop: 6 }}>
              Selected: {synopsis.name}
            </span>
          )}
        </div>

        <div className="csf-field csf-field-full">
          <label className="csf-label">Additional Notes</label>
          <p className="csf-hint">
            Optional. Paste the full synopsis text here or add anything else the agent should consider.
          </p>
          <textarea
            className="csf-textarea csf-textarea-lg"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Free-text notes or full synopsis content..."
          />
        </div>

        {error && <div className="error-text csf-field-full">{error}</div>}
        {saved && <Toast text="Protocol generated successfully" />}

        <div className="csf-actions">
          <button type="button" className="csf-btn csf-btn-reset" onClick={handleReset}>Reset</button>
          <button type="submit" className="csf-btn csf-btn-submit">Generate Protocol →</button>
        </div>
      </form>

      {pdfUrl && !loading && (
        <div className="pdf-container">
          <iframe title="Generated protocol PDF" src={pdfUrl} width="100%" height="800px"
            style={{ border: "1px solid #ccc", marginTop: "20px" }} />
        </div>
      )}
    </>
  );
}

// ── Tab 2: Medical Text Analysis ─────────────────────────────────────────────

function MedicalAnalysisTab() {
  const [text, setText] = useState("");
  const [analysisType, setAnalysisType] = useState("both");
  const [procedureType, setProcedureType] = useState("General Assessment");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!text.trim()) e.text = "Please enter clinical text.";
    if (!analysisType) e.analysisType = "Please choose an analysis type.";
    if ((analysisType === "icd10" || analysisType === "both") && !procedureType) {
      e.procedureType = "Please select a procedure type.";
    }
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    setResult(null);
    try {
      const { request } = http.post("api/Study/medical-analysis", {
        text,
        analysisType,
        procedureType,
      });
      const response = await request;
      setResult(response.data);
    } catch (err) {
      console.error(err);
      setErrors({ submit: "Failed to analyze medical text. Please check if the backend is running." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && <LoadingOverlay message="Analyzing medical text..." />}
      <form className="csf-form" onSubmit={handleSubmit}>
        <div className="csf-field csf-field-full">
          <label className="csf-label">Analysis Type</label>
          <div className="csf-choice-row">
            {[
              { value: "sdoh", label: "SDOH" },
              { value: "icd10", label: "ICD-10" },
              { value: "both", label: "Both" },
            ].map((option) => (
              <label
                key={option.value}
                className={`csf-choice ${analysisType === option.value ? "csf-choice-active" : ""}`}
              >
                <input
                  type="radio"
                  name="analysisType"
                  value={option.value}
                  checked={analysisType === option.value}
                  onChange={(event) => setAnalysisType(event.target.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
          {errors.analysisType && <span className="error-text">{errors.analysisType}</span>}
        </div>

        {(analysisType === "icd10" || analysisType === "both") && (
          <div className="csf-field csf-field-full">
            <label className="csf-label">Procedure Type</label>
            <select
              className={`csf-select ${errors.procedureType ? "is-invalid" : ""}`}
              value={procedureType}
              onChange={(e) => setProcedureType(e.target.value)}
            >
              {PROCEDURE_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            {errors.procedureType && <span className="error-text">{errors.procedureType}</span>}
          </div>
        )}

        <div className="csf-field csf-field-full">
          <label className="csf-label">Clinical Text</label>
          <p className="csf-hint">
            Paste free-text clinical notes, discharge summaries, or patient narratives.
          </p>
          <textarea
            className={`csf-textarea csf-textarea-lg ${errors.text ? "is-invalid" : ""}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Patient is a 45-year-old male presenting with uncontrolled hypertension. Lives alone in a rural area, limited access to transportation, reports food insecurity..."
          />
          {errors.text && <span className="error-text">{errors.text}</span>}
        </div>

        {errors.submit && <div className="error-text csf-field-full">{errors.submit}</div>}

        <div className="csf-actions">
          <button
            type="button"
            className="csf-btn csf-btn-reset"
            onClick={() => { setText(""); setResult(null); setErrors({}); }}
          >
            Clear
          </button>
          <button type="submit" className="csf-btn csf-btn-submit">Analyze Text →</button>
        </div>
      </form>

      {result && (
        <ResultPanel
          badgeClassName="result-badge-medical"
          badgeText="Medical"
          title="Analysis Result"
          result={result}
          fileName="medical-analysis.pdf"
        />
      )}
    </>
  );
}

// ── Tab 3: Drug Pipeline ─────────────────────────────────────────────────────

function DrugPipelineTab() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) {
      setError("Please enter drug pipeline text.");
      return;
    }

    setError("");
    setLoading(true);
    setResult(null);
    try {
      const { request } = http.post("api/Study/drug-pipeline", { text });
      const response = await request;
      setResult(response.data);
    } catch (err) {
      console.error(err);
      setError("Failed to analyze drug pipeline text. Please check if the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && <LoadingOverlay message="Analyzing drug pipeline..." />}
      <form className="csf-form" onSubmit={handleSubmit}>
        <div className="csf-field csf-field-full">
          <label className="csf-label">Drug Pipeline Text</label>
          <p className="csf-hint">
            Paste portfolio notes, trial updates, asset descriptions, or pipeline summaries.
          </p>
          <textarea
            className={`csf-textarea csf-textarea-lg ${error ? "is-invalid" : ""}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. ABC-101 is a phase II oral TYK2 inhibitor for plaque psoriasis. Sponsor expects top-line data in Q4, with expansion into psoriatic arthritis planned..."
          />
          {error && <span className="error-text">{error}</span>}
        </div>

        <div className="csf-actions">
          <button type="button" className="csf-btn csf-btn-reset"
            onClick={() => { setText(""); setResult(null); setError(""); }}>
            Clear
          </button>
          <button type="submit" className="csf-btn csf-btn-submit">Analyze Pipeline →</button>
        </div>
      </form>

      {result && (
        <ResultPanel
          badgeClassName="result-badge-pipeline"
          badgeText="Pipeline"
          title="Harmonized Data"
          result={result}
          fileName="drug-pipeline-analysis.pdf"
        />
      )}
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const TABS = [
  { id: "study",  label: "Study Registration", icon: "📋" },
  { id: "medical", label: "Medical Analysis",    icon: "🏥" },
  { id: "pipeline", label: "Drug Pipeline",      icon: "🔬" },
];

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState("study");

  return (
    <div className="csf-body">
      <div className="csf-wrapper">
        <header style={{ marginBottom: 28 }}>
          <p className="csf-eyebrow">Clinical Research</p>
          <h1 className="csf-title">
            {activeTab === "study" && <><em>Study</em> Registration</>}
            {activeTab === "medical" && <><em>Medical</em> Analysis</>}
            {activeTab === "pipeline" && <><em>Drug</em> Pipeline</>}
          </h1>
        </header>

        <nav className="csf-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`csf-tab ${activeTab === tab.id ? "csf-tab-active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="csf-tab-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="csf-divider" />

        {activeTab === "study" && <StudyTab />}
        {activeTab === "medical" && <MedicalAnalysisTab />}
        {activeTab === "pipeline" && <DrugPipelineTab />}
      </div>
    </div>
  );
}
