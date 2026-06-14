Below is a structured “debug playbook” we use internally when a stepped-orchestrator pipeline is technically sound but the LLM’s design proposals are disappointing.  You can skim the headings and jump straight to the actions that make sense for your team.

────────────────────────────────
1. Pinpoint where the quality collapses
────────────────────────────────
1.1 Check the raw model answer, not the assembled slice  
• In Firestore `ai_jobs`, open the **last completed step doc** (e.g. `forms.layoutSkeleton:plain.root`) and copy the `rawModelAnswer` string that’s stored before JSON extraction.  
• If the answer is already “plain list of fields”, the issue is on the LLM/prompt side.  
• If the answer contains a wizard but it disappears later, the problem is in sanitisation / merge / assemble.

1.2 Turn on verbose logging for the step context  
In `step-runner.ts`, temporarily dump `ctx.fullPrompt` for the failing step so you can confirm exactly what the model was told.  Nine times out of ten we discover that the context lacks an atom that nudges the model toward advanced UX.

Result of the check:   
A  → The model is never asked for anything better than a plain form (context gap).  
B  → The model tries but our Zod schemas/sanitiser strip things out (pipeline gap).  
C  → Even with a good prompt the model keeps choosing the laziest path (model limitation).

────────────────────────────────
2. If it’s a context gap  (A)
────────────────────────────────
2.1 Add a dedicated “design excellence” atom for forms  
You already have `ui.list.design-excellence`; create `ui.forms.design-excellence.md` with guidelines like:  
• Prefer wizard when field count > 6.  
• Target 3 ± 1 inputs per step.  
• Include **progress component** at top, **helper-tips** next to complex fields, etc.  

2.2 Inject the atom into the right steps  
In `assemble-ui-builder-step-context.ts` extend the matrix:

```
case 'forms.selectPresentation':
  include 'ui.forms.design-excellence'
case 'forms.layoutSkeleton':
  include 'ui.forms.design-excellence'
```

2.3 Feed examples  
Add two small markdown exemplars under `packages/ai-context/src/examples/forms/`. Reference them from the atom (“See example wizard layouts below”). Actual working JSON snippets are gold here.

2.4 Give the model a gentle nudge with a scoring rubric  
Pre-pend this to the `layoutSkeleton` task description:

```
Rate each potential design from 1-5 on usability (mobile + desktop) and pick the highest scoring one.  A plain single-page form of >6 inputs can never score above 2.
```

We’ve found a simple self-critique paragraph raises quality by itself.

────────────────────────────────
3. If it’s a pipeline gap  (B)
────────────────────────────────
3.1 Wizard structures being dropped  
Check that `forms-assembler.ts` retains **all pathKeys**.  Early drafts sometimes discarded `wizardShellLayout` or `wizardStepLayouts` if they were empty in `currentLayoutJson`.  

3.2 Sanitiser over-zealous?  
The list sanitiser clones rules that forbid unknown component kinds.  Make sure you DID NOT copy the line that strips anything except `text|image|badge|…`.  The wizard needs `wizard-progress`, `wizard-step-host`, `wizard-actions`.

3.3 Zod schema too restrictive  
• `UiLayoutComponentKind` for forms must include the wizard kinds.  
• `FormsSliceData` must allow `wizardModalFooterLayout?: UiLayoutDocument`.  

Run `pnpm test -t "forms-assembler"` after you copy over a failing draft fixture and the errors will surface.

────────────────────────────────
4. If it’s a model limitation  (C)
────────────────────────────────
4.1 Temperature and top-p  
Plain proposals are a symptom of **low temperature**.  On your Vertex client set:

```
temperature: 0.7,
topP: 0.9
```

The list pipeline may have forced `temperature: 0.35` to keep tables deterministic.

4.2 Larger / specialised model  
Switch the worker’s Vertex model id to `gemini-1.5-pro` or `gpt-4o-mini`.  These bigger models understand UI abstractions far better than PaLM-text-bison.

4.3 Second-pass refinement step (cheap + effective)  
Add a synthetic step at the end of your plan:

```
forms.refineWizard
  ← ctx includes { draftSoFar, "critique the design against best practices and patch" }
```

Give the output shape `{ patch: DeepPartial<FormsUiBuilderDraft> }` and deep-merge it.  The refine step costs one extra model call but often upgrades the UX dramatically.

────────────────────────────────
5. Deciding what to automate vs. keep manual
────────────────────────────────
Use a **value-vs-variance** lens:

• Lists, main pages, record detail – medium variance, high volume → AI works today with some polish.  
• Complex, brand-sensitive wizards – high variance, low volume → AI can scaffold (70 % of work) but a human designer must still curate.  

So you don’t have to choose AI *or* manual; treat AI as a “junior designer that does the grunt alignment” and expect a short human pass for polish.

────────────────────────────────
6. Quick wins you can ship this week
────────────────────────────────
1. Add `ui.forms.design-excellence` atom (≈30 minutes).  
2. Raise temperature to 0.7 only for forms skeleton/config steps.  
3. Whitelist wizard components in the sanitiser.  
4. Paste one real wizard JSON as an example in the atom.  

These four usually flip the output from “plain dump” to “reasonable wizard” on the next run.