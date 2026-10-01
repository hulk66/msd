# Editing msd.com in Google Docs

This guide covers everything you need to edit msd.com day to day. You edit
pages as Google Docs; the website updates when you publish.

## 1. Editing text and images

- A page is one Google Doc. Headings in the Doc become headings on the page.
- Normal text needs no special formatting — type it as paragraphs.
- To change an image, replace it in the Doc (Insert → Image). Keep the alt
  text meaningful (right-click image → Alt text).

## 2. The blocks you'll use

Blocks are tables in the Doc. The first cell of the first row names the
block; each following row adds one item (a card, a column, an accordion
entry). These are all the blocks you should ever need:

| Block | Use it for | How to fill it |
|---|---|---|
| `hero` | Page-top banner with image and headline | Row 1: image, headline, sub-line, button link |
| `content-block` | Image beside text with a call to action | Row: image, heading, text, link. Add `right` in the header to flip sides, `negative` for dark background |
| `columns` | 2–4 columns of image + text | One row per column: image, heading, text, link |
| `cards` | Teaser card grids | One row per card: image, title, description, link |
| `accordion` | Expandable Q&A lists | One row per entry: question, answer |
| `title` | Section heading band | Row: heading text |
| `quote` | Pull quote | Row: quote text, attribution |
| `statistics` | Big-number stats | One row per stat: number, label |
| `related-links` | List of links | One row per link: title, URL |
| `download-list` | Downloadable files | One row per file: title, file link |
| `buttons` | Call-to-action button row | One row per button: label, link |

Example — a cards block:

```
cards
img1.jpg | First story | Short description | /stories/first
img2.jpg | Second story | Short description | /stories/second
```

## 3. Section backgrounds

To give a section a dark or tinted background, add a "Section metadata"
table at the end of the section with `style: dark` (or `tinted`).

## 4. Page metadata

Every Doc starts with a metadata table: `title` and `description`. The
title appears in the browser tab and search results; the description is the
summary text under the title. Keep descriptions under 160 characters.

## 5. Preview and publish (Sidekick)

1. Install the "AEM Sidekick" browser extension (one-time setup).
2. Open your Doc, then open Sidekick.
3. **Preview** shows the page as it would appear — check it before publishing.
4. **Publish** makes the change live on msd.com.

## 6. Reverting a mistake

Sidekick keeps publish history. Open Sidekick → Publish history → select the
previous version → republish. Nothing is lost; every version is kept.

## 7. When to ask a developer

- You need a layout none of the blocks above can produce.
- A page uses a block you don't see in this guide (some exist only on
  migrated pages).
- Something looks broken rather than just different.
