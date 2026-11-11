---
name: arabic-rtl-review
description: Arabic web interface review for RTL correctness and bilingual layout consistency.
---

# Arabic RTL & Bilingual Interface Review Skill

## Purpose and Execution Mode (Read-Only Review)

This skill provides a structured audit procedure for reviewing Arabic (`RTL`) and bilingual (`Arabic`/`English`) web interfaces in the **Opportunity Gate (بوّابة الفرص)** project.

> **STRICT CONSTRAINT – NO AUTOMATIC MODIFICATIONS:**
> This skill operates strictly in **review and audit mode**. Do **NOT** edit, rewrite, or modify any project files automatically during the review process unless the user explicitly asks to apply the fixes.

---

## Review Checklist

When activated, inspect the relevant HTML, React/TypeScript (`.tsx`/`.ts`), and CSS files against all of the following criteria:

### 1. Root Direction and Language Attributes
- Verify that `dir="rtl"` and `lang="ar"` are set on the root element (`<html>` or root application container) when Arabic (the default language) is active.
- Verify that switching the language dynamically updates both `dir` (`"rtl"` ↔ `"ltr"`) and `lang` (`"ar"` ↔ `"en"`) on the root element.

### 2. Bidirectional (BiDi) Text, Numbers, URLs, and Code
- Verify that embedded English terms, acronyms, numbers, dates, URLs, email addresses, and code snippets inside Arabic text are rendered in the proper direction without scrambling surrounding Arabic text.
- Check for proper use of `dir="ltr"`, `dir="auto"`, or CSS `unicode-bidi: isolate` / `<bdi>` where mixed-direction strings (such as deadlines, verification dates, or official URLs) appear inside RTL containers.

### 3. Punctuation and Brackets Integrity
- Verify that parentheses `()`, square brackets `[]`, quotation marks, colons, slashes, and directional arrows/icons do not flip or misalign at the start or end of Arabic strings or mixed Arabic-English phrases.

### 4. Alignment, Spacing, and Element Ordering in Arabic UI
- Review text alignment, flex/grid item ordering, icon placement relative to labels, margins, padding, and borders in Arabic (`RTL`) mode.
- Check whether hardcoded physical CSS properties (`margin-left`, `padding-right`, `left`, `right`, `text-align: left`) cause visual defects in RTL, and recommend CSS logical properties (`margin-inline-start`, `padding-inline-end`, `inset-inline`, `text-align: start`) where appropriate.
- Verify Arabic typography clarity, font fallback, line height (`line-height`), and letter spacing (`letter-spacing` must not break connected Arabic script).

### 5. RTL / LTR Switching Consistency
- Verify that toggling between Arabic (`RTL`) and English (`LTR`) transitions cleanly across all components (navigation bar, search/filter controls, opportunity cards, deadline badges, details view, and favorites) without layout shifts, clipped text, or leftover direction-specific styles.

### 6. Mobile Usability at `360px` Viewport Width
- Review layout responsiveness and usability starting from a `360px` screen width in both Arabic (`RTL`) and English (`LTR`).
- Check for unintended horizontal overflow/scrolling, cramped filter controls, truncated Arabic labels, overlapping badges, or touch targets that are too small.

---

## Reporting Format and Rules

After completing the inspection, output a structured review report following these rules:

1. **No Line Number Guessing:**
   - Always read the target files first and cite the **exact file paths and verified line numbers**.
   - Never guess or fabricate line numbers. If a file does not exist yet or a check applies to runtime DOM state not yet present in static code, state that explicitly.

2. **Separate Confirmed Issues from Suggested Improvements:**
   - **Section A – Confirmed Issues (مشكلات مؤكدة):** Concrete bugs or violations found in the inspected code (e.g., missing `dir="rtl"`/`lang="ar"`, broken BiDi handling, hardcoded `left`/`right` properties breaking RTL layout, or overflow at `360px`).
   - **Section B – Suggested Improvements (تحسينات مقترحة):** Non-breaking enhancements for better maintainability, accessibility, or logical CSS adoption.

3. **Per-Finding Details:**
   For every item in the report, provide:
   - **Category:** Which checklist item (1–6) it relates to.
   - **Location:** Exact file path and exact line range.
   - **Description:** Clear explanation of the issue or improvement.
   - **Proposed Fix:** A concrete code snippet showing the recommended fix (without applying it to the file unless explicitly requested by the user).

