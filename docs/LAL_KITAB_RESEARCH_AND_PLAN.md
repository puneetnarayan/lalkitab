# Lal Kitab Traditional Rules — Research Notes and Implementation Plan

Research snapshot: 16 October 2026

## Executive summary

The app should treat Lal Kitab as a distinct, historically modern astrological tradition, not as a skin over Parashari or KP. Research supports a staged implementation: (1) reliable birth-time and planetary calculation; (2) a Lal Kitab chart/Teva representation under an explicitly selected convention; (3) a source-traceable rule library; (4) rule-matched interpretations and remedies; (5) report and test suite.

The core source corpus is commonly described as five books associated with Pandit Roop Chand Joshi, published in 1939, 1940, 1941, 1942 and 1952. The source texts and later translations/commentaries are not interchangeable. A commercial publisher's account explicitly notes that numerous versions exist and that many works fail to identify which edition they follow. Therefore, the app must track edition and page/section for every rule, and must not present internet summaries as primary-text rules.

## Sources reviewed

1. Motilal Banarsidass / D.P.B. Publications, *A Text Book of Lal Kitab*, by Pt. Umesh Sharma, translated by Subhash Jain. The publisher describes it as based on the five traditional classics (1939, 1940, 1941, 1942, 1952). Useful as a modern secondary reference; it is not the original text. https://www.motilalbanarsidass.com/products/a-text-book-of-lal-kitab
2. Motilal Banarsidass, *Lal Kitab with Remedies*, Beni Madhav Goswami / Sagar Publications. Its publisher description discusses the five editions and warns that versions and interpretations vary. https://www.motilalbanarsidass.com/products/lal-kitab-with-remedies
3. Himachal Publications, *Our Books*. Gives editorial context about the relationship between the 1939 and 1940 books, and warns readers that the later volume refers back to the earlier one. https://himachalpublications.com/our-books/
4. Himachal Publications, *Which is the best Lal Kitab book?* Lists Hindi transliterations for the 1940, 1941, 1942 and 1952 editions. https://himachalpublications.com/which-is-the-best-lal-kitab-book/
5. Astrology Science, overview of the five-volume chronology. Secondary overview. https://lalqitab.com/
6. AstroSage, *Lal Kitab: An Introduction to Philosophy*. A secondary overview of the tradition and remedies; not adequate as sole authority for a rule. https://www.astrosage.com/lalkitab_introduction.asp
7. Raman Bhardwaj, *Lal Kitab Foundations and History* and *Planets, Houses and Chart*. Contemporary teaching material helpful for identifying vocabulary and concepts, but secondary and to be cross-checked against the chosen edition. https://ramanstrology.com/courses/lal-kitab/foundations-and-history and https://www.ramanstrology.com/courses/lal-kitab/planets-houses-and-chart
8. Wikipedia, *Lal Kitab*. Used only as an orientation lead, not a primary authority. https://en.wikipedia.org/wiki/Lal_Kitab

## Research findings and confidence

### Strongly supported historical facts
- Lal Kitab refers to a corpus of five volumes published between 1939 and 1952 and commonly associated with Pt. Roop Chand Joshi.
- It has a distinct vocabulary, chart-reading approach, and remedy tradition; the exact rules and their ordering vary across editions and commentaries.
- The 1939/1940 relationship matters: later material may assume knowledge of the earlier volume.
- It is unsafe to treat any modern online list of “Lal Kitab rules” as a verified transcription of a particular original edition.

