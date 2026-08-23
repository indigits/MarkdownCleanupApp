# Obsidian Markdown Cleaner 🔮

A pure-frontend web application built with **Svelte 5** and **Vite** designed to clean up messy Markdown copied from **Google Gemini**, **ChatGPT**, **Claude**, and other AI chatbots so that it pastes and renders cleanly in **Obsidian**.

![Obsidian Markdown Cleaner UI](https://raw.githubusercontent.com/indigits/MarkdownCleanupApp/main/public/preview.jpg)

---

## ✨ Features

- **Loose List Tightener (Gemini Fix)**: Automatically detects and eliminates extra empty lines between bullet points (`*`, `-`, `+`), numbered lists (`1.`, `a.`), and task lists (`- [ ]`), keeping list items tight and clean in Obsidian.
- **LaTeX Math Normalizer**: Converts LaTeX `\[ ... \]` to Obsidian standard `$$ ... $$` (display math) and `\( ... \)` to `$ ... $` (inline math).
- **AI Callout Converter**: Automatically turns AI alert patterns like `> **Note:**`, `> **Warning:**`, `> **Tip:**` into native Obsidian Callouts (`> [!note]`, `> [!warning]`, `> [!tip]`).
- **Bold & Italic Whitespace Fixer**: Fixes spacing inside asterisks (`** word **` &rarr; `**word**`) so Obsidian's CommonMark parser renders bold/italics without errors.
- **Headings Normalizer**: Ensures space after hashes (e.g. `###Heading` &rarr; `### Heading`) and standardizes vertical spacing.
- **Code Block Safety**: Uses fence masking to guarantee that code snippets and inline backticks are never altered.
- **Live Obsidian Reading View**: Preview your cleaned note rendered with callout badges, LaTeX math formatting, checkboxes, and tables.
- **Line Diff Viewer**: Visual side-by-side indicator showing exactly which empty lines and whitespace tokens were removed.
- **Presets**: 
  - 🤖 **Gemini &rarr; Obsidian** (Specialized for Google Gemini chats)
  - 💬 **ChatGPT &rarr; Obsidian** (Optimized for GPT-4o output)
  - 🧠 **Claude &rarr; Obsidian** (Anthropic Claude formatting)
  - ⚡ **Obsidian Power Clean** (All rules enabled)
  - 🍃 **Minimal** (List tightening only)
- **One-Click Actions**:
  - 📋 **Copy Markdown**: Copies clean text directly with instant toast feedback.
  - 💾 **Download `.md` File**: Exports note file.
  - 🚀 **Open in Obsidian**: Uses the `obsidian://` protocol to create note directly in Obsidian.
- **Themes**: Obsidian Dark (default) and Light theme switcher with local persistence.

---

## 🚀 GitHub Pages Deployment

This project is 100% pure frontend (no backend server or API keys required) and is pre-configured for GitHub Pages:

1. **Relative Base Path**: `vite.config.ts` includes `base: './'` so static assets load correctly under any GitHub Pages subpath (e.g. `https://<username>.github.io/<repo>/`).
2. **Automated CI/CD**: A GitHub Actions workflow is included at `.github/workflows/deploy.yml`. When you push to `main` or `master`, GitHub Actions will automatically run the test suite, build the project, and deploy to GitHub Pages.
3. **Manual Build**:
   ```bash
   npm run build
   ```
   The production build output will be placed in the `dist/` directory, ready to be hosted on any static web host or GitHub Pages.

---

## 🧪 Testing

The project includes an extensive test suite built with **Vitest**:

```bash
npm test
```

Tests cover:
- Loose list tightening (bullet, numbered, task lists, mixed indentations).
- Deeply nested 4-level lists.
- LaTeX display math and inline math delimiters.
- Masked code blocks and inline backticks protection.
- AI Callout conversions (quoted, unquoted, parenthetical titles).
- Asterisk and underscore whitespace fixing.
- Heading spacing and blank line collapsing.
- Presets and idempotency.
- Markdown table formatting.

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev

# Run type check
npm run check

# Run tests
npm test

# Build production bundle
npm run build
```

---

## 📄 License

MIT License
