import { NextResponse } from "next/server";

const MODEL = "gpt-4.1-mini";

const personalSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    mode: { type: "string", enum: ["personal"] },
    lighting: {
      type: "object",
      additionalProperties: false,
      properties: {
        whereLightShouldGo: { type: "string" },
        brightnessLevel: { type: "string" },
        warmCoolFeel: { type: "string" },
      },
      required: ["whereLightShouldGo", "brightnessLevel", "warmCoolFeel"],
    },
    placement: {
      type: "object",
      additionalProperties: false,
      properties: {
        whatToMove: { type: "string" },
        whatToFace: { type: "string" },
        whatToRemove: { type: "string" },
        focalPoint: { type: "string" },
      },
      required: ["whatToMove", "whatToFace", "whatToRemove", "focalPoint"],
    },
    sound: {
      type: "object",
      additionalProperties: false,
      properties: {
        musicStyle: { type: "string" },
        tempo: { type: "string" },
        energy: { type: "string" },
        searchPhrases: { type: "array", items: { type: "string" } },
      },
      required: ["musicStyle", "tempo", "energy", "searchPhrases"],
    },
    songIdeas: { type: "array", items: { type: "string" } },
    environment: {
      type: "object",
      additionalProperties: false,
      properties: {
        emotionalSpatialFeel: { type: "string" },
        roomAdjustments: { type: "string" },
      },
      required: ["emotionalSpatialFeel", "roomAdjustments"],
    },
    oneSmartMove: { type: "string" },
  },
  required: ["mode", "lighting", "placement", "sound", "songIdeas", "environment", "oneSmartMove"],
};

const eventSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    mode: { type: "string", enum: ["event"] },
    styledPreviewPrompt: { type: "string" },
    styledPreviewImageUrl: { type: ["string", "null"] },
    lighting: { type: "string" },
    decorPlacement: { type: "string" },
    floralDecor: { type: "string" },
    music: { type: "string" },
    roomFlow: { type: "string" },
    designNotes: { type: "string" },
    oneSmartMove: { type: "string" },
    suggestedPlaylist: {
      type: "array",
      minItems: 10,
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          artist: { type: "string" },
        },
        required: ["title", "artist"],
      },
    },
  },
  required: [
    "mode",
    "styledPreviewPrompt",
    "styledPreviewImageUrl",
    "lighting",
    "decorPlacement",
    "floralDecor",
    "music",
    "roomFlow",
    "designNotes",
    "oneSmartMove",
    "suggestedPlaylist",
  ],
};

export async function POST(request) {
  try {
    const body = await request.json();
    const mode = body.mode === "event" ? "event" : "personal";

    if (mode === "event") {
      return await buildEventAtmosphere(body);
    }

    return await buildPersonalAtmosphere(body);
  } catch {
    return NextResponse.json(
      { error: "Unable to generate atmosphere right now. Please try again." },
      { status: 500 },
    );
  }
}

async function buildPersonalAtmosphere({ description = "", mood = "Relaxed", time = "Day", setting = "Alone", image }) {
  if (!description?.trim() && !image) {
    return NextResponse.json(
      { error: "Please provide an image, text, or both to generate your atmosphere." },
      { status: 400 },
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is missing. Add it to your environment variables." },
      { status: 500 },
    );
  }

  const userContent = [
    {
      type: "input_text",
      text:
        "Create a premium, practical atmosphere blueprint using all provided inputs. " +
        `Mood: ${mood}. Time: ${time}. Setting: ${setting}. ` +
        `User text: ${description.trim() || "No text provided."}`,
    },
  ];

  if (image) {
    userContent.push({
      type: "input_image",
      image_url: image,
      detail: "high",
    });
  }

  const openaiResponse = await fetchAtmosphereResponse({
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "You are Atmos AI, a spatial vibe designer. This is not a chat response. " +
              "Return only JSON that matches the requested schema. Keep suggestions specific, elegant, and actionable.",
          },
        ],
      },
      { role: "user", content: userContent },
    ],
    schema: personalSchema,
    schemaName: "atmosphere_blueprint_personal",
  });

  if (openaiResponse.error) {
    return openaiResponse.error;
  }

  return NextResponse.json(openaiResponse.data);
}

