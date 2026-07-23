## Imported Claude Cowork project instructions

## Product Quality Standard

Capabilio is a behavior-driven product, not merely a collection of correctly
configured screens. Treat product QA as a first-class implementation task.
Do not stop at validating the existence of registries, challenge banks, role
mappings, API fallbacks, or successful builds.

### Experience Consistency QA

Validate the application as the student using it. For each role affected by a
change, walk the end-to-end experience and ask:

> If I were this student, would I believe this platform was designed
> specifically for me?

Trace the role through onboarding, Aura, Skill Studio, Arena, Portfolio,
Launchpad, and Recruiter Preview. The professional identity must remain
consistent throughout. A page that unexpectedly feels designed for another
profession is a critical UX bug, even if all data and configurations exist.

Examples:

- An Embedded student must never be presented a Frontend journey.
- A Civil student must never be presented a Mechanical journey.
- An Analog Layout student must never be presented an Embedded journey.
- An HR student must never be presented an Engineering journey.

Avoid generic fallback experiences (especially Software Engineer defaults)
unless the product explicitly labels and justifies them as a deliberate,
role-appropriate choice.

### Journey Consistency

Every role must have one logical, connected learning and proof journey:

Assessment → Skill Graph → identified weak skills → Skill Studio → Arena
missions → proof/Vault → interview preparation → Portfolio → Recruiter view.

Verify that each stage feeds the next: skills diagnosed earlier should drive
learning recommendations, missions, proof, interview guidance, portfolio
evidence, and recruiter-facing signals. Flag disconnected modules, duplicated
concepts, contradictory recommendations, and dead ends as product bugs.

Do not only ask whether each module exists. Ask whether the student’s story
continues naturally from one module to the next.

### State Propagation QA

Whenever user data changes, trace all dependent systems and verify that they
update coherently. For example, after an Arena completion, inspect the
relevant state and UI for:

Arena completion → ELO → Aura → Skill Graph → Vault → Recruiter View →
Launchpad → Portfolio → Analytics → Timeline.

Missing downstream updates are blocking bugs. The application must behave as
one connected product, not as isolated pages with locally correct state.

### Required QA Practice

For feature work and role-content changes:

1. Perform existing repository-wide integrity checks and build verification.
2. Run an experience-consistency walkthrough for representative affected
   roles, including roles most likely to be confused by generic fallbacks.
3. Verify the journey’s inputs and outputs connect across each affected stage.
4. Trace state-changing actions through every applicable downstream surface.
5. Report UX, journey, and propagation gaps separately from implementation or
   configuration gaps; do not dismiss them because the build passes.
