/**
 * Hardcoded mock data for Demo Mode.
 * Matches real API shapes exactly so components need no branching.
 */

export interface ChatResponse {
  intent: string;
  message: string;
  schedule?: {
    status: string;
    schedule: Record<string, { start_min: number; end_min: number; title?: string; tmt_score?: number }>;
    goal_metadata?: Record<string, unknown>;
    horizon_start?: string;
  };
  execution_graph?: {
    goal_metadata?: { objective?: string; goal_id?: string };
    decomposition: Array<{
      task_id: string;
      title: string;
      duration_minutes: number;
      difficulty_weight: number;
      completion_criteria?: string;
      implementation_intention?: string;
    }>;
  };
  ingestion_result?: Record<string, unknown>;
  action_proposals?: Array<Record<string, unknown>>;
  search_result?: Record<string, unknown>;
  suggested_action?: string;
  thinking_process?: string;
  awaiting_task_confirmation?: boolean;
  schedule_status?: "draft" | "accepted";
  generation_metrics?: {
    total_tokens: number;
    total_time_s: number;
    tok_per_sec: number;
    ttft_ms: number | null;
    model: string;
  };
  conversation_id?: string;
  message_id?: string;
  clarification_options?: string[];
}

export interface TaskWorkspace {
  task_id: string;
  task_title: string;
  primary_objective: string;
  surfaced_assets: Array<{
    asset_type: string;
    title: string;
    content_or_url: string;
    rationale: string;
    metadata?: Record<string, unknown>;
  }>;
}

const DEMO_SCHEDULE: Record<string, { start_min: number; end_min: number; title: string; tmt_score: number }> = {
  chunk_1: {
    start_min: 180,
    end_min: 205,
    title: "Quantifiers: universal & existential",
    tmt_score: 85,
  },
  chunk_2: {
    start_min: 205,
    end_min: 230,
    title: "Negation of quantifiers",
    tmt_score: 72,
  },
  chunk_3: {
    start_min: 270,
    end_min: 295,
    title: "Proof techniques (direct, contrapositive)",
    tmt_score: 90,
  },
  chunk_4: {
    start_min: 295,
    end_min: 320,
    title: "Basic set theory",
    tmt_score: 65,
  },
  chunk_5: {
    start_min: 360,
    end_min: 385,
    title: "Flashcard review",
    tmt_score: 60,
  },
};

const DEMO_EXECUTION_GRAPH = {
  goal_metadata: {
    objective: "Study for math mid-sem",
    goal_id: "math_midsem_demo",
  },
  decomposition: [
    {
      task_id: "chunk_1",
      title: "Quantifiers: universal & existential",
      duration_minutes: 25,
      difficulty_weight: 0.6,
      completion_criteria: "Explain ∀ and ∃ with 2 examples each without notes",
      implementation_intention: "If I feel distracted, I will take a 2-min walk then return",
    },
    {
      task_id: "chunk_2",
      title: "Negation of quantifiers",
      duration_minutes: 25,
      difficulty_weight: 0.5,
      completion_criteria: "Negate 3 quantified statements correctly",
      implementation_intention: "If stuck, I will check the worked example first",
    },
    {
      task_id: "chunk_3",
      title: "Proof techniques (direct, contrapositive)",
      duration_minutes: 25,
      difficulty_weight: 0.7,
      completion_criteria: "Write one direct and one contrapositive proof",
      implementation_intention: "If I forget, I will re-read the summary box",
    },
    {
      task_id: "chunk_4",
      title: "Basic set theory",
      duration_minutes: 25,
      difficulty_weight: 0.5,
      completion_criteria: "Define union, intersection, complement with Venn diagrams",
      implementation_intention: "If tired, I will do 10 now and 10 later",
    },
    {
      task_id: "chunk_5",
      title: "Flashcard review",
      duration_minutes: 25,
      difficulty_weight: 0.3,
      completion_criteria: "Go through 20 cards with 90% recall",
      implementation_intention: "If tired, I will do 10 now and 10 later",
    },
  ],
};

