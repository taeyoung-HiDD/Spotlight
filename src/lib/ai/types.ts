export type AiTask =
  | "coach_chat"
  | "contextual_research"
  | "persona_enrich"
  | "latent_needs"
  | "slot_backfill"
  | "prototype_html"
  | "storyboard_image"
  | "research_debrief"
  | "research_audio";

export type GroqRole = "system" | "user" | "assistant";

export interface GroqMessage {
  role: GroqRole;
  content: string;
}

export interface GroqChatOptions {
  system?: string;
  messages?: GroqMessage[];
  user?: string;
  model?: string;
  models?: string[];
  temperature?: number;
  jsonMode?: boolean;
}

export interface GroqChatResult {
  text: string;
  model: string;
}
