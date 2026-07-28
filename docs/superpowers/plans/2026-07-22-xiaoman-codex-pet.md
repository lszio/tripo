# 小满 Codex 宠物 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate, validate, and install a Codex-compatible v2 animated pet based on 小满.

**Architecture:** `hatch-pet` prepares a deterministic run directory and v2 sprite contract. Image generation produces a canonical base and grounded animation strips; the hatch scripts extract, validate, assemble, and package the approved atlas into Codex's custom-pet directory.

**Tech Stack:** `hatch-pet` scripts, built-in image generation, Pillow, Codex v2 pet manifest.

## Global Constraints

- Use reference photos from `/Users/ruhua/Desktop/Test/codex pet/xiaoman/`.
- Preserve 小满's silver leopard pattern, blue eyes, pink nose, dark paw pads, large ears, and slender silhouette.
- Produce a 1536x2288 v2 atlas and install it as `/Users/ruhua/.codex/pets/xiaoman/`.
- Use a removable chroma background during generation; package only validated transparent output.

---

### Task 1: Prepare 小满's Pet Run

**Files:**
- Create: `/Users/ruhua/Desktop/Test/Travel Guide/pet-runs/xiaoman/`
- Create: `/Users/ruhua/Desktop/Test/Travel Guide/pet-runs/xiaoman/pet_request.json`
- Create: `/Users/ruhua/Desktop/Test/Travel Guide/pet-runs/xiaoman/imagegen-jobs.json`

- [ ] Prepare the run with 小满's selected reference photo and a writeable working directory.
- [ ] Inspect the generated job manifest and confirm the base job is ready.

### Task 2: Generate Core Visual Identity

**Files:**
- Create: `/Users/ruhua/Desktop/Test/Travel Guide/pet-runs/xiaoman/decoded/base.png`
- Create: `/Users/ruhua/Desktop/Test/Travel Guide/pet-runs/xiaoman/references/canonical-base.png`

- [ ] Generate one full-body, cute-realistic 小满 on a flat removable chroma background.
- [ ] Review identity fidelity and copy the selected result to the canonical reference path.

### Task 3: Generate and Validate Animation Rows

**Files:**
- Create: `/Users/ruhua/Desktop/Test/Travel Guide/pet-runs/xiaoman/decoded/*.png`
- Create: `/Users/ruhua/Desktop/Test/Travel Guide/pet-runs/xiaoman/qa/`

- [ ] Generate grounded strips for the nine standard animation states.
- [ ] Extract each strip immediately and reject clipped, identity-drifting, or nontransparent results.
- [ ] Generate four cardinal gaze anchors and both coherent eight-pose direction rows.

### Task 4: Assemble, QA, and Install

**Files:**
- Create: `/Users/ruhua/Desktop/Test/Travel Guide/pet-runs/xiaoman/final/spritesheet-extended.webp`
- Create: `/Users/ruhua/Desktop/Test/Travel Guide/pet-runs/xiaoman/final/validation-extended.json`
- Create: `/Users/ruhua/.codex/pets/xiaoman/pet.json`
- Create: `/Users/ruhua/.codex/pets/xiaoman/spritesheet.webp`

- [ ] Assemble the 11-row atlas, remove chroma spill once, and run v2 validation.
- [ ] Review contact sheets, motion previews, and direction semantics before packaging.
- [ ] Install the validated manifest and spritesheet together in the Codex custom-pet directory.
