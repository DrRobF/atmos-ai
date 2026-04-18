"use client";

import { useMemo, useState } from "react";

const modeOptions = [
  { value: "personal", label: "Personal Mode" },
  { value: "event", label: "Event Mode" },
];

const moodOptions = ["Relaxed", "Focus", "Romantic", "Creative", "Energized"];
const timeOptions = ["Day", "Night"];
const settingOptions = ["Alone", "Work", "Date", "Hosting"];

const eventTypeOptions = [
  "Wedding",
  "Birthday",
  "Private Dinner",
  "Corporate",
  "Baby Shower",
  "Bridal Shower",
  "Anniversary",
  "Cocktail Night",
];

const eventStyleOptions = [
  "Romantic",
  "Modern Candlelight",
  "Tropical Luxe",
  "Elegant",
  "Intimate",
  "Glam",
  "Minimal Chic",
  "Editorial",
];

const initialResult = null;

export default function HomePage() {
  const [mode, setMode] = useState("personal");

  // Personal mode fields
  const [description, setDescription] = useState("");
  const [mood, setMood] = useState(moodOptions[0]);
  const [time, setTime] = useState(timeOptions[0]);
  const [setting, setSetting] = useState(settingOptions[0]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  // Event mode fields
  const [venueImageFile, setVenueImageFile] = useState(null);
  const [venueImagePreview, setVenueImagePreview] = useState("");
  const [referenceImageFile, setReferenceImageFile] = useState(null);
  const [referenceImagePreview, setReferenceImagePreview] = useState("");
  const [eventType, setEventType] = useState(eventTypeOptions[0]);
  const [eventStyle, setEventStyle] = useState(eventStyleOptions[0]);
  const [eventNotes, setEventNotes] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(initialResult);

  const canSubmit = useMemo(() => {
    if (isLoading) {
      return false;
    }

    if (mode === "event") {
      return Boolean(venueImageFile);
    }

    return Boolean(description.trim() || imageFile);
  }, [mode, isLoading, description, imageFile, venueImageFile]);

  async function readImageFile(file, onPreview) {
    if (!file) {
      onPreview("");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => onPreview(reader.result?.toString() ?? "");
    reader.readAsDataURL(file);
  }

  async function handlePersonalImageChange(event) {
    const file = event.target.files?.[0] ?? null;
    setImageFile(file);
    readImageFile(file, setImagePreview);
  }

  async function handleVenueImageChange(event) {
    const file = event.target.files?.[0] ?? null;
    setVenueImageFile(file);
    readImageFile(file, setVenueImagePreview);
  }

  async function handleReferenceImageChange(event) {
    const file = event.target.files?.[0] ?? null;
    setReferenceImageFile(file);
    readImageFile(file, setReferenceImagePreview);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const body =
        mode === "event"
          ? {
              mode,
              venueImage: venueImagePreview || null,
              referenceImage: referenceImagePreview || null,
              eventType,
              eventStyle,
              notes: eventNotes,
            }
          : {
              mode,
              description,
              mood,
              time,
              setting,
              image: imagePreview || null,
            };

      const response = await fetch("/api/atmosphere", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Unable to build your atmosphere right now.");
      }

      const payload = await response.json();
      setResult(payload);
    } catch (submitError) {
      setError(submitError.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="atmos-page">
      <section className="hero card">
        <div>
          <p className="eyebrow">Atmos AI</p>
          <h1>Design the perfect atmosphere for everyday spaces and standout events.</h1>
          <p className="subtitle">
            Personal mode keeps your original vibe blueprint flow. Event mode upgrades Atmos into a
            venue styling assistant for lighting, decor placement, music, and room flow.
          </p>
        </div>

        <div className="mode-switch" role="tablist" aria-label="Mode switch">
          {modeOptions.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={mode === item.value}
              className={`mode-button ${mode === item.value ? "active" : ""}`}
              onClick={() => {
                setMode(item.value);
                setResult(null);
                setError("");
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="builder card">
        <form onSubmit={handleSubmit}>
          {mode === "personal" ? (
            <>
              <div className="builder-grid">
                <div className="field image-field">
                  <label htmlFor="imageUpload">Space Image (optional)</label>
                  <label className="upload" htmlFor="imageUpload">
                    <input
                      id="imageUpload"
                      type="file"
                      accept="image/*"
                      onChange={handlePersonalImageChange}
                    />
                    {imagePreview ? (
                      <img src={imagePreview} alt="Uploaded space preview" />
                    ) : (
                      <div className="upload-empty">
                        <strong>Drop an image or click to upload</strong>
                        <span>
                          Bedroom, desk, car, studio corner—anything you want to transform.
                        </span>
                      </div>
                    )}
                  </label>
                </div>

                <div className="field">
                  <label htmlFor="description">Describe the space or target vibe (optional)</label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Example: I want this room to feel calm, intimate, and expensive at night."
                    rows={8}
                  />
                </div>
              </div>

              <div className="control-grid">
                <Selector label="Mood" options={moodOptions} selected={mood} onSelect={setMood} />
                <Selector label="Time" options={timeOptions} selected={time} onSelect={setTime} />
                <Selector
                  label="Setting"
                  options={settingOptions}
                  selected={setting}
                  onSelect={setSetting}
                />
              </div>
            </>
          ) : (
            <>
              <div className="event-form-shell">
                <div className="builder-grid">
                  <div className="field image-field">
                    <label htmlFor="venueImageUpload">Venue Image</label>
                    <label className="upload" htmlFor="venueImageUpload">
                      <input
                        id="venueImageUpload"
                        type="file"
                        accept="image/*"
                        onChange={handleVenueImageChange}
                      />
                      {venueImagePreview ? (
                        <img src={venueImagePreview} alt="Uploaded venue preview" />
                      ) : (
                        <div className="upload-empty">
                          <strong>Drop a venue image or click to upload</strong>
                          <span>Main room, patio, ballroom, rooftop, or private dining layout.</span>
                        </div>
                      )}
                    </label>
                  </div>

                  <div className="field image-field">
                    <label htmlFor="referenceImageUpload">Decor / Table Reference (optional)</label>
                    <label className="upload" htmlFor="referenceImageUpload">
                      <input
                        id="referenceImageUpload"
                        type="file"
                        accept="image/*"
                        onChange={handleReferenceImageChange}
                      />
                      {referenceImagePreview ? (
                        <img src={referenceImagePreview} alt="Uploaded decor reference preview" />
                      ) : (
                        <div className="upload-empty">
                          <strong>Optional style reference image</strong>
                          <span>
                            Upload inspiration for tablescape, floral direction, or overall styling.
                          </span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <div className="planner-brief">
                  <p className="planner-kicker">Event Brief</p>
                  <div className="control-grid event-controls">
                    <Selector
                      label="Event Type"
                      options={eventTypeOptions}
                      selected={eventType}
                      onSelect={setEventType}
                    />
                    <Selector
                      label="Style"
                      options={eventStyleOptions}
                      selected={eventStyle}
                      onSelect={setEventStyle}
                    />
                    <div className="field notes-field">
                      <label htmlFor="eventNotes">Planner Notes (optional)</label>
                      <textarea
                        id="eventNotes"
                        value={eventNotes}
                        onChange={(event) => setEventNotes(event.target.value)}
                        placeholder="Guest count, special moments, keynote timing, menu style, or any non-negotiables."
                        rows={4}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="cta-row">
            <button type="submit" disabled={!canSubmit}>
              {isLoading
                ? mode === "event"
                  ? "Designing Event Atmosphere..."
                  : "Building Atmosphere..."
                : mode === "event"
                  ? "Build Event Atmosphere"
                  : "Build My Atmosphere"}
            </button>
            <p>
              {mode === "event"
                ? "Venue image is required. Add a style reference image to improve styling adaptation."
                : "Use image, text, or both together for the best result."}
            </p>
          </div>

          {error && <p className="error">{error}</p>}
        </form>
      </section>

      <section className="results card">
        <h2>{mode === "event" ? "Your Event Atmosphere Blueprint" : "Your Atmosphere Blueprint"}</h2>

        {!result && !isLoading && (
          <div className="empty-state">
            <p>
              {mode === "event" ? (
                <>
                  No event blueprint yet. Add your venue details above and click
                  <strong> Build Event Atmosphere</strong>.
                </>
              ) : (
                <>
                  No blueprint yet. Add your inputs above and click
                  <strong> Build My Atmosphere</strong>.
                </>
              )}
            </p>
          </div>
        )}

        {isLoading && (
          <div className="loading-state">
            <div className="spinner" />
            <div>
              <p>
                {mode === "event"
                  ? "Analyzing your venue and preparing a premium event styling plan..."
                  : "Analyzing your space and composing your atmosphere plan..."}
              </p>
              {mode === "event" && (
                <p className="loading-preview-note">
                  Creating a styled concept preview render for your event...
                </p>
              )}
            </div>
          </div>
        )}

        {result && !isLoading && (result.mode === "event" ? <EventResults result={result} /> : <PersonalResults result={result} />)}
      </section>

      <style jsx>{`
        .atmos-page {
          min-height: 100vh;
          background: radial-gradient(circle at top, #2b1455 0%, #0a0b14 42%, #07070f 100%);
          color: #f5f2ff;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
          padding: 24px;
          display: grid;
          gap: 22px;
          max-width: 1100px;
          margin: 0 auto;
        }

        .card {
          background: rgba(20, 20, 35, 0.76);
          border: 1px solid rgba(190, 166, 255, 0.16);
          border-radius: 20px;
          backdrop-filter: blur(8px);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
        }

        .hero {
          padding: 32px;
          display: grid;
          gap: 18px;
        }

        .eyebrow {
          color: #bc9cff;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 12px;
          font-weight: 600;
          margin: 0 0 10px;
        }

        h1 {
          margin: 0;
          line-height: 1.15;
          font-size: clamp(1.85rem, 4vw, 2.8rem);
        }

        .subtitle {
          margin-top: 12px;
          color: #d5c9f7;
          max-width: 780px;
        }

        .mode-switch {
          position: relative;
          display: inline-grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          width: min(420px, 100%);
          background: linear-gradient(180deg, rgba(16, 15, 30, 0.95), rgba(9, 8, 18, 0.95));
          padding: 8px;
          border-radius: 14px;
          border: 1px solid rgba(201, 174, 255, 0.24);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 14px 28px rgba(3, 2, 9, 0.38);
        }

        .mode-switch::after {
          content: "";
          position: absolute;
          inset: 6px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.04);
          pointer-events: none;
        }

        .mode-button {
          border: 1px solid rgba(201, 174, 255, 0.24);
          background: rgba(255, 255, 255, 0.01);
          color: #d9c9ff;
          font-weight: 600;
          border-radius: 10px;
          padding: 10px 12px;
          cursor: pointer;
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .mode-button:hover {
          transform: translateY(-1px);
          border-color: rgba(214, 188, 255, 0.42);
        }

        .mode-button.active {
          background: linear-gradient(120deg, #a57bff 5%, #764fff 45%, #6247ff 100%);
          border-color: #c7aeff;
          color: white;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 10px 20px rgba(90, 55, 210, 0.46);
        }

        .builder {
          padding: 24px;
        }

        .builder-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 18px;
        }

        .field {
          display: grid;
          gap: 10px;
        }

        label {
          color: #e7dcff;
          font-size: 14px;
          font-weight: 500;
        }

        textarea {
          width: 100%;
          border-radius: 14px;
          border: 1px solid rgba(206, 185, 255, 0.2);
          background: rgba(8, 7, 16, 0.7);
          color: #f5f0ff;
          padding: 14px;
          font-size: 15px;
          resize: vertical;
          min-height: 160px;
        }

        .notes-field textarea {
          min-height: 120px;
        }

        textarea:focus,
        button:focus,
        .chip:focus {
          outline: 2px solid #b088ff;
          outline-offset: 2px;
        }

        .upload {
          position: relative;
          border: 1px dashed rgba(206, 185, 255, 0.4);
          border-radius: 14px;
          min-height: 210px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(8, 7, 16, 0.7);
          overflow: hidden;
          cursor: pointer;
        }

        .upload input {
          position: absolute;
          inset: 0;
          opacity: 0;
          cursor: pointer;
          width: 100%;
          height: 100%;
        }

        .upload-empty {
          text-align: center;
          display: grid;
          gap: 6px;
          padding: 18px;
          color: #c4b6e9;
        }

        .upload img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .control-grid {
          display: grid;
          grid-template-columns: repeat(1, minmax(0, 1fr));
          gap: 14px;
          margin-top: 18px;
        }

        .event-form-shell {
          border: 1px solid rgba(201, 173, 255, 0.22);
          border-radius: 16px;
          padding: 16px;
          background: linear-gradient(160deg, rgba(22, 18, 38, 0.9), rgba(11, 10, 22, 0.85));
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .planner-brief {
          margin-top: 18px;
          border-radius: 14px;
          border: 1px solid rgba(207, 185, 255, 0.22);
          background: rgba(10, 9, 19, 0.68);
          padding: 14px;
        }

        .planner-kicker {
          margin: 0;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #d0b8ff;
        }

        .planner-brief .control-grid {
          margin-top: 12px;
        }

        .selector {
          display: grid;
          gap: 8px;
        }

        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .chip {
          border: 1px solid rgba(204, 178, 255, 0.24);
          color: #dfd2ff;
          padding: 8px 12px;
          border-radius: 999px;
          background: transparent;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .chip.active {
          background: linear-gradient(120deg, #9d6dff, #6f48ff);
          border-color: #c7aeff;
          color: white;
          box-shadow: 0 8px 20px rgba(100, 70, 210, 0.5);
        }

        .cta-row {
          margin-top: 20px;
          display: grid;
          gap: 8px;
        }

        button[type="submit"] {
          border: none;
          padding: 14px 18px;
          border-radius: 12px;
          background: linear-gradient(120deg, #a173ff, #7044ff);
          color: white;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
        }

        button[type="submit"]:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .cta-row p {
          color: #baa8e5;
          margin: 0;
          font-size: 13px;
        }

        .error {
          margin: 10px 0 0;
          color: #ff9292;
          font-size: 14px;
        }

        .results {
          padding: 24px;
        }

        h2 {
          margin: 0 0 16px;
          font-size: 1.15rem;
          color: #ebe1ff;
        }

        .empty-state,
        .loading-state {
          border: 1px solid rgba(201, 173, 255, 0.2);
          border-radius: 14px;
          padding: 18px;
          color: #cbbbe9;
          background: rgba(14, 12, 25, 0.7);
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .loading-preview-note {
          margin: 6px 0 0;
          font-size: 0.84rem;
          color: #bca6ea;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border-radius: 999px;
          border: 2px solid rgba(193, 165, 255, 0.25);
          border-top-color: #b995ff;
          animation: spin 0.8s linear infinite;
          flex: 0 0 auto;
        }

        .result-grid {
          display: grid;
          grid-template-columns: repeat(1, minmax(0, 1fr));
          gap: 12px;
        }

        .result-grid.event-grid {
          gap: 14px;
        }

        .result-card {
          border: 1px solid rgba(200, 174, 255, 0.15);
          border-radius: 14px;
          padding: 14px;
          background: rgba(12, 10, 20, 0.78);
        }

        .result-card h3 {
          margin: 0 0 8px;
          color: #dccaff;
          font-size: 1rem;
        }

        .item {
          margin: 0 0 7px;
          color: #cdbce9;
          font-size: 14px;
          line-height: 1.4;
        }

        .item strong {
          color: #f2ecff;
          margin-right: 4px;
        }

        .preview-panel {
          border: 1px solid rgba(219, 196, 255, 0.2);
          border-radius: 16px;
          padding: 18px;
          background: linear-gradient(145deg, rgba(27, 21, 46, 0.95), rgba(14, 12, 26, 0.95));
          min-height: 180px;
          display: grid;
          gap: 14px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 22px 30px rgba(0, 0, 0, 0.24);
        }

        .preview-panel p {
          margin: 0;
          color: #cebee9;
          line-height: 1.45;
        }

        .preview-frame {
          border-radius: 14px;
          border: 1px solid rgba(232, 214, 255, 0.26);
          background: radial-gradient(circle at 20% 20%, rgba(245, 204, 146, 0.18), transparent 45%),
            radial-gradient(circle at 85% 10%, rgba(167, 117, 255, 0.2), transparent 38%),
            linear-gradient(170deg, rgba(29, 22, 48, 0.92), rgba(18, 15, 30, 0.92));
          min-height: 138px;
          padding: 14px;
          display: grid;
          align-content: space-between;
          gap: 14px;
        }

        .preview-image-shell {
          border-radius: 14px;
          border: 1px solid rgba(232, 214, 255, 0.26);
          background: linear-gradient(160deg, rgba(17, 14, 29, 0.95), rgba(10, 9, 18, 0.95));
          overflow: hidden;
          min-height: 220px;
          box-shadow: 0 14px 28px rgba(0, 0, 0, 0.28);
        }

        .preview-image {
          display: block;
          width: 100%;
          height: auto;
          min-height: 220px;
          object-fit: cover;
        }

        .preview-fallback {
          display: grid;
          gap: 10px;
        }

        .preview-prompt {
          border-radius: 12px;
          border: 1px solid rgba(227, 208, 255, 0.2);
          background: rgba(245, 231, 255, 0.04);
          padding: 12px;
          color: #decfff;
          font-size: 0.92rem;
          line-height: 1.5;
        }

        .preview-caption {
          margin: 0;
          font-size: 0.85rem;
          color: #bca6ea;
        }

        .preview-layout {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 8px;
          min-height: 62px;
        }

        .preview-block {
          border-radius: 10px;
          border: 1px solid rgba(243, 232, 255, 0.18);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(248, 237, 255, 0.03));
        }

        .preview-block.secondary {
          background: linear-gradient(180deg, rgba(184, 151, 255, 0.2), rgba(255, 255, 255, 0.05));
        }

        .preview-chip-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .preview-chip {
          font-size: 11px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          border-radius: 999px;
          padding: 5px 9px;
          color: #f4eafe;
          border: 1px solid rgba(238, 221, 255, 0.25);
          background: rgba(245, 232, 255, 0.08);
        }

        .preview-tag {
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #b998ff;
          font-weight: 600;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }


        @media (min-width: 820px) {
          .atmos-page {
            padding: 36px 28px 48px;
          }

          .builder-grid {
            grid-template-columns: 1fr 1fr;
          }

          .control-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .event-controls {
            grid-template-columns: 1fr 1fr 1.1fr;
            align-items: start;
          }

          .result-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .result-grid.event-grid .preview-panel,
          .result-grid.event-grid .result-card.smart-move {
            grid-column: span 2;
          }
        }
      `}</style>
    </main>
  );
}

function Selector({ label, options, selected, onSelect }) {
  return (
    <div className="selector">
      <label>{label}</label>
      <div className="chips">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={`chip ${selected === option ? "active" : ""}`}
            onClick={() => onSelect(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function ResultCard({ title, items, className = "" }) {
  return (
    <article className={`result-card ${className}`.trim()}>
      <h3>{title}</h3>
      {items.map(([label, value]) => (
        <p key={`${title}-${label}`} className="item">
          <strong>{label}:</strong>
          {value || "—"}
        </p>
      ))}
    </article>
  );
}

function PersonalResults({ result }) {
  return (
    <div className="result-grid">
      <ResultCard
        title="Lighting"
        items={[
          ["Placement", result.lighting?.whereLightShouldGo],
          ["Brightness", result.lighting?.brightnessLevel],
          ["Temperature", result.lighting?.warmCoolFeel],
        ]}
      />
      <ResultCard
        title="Placement"
        items={[
          ["Move", result.placement?.whatToMove],
          ["Face", result.placement?.whatToFace],
          ["Remove", result.placement?.whatToRemove],
          ["Focal Point", result.placement?.focalPoint],
        ]}
      />
      <ResultCard
        title="Sound"
        items={[
          ["Style", result.sound?.musicStyle],
          ["Tempo", result.sound?.tempo],
          ["Energy", result.sound?.energy],
          ["Search Phrases", (result.sound?.searchPhrases || []).join(", ")],
        ]}
      />
      <ResultCard
        title="Song Ideas"
        items={(result.songIdeas || []).map((idea, index) => [`Idea ${index + 1}`, idea])}
      />
      <ResultCard
        title="Environment"
        items={[
          ["Feel", result.environment?.emotionalSpatialFeel],
          ["Adjustments", result.environment?.roomAdjustments],
        ]}
      />
      <ResultCard title="One Smart Move" items={[["Suggestion", result.oneSmartMove]]} />
    </div>
  );
}

function EventResults({ result }) {
  const hasStyledPreviewImage = Boolean(result.styledPreviewImageUrl);
  const hasStyledPreviewPrompt = Boolean(result.styledPreviewPrompt);

  return (
    <div className="result-grid event-grid">
      <article className="preview-panel">
        <span className="preview-tag">Styled Preview</span>
        {hasStyledPreviewImage ? (
          <div className="preview-image-shell">
            <img
              src={result.styledPreviewImageUrl}
              alt="Generated styled event concept preview"
              className="preview-image"
            />
          </div>
        ) : (
          <div className="preview-fallback">
            <div className="preview-frame" aria-hidden="true">
              <div className="preview-layout">
                <div className="preview-block" />
                <div className="preview-block secondary" />
              </div>
              <div className="preview-chip-row">
                <span className="preview-chip">Tablescape</span>
                <span className="preview-chip">Lighting Wash</span>
                <span className="preview-chip">Guest Flow</span>
              </div>
            </div>
            <p className="preview-caption">
              Preview image generation is unavailable right now. Use this visual concept prompt.
            </p>
          </div>
        )}
        {hasStyledPreviewPrompt && <p className="preview-prompt">{result.styledPreviewPrompt}</p>}
        {!hasStyledPreviewPrompt && (
          <p className="preview-prompt">A styled preview concept prompt will appear here.</p>
        )}
      </article>
      <ResultCard title="Lighting Plan" items={[["Recommendations", result.lighting]]} />
      <ResultCard title="Decor Placement" items={[["Recommendations", result.decorPlacement]]} />
      <ResultCard title="Music & Entertainment" items={[["Recommendations", result.music]]} />
      <ResultCard title="Flow of the Room" items={[["Recommendations", result.roomFlow]]} />
      <ResultCard title="Design Notes" items={[["Recommendations", result.designNotes]]} />
      <ResultCard
        title="One Smart Move"
        items={[["High-Impact Action", result.oneSmartMove]]}
        className="smart-move"
      />
    </div>
  );
}
