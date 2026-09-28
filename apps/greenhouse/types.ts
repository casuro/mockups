// The Greenhouse app's data. A `GreenhouseSeed` is the job as it opens: the
// hiring team, the pipeline's stages, and the candidates in them with their
// scorecards, activity and interviews. `GreenhouseState` is what changes
// while someone uses it; it is plain JSON, so it can be saved and handed back
// to `useGreenhouse` to pick up where they left off.

export interface GreenhouseStaff {
  name: string;
  /** "Recruiter", "Staff Engineer": under the name in the hiring team. */
  role?: string;
  /** A picture URL. Initials on `color` when missing. */
  photo?: string;
  /** Shown when there is no photo; the name's initials by default. */
  initials?: string;
  color?: string;
}

export interface GreenhouseJob {
  /** "Senior Backend Engineer" */
  title: string;
  /** "Engineering": in the breadcrumb and the job's meta line. */
  department: string;
  /** "San Francisco / Remote" */
  location?: string;
  /** "ENG-2041", shown as "Req #ENG-2041". */
  req?: string;
  /** The green pill next to the meta line. Default "Open". */
  status?: string;
  /** Staff ids shown at the top right of the job header. */
  hiringTeam?: string[];
  /** Staff id, in a candidate's Details. */
  recruiter?: string;
  /** Staff id, in a candidate's Details; interview requests go to them. The recruiter by default. */
  coordinator?: string;
}

/** A scorecard's overall recommendation. `null` is one not submitted yet ("Awaiting"). */
export type GreenhouseRecommendation = "strong-yes" | "yes" | "no" | null;

export interface GreenhouseScorecard {
  /** The interviewer's staff id. */
  by: string;
  /** The interview it is for: "Onsite: System Design". */
  step: string;
  recommendation: GreenhouseRecommendation;
  /** [attribute, 1-4] rows, drawn as four dots: ["System design", 3]. */
  attributes?: [string, number][];
}

export type GreenhouseActivityKind = "note" | "move" | "mail";

export interface GreenhouseActivityInput {
  id?: string;
  /** The icon: a note (pencil), a stage move (arrow) or an email (envelope). */
  kind: GreenhouseActivityKind;
  /** A staff id, or any name shown as it is ("Greenhouse"). */
  by: string;
  text: string;
  /** When: a timestamp in ms, or a date string. Now, when left out. Shown as "3 days ago". */
  at?: number | string;
}

export interface GreenhouseActivity extends Omit<GreenhouseActivityInput, "id" | "at"> {
  id: string;
  at: number;
}

export interface GreenhouseInterview {
  /** "Onsite Loop (3 sessions)" */
  title: string;
  /** A timestamp in ms (formatted "Tue, Sep 30, 10:00 AM"), or text shown as it is ("Tue, Sep 30, 10:00 AM PT"). */
  when: number | string;
  /** Interviewers' staff ids. */
  with: string[];
}

export interface GreenhouseCandidateInput {
  id: string;
  name: string;
  /** Initials on the avatar; the first letters of the first two names by default. */
  initials?: string;
  /** The avatar's color; picked from the id when missing. */
  color?: string;
  /** A picture URL, instead of initials. */
  photo?: string;
  /** Current title and company: "Backend Engineer II" at "Lumen Freight". */
  title?: string;
  company: string;
  /** "LinkedIn", "Referral": on the card and in the drawer. */
  source: string;
  /** One of the seed's `stages`. */
  stage: string;
  /** Days in the current stage. Resets to 0 when moved. */
  days?: number;
  /** 0-3 green dots on the card: how the scorecards lean so far. */
  rating?: number;
  email?: string;
  phone?: string;
  /** Grey tags under the contact line: "Referral", "Top talent", "Go". */
  tags?: string[];
  /** "7 days ago", in Details. */
  applied?: string;
  /** Submitted and awaited scorecards. Any awaited one puts "Needs scorecard" on the card. */
  scorecards?: GreenhouseScorecard[];
  /** Newest first. */
  activity?: GreenhouseActivityInput[];
  /** Upcoming, in order. */
  interviews?: GreenhouseInterview[];
}

export interface GreenhouseCandidate extends Omit<GreenhouseCandidateInput, "days" | "rating" | "activity" | "scorecards" | "interviews" | "tags"> {
  days: number;
  rating: number;
  tags: string[];
  scorecards: GreenhouseScorecard[];
  activity: GreenhouseActivity[];
  interviews: GreenhouseInterview[];
  /** Rejected candidates leave the board. */
  rejected: boolean;
}

export interface GreenhouseSeed {
  company: { name: string };
  /** The signed-in person's staff id: their photo is in the top bar, their notes and moves carry their name. */
  me: string;
  staff: Record<string, GreenhouseStaff>;
  job: GreenhouseJob;
  /** The pipeline's stages, in order: its columns. */
  stages: string[];
  /** In board order within each stage. */
  candidates: GreenhouseCandidateInput[];
  /** A candidate whose drawer is open at the start. */
  open?: string;
  /** The orange dot on the bell. */
  notifications?: boolean;
  theme?: "light" | "dark";
}

/** Everything that changes while the app is used. Plain JSON. */
export interface GreenhouseState {
  version: 1;
  candidates: GreenhouseCandidate[];
  /** The candidate whose drawer is open. */
  open: string | null;
  /** The stage chip that is on; null is "All stages". */
  filter: string | null;
  /** Candidates ticked for a bulk move. */
  selected: string[];
  theme: "light" | "dark";
  seq: number;
}

/** What the signed-in person does. */
export type GreenhouseEvent =
  | { type: "open"; candidate: string }
  | { type: "close"; candidate: string }
  | { type: "move"; candidate: string; from: string; to: string }
  | { type: "bulk-move"; candidates: string[]; to: string }
  | { type: "reject"; candidate: string }
  | { type: "note"; candidate: string; text: string; id: string }
  | { type: "schedule"; candidate: string }
  | { type: "filter"; stage: string | null }
  | { type: "action"; kind: "add" | "notifications" | "nav" | "tab" | "email"; label: string };
