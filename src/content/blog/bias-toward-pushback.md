---
author: Ujjwal Ojha
pubDatetime: 2026-05-26T15:00:00+10:00
title: "The Bias Toward Pushback: Reclaiming Curiosity"
slug: bias-toward-pushback
featured: true
draft: false
description:
  Engineering culture has started treating 'pushing back' as the ultimate badge of seniority.
  It's time to reclaim curiosity.
tags:
  - engineering-culture
  - leadership
---

Engineering culture shifts as startups grow into corporate enterprises. Somewhere along the way, "pushing back" became the ultimate badge of senior engineering.

We celebrate the tech lead who says "no" to a new feature and the staff engineer who vetoes a new tool. The developer who guards the status quo against scope creep gets the same treatment. Boundaries matter for stability, but the default has become anti-innovation.

We built a culture that rewards resistance over curiosity.

### Trickle-down resistance

The glorification of pushback trickles down. Junior and mid-level engineers now push back on simple, constructive PR suggestions.

When a reviewer suggests a cleaner pattern or a newer utility, the default response is a defensive block: "That's out of scope" or "Let's not introduce new things here."

They aren't defending against technically flawed ideas. Company culture taught them that saying "no" sounds mature and senior. Shutting down small-scale experimentation on a PR signals stagnation, not maturity. We're training developers to value rigid consistency over questioning the status quo.

### Migration excuse

Ask a tech lead why they resist new tools or techniques and the answer is almost always the same: the cost of migration.

"If we adopt this new library, we have to rewrite the whole codebase."

"We don't have the bandwidth for a massive migration."

The costs they name are real. Time spent rewriting working code. Upskilling the team. Splitting attention from feature work. The risk of breaking something that already runs in production.

What's missing from the calculation is the value side. How much faster will the next feature ship on the new foundation? How many hours do we lose each month to the old thing's quirks and onboarding friction? Nobody builds the value column. They tally the cost column, see a positive number, and call that a no.

But "no" is safer to defend than "yes." If you block a migration and nothing changes, nobody notices. If you approve it and it goes wrong, you own it. That asymmetry pushes the default toward resistance.

One cost argument that rarely gets enough weight is the opportunity cost of the migration itself. While you're migrating, you're not working on other things. That's a real tradeoff. But it cuts both ways. Every month you stay on the old approach is a month you don't get the benefits of the new one. If you're going to count opportunity cost, count it on both sides.

New ideas are hard to integrate, but they rarely demand an all-at-once rewrite. The best teams use gradual migration strategies: isolate the new technique to a specific domain or implement the Strangler Fig pattern, slowly deprecating the old way without pausing feature development. You don't have to boil the ocean to make a cup of tea.

### AI changes the math

The "migration is too hard" argument gets weaker every quarter. We aren't limited to manual find-and-replace drudgery anymore.

With the right AI integration, the heavy lifting of code migrations can be automated. Feed the model specific constraints and write solid test suites to catch its hallucinations; then let it process the boilerplate. Sweeping refactors take a fraction of the time.

AI doesn't just write new code. It's an intelligent migration script that understands context. The manual parts of migrating to a new technique shrink every day.

### Reclaiming curiosity

Stop over-celebrating the pushback. Protect your systems from reckless instability, but don't make "no" your default.

Engineering teams should pursue new ideas. Encourage developers at every level to ask, "Is there a better way to do this?" and reward them for trying.

The tools for managing technical transitions are better than ever. We just need the cultural permission to use them.

---

*This post was written with AI assistance. The ideas are my own.*
