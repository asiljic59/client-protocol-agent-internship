import { useState } from "react";
import "./HomeScreen.css";

const INITIAL_STATE = {
  studyTitle: "",
  therapeuticArea: "",
  disease: "",
  phase: "",
  sampleSize: "",
  arms: "",
  comparator: "",
  countries: "",
  notes: "",
};

const THERAPEUTIC_AREAS = [
  "Oncology", "Cardiology", "Neurology", "Immunology",
  "Infectious Disease", "Endocrinology", "Dermatology",
  "Gastroenterology", "Rare Diseases", "Other",
];

const PHASES = [
  "Phase I", "Phase I/II", "Phase II", "Phase II/III",
  "Phase III", "Phase IV", "Not Applicable",
];

export default function HomeScreen() {
  const [form, setForm] = useState(INITIAL_STATE);
  const [saved, setSaved] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Study data:", form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setForm(INITIAL_STATE);
    setSaved(false);
  };

  return (
    <div className="csf-body">
      <div className="csf-wrapper">
        <header style={{ marginBottom: 36 }}>
          <p className="csf-eyebrow">Clinical Research</p>
          <h1 className="csf-title">
            Study <em>Registration</em>
          </h1>
        </header>

        <div className="csf-divider" />

        <form className="csf-form" onSubmit={handleSubmit}>

          {/* Study Title */}
          <div className="csf-field csf-field-full">
            <label className="csf-label" htmlFor="studyTitle">Study Title</label>
            <input
              className="csf-input"
              id="studyTitle"
              name="studyTitle"
              type="text"
              placeholder="Enter full study title"
              value={form.studyTitle}
              onChange={handleChange}
            />
          </div>

          {/* Therapeutic Area */}
          <div className="csf-field">
            <label className="csf-label" htmlFor="therapeuticArea">Therapeutic Area</label>
            <select
              className="csf-select"
              id="therapeuticArea"
              name="therapeuticArea"
              value={form.therapeuticArea}
              onChange={handleChange}
            >
              <option value="" disabled>Select area</option>
              {THERAPEUTIC_AREAS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Disease */}
          <div className="csf-field">
            <label className="csf-label" htmlFor="disease">Disease / Indication</label>
            <input
              className="csf-input"
              id="disease"
              name="disease"
              type="text"
              placeholder="e.g. NSCLC, Type 2 Diabetes"
              value={form.disease}
              onChange={handleChange}
            />
          </div>

          {/* Phase */}
          <div className="csf-field">
            <label className="csf-label" htmlFor="phase">Phase</label>
            <select
              className="csf-select"
              id="phase"
              name="phase"
              value={form.phase}
              onChange={handleChange}
            >
              <option value="" disabled>Select phase</option>
              {PHASES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Sample Size */}
          <div className="csf-field">
            <label className="csf-label" htmlFor="sampleSize">Sample Size (N)</label>
            <input
              className="csf-input"
              id="sampleSize"
              name="sampleSize"
              type="number"
              placeholder="e.g. 240"
              min="1"
              value={form.sampleSize}
              onChange={handleChange}
            />
          </div>

          {/* Arms */}
          <div className="csf-field">
            <label className="csf-label" htmlFor="arms">Arms</label>
            <input
              className="csf-input"
              id="arms"
              name="arms"
              type="number"
              placeholder="e.g. 2"
              min="1"
              value={form.arms}
              onChange={handleChange}
            />
          </div>

          {/* Comparator */}
          <div className="csf-field">
            <label className="csf-label" htmlFor="comparator">Comparator</label>
            <input
              className="csf-input"
              id="comparator"
              name="comparator"
              type="text"
              placeholder="e.g. Placebo, Standard of Care"
              value={form.comparator}
              onChange={handleChange}
            />
          </div>

          {/* Countries */}
          <div className="csf-field csf-field-full">
            <label className="csf-label" htmlFor="countries">Countries</label>
            <input
              className="csf-input"
              id="countries"
              name="countries"
              type="text"
              placeholder="e.g. USA, Germany, Japan, Brazil"
              value={form.countries}
              onChange={handleChange}
            />
          </div>

          {/* Notes */}
          <div className="csf-field csf-field-full">
            <label className="csf-label" htmlFor="notes">Notes</label>
            <textarea
              className="csf-textarea"
              id="notes"
              name="notes"
              placeholder="Additional details, protocol remarks, or internal notes…"
              value={form.notes}
              onChange={handleChange}
            />
          </div>

          {/* Toast */}
          {saved && (
            <div className="csf-toast">Study saved successfully</div>
          )}

          {/* Actions */}
          <div className="csf-actions">
            <button
              type="button"
              className="csf-btn csf-btn-reset"
              onClick={handleReset}
            >
              Reset
            </button>
            <button type="submit" className="csf-btn csf-btn-submit">
              Save Study →
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}