import { useState } from "react";
import "./HomeScreen.css";
import HttpService from  "../../services/HttpService"

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

const http = new HttpService();


export default function HomeScreen() {
  const [form, setForm] = useState(INITIAL_STATE);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState({});

  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Generating protocol...");
  let interval = null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
      e.preventDefault();
      const validationErrors = validate(form);
      setErrors(validationErrors);

      if (Object.keys(validationErrors).length === 0) {
          try {
              setLoading(true);
              setLoadingMessage("Sending study data...");

              // Logic for rotating messages
              const messages = ["Analyzing...", "Generating PDF...", "Almost there..."];
              let msgIdx = 0;
              const intervalId = setInterval(() => {
                  if (msgIdx < messages.length) setLoadingMessage(messages[msgIdx++]);
              }, 3000);

              // 1. Pass 'blob' here!
              const { request } = http.post("api/Study", form, 'blob');
              const response = await request;

              console.log("Full Response Object:", response);

              // 2. Safety check: ensure response and response.data exist
              if (response && response.data) {
                  const blob = new Blob([response.data], { type: "application/pdf" });
                  
                  // Cleanup old URL to save memory
                  if (pdfUrl) window.URL.revokeObjectURL(pdfUrl);
                  
                  const url = window.URL.createObjectURL(blob);
                  setPdfUrl(url);
                  setSaved(true);
              } else {
                  throw new Error("Response was empty");
              }

              clearInterval(intervalId);
          } catch (err) {
              // This is where your error was caught
              console.error("Greška pri slanju:", err);
              alert("Could not generate PDF. Please check if the backend is running.");
          } finally {
              setLoading(false);
          }
      }
  };
  const handleReset = () => {
    setForm(INITIAL_STATE);
    setSaved(false);
  };

  const validate = (currentForm) => {
    let tempErrs = {};

    // Tekstualna polja i selekti
    if (!currentForm.studyTitle?.trim()) tempErrs.studyTitle = "Naslov studije je obavezan.";
    if (!currentForm.therapeuticArea) tempErrs.therapeuticArea = "Odaberite terapijsku oblast.";
    if (!currentForm.disease) tempErrs.disease = "Polje za bolest je obavezno.";
    if (!currentForm.phase) tempErrs.phase = "Odaberite fazu studije.";
    
    // Brojčana polja
    if (!currentForm.sampleSize || currentForm.sampleSize <= 0) {
      tempErrs.sampleSize = "Unesite validan broj učesnika.";
    }

    // Kompleksnija polja (npr. ako su nizovi ili specifični stringovi)
    if (!currentForm.arms) tempErrs.arms = "Unesite 'arms' podatke.";
    if (!currentForm.comparator) tempErrs.comparator = "Comparator polje je obavezno.";
    
    // Liste/Nizovi (provera da li je bar jedna država izabrana)
    if (!currentForm.countries || currentForm.countries.length === 0) {
      tempErrs.countries = "Odaberite bar jednu državu.";
    }

    return tempErrs;
  };


   return (
    <div className="csf-body">
      <div className="csf-wrapper">
        <header style={{ marginBottom: 36 }}>
          <p className="csf-eyebrow">Clinical Research</p>
          <h1 className="csf-title">Study <em>Registration</em></h1>
        </header>

        <div className="csf-divider" />

        {loading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p className="loading-text">{loadingMessage}</p>
          </div>
        )}

        <form className="csf-form" onSubmit={handleSubmit}>

          {/* Study Title */}
          <div className="csf-field csf-field-full">
            <label className="csf-label" htmlFor="studyTitle">Study Title</label>
            <input
              className={`csf-input ${errors.studyTitle ? 'is-invalid' : ''}`}
              name="studyTitle"
              type="text"
              value={form.studyTitle}
              onChange={handleChange}
            />
            {errors.studyTitle && <span className="error-text">{errors.studyTitle}</span>}
          </div>

          {/* Therapeutic Area */}
          <div className="csf-field">
            <label className="csf-label" htmlFor="therapeuticArea">Therapeutic Area</label>
            <select
              className={`csf-select ${errors.therapeuticArea ? 'is-invalid' : ''}`}
              name="therapeuticArea"
              value={form.therapeuticArea}
              onChange={handleChange}
            >
              <option value="" disabled>Select area</option>
              {THERAPEUTIC_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            {errors.therapeuticArea && <span className="error-text">{errors.therapeuticArea}</span>}
          </div>

          {/* Disease */}
          <div className="csf-field">
            <label className="csf-label" htmlFor="disease">Disease / Indication</label>
            <input
              className={`csf-input ${errors.disease ? 'is-invalid' : ''}`}
              name="disease"
              type="text"
              value={form.disease}
              onChange={handleChange}
            />
            {errors.disease && <span className="error-text">{errors.disease}</span>}
          </div>

          {/* Phase */}
          <div className="csf-field">
            <label className="csf-label" htmlFor="phase">Phase</label>
            <select
              className={`csf-select ${errors.phase ? 'is-invalid' : ''}`}
              name="phase"
              value={form.phase}
              onChange={handleChange}
            >
              <option value="" disabled>Select phase</option>
              {PHASES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            {errors.phase && <span className="error-text">{errors.phase}</span>}
          </div>

          {/* Sample Size */}
          <div className="csf-field">
            <label className="csf-label" htmlFor="sampleSize">Sample Size (N)</label>
            <input
              className={`csf-input ${errors.sampleSize ? 'is-invalid' : ''}`}
              name="sampleSize"
              type="number"
              value={form.sampleSize}
              onChange={handleChange}
            />
            {errors.sampleSize && <span className="error-text">{errors.sampleSize}</span>}
          </div>

          {/* Arms */}
          <div className="csf-field">
            <label className="csf-label" htmlFor="arms">Arms</label>
            <input
              className={`csf-input ${errors.arms ? 'is-invalid' : ''}`}
              name="arms"
              type="number"
              value={form.arms}
              onChange={handleChange}
            />
            {errors.arms && <span className="error-text">{errors.arms}</span>}
          </div>

          {/* Comparator */}
          <div className="csf-field">
            <label className="csf-label" htmlFor="comparator">Comparator</label>
            <input
              className={`csf-input ${errors.comparator ? 'is-invalid' : ''}`}
              name="comparator"
              type="text"
              value={form.comparator}
              onChange={handleChange}
            />
            {errors.comparator && <span className="error-text">{errors.comparator}</span>}
          </div>

          <div className="csf-field csf-field-full">
            <label className="csf-label" htmlFor="countries">Countries</label>
            <input
              className={`csf-input ${errors.countries ? 'is-invalid' : ''}`}
              name="countries"
              type="text"
              value={form.countries}
              onChange={handleChange}
            />
            {errors.countries && <span className="error-text">{errors.countries}</span>}
          </div>

          {/* Notes (Nema validacije, opciono polje) */}
          <div className="csf-field csf-field-full">
            <label className="csf-label" htmlFor="notes">Notes</label>
            <textarea
              className="csf-textarea"
              name="notes"
              value={form.notes}
              onChange={handleChange}
            />
          </div>

          {saved && <div className="csf-toast">Study saved successfully</div>}

          <div className="csf-actions">
            <button type="button" className="csf-btn csf-btn-reset" onClick={handleReset}>Reset</button>
            <button type="submit" className="csf-btn csf-btn-submit">Save Study →</button>
          </div>
        </form>

        {pdfUrl && !loading && (
          <div className="pdf-container">
            <iframe
              src={pdfUrl}
              width="100%"
              height="800px"
              style={{ border: "1px solid #ccc", marginTop: "20px" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}