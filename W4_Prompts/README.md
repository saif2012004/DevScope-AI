# DevScope AI — Week 4 Prompts
# How to use these files with Claude Code CLI

## Option A — Pipe directly (RECOMMENDED, no copy-paste needed)

Open your terminal in the DevScopeAI root folder and run:

  claude < week4_prompts/p1_orientation.md

This pipes the file content directly into Claude Code. No copy-paste, no formatting issues.

Run each prompt in order. Wait for Claude Code to fully finish before running the next one.

FULL SEQUENCE:
  claude < week4_prompts/p1_orientation.md
  claude < week4_prompts/p2_setup.md
  claude < week4_prompts/p3_doc_generator.md
  claude < week4_prompts/p4_pr_review.md
  claude < week4_prompts/p5_complexity.md
  claude < week4_prompts/p6_landing_page.md
  claude < week4_prompts/p7_polish.md
  claude < week4_prompts/p8_verification.md

## Option B — Use --print flag for non-interactive mode

  claude --print < week4_prompts/p1_orientation.md

## Option C — Reference the file inside Claude Code session

Start claude normally:
  claude

Then inside the session, say:
  Read the file week4_prompts/p2_setup.md and execute those instructions.

Claude Code will read and follow the file directly.

## IMPORTANT RULES
1. Run prompts IN ORDER (p1 through p8)
2. Wait for full completion before running the next one
3. If a prompt fails midway, fix the error then re-run the SAME prompt
4. Keep docker running the whole time: npm run docker:up
5. Keep the dev server running: npm run dev (in a separate terminal)

## FILE ORDER
p1_orientation.md    — Read entire codebase, report current state
p2_setup.md          — Add DB models, install packages, update sidebar  
p3_doc_generator.md  — Auto Documentation Generator feature
p4_pr_review.md      — PR Review Bot feature
p5_complexity.md     — Complexity Scorer feature
p6_landing_page.md   — Public marketing landing page
p7_polish.md         — Real dashboard stats + UI polish
p8_verification.md   — Full end-to-end test + git commit
