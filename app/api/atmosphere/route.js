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

  return [
    `Cinematic luxury event rendering for a ${eventType} with a ${eventStyle} design direction.`,
    "Use the exact venue architecture, ceiling height, entry path, and room proportions from the analyzed venue photo.",
    "Apply any reference styling as if installed by a top-tier event production team with realistic scale, spacing, and material finishes.",
    "Show what guests see first on entry, then the primary focal composition, then supporting zones in coherent visual hierarchy.",
    "Lighting must read physically real: layered ambient wash, focal highlights, and intentional shadow depth that guides the eye.",
    "Render premium hospitality detail: believable linens, glassware, floral volume, candle density, staging finishes, and cable-free execution.",
    "Mood target: editorial, immersive, elevated, and photographable without looking synthetic or over-styled.",
    "Avoid diagrams, labels, overlays, or AR graphics. Produce a convincing in-room design preview still.",
    `Lighting plan to depict: ${eventPlan.lighting}`,
    `Decor layout to depict: ${eventPlan.decorPlacement}`,
    `Guest movement and energy flow to depict: ${eventPlan.roomFlow}`,
    `Refinement details to depict: ${eventPlan.designNotes}`,
    `Planner notes: ${plannerNotes}`,
    "Camera/style guidance: wide interior editorial lens, natural perspective from guest eye level, controlled highlight roll-off, rich but realistic shadows, premium color grade.",
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
  });

  if (openaiResponse.error) {
    return openaiResponse.error;
  }

  const eventPlan = openaiResponse.data;
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

async function fetchAtmosphereResponse({ input, schema, schemaName }) {
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
  const jsonText = payload.output_text;

  if (!jsonText) {
    return {
      error: NextResponse.json(
        { error: "Model returned an empty response. Please try again." },
        { status: 500 },
      ),
    };
  }

  return { data: JSON.parse(jsonText) };
}