### Core concepts to investigate against the chosen text
The secondary sources consistently point to the Teva/chart, fixed-house mapping in common modern teaching, Pakka Ghar (planet's permanent house), planetary placement results, occupied and empty houses, planetary relationships, sleeping/awake or blind states, Rin/debt concepts, annual chart/Varshaphal in some editions, and totke/upay. These are a research index, not a claim that every concept is identical across all editions.

### House mapping is a critical unresolved implementation decision
Some modern teaching sources describe a fixed natural-zodiac layout (Mesha/Aries as house 1, Vrishabha/Taurus as house 2, etc.) and describe the Ascendant as not structuring the Lal Kitab house grid. Other popular software presents Lal Kitab placements by transferring planets from a calculated birth chart into a house layout. We must not silently choose between these formulations. Implement a configurable, named mapping policy and document exactly how the selected original/translation defines Teva, Lagna, and house numbers. Until the user chooses the source edition and a competent textual check is completed, label the current fixed-house mapping as a provisional common teaching convention, not a settled universal rule.

### Calculation boundary
The Parashari repository's Swiss Ephemeris bridge can be reused for astronomical primitives such as geocentric sidereal longitudes and UTC conversion, after verifying its settings and assets. It currently sets Lahiri ayanamsa and mean lunar node. Whether this exactly matches the chosen Lal Kitab edition/convention is a separate research question. Do not assume that the Parashari Ascendant or its whole-sign D1 mapping should be reused as Lal Kitab house logic. Preserve calculation settings in each chart record.

### Remedies and safety
- A remedy must never be shown as a generic automatic prescription simply because a planet exists.
- Each remedy record needs the triggering condition, source/edition/page or section, procedure, duration/timing if the source actually states it, and any practical caution.
- Avoid presenting predictions about illness, death, fertility, legal outcomes, or financial success as facts. Traditional beliefs should be framed as interpretations, not scientifically established causal claims.
- Do not recommend harmful, expensive, coercive, illegal, or animal-harming actions. Prefer a safety review and clearly disclose when a traditional source contains a practice the app will not recommend.
- Do not reproduce substantial copyrighted text from modern translations/commentaries. Store concise paraphrases, metadata and page references; use short quotations only when lawful and necessary. Check the rights status of each source before importing full text.

## Rule provenance and confidence model

Every rule should have:
- stable ID and module;
- concept/trigger and structured conditions;
- concise paraphrase, separate from the source's wording;
- source title, edition/year, author/translator/publisher, page/section/verse if available;
- evidence type: primary text, licensed translation, secondary commentary, or unverified web summary;
- confidence: verified, cross-checked, provisional, disputed, or rejected;
- edition/convention applicability;
- tests and examples;
- remedy link(s), when applicable;
- last-reviewed date and reviewer notes.

Do not let an unverified rule drive an assertive prediction. The app should show “research pending” for rules that lack traceable source details.

## Implementation plan

### Phase 0 — Research and source policy
1. Select the base text/edition (recommend the 1952 edition as a primary baseline, while keeping earlier editions available for comparison).
2. Obtain a legitimate copy of the selected primary text and a translation/transliteration that can be referenced.
3. Create an edition comparison register for rules that change between editions.
4. Confirm chart/Teva mapping and calculation convention from the selected text.

### Phase 1 — Calculation integration
1. Copy only necessary Swiss Ephemeris JS/WASM assets and time-zone conversion code from the Parashari repository.
2. Keep upstream notices/licenses intact; verify distribution and network-use obligations before any public deployment.
3. Add a reproducible calculation passport: birth inputs, UTC conversion, coordinates, ayanamsa, node type, engine/version and warnings.
4. Test with independent chart examples and known expected positions before interpreting anything.

### Phase 2 — Rule engine
1. Define schema and validator for source-tagged rules.
2. Implement a convention-specific Teva/house mapping module.
3. Add general chart inventory and non-interpretive placements first.
4. Add house/planet rules in small batches with tests and provenance.
5. Add conditional concepts (Pakka Ghar, sleeping/awake, blind states, Rin/debts) only after the source rules are verified.
6. Keep conflicting editions as separate rule variants rather than merging them.

### Phase 3 — Remedies and interpretation
1. Link remedies only to matched, sourced conditions.
2. Add plain-language explanations and transparent rule traces.
3. Add user-configurable caution filters and safe alternatives.
4. Never promise guaranteed outcomes.

### Phase 4 — Reporting and validation
1. Generate printable reports with calculation settings, rule IDs and source notes.
2. Build regression fixtures from manually checked charts and rule cases.
3. Ask a Lal Kitab practitioner/textual reader to review high-impact rules.
4. Track unverified and disputed rules in a visible research backlog.

## Initial coding decisions
- Keep the app plain HTML/CSS/JS, consistent with the current starter.
- Create an isolated `js/lalkitab/` namespace.
- Use JSON data for rules and JS for deterministic evaluation.
- Start with rule metadata and a chart inventory; do not fabricate a large prediction database from scraped snippets.
- No deployment to Vercel without explicit user consent.


## Source access note (16 Oct 2026)

A study-group website provides an online reading copy labelled as the 1952 text and describes the five-book corpus. This is a lead for human source review, not permission to bulk-copy or treat every transcription as authoritative: [AstroStudents 1952 reading page](https://astrostudents.ueuo.com/1952/index.html). Commercially published transcriptions/translations are also available from publishers. Before any rule is activated, the researcher must record the exact edition/printing, the printed page or numbered section, and whether the wording was checked directly against the source. If a page image is illegible or the edition cannot be confirmed, keep the rule pending. No rule is being populated from unsourced web summaries.