function buildStyledPreviewPrompt({
  eventPlan,
  eventType,
  eventStyle,
  notes,
  isRefinement = false,
  refinementInstruction = "",
}) {
  const plannerNotes = notes?.trim() || "No additional planner notes.";
  const eventTypeLower = typeof eventType === "string" ? eventType.toLowerCase() : "";
  const isDaylightEvent = eventTypeLower.includes("bridal shower") || eventTypeLower.includes("brunch");
  const isEveningEvent = eventTypeLower.includes("cocktail") || eventTypeLower.includes("evening");
  const timeOfDayDirection = isDaylightEvent
    ? "Time-of-day tone: prioritize soft daylight, airy ambience, and natural window-balanced light for a fresh daytime feel."
    : isEveningEvent
      ? "Time-of-day tone: use warmer, dimmer evening lighting layers while preserving realistic exposure and detail."
      : "Time-of-day tone: match lighting color and intensity to the stated event type, avoiding default dramatic evening grading unless explicitly requested.";

  const refinementDirection = isRefinement
    ? `Refinement mode: revise the existing staged concept in this same room only. Apply this edit without changing the underlying architecture or camera framing: ${refinementInstruction || "No additional refinement details provided."}`
    : "Initial concept mode: stage a first-pass redesign in this same uploaded room.";

  return [
    `Scene overview: stage a professional ${eventType} concept in a ${eventStyle} direction directly inside the uploaded venue image.`,
    "Scene preservation priority 1: preserve this exact room as the architectural base; do not invent a different room.",
    "Scene preservation priority 2: preserve the same camera angle, lens feel, and viewpoint from the uploaded venue photo.",
    "Scene preservation priority 3: preserve visible structure and layout including walls, windows, doors, ceiling shape, floor plane, columns, stairs, and major built-in or heavy furniture positions.",
    "Scene preservation priority 4: add requested decor, florals, lighting, and styling into that same scene as a staged redesign.",
    "Scene preservation priority 5: final image must read clearly as the same property and same shot, newly styled by a planner.",
    "Reference handling: venue image is structural truth. Any reference image is style inspiration only for palette, material mood, floral language, and formality; do not copy its room geometry or shot composition.",
    "Anti-drift guardrails: do not significantly alter architecture, do not shift perspective, do not replace the scene with a generic styled interior, and do not transform this into a different property.",
    "Room-aware staging language: place elements with clear spatial anchors such as along the back wall, around the window wall, at the left side of the main gathering area, suspended above the primary table, floor uplighting at column bases, and candle accents near the entry console when contextually appropriate.",
    "Believability: preserve original room proportions, integrate additions naturally with plausible scale and shadows, and keep lighting physically realistic for the space and time-of-day intent.",
    "Visual tone: premium, editorial, and realistic staging mockup, not fantasy reinterpretation and not AR overlays.",
    refinementDirection,
    "Do not include signage text baked into architecture; keep surfaces natural and believable.",
    timeOfDayDirection,
    "Avoid diagrams, labels, overlays, or AR graphics; render a convincing in-room design preview still.",
    `Plan alignment - lighting: ${eventPlan.lighting}`,
    `Plan alignment - layout: ${eventPlan.decorPlacement}`,
    `Plan alignment - floral and decor: ${eventPlan.floralDecor}`,
    `Plan alignment - flow: ${eventPlan.roomFlow}`,
    `Plan alignment - refinements: ${eventPlan.designNotes}`,
    `Planner notes: ${plannerNotes}`,
  ].join(" ");
}