const DEMO_THINKING_PROCESS = `[Brain Dump Extraction] Detected intent: PLAN_DAY. Goal: "study for math mid-sem".
No file attached. No calendar text. No deadline override.

[Habit Translation] Fetching behavioral constraints from Supabase...
Found constraint: "no heavy work before 11 AM" → minimal_work block 00:00–11:00 (minute 0–660).

[Socratic Chunker] Decomposing goal using Cognitive Load Theory...
Applying WOOP: vivid outcome = "explain quantifiers and proof techniques confidently without notes".
Identified obstacles: distraction, fatigue, context-switching.
Breaking into 5 × 25-min chunks. Each chunk gets a completion_criteria (active recall gate) and an implementation_intention (If-Then behavioral cue).
Estimated cognitive load: 0.62 (moderate). No cap reduction needed.

[OR-Tools CP-SAT] Running scheduler...
Hard block injected: 00:00–11:00 (behavioral constraint: no early work).
Biological fallback: sleep block midnight–08:00 already covered by behavioral constraint.
5 tasks placed starting at minute 180 (11:00 AM). TMT priority applied — no deadlines set, so equal weight.
Status: OPTIMAL.

[Voice of Jarvis] Synthesizing warm response...`;

export const MOCK_CHAT_RESPONSE_PLAN_DAY: ChatResponse = {
  intent: "PLAN_DAY",
  message:
    "Here's your schedule. I've broken down 'Study for math mid-sem' into five 25-minute chunks (quantifiers, negation, proof techniques, set theory, flashcards), each with verifiable completion criteria. I've respected your habit—no work before 11 AM. Deep work starts at 11:00.",
  schedule: {
    status: "OPTIMAL",
    schedule: DEMO_SCHEDULE,
    goal_metadata: DEMO_EXECUTION_GRAPH.goal_metadata,
    horizon_start: new Date().toISOString().split("T")[0] + "T08:00:00.000Z",
  },
  execution_graph: DEMO_EXECUTION_GRAPH,
  thinking_process: DEMO_THINKING_PROCESS,
};

const DEMO_THINKING_INGESTION = `[Brain Dump Extraction] File attached. Detected intent: KNOWLEDGE_INGESTION.
Media type: PDF. No planning goal detected.

[Ingestion Pipeline] Routing to process_ingestion with intent_override=KNOWLEDGE_INGESTION...
Docling extracting text — preserving table structure and heading hierarchy.
Chunking: splitting into ~500-token chunks with 50-token overlap.
Embedding via MLX-Embed (Nomic) → storing in ChromaDB cloud tenant.

[Task-Material Linker] Computing cosine similarity between new chunks and existing user_tasks...
Similarity threshold: 0.65. Linked 8 of 12 chunks to scheduled tasks.
4 chunks are general reference (no task match above threshold).

[Supabase] Upserted 12 rows into task_materials (UNIQUE on user_id, task_id, source_id).

[Voice of Jarvis] Synthesizing response...`;

const DEMO_THINKING_BEHAVIORAL = `[Brain Dump Extraction] Detected intent: BEHAVIORAL_CONSTRAINT.
Extracted constraint text: "I hate mornings / no work before 11 AM".
No planning goal. No file attached.

[Behavioral Store] Persisting to Supabase behavioral_constraints table...
constraint_type: "time_preference"
structured_semantics: { "avoid_before_hour": 11, "recurrence": "daily" }
valid_from: today. valid_until: null (permanent).

[PEARL Logic] Checking for pattern reinforcement...
This constraint has now been set — will apply as a hard minimal_work block in all future PLAN_DAY flows.
translate_habits_to_slots will pick this up on the next planning request.

[Voice of Jarvis] Suggesting "replan" action so user can regenerate schedule with updated constraint...`;

