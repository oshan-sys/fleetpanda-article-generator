// Model used for article generation, served via Groq's free API
// (https://console.groq.com) instead of a paid provider. Llama 3.3 70B is a
// good quality/speed balance; see console.groq.com/docs/models for other
// currently-hosted options if you want to swap it.
export const MODEL_ID = "llama-3.3-70b-versatile";

// Heuristic used to pre-estimate token counts for rate-limit pacing
// (lib/groqRateLimit.ts) — not exact, deliberately conservative (fewer
// chars/token = higher token estimate) so pacing waits slightly more than
// strictly necessary rather than risking a 413/429.
export const CHARS_PER_TOKEN_ESTIMATE = 3.5;

// Groq's free tier caps llama-3.3-70b-versatile at 12,000 tokens/minute
// (confirmed via the API's rate-limit headers — this is the highest of the
// currently-hosted free models, not a conservative guess), counting BOTH
// input (system prompt + document) and this reserved output budget. The
// User Guide format is comprehensive (the reference guide it's modeled on
// runs ~5,000+ tokens), so this needs real headroom.
export const MAX_OUTPUT_TOKENS = 6000;

// Above this, a document fits Groq's 12,000 tokens/minute budget in a
// single request alongside the full style prompt (~2,050 tokens worst
// case) and MAX_OUTPUT_TOKENS. At or below this, /api/generate skips
// chunking entirely and behaves exactly as a single call always has.
export const SINGLE_PASS_MAX_CHARS = 11_000;

// Documents larger than SINGLE_PASS_MAX_CHARS go through a condensation
// pass first (see CONDENSATION_SYSTEM_PROMPT below): split into chunks,
// each condensed down to customer-relevant content by its own Groq call,
// then the condensed result is run through the normal single-pass
// generation. The condensation prompt is much shorter than the full style
// prompt, so each condensation chunk can be far bigger than
// SINGLE_PASS_MAX_CHARS while still fitting the same 12,000/minute budget.
export const CONDENSE_CHUNK_MAX_CHARS = 30_000;
export const CONDENSE_OUTPUT_TOKENS = 2000;

// Absolute ceiling on the source document, checked before chunking even
// starts. This is a character-based heuristic, not an exact token count.
// Raise it if you want to support even larger docs — each extra
// CONDENSE_CHUNK_MAX_CHARS-sized chunk adds roughly 30-60s of real time,
// since Groq's free tier is a continuously-refilling 12,000-tokens/60s
// bucket (see lib/groqRateLimit.ts) and a full-size condensation call can
// consume most of the bucket in one shot.
export const MAX_DOCUMENT_CHARS = 60_000;

// Sent for each chunk during condensation. Deliberately much shorter than
// DEFAULT_STYLE_PROMPT — it only needs to extract customer-relevant facts,
// not produce the final formatted guide — which is what buys the bigger
// per-chunk character budget above.
export const CONDENSATION_SYSTEM_PROMPT = `You are helping process one piece of a longer internal FleetPanda product
document ("102 doc") that has been split into sequential parts because it's
too long to process in one pass. You'll be told which part this is.

Read this excerpt and extract everything a customer-facing User Guide about
this feature would need:
- What the feature does and who uses it
- Every concrete step or interaction in any workflow, in order
- Every icon, color, status, toggle, or other reference data — keep tables
  or structured lists intact, don't lose the data
- Any tips, warnings, required setup steps, or "why it matters" notes
- Any FAQ questions and answers, kept close to verbatim

Do NOT write the final customer-facing guide — a later step does that from
the combined output of all parts. Just extract and lightly organize the
customer-relevant facts as plain notes. Preserve exact UI labels, button
names, and step order — a customer will need these exactly right later.

Leave out entirely, since none of it will ever reach the customer-facing
guide: personas/JTBD framing, feature flags or internal enablement
settings, module/ownership classification, "non-goals", sales objections,
internal contacts or Slack/Teams channel names, and change logs. Dropping
these here saves space for what actually matters.

Be concise, but do not drop workflow detail, steps, or reference tables —
those are the most valuable things to preserve. Plain text or lightly
structured Markdown is fine; it does not need to be polished prose.`;

// Upload constraints, enforced both client- and server-side.
export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;
export const ACCEPTED_FILE_EXTENSIONS = [".docx", ".doc", ".txt", ".md", ".pdf"];

export const PREVIEW_CHAR_COUNT = 500;

export const STYLE_INSTRUCTIONS_STORAGE_KEY = "article-generator:style-instructions";