async function generateStyledPreviewImage({ prompt, venueImage, referenceImage }) {
  try {
    const conditionedBody = {
      model: "gpt-image-1",
      prompt,
      size: "1536x1024",
      quality: "high",
      image: referenceImage ? [venueImage, referenceImage] : [venueImage],
    };

    const imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(conditionedBody),
    });

    if (!imageResponse.ok) {
      const fallbackResponse = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-image-1",
          prompt,
          size: "1536x1024",
          quality: "high",
        }),
      });

      if (!fallbackResponse.ok) {
        return null;
      }

      const fallbackPayload = await fallbackResponse.json();
      const fallbackBase64Image = fallbackPayload?.data?.[0]?.b64_json;
      return fallbackBase64Image ? `data:image/png;base64,${fallbackBase64Image}` : null;
    }

    const payload = await imageResponse.json();
    const base64Image = payload?.data?.[0]?.b64_json;

    if (!base64Image) {
      return null;
    }

    return `data:image/png;base64,${base64Image}`;
  } catch {
    return null;
  }
}

async function buildEventAtmosphere({
  venueImage,
  referenceImage,
  eventType = "Private Dinner",
  eventStyle = "Elegant",
  notes = "",
  refinementInstruction = "",
  currentResult = null,
}) {
  if (!venueImage) {
    return NextResponse.json(
      { error: "Please upload a venue image to generate an event atmosphere plan." },
      { status: 400 },
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is missing. Add it to your environment variables." },
      { status: 500 },
    );
  }

  const trimmedRefinement = typeof refinementInstruction === "string" ? refinementInstruction.trim() : "";
  const isRefinement = Boolean(trimmedRefinement);
  const currentResultContext =
    currentResult && typeof currentResult === "object"
      ? [
          `Current concept lighting: ${currentResult.lighting || "N/A"}`,
          `Current concept setup: ${currentResult.decorPlacement || "N/A"}`,
          `Current concept floral/decor: ${currentResult.floralDecor || "N/A"}`,
          `Current concept energy/music: ${currentResult.music || "N/A"}`,
          `Current concept flow: ${currentResult.roomFlow || "N/A"}`,
          `Current concept notes: ${currentResult.designNotes || "N/A"}`,
        ].join(" ")
      : "";

  const userContent = [
    {
      type: "input_text",
      text:
        `${isRefinement ? "Revise this existing event concept with the requested edits." : "Build a high-end event atmosphere and venue styling plan from these inputs."} ` +
        "Think like a luxury event planner giving install-ready direction to a production team. " +
        "Prioritize fewer, stronger moves over long generic lists. " +
        "Anchor every recommendation to the room's real geometry: entry sequence, walls, corners, focal axis, and circulation paths. " +
        `Event type: ${eventType}. Style/vibe: ${eventStyle}. ` +
        `Planner notes: ${notes?.trim() || "No notes provided."} ` +
        `${isRefinement ? `Revision request: ${trimmedRefinement}.` : ""} ` +
        `${isRefinement ? `Existing concept context: ${currentResultContext || "No previous context provided."}` : ""}`,
    },
    {
      type: "input_image",
      image_url: venueImage,
      detail: "high",
    },
  ];

  if (referenceImage) {
    userContent.push({
      type: "input_image",
      image_url: referenceImage,
      detail: "high",
    });
  }

  const openaiResponse = await fetchAtmosphereResponse({
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "You are Atmos AI in Event Mode, a high-end event atmosphere and venue styling assistant. " +
              "Analyze the venue photo as the architectural base and treat any provided reference image as inspiration only. " +
              "Never copy literal arrangement, camera framing, or object placement from the reference image. " +
              "Provide concrete recommendations for atmosphere, layout, lighting, floral/decor direction, sound placement, and guest flow. Keep every section specific and visually believable. " +
              "No generic wording. Use confident, intentional language and give install-ready specificity. " +
              "For lighting, specify direction, intensity, and purpose in concise client-facing language. " +
              "For decorPlacement, state where the primary composition sits, what anchors the focal point, and what guests see first when entering. " +
              "For floralDecor, define floral language, material mood, and table styling direction as a fresh interpretation of inspiration. " +
              "For roomFlow, describe the guest journey from entry to gathering to high-energy zone, including where bottlenecks are avoided. " +
              "For music, place speakers/DJ/live elements in believable positions that protect conversation zones while building momentum where appropriate. " +
              "For designNotes and oneSmartMove, keep output concise, premium, and client-ready rather than technical. " +
              "For suggestedPlaylist, return exactly 10 songs as title + artist pairs aligned to the event type, styling language, and the energy of this concept. " +
              "Avoid generic filler songs where possible. " +
              "For styledPreviewPrompt, explicitly instruct the image model to preserve the uploaded venue as the same room and same viewpoint while staging a redesigned concept inside it. " +
              "Treat the venue image as structural truth and any reference image as style inspiration only. " +
              "If a revision request is provided, treat it as modifications to the current staged concept in the same room rather than permission to redesign a different space. " +
              "Return only JSON matching the schema.",
          },
        ],
      },
      { role: "user", content: userContent },
    ],
    schema: eventSchema,
    schemaName: "atmosphere_blueprint_event",
    fallbackDataBuilder: buildEventPlanFallback,
  });

  if (openaiResponse.error) {
    return openaiResponse.error;
  }

  const eventPlan = normalizeEventPlan(openaiResponse.data);
  const styledPreviewPrompt = buildStyledPreviewPrompt({
    eventPlan,
    eventType,
    eventStyle,
    notes,
    isRefinement,
    refinementInstruction: trimmedRefinement,
  });

  const styledPreviewImageUrl = await generateStyledPreviewImage({
    prompt: styledPreviewPrompt,
    venueImage,
    referenceImage,
  });

  return NextResponse.json({
    ...eventPlan,
    styledPreviewPrompt,
    styledPreviewImageUrl,
  });
}