export const MOCK_CHAT_RESPONSE_INGESTION: ChatResponse = {
  intent: "KNOWLEDGE_INGESTION",
  message:
    "I've processed your syllabus. Extracted 12 chunks into ChromaDB and linked them to your existing tasks. You can now use 'Start Task' to get RAG-powered study materials for each scheduled item.",
  thinking_process: DEMO_THINKING_INGESTION,
  ingestion_result: {
    intent: "KNOWLEDGE_INGESTION",
    knowledge_result: {
      stored_chunk_count: 12,
      suggested_actions: ["generate_quiz", "use_for_revision"],
    },
  },
};

export const MOCK_CHAT_RESPONSE_BEHAVIORAL: ChatResponse = {
  intent: "BEHAVIORAL_CONSTRAINT",
  message:
    "Got it, I've noted your preference. Your schedule constraints have been updated.",
  thinking_process: DEMO_THINKING_BEHAVIORAL,
  suggested_action: "replan",
};

export const MOCK_SCHEDULE = {
  status: "OPTIMAL",
  schedule: DEMO_SCHEDULE,
  goal_metadata: DEMO_EXECUTION_GRAPH.goal_metadata,
  horizon_start: new Date().toISOString().split("T")[0] + "T08:00:00.000Z",
};

export const MOCK_EXECUTION_GRAPH = DEMO_EXECUTION_GRAPH;

export const MOCK_WORKSPACE: TaskWorkspace = {
  task_id: "chunk_1",
  task_title: "Quantifiers: universal & existential",
  primary_objective: "Master universal (∀) and existential (∃) quantifiers for the math mid-semester exam",
  surfaced_assets: [
    {
      asset_type: "pdf_chunk",
      title: "Quantifiers - Definitions",
      content_or_url:
        "Universal quantifier ∀: 'For all x, P(x)' means P(x) is true for every x in the domain. Existential quantifier ∃: 'There exists x such that P(x)' means at least one x satisfies P(x).",
      rationale: "From your syllabus Chapter 2",
    },
    {
      asset_type: "youtube_link",
      title: "Discrete Math - Quantifiers",
      content_or_url: "https://www.youtube.com/watch?v=2HdO1Q1Ljug",
      rationale: "Matches your visual learning style",
    },
    {
      asset_type: "article_link",
      title: "Khan Academy - Logical Reasoning",
      content_or_url: "https://www.khanacademy.org/math/discrete-math",
      rationale: "Comprehensive written guide",
    },
    {
      asset_type: "generated_quiz",
      title: "Practice Quiz",
      content_or_url: `1. Translate "All students pass" using ∀.
2. Negate ∃x P(x).
3. When is ∀x (P(x) → Q(x)) true?`,
      rationale: "Generated from your lecture notes",
    },
  ],
};

const TASK_WORKSPACES: Record<string, Partial<TaskWorkspace>> = {
  chunk_1: {
    task_title: "Quantifiers: universal & existential",
    primary_objective: "Master universal (∀) and existential (∃) quantifiers for the math mid-semester exam",
  },
  chunk_2: {
    task_title: "Negation of quantifiers",
    primary_objective: "Correctly negate ∀ and ∃ statements (e.g. ¬∀x P(x) ≡ ∃x ¬P(x))",
  },
  chunk_3: {
    task_title: "Proof techniques (direct, contrapositive)",
    primary_objective: "Write direct and contrapositive proofs for discrete math",
  },
  chunk_4: {
    task_title: "Basic set theory",
    primary_objective: "Define union, intersection, complement; use Venn diagrams",
  },
  chunk_5: {
    task_title: "Flashcard review",
    primary_objective: "Review key definitions with 90% recall",
  },
};

/** Returns task-specific workspace for demo mode. */
export function getMockWorkspaceForTask(taskId: string): TaskWorkspace {
  const overrides = TASK_WORKSPACES[taskId];
  return {
    ...MOCK_WORKSPACE,
    task_id: taskId,
    ...(overrides || { task_title: taskId }),
  };
}