export const DEFAULT_STYLE_PROMPT = `FleetPanda User Guide Template (Customer-Facing)

Convert the internal 102 doc into a complete, customer-facing User Guide —
not a short summary. A customer should be able to use this as their primary
reference for the feature: what it does, why it matters, and exactly how to
perform every documented action. Preserve the full depth of the source
material's workflow section; only strip the internal-only framing listed
under RULES below. This is a full reference document, not a teaser — do not
compress multi-step workflows into a single paragraph.

STRUCTURE

1. TITLE BLOCK
   ONE single-line "#" heading combining company, feature name, and
   "User Guide" — e.g. "# FleetPanda Route Builder User Guide". Markdown
   headings cannot span multiple lines, so do not split this across
   separate lines.

2. OVERVIEW
   2–4 sentences: what the tool is, the general approach it uses (e.g. a
   map-based interface, a dashboard), and the core value it delivers.
   Written for the person who will actually use it day to day.

3. WHAT YOU CAN DO
   A short bullet list (4–8 bullets) of the core capabilities. Each bullet
   is one line, phrased as an action ("Visualize...", "Select...",
   "Create...").

4. WHO USES [FEATURE NAME]
   One bullet per role that touches this feature — translate the source
   doc's internal "Personas" into plain role names a customer would
   recognize (e.g. Dispatchers/Planners, Drivers, Operations Teams). Each
   is its own "-" bullet: "- **Role Name**: 1–2 sentences on what that role
   does with the feature." Always use a bullet per role — consecutive
   plain lines with no bullet or blank line between them can render as one
   run-on paragraph.

5. KEY FEATURES AT A GLANCE
   A two-column Markdown table: "Feature" | "What It Does". One row per
   major feature from the source doc's feature list. Keep each cell to one
   short sentence.

6. GETTING STARTED
   - "### Accessing [Feature Name]" as an actual "###" sub-header (not a
     bare bolded line): if the source document describes an internal
     enablement step (a setting, a feature flag, an admin toggle), do NOT
     explain that internal mechanism. Instead open with a callout —
     "> **NOTE:** If you don't see [Feature Name] in the navigation menu,
     the feature may not be enabled for your account. Contact your
     administrator to enable access." — then give short numbered steps for
     how someone who already has access opens the feature.
   - "### Understanding the Layout" as its own "###" sub-header: describe
     the main areas of the screen (e.g. a three-panel layout) — what lives
     where, in plain language.

7. DETAILED WALKTHROUGH SECTIONS
   One "##" section per major area of functionality covered in the source
   document's workflow / "how it works" section. There will usually be
   several distinct areas — do not compress them into one section. For
   each:
   - Open with a one- or two-sentence summary of what the section covers.
   - EVERY named sub-topic gets an actual "###" heading — never write a
     sub-topic name as a bolded or plain line ending in a colon (e.g. do
     NOT write "Understanding Pin Colors:" as a text line — write
     "### Understanding Pin Colors" as a real heading). This applies
     consistently through the whole document, not just the first section —
     it's easy to drift back to plain bolded lines partway through a long
     document; don't.
   - Use numbered steps for anything the customer DOES in sequence.
   - Use plain bullets for reference information that isn't sequential
     (e.g. "what each icon or color means").
   - Use a Markdown table wherever the source document has structured
     reference data (icon meanings, color codes, toggle effects, menu
     actions, statuses) — do not flatten tables into prose.
   - Add a callout (blockquote) wherever the source flags a tip, a warning,
     a required setup step, a "why it matters" explanation, or an
     error/edge case. Format every callout the same way — a short bold
     ALL-CAPS label on the first line, then one or two plain sentences:
     "> **QUICK TIP:** Press SHIFT + L at any time to toggle the tool on."
     "> **IF PUBLISHING FAILS:** ..."
     Do not invent callouts that aren't grounded in the source material.

   Worked example of the expected shape for one section (follow this
   pattern exactly, including the "###" headings and the table):

   ## Viewing Your Data on the Map
   This section covers how orders, hubs, and routes appear on the map.

   ### Clustered View
   When you first load the map, orders are grouped into numbered clusters.
   Double-click or scroll on a cluster to zoom in.

   ### Understanding Pin Colors
   Each pin's color tells you its status at a glance.

   | Color | Meaning |
   | --- | --- |
   | Red | Over 75% full |
   | Yellow | 40–75% full |

   > **QUICK TIP:** Hover over any pin to see its full details.

8. TIPS & COMMON QUESTIONS
   Group the source document's FAQ content under 2–4 short category
   sub-headers ("###"), matching how the questions naturally cluster (e.g.
   by screen or workflow area). Under each, list questions in bold followed
   by a one- or two-sentence plain-language answer. If the source document
   separately lists a limitation or edge case a customer would genuinely
   need to know, fold it in here as a question and answer rather than a
   labeled "Known Limitations" section.

RULES
- Translate ALL internal framing into customer language. Never mention or
  carry over: personas, JTBD, feature flags, the internal settings/toggles
  used to enable the feature, module/ownership classification, a
  "Non-Goals" section, internal Slack/Teams channel names, internal contact
  names, or a change log.
- Do not include a "Sales / Customer Objections" section or anything
  written to persuade a skeptical buyer — this is a how-to guide, not a
  sales asset.
- Use "you" and active voice throughout instructions ("Click Create Route,"
  not "The Create Route button is clicked").
- Do not invent steps, screens, UI labels, or behavior that isn't in the
  source document. If something is ambiguous, phrase it generally rather
  than guessing specifics.
- No marketing language. Clear, complete, and instructional — this is
  reference documentation the reader will come back to, not a one-time
  pitch.

OUTPUT FORMAT
Output valid Markdown only. Never write HTML tags of any kind (no <font>,
<span>, <div>, <br>, etc.) and never write color codes, hex values, or style
attributes anywhere — any visual styling is applied automatically after you
write plain text, so you never need to (and must not) encode it yourself.
- "#" once, for the title block.
- "##" for each major section (Overview, What You Can Do, Who Uses
  [Feature], Key Features at a Glance, Getting Started, each detailed
  walkthrough section, Tips & Common Questions).
- "###" for sub-headers within a section.
- Standard Markdown tables (a header row, then a "---" separator row, then
  data rows) for tabular reference data.
- ">" blockquotes for every callout, with the label in "**bold**" on the
  first line.
- "1." numbered lists for sequential steps; "-" bullets for non-sequential
  lists. "**bold**" for role names and FAQ questions.
`;
