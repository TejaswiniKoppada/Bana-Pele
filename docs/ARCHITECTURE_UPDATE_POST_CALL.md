# Bana Pele PoC — Architecture Update
### Post-Call with Vijayashree (Shikshalokam CTO) — Supersedes Prior My Learning Plan

**This document reflects a confirmed pivot.** The session-based approach to My Learning documented in `PRE_IMPLEMENTATION_ARCHITECTURE.md` and `COMPLETE_ARCHITECTURE.md` is no longer the plan — read this document as the current source of truth for My Learning; those earlier docs remain accurate for Community Connect (formerly "Peer Connect").

---

## 1. What Changed

1. **My Learning will not use Elevate's session system.** Everything previously confirmed about `sessions/update`, `mentee_session_details`, `session_attended`, and `mentees/joinSession` is now obsolete for this purpose — Shikshalokam confirmed the sessions-based approach is not feasible for our use case.
2. **My Learning will instead use Elevate's "Programs and Projects" feature**, which manages Learning Resources (LRs). This feature needs to be **enabled on our tenant by Shikshalokam's team** before we can integrate against it. API access/documentation will follow once enabled.
3. **Peer Connect is now referred to as "Community Connect."** No functional change — same feature, new name.
4. **The missing profile fields are confirmed real and being added** — no longer an open question, no longer something to avoid mocking around. Shikshalokam confirmed these can be added on their side and will evaluate implementation approach.
5. **Community Voices remains fully independent** — confirmed explicitly out of Elevate's scope, no change to the existing Supabase-based build.
6. **Confirmed scope of Elevate usage going forward:** Community Connect + My Learning only.

---

## 2. Community Connect — Profile Fields & Filters (Confirmed Coming from Elevate)

### Peer Profile ("About" section)
- Location
- Years of Experience *(already confirmed real and working — `experience` field, no change needed)*
- ELP Type
- ELP Tier

**Important note on ELP Tier:** this is **not set directly by the practitioner or by us** — it's determined by the government based on certifications and learning achievements the practitioner has earned. Build this as a **read-only, Elevate-sourced field** once available; do not build any UI allowing a user to set their own tier.

### Search Filters
- Distance — radius options: 5 km, 10 km, 20 km, 50 km, 100 km
- ELP Type — Centre-based, Non-Centre-based
- ELP Tier — Pre-Bronze, Bronze, Silver, Gold

**Status:** Shikshalokam will evaluate their implementation approach and confirm a timeline. Until these fields exist in the API, continue building Community Connect's UI to gracefully handle their absence (e.g. hide the field/filter rather than showing empty or mock data) — do not mock values in the meantime.

### 2.1 Field Definitions (for UI copy, tooltips, and validation — from Bana Pele's spec)

**Location/Address:** either an address or a general area description — confirmed with Vishwanath as a single free-text field (not hierarchical state/district/place).

**Years of Experience:** how long the practitioner has been running their centre. *(Already live and working via the `experience` field.)*

**ELP Type:**
- **Centre-Based** (crèches, preschools) — more than 6 children attending, run in a fixed location, children spend more than 16 hours/week at the space.
- **Non-Centre-Based** (childminders, playgroups, toy libraries, mobile programmes) — 6 or fewer children at once, may be a mobile space (e.g. a travelling truck).

**ELP Tier** — awarded by government, not self-selected, based on certifications/achievements:
1. **Pre-Bronze** — haven't set up or registered yet.
2. **Bronze** — granted upon initial application submission; entry-level recognition, assigns a unique National ECD Identifier Number.
3. **Silver** — awarded after site visits by social workers or Environmental Health Practitioners (EHPs), verifying baseline health, safety, and practitioner capability.
4. **Gold** — granted when higher-level infrastructure, compliance, and qualification standards are met.

**Use this text as the source for any tooltip/help copy built alongside these fields** — these definitions are non-obvious from the label alone and should be surfaced to the user (e.g. an info icon next to ELP Tier explaining what each level means), not just implemented as a bare dropdown.

---

## 3. My Learning — New Plan (Programs and Projects)

**Current status: blocked on Shikshalokam enabling this feature and sharing API access.** Nothing in this section can be built yet — this is documented now so the plan is ready the moment access is granted.

### What we know from the call
- Programs and Projects is Elevate's existing mechanism for managing and serving Learning Resources.
- Once enabled, we'll get APIs to integrate learning materials into our frontend — exact endpoints unknown until then; expect the same live-discovery process used successfully for Mentoring, unless Shikshalokam provides documentation directly.
- The proposed user flow (Section 4) implies Programs/Projects likely has its own native progress-tracking mechanism (mirroring what we'd hoped `session_attended` would provide) — this needs to be confirmed once we have access, not assumed.

### What to do in the meantime
- **Do not resume building Recommended/In Progress tabs** against the old session-based data source.
- **Pause is different from delete** — see the implementation note (Section 5) for what to do with the already-built session-based code.

---

## 4. Confirmed User Flow (from the call)

Two people:
- **Thandi** — mentee, Pre-Bronze aspiring ELP practitioner, wants to start a daycare.
- **Maria** — Gold Tier ELP practitioner.

```
Thandi searches Community Connect using filters (distance, ELP type/tier)
        │
        ▼
Sends connection request to Maria → Maria accepts
        │
        ▼
They chat. Thandi asks about achieving Gold Tier, child healthcare,
running a daycare.
        │
        ▼
Maria recommends learning materials that helped her, shares them
        │
        ▼
Shared resources appear in Thandi's My Learning → Recommended
(via Programs and Projects, once integrated)
        │
        ▼
As Thandi completes resources, her progress reflects on a Progress page
```

**Key implication:** Community Connect's chat is where the human recommendation happens — the actual "sharing" of learning resources into My Learning is expected to go through Elevate's Programs and Projects mechanism itself (likely Maria assigning/sharing a resource through Elevate directly), not through a custom in-app "Suggest Learning" form we build ourselves. This needs confirming once we see the real Programs/Projects UI and API, but it's the working assumption.

---

## 5. Implementation Note — What to Do with Existing Session-Based Code

The Suggest Learning form, `sessionsService.js`, and the Recommended/In Progress tabs built against `mentee_session_details` should be **disabled from the user-facing app, not deleted**:

- Remove/hide the "Suggest Learning" button from My Connections.
- Replace My Learning's Recommended/In Progress tabs with a simple "Coming soon" state.
- Keep the underlying code in the repo, dormant — some patterns (report-based data fetching, resource link rendering, card layouts) may still be reusable once the real Programs/Projects API is known, even though the specific endpoints won't be.

---

## 6. Immediate Next Steps

1. Send Shikshalokam a follow-up confirming this understanding and requesting a timeline for Programs and Projects enablement + the profile fields.
2. Pause session-based My Learning work; disable it from the UI per Section 5.
3. Continue Community Connect's remaining item (mentor Accept action capture) — fully unaffected by this pivot.
4. Once Programs and Projects access is granted: repeat the same live-discovery process used for Mentoring (test real actions, capture real payloads) before building anything.