/** Returns mock task-scoped ChatResponse for workspace chat (demo mode). */
export function getMockTaskChatResponse(
  taskTitle: string,
  primaryObjective: string,
  userPrompt: string
): ChatResponse {
  const lower = userPrompt.toLowerCase();
  const isQuantifier =
    taskTitle.toLowerCase().includes("quantifier") ||
    lower.includes("∀") ||
    lower.includes("∃") ||
    lower.includes("universal") ||
    lower.includes("existential");
  const isNegation =
    taskTitle.toLowerCase().includes("negation") ||
    lower.includes("negate") ||
    lower.includes("¬∀") ||
    lower.includes("¬∃");
  const isProof =
    taskTitle.toLowerCase().includes("proof") ||
    lower.includes("direct proof") ||
    lower.includes("contrapositive");
  const isSetTheory =
    taskTitle.toLowerCase().includes("set") ||
    lower.includes("union") ||
    lower.includes("intersection") ||
    lower.includes("venn");

  if (isQuantifier || lower.includes("example") || lower.includes("explain")) {
    return {
      intent: "TASK_QA",
      message:
        "**Universal (∀)**: 'For all x, P(x)' means P(x) is true for every x. Example: ∀x (x > 0 → x² > 0) says every positive number has a positive square.\n\n**Existential (∃)**: 'There exists x such that P(x)' means at least one x satisfies P(x). Example: ∃x (x² = 2) says there is a number whose square is 2 (√2).\n\nFor your materials, check the PDF chunk and the YouTube video—they walk through worked examples.",
    };
  }
  if (isNegation) {
    return {
      intent: "TASK_QA",
      message:
        "**Negation rules**: ¬∀x P(x) ≡ ∃x ¬P(x) and ¬∃x P(x) ≡ ∀x ¬P(x). To negate, flip the quantifier and negate the predicate. Example: The negation of 'All students pass' is 'Some student does not pass.'",
    };
  }
  if (isProof) {
    return {
      intent: "TASK_QA",
      message:
        "**Direct proof**: Assume P, derive Q step by step. **Contrapositive**: Prove ¬Q → ¬P instead of P → Q. Both are valid; contrapositive is often easier when the conclusion is a negation.",
    };
  }
  if (isSetTheory) {
    return {
      intent: "TASK_QA",
      message:
        "**Union (A ∪ B)**: All elements in A or B. **Intersection (A ∩ B)**: Elements in both. **Complement (A')**: Elements not in A. Venn diagrams help visualize these—draw overlapping circles for A and B.",
    };
  }
  if (lower.includes("more") || lower.includes("resource") || lower.includes("link")) {
    return {
      intent: "TASK_QA",
      message:
        "Your surfaced assets already include a PDF, a YouTube video, and Khan Academy. I've picked these to match your learning style. If you want more, try searching 'discrete math quantifiers' on YouTube or check your syllabus for additional chapters.",
    };
  }
  return {
    intent: "TASK_QA",
    message: `I'm here to help with "${taskTitle}". Your goal: ${primaryObjective}. Ask me to explain a concept, give an example, or clarify any of the materials above.`,
  };
}

/** Returns mock ChatResponse based on prompt keywords (for demo mode). */
export function getMockChatResponse(
  userPrompt: string,
  hasFile?: boolean
): ChatResponse {
  if (hasFile) return MOCK_CHAT_RESPONSE_INGESTION;
  const lower = userPrompt.toLowerCase();
  if (lower.includes("habit") || lower.includes("hate mornings") || lower.includes("before 11")) {
    return MOCK_CHAT_RESPONSE_BEHAVIORAL;
  }
  if (lower.includes("syllabus") || lower.includes("pdf") || lower.includes("ingest")) {
    return MOCK_CHAT_RESPONSE_INGESTION;
  }
  return MOCK_CHAT_RESPONSE_PLAN_DAY;
}

export function getDemoSchedule(): Record<string, { start_min: number; end_min: number; title?: string }> {
  return { ...DEMO_SCHEDULE };
}

export function getDemoExecutionGraph() {
  return { ...DEMO_EXECUTION_GRAPH };
}