function summarizeResponseShape(payload) {
  const output = Array.isArray(payload?.output) ? payload.output : [];
  const contentTypes = output
    .flatMap((entry) => (Array.isArray(entry?.content) ? entry.content.map((item) => item?.type || "unknown") : []))
    .slice(0, 8);

  return {
    id: payload?.id ?? null,
    status: payload?.status ?? null,
    outputItems: output.length,
    contentTypes,
    hasOutputText: typeof payload?.output_text === "string" && payload.output_text.trim().length > 0,
    incompleteReason: payload?.incomplete_details?.reason ?? null,
    usage: payload?.usage
      ? {
          inputTokens: payload.usage.input_tokens,
          outputTokens: payload.usage.output_tokens,
        }
      : null,
  };
}

function collectResponseTextCandidates(payload) {
  const candidates = [];

  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    candidates.push(payload.output_text.trim());
  }

  const output = Array.isArray(payload?.output) ? payload.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if (typeof part?.text === "string" && part.text.trim()) {
        candidates.push(part.text.trim());
      }

      if (part?.parsed && typeof part.parsed === "object") {
        candidates.push(JSON.stringify(part.parsed));
      }

      if (part?.json && typeof part.json === "object") {
        candidates.push(JSON.stringify(part.json));
      }
    }
  }

  return [...new Set(candidates)];
}

function parseJsonCandidate(text) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {}

  const fencedJsonMatch = text.match(/```json\s*([\s\S]*?)```/i);
  if (fencedJsonMatch?.[1]) {
    try {
      return JSON.parse(fencedJsonMatch[1].trim());
    } catch {}
  }

  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch?.[0]) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch {}
  }

  return null;
}

function parseResponsePayload(payload) {
  const candidates = collectResponseTextCandidates(payload);
  for (const candidate of candidates) {
    const parsed = parseJsonCandidate(candidate);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  }

  return null;
}

function buildEventPlanFallback(payload) {
  const candidates = collectResponseTextCandidates(payload);
  const firstCandidate = candidates[0] || "";

  return normalizeEventPlan({
    mode: "event",
    lighting: "Layer warm ambient wash at walls and a focused highlight on the primary focal zone.",
    decorPlacement:
      "Anchor the main composition on the strongest wall axis and keep entry sightlines open to the focal point.",
    floralDecor:
      "Use the reference palette as inspiration only, then design an original tablescape and floral language tailored to the venue scale.",
    music:
      "Place speakers or DJ coverage near the high-energy zone while keeping dining or lounge conversation zones clear.",
    roomFlow:
      "Guide guests from entry to focal gathering area first, then toward secondary social zones without bottlenecks.",
    designNotes: firstCandidate || "Use premium finishes, intentional spacing, and realistic scale for all installs.",
    oneSmartMove:
      "Invest in one high-impact focal installation at guest eye-line to establish immediate visual hierarchy.",
    suggestedPlaylist: buildFallbackPlaylist(),
    styledPreviewPrompt: firstCandidate,
    styledPreviewImageUrl: null,
  });
}

