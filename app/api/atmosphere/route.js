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
    music: { type: "string" },
    roomFlow: { type: "string" },
    designNotes: { type: "string" },
    oneSmartMove: { type: "string" },
  },
  required: [
    "mode",
    "styledPreviewPrompt",
    "styledPreviewImageUrl",
    "lighting",
    "decorPlacement",
    "music",
    "roomFlow",
    "designNotes",
    "oneSmartMove",
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

function buildStyledPreviewPrompt({ eventPlan, eventType, eventStyle, notes }) {
  const plannerNotes = notes?.trim() || "No additional planner notes.";
  const eventTypeLower = typeof eventType === "string" ? eventType.toLowerCase() : "";
  const isDaylightEvent = eventTypeLower.includes("bridal shower") || eventTypeLower.includes("brunch");
  const isEveningEvent = eventTypeLower.includes("cocktail") || eventTypeLower.includes("evening");
  const timeOfDayDirection = isDaylightEvent
    ? "Time-of-day tone: prioritize soft daylight, airy ambience, and natural window-balanced light for a fresh daytime feel."
    : isEveningEvent
      ? "Time-of-day tone: use warmer, dimmer evening lighting layers while preserving realistic exposure and detail."
      : "Time-of-day tone: match lighting color and intensity to the stated event type, avoiding default dramatic evening grading unless explicitly requested.";

  return [
    `Scene overview: Cinematic luxury ${eventType} in a ${eventStyle} direction, using the exact venue architecture and proportions from the analyzed photo.`,
    "Focal point: the main table must be clearly visible in the center landing and read as the primary composition at first glance.",
    "Lighting: columns must show visible uplighting, with layered ambient wash and focused highlights that guide the eye toward the main table.",
    "Supporting elements: hydrangea arrangements must be prominent, with key decor grouped in visually clear clusters and supporting pieces that feel naturally placed rather than perfectly uniform.",
    "Spatial flow: guests should visually read a clear path from entry to focal table to secondary gathering zones, without clutter or blocked sightlines.",
    "Realism cues: keep materials and installation believable with slight floral placement variation, subtle asymmetry in decor, and real-world imperfection; avoid overly perfect spacing unless critical for function or focal hierarchy.",
    "Mood/style: editorial, immersive, elevated, and photographable; premium interior event styling with rich but realistic shadows and controlled highlight roll-off.",
    "Use visually interpretable spacing language (clustered, staggered, intentionally balanced) instead of technical measurement-heavy instructions unless critical to composition.",
    "Do not include signage text baked into architecture (for example words on walls, doors, or permanent surfaces); keep the environment natural and believable.",
    timeOfDayDirection,
    "Preserve current strengths: maintain strong style alignment, clear centered composition, intentional lighting direction, and clear focal hierarchy.",
    "Avoid diagrams, labels, overlays, or AR graphics; render a convincing in-room design preview still.",
    `Plan alignment - lighting: ${eventPlan.lighting}`,
    `Plan alignment - decor: ${eventPlan.decorPlacement}`,
    `Plan alignment - flow: ${eventPlan.roomFlow}`,
    `Plan alignment - refinements: ${eventPlan.designNotes}`,
    `Planner notes: ${plannerNotes}`,
  ].join(" ");
}

async function generateStyledPreviewImage(prompt) {
  try {
    const imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
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

    if (!imageResponse.ok) {
      return null;
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

  const userContent = [
    {
      type: "input_text",
      text:
        "Build a high-end event atmosphere and venue styling plan from these inputs. " +
        "Think like a luxury event planner giving install-ready direction to a production team. " +
        "Prioritize fewer, stronger moves over long generic lists. " +
        "Anchor every recommendation to the room's real geometry: entry sequence, walls, corners, focal axis, and circulation paths. " +
        `Event type: ${eventType}. Style/vibe: ${eventStyle}. ` +
        `Planner notes: ${notes?.trim() || "No notes provided."}`,
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
              "Analyze the venue photo, adapt any provided reference image style realistically to the venue, " +
              "and provide concrete recommendations for lighting placement, table/decor zones, focal points, " +
              "music/entertainment placement, and guest flow. Keep every section specific and visually believable. " +
              "No generic wording. Use confident, intentional language and give install-ready specificity. " +
              "For lighting, specify direction (walls, behind tables, overhead strands), intensity (soft wash vs focused glow), and purpose (highlight focal table, guide movement, build energy near dance floor). " +
              "For decorPlacement, state exactly where the main table sits, what anchors the focal point, and what guests see first when entering. " +
              "For roomFlow, describe the guest journey from entry to gathering to high-energy zone, including where bottlenecks are avoided. " +
              "For music, place speakers/DJ/live elements in believable positions that protect conversation zones while building momentum where appropriate. " +
              "For designNotes and oneSmartMove, provide premium, high-impact refinements with measurable placement cues (counts, spacing ranges, offsets, or distances where possible). " +
              "For styledPreviewPrompt, write a cinematic, visual, scene-building prompt with precise mood, arrangement, light behavior, and atmospheric realism; avoid phrases like 'beautiful event scene.' " +
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
  });

  const styledPreviewImageUrl = await generateStyledPreviewImage(styledPreviewPrompt);

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
    music:
      "Place speakers or DJ coverage near the high-energy zone while keeping dining or lounge conversation zones clear.",
    roomFlow:
      "Guide guests from entry to focal gathering area first, then toward secondary social zones without bottlenecks.",
    designNotes: firstCandidate || "Use premium finishes, intentional spacing, and realistic scale for all installs.",
    oneSmartMove:
      "Invest in one high-impact focal installation at guest eye-line to establish immediate visual hierarchy.",
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
    music: typeof eventPlan.music === "string" ? eventPlan.music : "",
    roomFlow: typeof eventPlan.roomFlow === "string" ? eventPlan.roomFlow : "",
    designNotes: typeof eventPlan.designNotes === "string" ? eventPlan.designNotes : "",
    oneSmartMove: typeof eventPlan.oneSmartMove === "string" ? eventPlan.oneSmartMove : "",
  };
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
