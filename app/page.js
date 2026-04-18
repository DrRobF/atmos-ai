"use client";

import { useEffect, useMemo, useState } from "react";

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

function normalizeValue(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(", ");
  }
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  return String(value);
}

function getReportSections(result) {
  if (!result) {
    return [];
  }

  if (result.mode === "event") {
    return [
      { title: "Event Vision", items: [["Concept", result.designNotes]] },
      { title: "The Setup", items: [["Direction", result.decorPlacement]] },
      { title: "Lighting Mood", items: [["Direction", result.lighting]] },
      { title: "Signature Styling", items: [["Direction", result.floralDecor]] },
      { title: "The Energy", items: [["Direction", result.music]] },
      { title: "Guest Flow", items: [["Direction", result.roomFlow]] },
      { title: "The Moment", items: [["Highlight", result.oneSmartMove]] },
    ];
  }

  return [
    {
      title: "Lighting",
      items: [
        ["Placement", result.lighting?.whereLightShouldGo],
        ["Brightness", result.lighting?.brightnessLevel],
        ["Temperature", result.lighting?.warmCoolFeel],
      ],
    },
    {
      title: "Placement",
      items: [
        ["Move", result.placement?.whatToMove],
        ["Face", result.placement?.whatToFace],
        ["Remove", result.placement?.whatToRemove],
        ["Focal Point", result.placement?.focalPoint],
      ],
    },
    {
      title: "Sound",
      items: [
        ["Style", result.sound?.musicStyle],
        ["Tempo", result.sound?.tempo],
        ["Energy", result.sound?.energy],
        ["Search Phrases", normalizeValue(result.sound?.searchPhrases)],
      ],
    },
    {
      title: "Song Ideas",
      items: (result.songIdeas || []).map((idea, index) => [`Idea ${index + 1}`, idea]),
    },
    {
      title: "Environment",
      items: [
        ["Feel", result.environment?.emotionalSpatialFeel],
        ["Adjustments", result.environment?.roomAdjustments],
      ],
    },
    { title: "One Smart Move", items: [["Suggestion", result.oneSmartMove]] },
  ];
}

async function toDataUrl(sourceUrl) {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error("Image could not be loaded.");
  }
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result?.toString() ?? "");
    reader.onerror = () => reject(new Error("Image conversion failed."));
    reader.readAsDataURL(blob);
  });
}

function fileToDataUrl(file) {
  if (!file) {
    return Promise.resolve("");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result?.toString() ?? "");
    reader.onerror = () => reject(new Error("Image conversion failed."));
    reader.readAsDataURL(file);
  });
}

