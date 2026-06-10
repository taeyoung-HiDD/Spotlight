/**
 * Spotlight DB types — PRD §6.1 Artifact 데이터 모델
 * SQL: `supabase/schema.sql`
 */

// ---------------------------------------------------------------------------
// §6.1 Enums
// ---------------------------------------------------------------------------

/** discovery: 오프라인 리서치 연동 | hypothesis: AI 백필·사용자 가설 */
export type ConfidenceLevel = "discovery" | "hypothesis";

export type SlotState =
  | "empty"
  | "in_progress"
  | "complete"
  | "revisit"
  | "frozen";

export type SlotUpdatedBy = "user" | "ai_coach";

export type ArtifactType =
  | "form"
  | "ladder"
  | "matrix"
  | "sheet"
  | "slide"
  | "external_program"
  | "application_prep";

/** stage_id: 1–14 */
export type StageId = number;

// ---------------------------------------------------------------------------
// §6.1 Artifact — slots
// ---------------------------------------------------------------------------

export type SlotContent = unknown;

export interface ArtifactSlot {
  state: SlotState;
  content: SlotContent;
  /** AI 백필 유무 판단 핵심 필드 */
  confidence: ConfidenceLevel;
  /** 데이터 역·정방향 추적용 ID 배열 */
  source_refs: string[];
  updated_by: SlotUpdatedBy;
  updated_at: string;
}

export type ArtifactSlots = Record<string, ArtifactSlot>;

// ---------------------------------------------------------------------------
// §6.1 Artifact (PRD 인터페이스 + DB 메타)
// ---------------------------------------------------------------------------

export interface Artifact {
  id: string;
  project_id: string;
  artifact_type: ArtifactType;
  stage_id: StageId;
  slots: ArtifactSlots;
  /** 오프라인 리서치 데이터 누락 시 true 고정 */
  hypothesis_board: boolean;
  /** AI 생성 이미지·모바일 업로드 미디어 URL */
  image_attachments?: string[];
}

// ---------------------------------------------------------------------------
// 연관 테이블 (FK·RLS용)
// ---------------------------------------------------------------------------

export type ProjectStatus = "active" | "archived" | "completed";

export type ProjectMemberRole = "owner" | "member";

export type ProjectInviteStatus = "pending" | "accepted" | "revoked";

export interface ProjectMember {
  project_id: string;
  user_id: string;
  role: ProjectMemberRole;
  joined_at: string;
}

export interface ProjectInvite {
  id: string;
  project_id: string;
  invited_by: string;
  token: string;
  status: ProjectInviteStatus;
  accepted_by: string | null;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  current_phase: string | null;
  created_at: string;
  updated_at: string;
}

/** DB Row — image_attachments·타임스탬프 포함 */
export interface ArtifactRow extends Artifact {
  image_attachments: string[];
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Insert / Update
// ---------------------------------------------------------------------------

export type ProjectInsert = Pick<Project, "user_id" | "title"> &
  Partial<Pick<Project, "description" | "status" | "current_phase">>;

export type ArtifactInsert = Pick<
  ArtifactRow,
  "project_id" | "artifact_type" | "stage_id"
> &
  Partial<
    Pick<
      ArtifactRow,
      "slots" | "hypothesis_board" | "image_attachments"
    >
  >;

export type ArtifactUpdate = Partial<
  Pick<
    ArtifactRow,
    | "artifact_type"
    | "stage_id"
    | "slots"
    | "hypothesis_board"
    | "image_attachments"
  >
>;

export type ProjectUpdate = Partial<
  Pick<Project, "title" | "description" | "status" | "current_phase">
>;

export type ArtifactSlotUpdate = Partial<ArtifactSlot>;

// ---------------------------------------------------------------------------
// Supabase client generic
// ---------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Pick<User, "id" | "email"> &
          Partial<Pick<User, "display_name" | "avatar_url">>;
        Update: Partial<Pick<User, "display_name" | "avatar_url">>;
        Relationships: [];
      };
      projects: {
        Row: Project;
        Insert: ProjectInsert;
        Update: ProjectUpdate;
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      artifacts: {
        Row: ArtifactRow;
        Insert: ArtifactInsert;
        Update: ArtifactUpdate;
        Relationships: [];
      };
      project_members: {
        Row: ProjectMember;
        Insert: Pick<ProjectMember, "project_id" | "user_id"> &
          Partial<Pick<ProjectMember, "role">>;
        Update: Partial<Pick<ProjectMember, "role">>;
        Relationships: [];
      };
      project_invites: {
        Row: ProjectInvite;
        Insert: Pick<ProjectInvite, "project_id" | "invited_by"> &
          Partial<
            Pick<ProjectInvite, "token" | "status" | "expires_at">
          >;
        Update: Partial<
          Pick<
            ProjectInvite,
            "status" | "accepted_by" | "accepted_at" | "expires_at"
          >
        >;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_invite_preview: {
        Args: { invite_token: string };
        Returns: {
          project_id: string;
          project_title: string;
          starting_point: string;
          inviter_name: string;
        }[];
      };
      accept_project_invite: {
        Args: { invite_token: string };
        Returns: string;
      };
    };
    Enums: {
      confidence_level: ConfidenceLevel;
      slot_state: SlotState;
      slot_updated_by: SlotUpdatedBy;
      artifact_type: ArtifactType;
      project_status: ProjectStatus;
      project_member_role: ProjectMemberRole;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
