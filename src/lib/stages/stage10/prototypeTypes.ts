export type PrototypePlatform = "mobile" | "web";

export type PrototypeData = {
  platform: PrototypePlatform;
  html: string;
  generatedAt?: string;
  model?: string;
};

export function defaultPrototype(): PrototypeData {
  return {
    platform: "mobile",
    html: "",
  };
}

export function normalizePrototype(
  raw: Partial<PrototypeData> | null | undefined,
): PrototypeData {
  const base = defaultPrototype();
  if (!raw || typeof raw !== "object") return base;
  return {
    platform: raw.platform === "web" ? "web" : "mobile",
    html: typeof raw.html === "string" ? raw.html : base.html,
    generatedAt:
      typeof raw.generatedAt === "string" ? raw.generatedAt : undefined,
    model: typeof raw.model === "string" ? raw.model : undefined,
  };
}

export function hasPrototypeContent(data: PrototypeData): boolean {
  return Boolean(data.html.trim());
}