function escapePdfText(value) {
  return String(value)
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function createPdfBlob(linesByPage) {
  const objects = [];
  const addObject = (content) => {
    objects.push(content);
    return objects.length;
  };
  const byteLength = (value) => new TextEncoder().encode(value).length;

  const catalogId = addObject("<< /Type /Catalog /Pages 2 0 R >>");
  const pagesId = addObject("");
  const pageIds = [];
  const fontRegularId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const fontBoldId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  linesByPage.forEach((lines) => {
    const commands = lines
      .map((line) => {
        if (line.command) {
          return line.command;
        }
        const escaped = escapePdfText(line.text);
        const fontRef = line.bold ? "/F2" : "/F1";
        const color = line.color || "0.20 0.18 0.16 rg";
        return `${color}\nBT ${fontRef} ${line.size} Tf ${line.x ?? 44} ${line.y} Td (${escaped}) Tj ET`;
      })
      .join("\n");

    const contentId = addObject(`<< /Length ${byteLength(commands)} >>\nstream\n${commands}\nendstream`);
    const pageId = addObject(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> >>`,
    );
    pageIds.push(pageId);
  });

  objects[pagesId - 1] = `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((obj, index) => {
    offsets.push(byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefStart = byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

function wrapText(value, maxChars = 92) {
  const words = String(value).split(/\s+/);
  const lines = [];
  let current = "";

  words.forEach((word) => {
    if (!word) {
      return;
    }
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars) {
      if (current) {
        lines.push(current);
      }
      current = word;
    } else {
      current = candidate;
    }
  });

  if (current) {
    lines.push(current);
  }
  return lines;
}

function toConciseSentence(value, fallback = "—") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) {
    return fallback;
  }
  const parts = text.match(/[^.!?]+[.!?]?/g) || [];
  const trimmed = parts.slice(0, 2).join(" ").trim() || text;
  return trimmed.length > 240 ? `${trimmed.slice(0, 237)}...` : trimmed;
}

function compactEventResult(result) {
  return {
    eventVision: toConciseSentence(result.designNotes, "Elegant, intentional styling direction."),
    setup: toConciseSentence(result.decorPlacement),
    lightingMood: toConciseSentence(result.lighting),
    signatureStyling: toConciseSentence(result.floralDecor || result.designNotes),
    energy: toConciseSentence(result.music),
    guestFlow: toConciseSentence(result.roomFlow),
    moment: toConciseSentence(result.oneSmartMove),
  };
}

function getEventConceptSections(result) {
  const brief = compactEventResult(result);
  return [
    ["Event Vision", brief.eventVision],
    ["The Setup", brief.setup],
    ["Lighting Mood", brief.lightingMood],
    ["Signature Styling", brief.signatureStyling],
    ["The Energy", brief.energy],
    ["Guest Flow", brief.guestFlow],
    ["The Moment", brief.moment],
  ];
}

async function createReportPdf({ result, mode }) {
  const allLines = [
    {
      text: mode === "event" ? "Atmos AI Event Concept Brief" : "Atmos AI Personal Atmosphere Brief",
      size: 19,
      bold: true,
      y: 792,
      x: 44,
      color: "0.20 0.17 0.14 rg",
    },
    {
      text: `Generated ${new Date().toLocaleString()}`,
      size: 10,
      bold: false,
      y: 772,
      x: 44,
      color: "0.45 0.39 0.34 rg",
    },
  ];

  if (mode === "event") {
    allLines.push({
      command:
        "q 0.97 0.94 0.90 rg 44 724 507 36 re f Q q 0.74 0.64 0.54 RG 1 w 44 724 507 36 re S Q",
    });
    allLines.push({
      text: "Curated as a luxury concept brief with layout, mood, and guest-experience guidance.",
      size: 10,
      bold: false,
      y: 744,
      x: 58,
      color: "0.34 0.29 0.24 rg",
    });

    if (result.styledPreviewImageUrl) {
      try {
        await toDataUrl(result.styledPreviewImageUrl);
        allLines.push({
          text: "Styled preview image is available in the app and referenced by this PDF brief.",
          size: 9,
          y: 713,
          x: 58,
          color: "0.40 0.35 0.30 rg",
        });
      } catch {
        allLines.push({
          text: "Styled preview image could not be embedded; narrative brief remains complete.",
          size: 9,
          y: 713,
          x: 58,
          color: "0.40 0.35 0.30 rg",
        });
      }
    }
  }

  const sections =
    mode === "event"
      ? getEventConceptSections(result)
      : getReportSections(result).flatMap((section) =>
          section.items.map(([label, value]) => [`${section.title} — ${label}`, toConciseSentence(value)]),
        );

  let nextY = mode === "event" ? 684 : 742;
  sections.forEach(([title, content], idx) => {
    const wrapped = wrapText(content, 82).slice(0, 4);
    const cardHeight = 54 + wrapped.length * 14;
    if (nextY - cardHeight < 64) {
      allLines.push({ command: "__PAGE_BREAK__" });
      nextY = 770;
    }
    const cardTop = nextY;
    const cardBottom = nextY - cardHeight;
    const accent = [
      "0.45 0.63 0.59 rg",
      "0.56 0.62 0.73 rg",
      "0.62 0.67 0.56 rg",
      "0.66 0.59 0.53 rg",
      "0.61 0.56 0.69 rg",
      "0.63 0.63 0.52 rg",
      "0.58 0.67 0.72 rg",
    ][idx % 7];

    allLines.push({
      command: `q 0.99 0.97 0.94 rg 44 ${cardBottom} 507 ${cardHeight} re f Q q 0.87 0.80 0.72 RG 1 w 44 ${cardBottom} 507 ${cardHeight} re S Q q ${accent} 44 ${cardBottom} 8 ${cardHeight} re f Q`,
    });
    allLines.push({
      text: title,
      size: 12,
      bold: true,
      y: cardTop - 20,
      x: 62,
      color: "0.30 0.25 0.21 rg",
    });
    wrapped.forEach((line, index) => {
      allLines.push({
        text: line,
        size: 10,
        bold: false,
        y: cardTop - 40 - index * 14,
        x: 62,
        color: "0.29 0.24 0.20 rg",
      });
    });
    nextY -= cardHeight + 14;
  });

  const linesByPage = [];
  let pageLines = [];
  let y = 800;
  allLines.forEach((line) => {
    if (line.command === "__PAGE_BREAK__") {
      linesByPage.push(pageLines);
      pageLines = [];
      y = 800;
      return;
    }
    if (typeof line.y === "number") {
      pageLines.push(line);
      y = line.y - 14;
      return;
    }
    if (y < 50) {
      linesByPage.push(pageLines);
      pageLines = [];
      y = 800;
    }
    pageLines.push({ ...line, y });
    y -= line.size >= 12 ? 18 : 14;
  });
  if (pageLines.length) {
    linesByPage.push(pageLines);
  }

  return createPdfBlob(linesByPage);
}

async function downloadReportPdf({ result, mode }) {
  if (!result) {
    return;
  }

  const pdfBlob = await createReportPdf({ result, mode });
  const blobUrl = URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");
  const fileMode = mode === "event" ? "event" : "personal";
  link.href = blobUrl;
  link.download = `atmos-ai-${fileMode}-report.pdf`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
}

const eventSectionAccents = ["mint", "blue", "sage", "taupe", "plum", "olive", "sky"];

export default function HomePage() {
  const [mode, setMode] = useState("personal");

  const [description, setDescription] = useState("");
  const [mood, setMood] = useState(moodOptions[0]);
  const [time, setTime] = useState(timeOptions[0]);
  const [setting, setSetting] = useState(settingOptions[0]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const [venueImageFile, setVenueImageFile] = useState(null);
  const [venueImagePreview, setVenueImagePreview] = useState("");
  const [referenceImageFile, setReferenceImageFile] = useState(null);
  const [referenceImagePreview, setReferenceImagePreview] = useState("");
  const [eventType, setEventType] = useState(eventTypeOptions[0]);
  const [eventStyle, setEventStyle] = useState(eventStyleOptions[0]);
  const [eventNotes, setEventNotes] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(initialResult);

  const canSubmit = useMemo(() => {
    if (isLoading) return false;
    if (mode === "event") return Boolean(venueImageFile);
    return Boolean(description.trim() || imageFile);
  }, [mode, isLoading, description, imageFile, venueImageFile]);

  useEffect(
    () => () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    },
    [imagePreview],
  );

  useEffect(
    () => () => {
      if (venueImagePreview) URL.revokeObjectURL(venueImagePreview);
    },
    [venueImagePreview],
  );

  useEffect(
    () => () => {
      if (referenceImagePreview) URL.revokeObjectURL(referenceImagePreview);
    },
    [referenceImagePreview],
  );

  async function handlePersonalImageChange(event) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    setImageFile(file);
    setImagePreview((currentPreview) => {
      if (currentPreview) URL.revokeObjectURL(currentPreview);
      return URL.createObjectURL(file);
    });
  }

  async function handleVenueImageChange(event) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    setVenueImageFile(file);
    setVenueImagePreview((currentPreview) => {
      if (currentPreview) URL.revokeObjectURL(currentPreview);
      return URL.createObjectURL(file);
    });
  }

  async function handleReferenceImageChange(event) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    setReferenceImageFile(file);
    setReferenceImagePreview((currentPreview) => {
      if (currentPreview) URL.revokeObjectURL(currentPreview);
      return URL.createObjectURL(file);
    });
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
              venueImage: venueImageFile ? await fileToDataUrl(venueImageFile) : null,
              referenceImage: referenceImageFile ? await fileToDataUrl(referenceImageFile) : null,
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
              image: imageFile ? await fileToDataUrl(imageFile) : null,
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

  async function handleDownloadPdf() {
    if (!result || isDownloadingPdf) return;
    setError("");
    setIsDownloadingPdf(true);
    try {
      await downloadReportPdf({ result, mode });
    } catch (downloadError) {
      setError(downloadError.message || "Unable to download PDF right now.");
    } finally {
      setIsDownloadingPdf(false);
    }
  }

  return (
    <main className="page-shell">
      <div className="page-inner">
        <section className="hero card">
          <div className="hero-body">
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
                {mode === item.value && <span className="selection-mark">✓</span>}
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <section className="builder card">
          <form onSubmit={handleSubmit} className="bounded-form">
            {mode === "personal" ? (
              <>
                <div className="builder-grid">
                  <div className="field image-field">
                    <label htmlFor="imageUpload">Space Image (optional)</label>
                    <label className="upload" htmlFor="imageUpload">
                      <input id="imageUpload" type="file" accept="image/*" onChange={handlePersonalImageChange} />
                      {imagePreview ? (
                        <img src={imagePreview} alt="Uploaded space preview" />
                      ) : (
                        <div className="upload-empty">
                          <strong>Drop an image or click to upload</strong>
                          <span>Bedroom, desk, car, studio corner—anything you want to transform.</span>
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
                  <Selector label="Setting" options={settingOptions} selected={setting} onSelect={setSetting} />
                </div>
              </>
            ) : (
              <div className="event-form-shell">
                <div className="builder-grid">
                  <div className="field image-field">
                    <label htmlFor="venueImageUpload">Venue Image</label>
                    <label className="upload" htmlFor="venueImageUpload">
                      <input id="venueImageUpload" type="file" accept="image/*" onChange={handleVenueImageChange} />
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
                          <span>Upload inspiration for tablescape, floral direction, or overall styling.</span>
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
          <div className="results-header">
            <div className="results-header-main">
              <p className="results-kicker">Final Report</p>
              <h2>{mode === "event" ? "Your Event Concept Brief" : "Your Atmosphere Blueprint"}</h2>
            </div>
            <div className="results-header-actions">
              <button
                type="button"
                className="download-btn"
                onClick={handleDownloadPdf}
                disabled={!result || isLoading || isDownloadingPdf}
              >
                {isDownloadingPdf ? "Preparing PDF..." : "Download PDF"}
              </button>
            </div>
          </div>

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

          {result && !isLoading &&
            (result.mode === "event" ? <EventResults result={result} /> : <PersonalResults result={result} />)}
        </section>
      </div>

      <style jsx>{`
        .page-shell {
          min-height: 100vh;
          width: 100%;
          max-width: 100%;
          padding: 20px clamp(14px, 4vw, 34px) 40px;
          background: radial-gradient(circle at top, #faf3e8 0%, #f5ecdf 42%, #efe4d8 100%);
          overflow-x: clip;
        }

        .page-inner {
          width: min(1120px, 100%);
          margin: 0 auto;
          display: grid;
          gap: 22px;
          min-width: 0;
          overflow-x: clip;
        }

        .card {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          overflow: hidden;
          background: linear-gradient(158deg, rgba(255, 250, 244, 0.97), rgba(246, 237, 225, 0.95));
          border: 1px solid rgba(188, 168, 143, 0.38);
          border-radius: 28px;
          box-shadow: 0 20px 38px rgba(115, 92, 64, 0.14);
        }

        .hero {
          padding: clamp(22px, 3.8vw, 34px);
          display: grid;
          gap: 20px;
        }
        .hero-body {
          max-width: 820px;
          min-width: 0;
        }
        .eyebrow {
          color: #938067;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 12px;
          font-weight: 600;
          margin: 0 0 10px;
        }
        h1 {
          margin: 0;
          line-height: 1.14;
          font-size: clamp(1.9rem, 4vw, 2.8rem);
          text-wrap: balance;
          overflow-wrap: anywhere;
        }
        .subtitle {
          margin-top: 12px;
          color: #5d5146;
          overflow-wrap: anywhere;
        }

        .mode-switch {
          display: inline-grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          width: min(430px, 100%);
          background: linear-gradient(180deg, rgba(241, 231, 217, 0.95), rgba(235, 224, 210, 0.95));
          padding: 8px;
          border-radius: 20px;
          border: 1px solid rgba(182, 162, 136, 0.38);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65), 0 10px 24px rgba(128, 106, 80, 0.12);
        }
        .mode-button {
          border: 1px solid rgba(180, 162, 138, 0.45);
          background: rgba(255, 255, 255, 0.72);
          color: #4e4338;
          font-weight: 600;
          border-radius: 14px;
          padding: 11px 14px;
          cursor: pointer;
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-width: 0;
          overflow-wrap: anywhere;
        }
        .mode-button:hover {
          transform: translateY(-1px);
        }
        .mode-button.active {
          background: linear-gradient(120deg, #3f9f92 2%, #318877 56%, #246f63 100%);
          border-color: #1f5f56;
          color: #fff;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4), 0 0 0 4px rgba(63, 159, 146, 0.3), 0 10px 18px rgba(43, 106, 96, 0.28);
        }

        .selection-mark {
          width: 18px;
          height: 18px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 800;
          color: #1f5f56;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.8);
        }

        .builder {
          padding: clamp(18px, 3vw, 28px);
        }
        .bounded-form {
          width: 100%;
          min-width: 0;
        }
        .builder-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 18px;
          min-width: 0;
        }
        .field {
          display: grid;
          gap: 10px;
          min-width: 0;
          max-width: 100%;
        }
        label {
          color: #5c4f43;
          font-size: 13px;
          font-weight: 600;
          overflow-wrap: anywhere;
          letter-spacing: 0.02em;
        }
        textarea {
          width: 100%;
          max-width: 100%;
          border-radius: 16px;
          border: 1px solid rgba(191, 169, 143, 0.46);
          background: rgba(255, 251, 247, 0.95);
          color: #3f352d;
          padding: 14px;
          font-size: 15px;
          resize: vertical;
          min-height: 160px;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .notes-field textarea {
          min-height: 120px;
        }
        textarea:focus,
        button:focus,
        .chip:focus {
          outline: 2px solid #3f9f92;
          outline-offset: 2px;
        }

        .upload {
          position: relative;
          border: 1px dashed rgba(176, 152, 123, 0.52);
          border-radius: 16px;
          min-height: 210px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 251, 247, 0.88);
          overflow: hidden;
          cursor: pointer;
          min-width: 0;
          max-width: 100%;
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
          color: #776557;
          overflow-wrap: anywhere;
        }
        .upload img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .control-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 14px;
          margin-top: 18px;
          min-width: 0;
          width: 100%;
        }
        .event-form-shell {
          border: 1px solid rgba(187, 166, 140, 0.35);
          border-radius: 22px;
          padding: 16px;
          background: linear-gradient(160deg, rgba(252, 247, 240, 0.95), rgba(242, 232, 219, 0.95));
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
          min-width: 0;
        }
        .planner-brief {
          margin-top: 18px;
          border-radius: 16px;
          border: 1px solid rgba(194, 174, 150, 0.36);
          background: rgba(255, 251, 246, 0.82);
          padding: 14px;
          min-width: 0;
        }
        .planner-kicker {
          margin: 0;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #8f7962;
        }

        .cta-row {
          margin-top: 20px;
          display: grid;
          gap: 8px;
          min-width: 0;
        }
        button[type="submit"] {
          border: none;
          padding: 14px 18px;
          border-radius: 14px;
          background: linear-gradient(120deg, #3f9f92, #2f7f72);
          color: white;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          width: 100%;
          max-width: 360px;
        }
        button[type="submit"]:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .cta-row p {
          color: #78695a;
          margin: 0;
          font-size: 13px;
          overflow-wrap: anywhere;
        }
        .error {
          margin: 10px 0 0;
          color: #b44343;
          font-size: 14px;
          overflow-wrap: anywhere;
        }

        .results {
          padding: clamp(18px, 3vw, 28px);
          display: grid;
          gap: 22px;
          min-width: 0;
          max-width: 100%;
          overflow: visible;
        }
        .results-header {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: flex-end;
          gap: 14px;
          border-bottom: 1px solid rgba(190, 170, 145, 0.4);
          padding-bottom: 16px;
          width: 100%;
          max-width: 100%;
          min-width: 0;
        }
        .results-header-main {
          min-width: 0;
          max-width: 100%;
          flex: 1 1 300px;
        }
        .results-header-actions {
          min-width: 0;
          max-width: 100%;
          flex: 0 0 auto;
          display: flex;
          justify-content: flex-end;
        }
        .results-kicker {
          margin: 0 0 6px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #8f7962;
          font-size: 11px;
          font-weight: 700;
        }
        h2 {
          margin: 0;
          font-size: clamp(1.3rem, 2.6vw, 1.66rem);
          color: #3b322a;
          line-height: 1.2;
          overflow-wrap: anywhere;
          word-break: break-word;
          text-wrap: pretty;
        }

        .download-btn {
          border: 1px solid rgba(32, 90, 82, 0.82);
          color: #ffffff;
          background: linear-gradient(135deg, #3a9788 0%, #2d7d70 62%, #25685e 100%);
          border-radius: 13px;
          padding: 12px 20px;
          cursor: pointer;
          font-weight: 700;
          font-size: 0.94rem;
          letter-spacing: 0.02em;
          transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
          max-width: 100%;
          white-space: normal;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 10px 22px rgba(35, 103, 93, 0.27);
        }
        .download-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.42), 0 12px 24px rgba(35, 103, 93, 0.31);
        }
        .download-btn:active:not(:disabled) {
          transform: translateY(0);
          filter: saturate(1.05);
        }
        .download-btn:disabled {
          opacity: 0.78;
          color: rgba(246, 255, 252, 0.96);
          background: linear-gradient(135deg, #67a79b 0%, #5f9289 62%, #557f77 100%);
          border-color: rgba(77, 117, 110, 0.86);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.22), 0 7px 14px rgba(44, 76, 71, 0.22);
          cursor: not-allowed;
        }

        .empty-state,
        .loading-state {
          border: 1px solid rgba(190, 168, 142, 0.34);
          border-radius: 14px;
          padding: 18px;
          color: #66594c;
          background: rgba(255, 251, 246, 0.9);
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
          max-width: 100%;
          overflow-wrap: anywhere;
        }
        .loading-preview-note {
          margin: 6px 0 0;
          font-size: 0.84rem;
          color: #79695a;
        }
        .spinner {
          width: 18px;
          height: 18px;
          border-radius: 999px;
          border: 2px solid rgba(140, 173, 167, 0.32);
          border-top-color: #3f9f92;
          animation: spin 0.8s linear infinite;
          flex: 0 0 auto;
        }

        .result-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 16px;
          min-width: 0;
          width: 100%;
          max-width: 100%;
          overflow-wrap: anywhere;
        }
        .result-card {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          border: 1px solid rgba(185, 163, 136, 0.34);
          border-radius: 20px;
          padding: 18px;
          background: linear-gradient(162deg, rgba(255, 252, 247, 0.98), rgba(245, 236, 225, 0.95));
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72), 0 10px 20px rgba(128, 103, 72, 0.09);
          overflow: visible;
        }
        .result-card h3 {
          margin: 0 0 14px;
          color: #4b4036;
          font-size: 1.12rem;
          letter-spacing: 0.01em;
          overflow-wrap: anywhere;
        }

        .event-hero {
          border-radius: 20px;
          border: 1px solid rgba(186, 164, 137, 0.36);
          background: linear-gradient(120deg, rgba(255, 248, 239, 0.95), rgba(241, 229, 214, 0.96));
          padding: 18px;
          display: grid;
          gap: 10px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
          min-width: 0;
        }
        .event-hero-eyebrow {
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 11px;
          color: #8d7761;
          font-weight: 700;
        }
        .event-hero-title {
          margin: 0;
          font-size: clamp(1.12rem, 2.4vw, 1.5rem);
          color: #3c3027;
          text-wrap: balance;
        }
        .event-hero-subtitle {
          margin: 0;
          color: #5d5045;
          line-height: 1.52;
          max-width: 74ch;
          overflow-wrap: anywhere;
          text-wrap: pretty;
        }

        .event-brief-card {
          position: relative;
          padding-left: 16px;
        }
        .event-brief-card::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 8px;
          border-radius: 12px;
          background: #86b9b0;
        }
        .event-brief-card.blue::before {
          background: #95a9cb;
        }
        .event-brief-card.sage::before {
          background: #9eb78a;
        }
        .event-brief-card.taupe::before {
          background: #b79f90;
        }
        .event-brief-card.plum::before {
          background: #a89bc2;
        }
        .event-brief-card.olive::before {
          background: #b2af7d;
        }
        .event-brief-card.sky::before {
          background: #90b4be;
        }
        .brief-eyebrow {
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-size: 11px;
          color: #8d7862;
          font-weight: 700;
          overflow-wrap: anywhere;
        }
        .brief-summary {
          margin: 8px 0 0;
          color: #3f352d;
          line-height: 1.58;
          font-size: 0.97rem;
          overflow-wrap: anywhere;
          word-break: break-word;
          text-wrap: pretty;
        }
        .item {
          margin: 0 0 10px;
          color: #4b4037;
          font-size: 14px;
          line-height: 1.5;
          overflow-wrap: anywhere;
          word-break: break-word;
          text-wrap: pretty;
        }
        .item strong {
          color: #2f2823;
          margin-right: 4px;
        }

        .preview-panel {
          border: 1px solid rgba(186, 164, 137, 0.36);
          border-radius: 20px;
          padding: 20px;
          background: linear-gradient(145deg, rgba(255, 251, 246, 0.98), rgba(245, 234, 221, 0.95));
          min-height: 180px;
          display: grid;
          gap: 18px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75), 0 18px 26px rgba(121, 99, 71, 0.12);
          min-width: 0;
          width: 100%;
          overflow: hidden;
        }
        .preview-panel p {
          margin: 0;
          color: #5c4e43;
          line-height: 1.45;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .preview-frame {
          border-radius: 14px;
          border: 1px solid rgba(196, 172, 143, 0.34);
          background: radial-gradient(circle at 20% 20%, rgba(234, 198, 145, 0.28), transparent 45%),
            radial-gradient(circle at 85% 10%, rgba(152, 199, 187, 0.28), transparent 38%),
            linear-gradient(170deg, rgba(246, 236, 223, 0.95), rgba(235, 223, 208, 0.94));
          min-height: 138px;
          padding: 14px;
          display: grid;
          align-content: space-between;
          gap: 14px;
          min-width: 0;
          overflow: hidden;
        }
        .preview-image-shell {
          border-radius: 14px;
          border: 1px solid rgba(193, 169, 141, 0.38);
          background: linear-gradient(160deg, rgba(249, 239, 226, 0.94), rgba(236, 225, 211, 0.95));
          overflow: hidden;
          min-height: 220px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px;
          box-shadow: 0 12px 22px rgba(124, 101, 72, 0.16);
          width: 100%;
          max-width: 100%;
        }
        .preview-image {
          display: block;
          width: 100%;
          max-width: 100%;
          height: auto;
          max-height: 560px;
          object-fit: contain;
        }
        .preview-fallback {
          display: grid;
          gap: 10px;
          min-width: 0;
        }
        .preview-prompt {
          border-radius: 12px;
          border: 1px solid rgba(188, 164, 137, 0.35);
          background: rgba(255, 252, 247, 0.84);
          padding: 12px;
          color: #4f443a;
          font-size: 0.92rem;
          line-height: 1.5;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .preview-caption {
          margin: 0;
          font-size: 0.85rem;
          color: #7e6e60;
        }
        .preview-layout {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 8px;
          min-height: 62px;
          min-width: 0;
        }
        .preview-block {
          border-radius: 10px;
          border: 1px solid rgba(194, 170, 143, 0.34);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.65), rgba(246, 237, 226, 0.55));
          min-width: 0;
        }
        .preview-block.secondary {
          background: linear-gradient(180deg, rgba(152, 199, 187, 0.35), rgba(255, 255, 255, 0.2));
        }
        .preview-chip-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          min-width: 0;
        }
        .preview-chip {
          font-size: 11px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          border-radius: 999px;
          padding: 5px 9px;
          color: #4c4137;
          border: 1px solid rgba(191, 168, 141, 0.34);
          background: rgba(255, 249, 242, 0.82);
        }
        .preview-tag {
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #8f7962;
          font-weight: 600;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (min-width: 820px) {
          .builder-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .control-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          .event-controls {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.1fr);
            align-items: start;
          }
          .result-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .result-grid.event-grid .preview-panel,
          .result-grid.event-grid .event-hero,
          .result-grid.event-grid .result-card.smart-move {
            grid-column: span 2;
          }
        }

        @media (max-width: 760px) {
          .results-header {
            flex-direction: column;
            align-items: stretch;
          }
          .results-header-actions {
            width: 100%;
          }
          .download-btn {
            width: 100%;
            display: flex;
          }
          button[type="submit"] {
            max-width: 100%;
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
            aria-pressed={selected === option}
            data-selected={selected === option ? "true" : "false"}
            onClick={() => onSelect(option)}
          >
            {option}
          </button>
        ))}
      </div>
      <style jsx>{`
        .selector {
          display: grid;
          gap: 9px;
          min-width: 0;
        }
        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: stretch;
          min-width: 0;
          width: 100%;
        }
        .chips .chip {
          border: 1px solid rgba(183, 164, 140, 0.8);
          color: #4f4338;
          padding: 10px 18px;
          border-radius: 999px;
          background: linear-gradient(180deg, #fffdf9, #f2eade);
          cursor: pointer;
          font-weight: 700;
          letter-spacing: 0.01em;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          max-width: 100%;
          min-width: 0;
          white-space: normal;
          text-align: center;
          overflow-wrap: anywhere;
          word-break: break-word;
          box-shadow: 0 2px 8px rgba(118, 94, 66, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.84);
        }
        .chips .chip:hover {
          transform: translateY(-1px);
          box-shadow: 0 7px 15px rgba(121, 96, 67, 0.14);
          border-color: rgba(162, 141, 116, 0.95);
        }
        .chips .chip:focus-visible {
          outline: 2px solid #3b9a8c;
          outline-offset: 2px;
        }
        .chips .chip.active,
        .chips .chip[data-selected="true"] {
          background: linear-gradient(138deg, #2f8b7e 0%, #2a786d 58%, #20655c 100%);
          border-color: rgba(30, 87, 79, 0.95);
          color: #f8fffd;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.33), 0 0 0 3px rgba(47, 139, 126, 0.27),
            0 9px 18px rgba(28, 86, 77, 0.31);
        }
      `}</style>
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
      <ResultCard title="Song Ideas" items={(result.songIdeas || []).map((idea, index) => [`Idea ${index + 1}`, idea])} />
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
  const conceptSections = getEventConceptSections(result);

  return (
    <div className="result-grid event-grid">
      <article className="event-hero">
        <p className="event-hero-eyebrow">Event Concept Brief</p>
        <h3 className="event-hero-title">A polished event narrative for concept, execution, and guest experience.</h3>
        <p className="event-hero-subtitle">
          This brief is structured in a fixed section order to make planning handoff clean and reliable for designers,
          production teams, and client approvals.
        </p>
      </article>

      <article className="preview-panel">
        <span className="preview-tag">Styled Preview</span>
        {hasStyledPreviewImage ? (
          <div className="preview-image-shell">
            <img src={result.styledPreviewImageUrl} alt="Generated styled event concept preview" className="preview-image" />
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
        {hasStyledPreviewPrompt ? (
          <p className="preview-prompt">
            {toConciseSentence(result.styledPreviewPrompt, "A cinematic design direction will appear here.")}
          </p>
        ) : (
          <p className="preview-prompt">A styled preview concept prompt will appear here.</p>
        )}
      </article>

      {conceptSections.map(([title, summary], index) => (
        <EventBriefCard
          key={title}
          title={title}
          summary={summary}
          className={`${eventSectionAccents[index % eventSectionAccents.length]} ${index === conceptSections.length - 1 ? "smart-move" : ""}`}
        />
      ))}
    </div>
  );
}

function EventBriefCard({ title, summary, className = "" }) {
  return (
    <article className={`result-card event-brief-card ${className}`.trim()}>
      <p className="brief-eyebrow">{title}</p>
      <p className="brief-summary">{summary}</p>
    </article>
  );
}
