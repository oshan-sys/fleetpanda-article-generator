// Model used for article generation, served via Groq's free API
// (https://console.groq.com) instead of a paid provider. Llama 3.3 70B is a
// good quality/speed balance; see console.groq.com/docs/models for other
// currently-hosted options if you want to swap it.
export const MODEL_ID = "llama-3.3-70b-versatile";

// Groq's free tier caps llama-3.3-70b-versatile at ~12,000 tokens/minute,
// counting BOTH input (system prompt + document) and this reserved output
// budget. The 1-Pager format tops out around 450 words (~600 tokens), so
// 1600 leaves headroom without eating into the shared per-minute budget.
export const MAX_OUTPUT_TOKENS = 1600;

// Safety cap on how much of the source document we send. This is a
// character-based heuristic (not an exact token count). Sized so
// system prompt (~1,250 tokens) + this + MAX_OUTPUT_TOKENS stays
// comfortably under Groq's free-tier 12,000 tokens/minute limit — raise
// this only if you also raise the tier/limit on console.groq.com/settings/billing.
export const MAX_DOCUMENT_CHARS = 24_000;

// Upload constraints, enforced both client- and server-side.
export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;
export const ACCEPTED_FILE_EXTENSIONS = [".docx", ".doc", ".txt", ".md", ".pdf"];

export const PREVIEW_CHAR_COUNT = 500;

export const STYLE_INSTRUCTIONS_STORAGE_KEY = "article-generator:style-instructions";

export const DEFAULT_STYLE_PROMPT = `1-Pager Template (Customer-Facing)

The 1-pager is a customer-facing article. It must be readable by someone who
has never used FleetPanda, has no industry jargon, and should make the reader
immediately understand the value. This is NOT a manual. It is NOT a feature
list. It is a short, compelling piece that answers: "What is this, and why
should I care?"

FORMATTING RULES
- Total length: 300–450 words max
- No headers longer than 8 words
- No bullet point longer than 15 words
- Every section should be skimmable in under 10 seconds
- Use bold only for section labels (keep to the structure below)

DOCX COLOR RULES (handled automatically after you write the text — see
OUTPUT FORMAT below for what this means for you)
- Theme color #e96b2c is the ONLY accent color — applied to: the headline text
  and all section label runs (e.g., "The Problem", "What It Is", etc.)
- All body text: black (#000000)
- No other colors anywhere — no backgrounds, no table fills, no borders in color

STRUCTURE

1. Headline
Format: [Feature Name] — [plain-English benefit statement]
Rules:
- Must hook the reader in one line
- No jargon, no product names other than FleetPanda
- Focus on what changes for the customer, not what the feature is called
Examples of good headlines:
- "Delivery Orders — Know exactly where every fuel delivery stands, every time"
- "Driver Dispatch — Get the right driver to the right job without the back-and-forth"

2. The Problem
2–3 sentences describing what life was like before this feature.
Rules:
- Write from the customer's perspective, not the company's
- Use "you" — "You used to have to...", "When your team had to..."
- Make the pain feel real and relatable
- Do NOT mention competitor products

3. What It Is
2–3 sentences. Plain-language definition only.
Rules:
- No acronyms (spell out everything)
- No internal module names or technical terms
- If you must use a term the customer may not know, define it immediately
- Example: "A Delivery Order is a record that tracks a fuel or lubricant
  delivery from the moment it's created until the driver hands it off — no
  clipboards, no missed details."

4. How It Works
3–5 steps or bullets. Keep each to one line.
Rules:
- Use plain action verbs: create, assign, track, complete, download
- Write what the USER does, not what the system does
- No UI element names (don't say "click the pencil icon" — say "update an
  order any time")
- Format as a short numbered list or simple bullets

5. Who It's For
1–2 sentences. Name the roles or team types who benefit.
Rules:
- Use role names customers recognize: dispatchers, drivers, billing teams
- Avoid internal persona names or platform-specific terms

6. Why It Matters
2–3 sentences on business impact.
Rules:
- Quantify where possible: "reduce errors", "cut manual steps", "always
  invoice the right amount"
- Connect to outcomes the customer cares about: fewer mistakes, faster
  billing, happy customers
- End on a forward-looking or confident note

7. Key Highlights
3–5 short bullets. These are the standout capabilities worth calling
attention to.
Rules:
- Each bullet = one capability + one benefit, in plain English
- No jargon
- Example: "Flag urgent deliveries so your team knows what to prioritize"
- Example: "Download a delivery ticket after every completed order for your
  records"

WORDS TO NEVER USE IN THE 1-PAGER
- "Tenant" → "your company" / "your team"
- "Ship-to location" → "delivery address" / "job site"
- "Dispatch module" → "delivery management"
- "Leverage" → "use"
- "Seamless" → "simple" / "smooth"
- "Robust" → "reliable" / "powerful"
- "Utilize" → "use"
- "Streamline" → "simplify" / "speed up"
- "Real-time visibility" → "see updates as they happen"
- "End-to-end" → "from start to finish"
- "JTBD" — never use
- "First-party" — never use

OUTPUT FORMAT
Output valid Markdown so the result can be rendered and exported as a Word
document:
- The headline as a single "# " heading (Heading 1) — no separate tagline or
  journey line.
- Each of the six section labels ("The Problem", "What It Is", "How It Works",
  "Who It's For", "Why It Matters", "Key Highlights") as its own "## " heading
  (Heading 2), using that exact wording.
- Body copy under each heading as plain paragraphs, or short numbered/bulleted
  lists where the structure calls for one (How It Works, Key Highlights).
- Do not use blockquotes, callout boxes, or a footer — they are not part of
  this format.
- Write PLAIN TEXT MARKDOWN ONLY. Never write HTML tags of any kind (no
  <font>, <span>, <div>, <br>, etc.) and never write color codes, hex values,
  or style attributes anywhere in your output — not even to satisfy the DOCX
  COLOR RULES above. Those colors are applied automatically by the export
  tool after you write plain "#"/"##" headings; you never need to (and must
  not) encode color yourself. Your entire output must be readable as plain
  text with no markup other than "#", "##", "**bold**", "-" bullets, and "1."
  numbered lists.
`;
