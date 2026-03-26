/**
 * Architecture diagrams from Jarvis-Engine/docs/POLICY_ENGINE_ARCHITECTURE.md
 * Each diagram can be rendered with Mermaid and supports zoom/expand.
 */

export interface DiagramDef {
  id: string;
  title: string;
  description?: string;
  mermaid: string;
  category: "overview" | "target" | "flow" | "component" | "combined";
}

export const ARCHITECTURE_DIAGRAMS: DiagramDef[] = [
  {
    id: "current-overview",
    title: "Current Implementation — High-Level Overview",
    description: "Chat, ingestion, and workspace entry points; Control Policy, Plan-Day, OR-Tools Scheduler.",
    category: "overview",
    mermaid: `
flowchart LR
    User((User)) --> Chat[chat API]
    User --> Ingest[ingestion]
    User --> Workspace[workspace]
    Chat --> Control[Control Policy]
    Control --> Plan[Plan-Day]
    Control --> Habits[behavioral_constraints]
    Plan --> Schedule[OR-Tools Scheduler]
    Workspace --> RAG[RAG + Web + Practice]
    Ingest --> Chroma[(ChromaDB)]
`.trim(),
  },
  {
    id: "target-architecture",
    title: "Target Architecture (Design Vision)",
    description: "9-layer agentic stack: Local Orchestration, Memory/Extraction, Analytical Engine, Deterministic Engine. DKT, RL, L8 PII planned.",
    category: "target",
    mermaid: `
flowchart TD
    User((User)) -->|Types prompt| UI[Minimalist UI]
    UI -->|JSON Request| API[API Gateway - L3 Framework]
    subgraph LocalOrch [Local Orchestration Layer]
        API --> Router{LiteLLM Hybrid Router}
        Router -->|Simple Task or Planning| LocalLLM[Local Powerhouse: Qwen-14B]
        Router -->|Deep Research Query| L8PII[L8 Alignment: Guardrails AI]
    end
    subgraph MemExtract [Memory and Extraction Layer]
        LocalLLM -->|L6 Extraction| Docling[L6 Docling]
        Docling -->|L5 Embedding| Embedding[L5 MLX-Embed]
        Embedding -->|L4 Storage| VectorDB[L4 Chroma/Qdrant]
        LocalLLM -->|L7 Persistence| Memory[L7 Strategy Hub]
    end
    subgraph Analytical [Analytical Engine]
        LocalLLM -->|Structured JSON Intent| Logic[Control Policy]
        Logic -->|LSTM RNN| DKT[Deep Knowledge Tracing]
        Logic -->|DQN Model| RL[Reinforcement Learning]
        DKT -->|KC Mastery Scores| RL
    end
    subgraph Deterministic [Deterministic Engine]
        RL -->|Ordered Tasks and Priorities| CSP[CSP Solver]
        CSP -->|Calendar Math| Calendar[Calendar]
    end
    L8PII -->|Anonymized| CloudLLM[Gemini 1.5 Pro]
    CloudLLM -->|Cloud Response| API
    LocalLLM -->|Local Response| API
    Calendar -->|Final Schedule| API
    API -->|L1 Evaluation| Eval[Evaluation]
    API -->|Updates| UI
    API -->|Signals: Time, Focus, Mood| Signals[Analytical Engine Inputs]
    Signals -->|Reward or Penalty| RL
    Signals -->|User Profile| DKT
`.trim(),
  },
  {
    id: "entry-chat-flow",
    title: "Entry Points & Chat Flow",
    description: "POST /chat, ingestion, workspace APIs. Brain Dump → Control Policy → PLAN_DAY / KNOWLEDGE_INGESTION / BEHAVIORAL.",
    category: "flow",
    mermaid: `
flowchart TD
    User((User)) -->|JSON| ChatAPI[POST /api/v1/chat]
    User -->|File/Text| IngestAPI[POST /api/v1/ingestion/process]
    User -->|task_id| WorkspaceAPI[GET /api/v1/tasks/task_id/workspace]
    subgraph ChatFlow [Chat Flow]
        ChatAPI --> BrainDump[Brain Dump Extraction]
        BrainDump --> ControlPolicy[Control Policy]
        ControlPolicy -->|PLAN_DAY| PlanDayFlow[Plan-Day Flow]
        ControlPolicy -->|KNOWLEDGE_INGESTION| IngestAPI
        ControlPolicy -->|BEHAVIORAL| HabitsStore[behavioral_constraints]
    end
`.trim(),
  },
  {
    id: "plan-day-flow",
    title: "Plan-Day Flow (Full)",
    description: "Fetch habits → translate → expand → decompose → fusion → horizon → run_schedule → persist.",
    category: "flow",
    mermaid: `
flowchart TD
    subgraph PlanDayFlow [Plan-Day Flow]
        HabitsFetch[Fetch behavioral_constraints]
        HabitTranslate[translate_habits_to_slots]
        HorizonExpand[expand_semantic_slots_to_time_slots]
        Decompose[Socratic Chunker]
        Fusion[get_all_pending_tasks + Fusion]
        HorizonCalc[compute_horizon_from_deadlines]
        RunSchedule[run_schedule OR-Tools]
        Persist[_persist_fused_tasks]
        HabitsFetch --> HabitTranslate --> HorizonExpand
        Decompose --> Fusion --> HorizonCalc --> RunSchedule --> Persist
    end
`.trim(),
  },
  {
    id: "deterministic-engine",
    title: "Deterministic Engine (CSP + Calendar)",
    description: "run_schedule → TMT priority → OR-Tools CP-SAT → adaptive pacing → Calendar JSON.",
    category: "flow",
    mermaid: `
flowchart TD
    subgraph Deterministic [Deterministic Engine]
        RunSchedule[run_schedule] --> TMT[TMT Priority from deadline_hint]
        TMT --> CSP[CSP Solver: OR-Tools CP-SAT]
        CSP --> AdaptivePacing[compute_adaptive_daily_cap]
        AdaptivePacing --> Calendar[Calendar: Schedule JSON]
    end
`.trim(),
  },
  {
    id: "workspace-ingestion",
    title: "Workspace & Ingestion",
    description: "Workspace Builder: RAG, Web Search, Practice. Ingestion: Docling, ingest_knowledge, link_document_to_tasks.",
    category: "flow",
    mermaid: `
flowchart TD
    subgraph Workspace [Workspace Flow]
        WSB[Workspace Builder] --> RAG[RAG chunks]
        WSB --> WebSearch[Web Search]
        WSB --> PracticeGen[Practice Assets]
    end
    subgraph Ingestion [Ingestion Flow]
        Orchestrator[process_ingestion] --> Docling[Docling]
        Orchestrator --> IngestKnowledge[ingest_knowledge]
        Orchestrator --> LinkTasks[link_document_to_tasks]
    end
    RAG --> ChromaDB[(ChromaDB)]
    IngestKnowledge --> ChromaDB
    LinkTasks --> TaskMaterials[(task_materials)]
`.trim(),
  },
  {
    id: "brain-dump",
    title: "Brain Dump: Extract → Execute → Synthesize",
    description: "Phase 1 Extract, Phase 2 Execute (parallel search), Phase 3 Voice of Jarvis synthesis.",
    category: "component",
    mermaid: `
flowchart TB
    subgraph extraction [Phase 1: Extract]
        UserPrompt[User Brain Dump]
        ExtractLLM[Brain Dump Extraction LLM]
        BrainDumpSchema[BrainDumpExtraction schema]
        UserPrompt --> ExtractLLM
        ExtractLLM --> BrainDumpSchema
    end
    subgraph execution [Phase 2: Execute]
        BrainDumpSchema --> SaveHabits[Save inline habits]
        BrainDumpSchema -->|search_queries| SpawnSearch[asyncio.create_task search]
        SaveHabits --> MergeState[Merge state_updates]
        MergeState --> ProposeActions[Propose action items]
        ProposeActions --> ProcessCalendar[Process calendar if any]
        ProcessCalendar --> PlanDay{Has planning goal?}
        PlanDay -->|Yes| Decompose[Decompose + Schedule]
        PlanDay -->|No| AwaitSearch
        Decompose --> AwaitSearch[Await search_task]
        SpawnSearch -.->|runs in parallel| AwaitSearch
        AwaitSearch --> ExecSummary[Execution summary]
    end
    subgraph synthesis [Phase 3: Voice of Jarvis]
        ExecSummary --> VoiceLLM[4B Response Synthesis]
        VoiceLLM --> UnifiedMessage[Single warm message]
    end
    UnifiedMessage --> ChatResponse[Unified ChatResponse]
`.trim(),
  },
  {
    id: "control-policy",
    title: "Control Policy: Single Entry, Plan vs Ingest",
    description: "5-way classification. Plan Day pipeline: FetchHabits → Translate → Decompose → Solve.",
    category: "component",
    mermaid: `
flowchart TD
    subgraph Entry [Single Entry Point]
        Chat[POST api/v1/chat]
    end
    subgraph ControlPolicy [Control Policy]
        Classify[4B: 5-way classification]
        Classify -->|PLAN_DAY| PlanDayFlow[Plan Day Flow]
        Classify -->|Ingestion intent| IngestFlow[Ingestion Flow]
    end
    subgraph PlanDayFlow [Plan Day Pipeline]
        FetchHabits[get_behavioral_context_for_calendar]
        Translate[translate_habits_to_slots 27B]
        Decompose[hybrid_route_query Socratic 27B]
        Solve[run_schedule OR-Tools]
        FetchHabits --> Translate
        Translate --> Decompose
        Decompose --> Solve
    end
    subgraph IngestFlow [Ingestion Pipeline]
        ProcessIngest[process_ingestion]
    end
    PlanDayFlow --> ChatResponse[ChatResponse]
    IngestFlow --> ChatResponse
`.trim(),
  },
  {
    id: "global-recalibration",
    title: "Global Recalibration: Fusion Flow",
    description: "Decompose new goal → get_all_pending_tasks → Fusion (namespace, master_chunk_list) → run_schedule → persist.",
    category: "component",
    mermaid: `
flowchart TD
    subgraph Request [PLAN_DAY Request]
        A[planning_goal]
    end
    subgraph Decompose [Decompose New Goal]
        A --> B[hybrid_route_query]
        B --> C[new_graph: ExecutionGraph]
    end
    subgraph Retrieve [Retrieve Pending]
        D[get_all_pending_tasks]
        D --> E[(user_tasks status=pending)]
        E --> F[pending_chunks]
    end
    subgraph Fusion [Fusion]
        C --> G[Namespace new: goal_id_task_id]
        F --> H[Namespace old]
        G --> I[master_chunk_list]
        H --> I
        I --> J[compute_horizon_from_deadlines]
        J --> K[global_horizon]
        I --> L[compute_adaptive_daily_cap]
        L --> M[run_schedule synthetic_graph]
    end
    subgraph Persist [Persist]
        M --> N[Replace user_tasks with master_chunk_list]
    end
`.trim(),
  },
  {
    id: "workspace-builder",
    title: "Workspace: RAG + Web Search + Practice Gen",
    description: "Start Task → Workspace Builder → RAG, Web Search (learning-style), Dynamic Practice Asset Generator.",
    category: "component",
    mermaid: `
flowchart TD
    User[User clicks Start Task] --> WorkspaceEndpoint[GET tasks task_id workspace]
    WorkspaceEndpoint --> FetchTask[Fetch user_tasks + task_materials]
    FetchTask --> Builder[Workspace Builder]
    subgraph builder [Workspace Builder - asyncio.gather]
        RAG[RAG Material Fetch]
        WebSearch[Learning-Style Web Search]
        PracticeGen[Dynamic Practice Asset Generator]
    end
    Builder --> RAG
    Builder --> WebSearch
    Builder --> PracticeGen
    RAG --> TaskMaterials[(task_materials)]
    TaskMaterials --> ChromaDB[(ChromaDB)]
    WebSearch --> LearningStyle[user_preferences.learning_style]
    LearningStyle -->|watcher| GeminiYouTube[Gemini YouTube]
    LearningStyle -->|reader| GeminiArticles[Gemini Articles]
    LearningStyle -->|interactive| GeminiBoth[Both]
    PracticeGen --> Context[Task context + Chunks]
    Context --> LLMRouter[LLM decides output type]
    LLMRouter -->|PDF or Notes| Quiz[Quiz from materials]
    LLMRouter -->|Topic only| Links[LeetCode + YouTube + Blog]
    LLMRouter -->|User question| Freeform[Freeform LLM response]
    RAG --> Aggregate[Aggregate StudyAssets]
    WebSearch --> Aggregate
    PracticeGen --> Aggregate
    Aggregate --> TaskWorkspace[TaskWorkspace JSON]
    TaskWorkspace --> User
`.trim(),
  },
  {
    id: "litellm-router",
    title: "LiteLLM: Local vs Cloud Routing",
    description: "Local-first: CLOUD_KEYWORDS match → Gemini; else → Local Qwen 27B or 4B.",
    category: "component",
    mermaid: `
flowchart LR
    Request[user_prompt] --> Router{LiteLLM Router}
    Router -->|CLOUD_KEYWORDS match| Cloud[Gemini + web_search_options]
    Router -->|else| Local[Local Qwen 27B or 4B]
    Cloud --> Response[Response]
    Local --> Response
`.trim(),
  },
  {
    id: "adaptive-pacing-tmt",
    title: "Adaptive Pacing + TMT",
    description: "slack_ratio, compute_adaptive_daily_cap, TMT from deadline_hint, horizon retry.",
    category: "component",
    mermaid: `
flowchart TD
    subgraph inputs [Inputs]
        Horizon[horizon_minutes]
        Total[total_task_minutes]
        Intrinsic[cognitive_load.intrinsic_load]
        Chunks[chunks with deadline_hint]
    end
    subgraph pacing [Adaptive Pacing]
        Slack[slack_ratio = horizon / total]
        Slack --> Tiers[slack >= 10: 90 min/day, >= 5: 120, >= 3: 180]
        Tiers --> Cap[compute_adaptive_daily_cap]
        Cap --> Cognitive[if intrinsic >= 0.8: cap *= 0.8]
    end
    subgraph tmt [TMT from Deadlines]
        Chunks --> Delay[_delay_hours_for_chunk]
        Delay --> Priority[TMT priority score]
        Priority --> Solver[Solver weights task start]
    end
    Cap --> Solver
`.trim(),
  },
  {
    id: "multi-day-safeguards",
    title: "Multi-Day Safeguards",
    description: "Late-night fix, biological fallback inject, horizon_start, thinking_process in ChatResponse.",
    category: "component",
    mermaid: `
flowchart TD
    subgraph ChatFlow [Chat Request]
        A[ChatRequest with optional day_start_hour] --> B[execute_agentic_flow]
        B --> C{planning_goal?}
        C -->|yes| D[_run_plan_day_flow]
        C -->|no| E[synthesize_jarvis_response]
    end
    subgraph PlanDayFlow [Plan Day Flow]
        D --> F[Logical day fix: plan_date if before DAY_START]
        F --> G[_build_daily_context]
        G --> H[run_schedule]
        H --> I[Biological fallback inject]
        I --> J[Solver]
        J --> K[synthesize_jarvis_response]
    end
    subgraph Response [ChatResponse]
        K --> L[message + thinking_process]
        E --> L
        L --> M[ChatResponse]
    end
`.trim(),
  },
  {
    id: "chromadb-linking",
    title: "ChromaDB-to-Task Linking",
    description: "Ingestion: Doc → ingest_knowledge → ChromaDB. Workspace: task_materials → Query ChromaDB → Chunks.",
    category: "component",
    mermaid: `
flowchart LR
    subgraph ingest [Ingestion Pipeline]
        Doc[PDF or Syllabus] --> Ingest[ingest_knowledge]
        Ingest -->|source_id per doc| Chroma[(ChromaDB)]
        Ingest --> Topics[document_topics]
        Topics --> Linker[link_document_to_tasks]
        Linker --> TaskMaterials[(task_materials)]
    end
    subgraph workspace [Workspace Builder]
        TaskMaterials -->|source_ids| RAGQuery[Query ChromaDB by source_id]
        RAGQuery --> Chroma
        Chroma --> Chunks[Text chunks]
    end
`.trim(),
  },
  {
    id: "combined-entry-routing",
    title: "Combined: Entry Points and Routing",
    description: "Full flow from Chat/Ingest/Workspace APIs through Brain Dump, Control Policy, Plan Day, Ingestion.",
    category: "combined",
    mermaid: `
flowchart TD
    User((User)) -->|prompt| ChatAPI[POST chat]
    User -->|file/text| IngestAPI[POST ingestion process]
    User -->|task_id| WorkspaceAPI[GET tasks workspace]
    ChatAPI --> BrainDump[Brain Dump Extraction 4B]
    BrainDump --> BrainDumpSchema[BrainDumpExtraction]
    BrainDumpSchema --> ControlPolicy[Control Policy]
    ControlPolicy -->|PLAN_DAY| PlanDayFlow
    ControlPolicy -->|INGESTION| IngestAPI
    ControlPolicy -->|BEHAVIORAL| HabitsStore[(behavioral_constraints)]
    subgraph PlanDayFlow [Plan Day Flow]
        direction TB
        FetchHabits[Fetch habits]
        HabitTranslate[Translate 27B]
        HorizonExpand[Expand slots]
        Decompose[Decompose 27B]
        Fusion[get_all_pending_tasks + Fusion]
        HorizonCalc[compute_horizon]
        RunSchedule[run_schedule]
        Persist[_persist_fused_tasks]
        FetchHabits --> HabitTranslate --> HorizonExpand
        Decompose --> Fusion --> HorizonCalc --> RunSchedule --> Persist
    end
    IngestAPI --> Orchestrator[process_ingestion]
    Orchestrator --> Docling[Docling]
    Orchestrator --> IngestKnowledge[ingest_knowledge]
    Orchestrator --> LinkTasks[link_document_to_tasks]
    IngestKnowledge --> Chroma[(ChromaDB)]
    LinkTasks --> TaskMaterials[(task_materials)]
    WorkspaceAPI --> WSB[Workspace Builder]
    WSB --> RAG[RAG Fetch]
    WSB --> WebSearch[Web Search]
    WSB --> PracticeGen[Practice Assets]
    RAG --> Chroma
`.trim(),
  },
  {
    id: "combined-plan-to-schedule",
    title: "Combined: Plan Day to Schedule",
    description: "Fusion → run_schedule → Biological fallback → TMT → CSP → Calendar → Voice of Jarvis.",
    category: "combined",
    mermaid: `
flowchart TD
    subgraph PlanDay [Plan Day Pipeline Detail]
        Decompose[Decompose: new_graph]
        GetPending[get_all_pending_tasks]
        Namespace[Namespace goal_id_task_id]
        Merge[master_chunk_list]
        Horizon[compute_horizon_from_deadlines]
        Pacing[compute_adaptive_daily_cap]
        Synthetic[synthetic_graph]
        Decompose --> Namespace
        GetPending --> Merge
        Namespace --> Merge
        Merge --> Horizon
        Merge --> Pacing
        Merge --> Synthetic
    end
    subgraph Solver [Deterministic Engine]
        RunSched[run_schedule]
        BioFallback[Biological fallback inject]
        TMT[TMT from deadline_hint]
        CSP[OR-Tools CP-SAT]
        Calendar[Schedule JSON]
        RunSched --> BioFallback
        BioFallback --> TMT
        TMT --> CSP
        CSP --> Calendar
    end
    Horizon --> RunSched
    Pacing --> RunSched
    Synthetic --> RunSched
    Calendar --> Voice[Voice of Jarvis]
    Voice --> Response[ChatResponse: message + thinking_process]
`.trim(),
  },
];

export const DIAGRAM_CATEGORIES = [
  { id: "overview", label: "Overview" },
  { id: "target", label: "Target Architecture" },
  { id: "flow", label: "Request Flow" },
  { id: "component", label: "Component Details" },
  { id: "combined", label: "Combined Views" },
] as const;
