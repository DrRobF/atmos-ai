import { NextResponse } from "next/server";

const MODEL = "gpt-4.1-mini";

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
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
  required: ["lighting", "placement", "sound", "songIdeas", "environment", "oneSmartMove"],
};

export async function POST(request) {
  try {
    const { description = "", mood = "Relaxed", time = "Day", setting = "Alone", image } =
      await request.json();

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

    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
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
        text: {
          format: {
            type: "json_schema",
            name: "atmosphere_blueprint",
            schema,
            strict: true,
          },
        },
      }),
    });

    if (!openaiResponse.ok) {
      const failure = await openaiResponse.text();
      return NextResponse.json(
        {
          error: "OpenAI request failed.",
          details: failure,
        },
        { status: 500 },
      );
    }

    const payload = await openaiResponse.json();
    const jsonText = payload.output_text;

    if (!jsonText) {
      return NextResponse.json(
        { error: "Model returned an empty response. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json(JSON.parse(jsonText));
  } catch {
    return NextResponse.json(
      { error: "Unable to generate atmosphere right now. Please try again." },
      { status: 500 },
    );
  }
}