function normalizeEventPlan(eventPlan = {}) {
  return {
    mode: "event",
    styledPreviewPrompt:
      typeof eventPlan.styledPreviewPrompt === "string" ? eventPlan.styledPreviewPrompt : "",
    styledPreviewImageUrl: typeof eventPlan.styledPreviewImageUrl === "string" ? eventPlan.styledPreviewImageUrl : null,
    lighting: typeof eventPlan.lighting === "string" ? eventPlan.lighting : "",
    decorPlacement: typeof eventPlan.decorPlacement === "string" ? eventPlan.decorPlacement : "",
    floralDecor: typeof eventPlan.floralDecor === "string" ? eventPlan.floralDecor : "",
    music: typeof eventPlan.music === "string" ? eventPlan.music : "",
    roomFlow: typeof eventPlan.roomFlow === "string" ? eventPlan.roomFlow : "",
    designNotes: typeof eventPlan.designNotes === "string" ? eventPlan.designNotes : "",
    oneSmartMove: typeof eventPlan.oneSmartMove === "string" ? eventPlan.oneSmartMove : "",
    suggestedPlaylist: normalizeSuggestedPlaylist(eventPlan.suggestedPlaylist),
  };
}

function normalizeSuggestedPlaylist(playlist) {
  const normalized = Array.isArray(playlist)
    ? playlist
        .map((entry) => ({
          title: typeof entry?.title === "string" ? entry.title.trim() : "",
          artist: typeof entry?.artist === "string" ? entry.artist.trim() : "",
        }))
        .filter((entry) => entry.title && entry.artist)
    : [];

  const fallback = buildFallbackPlaylist();
  const filled = [...normalized];
  for (let index = filled.length; index < 10; index += 1) {
    filled.push(fallback[index]);
  }

  return filled.slice(0, 10);
}

function buildFallbackPlaylist() {
  return [
    { title: "Midnight City", artist: "M83" },
    { title: "Electric Feel", artist: "MGMT" },
    { title: "Fantasy", artist: "Mariah Carey" },
    { title: "Levitating", artist: "Dua Lipa" },
    { title: "Adore You", artist: "Harry Styles" },
    { title: "Jubel", artist: "Klingande" },
    { title: "Tadow", artist: "Masego & FKJ" },
    { title: "Latch", artist: "Disclosure ft. Sam Smith" },
    { title: "Golden", artist: "Jill Scott" },
    { title: "On Hold", artist: "The xx" },
  ];
}

async function fetchAtmosphereResponse({ input, schema, schemaName, fallbackDataBuilder }) {
  const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      input,
      text: {
        format: {
          type: "json_schema",
          name: schemaName,
          schema,
          strict: true,
        },
      },
    }),
  });

  if (!openaiResponse.ok) {
    const failure = await openaiResponse.text();
    return {
      error: NextResponse.json(
        {
          error: "OpenAI request failed.",
          details: failure,
        },
        { status: 500 },
      ),
    };
  }

  const payload = await openaiResponse.json();
  const payloadShape = summarizeResponseShape(payload);
  console.info(`[Atmos] OpenAI response shape (${schemaName})`, payloadShape);

  const parsed = parseResponsePayload(payload);
  if (parsed) {
    return { data: parsed };
  }

  if (typeof fallbackDataBuilder === "function") {
    const fallbackData = fallbackDataBuilder(payload);
    if (fallbackData) {
      console.warn(`[Atmos] Using fallback response parsing for ${schemaName}.`);
      return { data: fallbackData };
    }
  }

  return {
    error: NextResponse.json(
      {
        error: "OpenAI returned a response, but structured output could not be parsed.",
        details: {
          schemaName,
          responseShape: payloadShape,
        },
      },
      { status: 500 },
    ),
  };
}
