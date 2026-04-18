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
    `Luxury event concept rendering for a ${eventType} with a ${eventStyle} direction.`,
    "Use the real venue architecture and proportions from the analyzed venue photo as the base scene.",
    "Translate any provided decor reference into this venue with believable scale and premium material details.",
    "Atmosphere target: elegant, realistic, cinematic, and high-end hospitality quality.",
    "Not a CAD diagram, not AR overlays, not cartoonish. Keep it as a convincing design concept image.",
    `Lighting direction: ${eventPlan.lighting}`,
    `Decor placement direction: ${eventPlan.decorPlacement}`,
    `Room flow direction: ${eventPlan.roomFlow}`,
    `Design details: ${eventPlan.designNotes}`,
    `Planner notes: ${plannerNotes}`,
    "Camera/style guidance: wide interior editorial lens, natural perspective, balanced highlights, rich shadows, premium color grading.",
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
