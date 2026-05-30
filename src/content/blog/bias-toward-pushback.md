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

"Pushing back" has become the most visible marker of senior engineering.

We celebrate the tech lead who says "no" to a new feature and the staff engineer who vetoes a new tool. Boundaries matter for stability, but the default posture — especially in larger organisations — has tilted toward anti-innovation.

We built a culture that rewards resistance more reliably than curiosity.

### When pushback was right

The bias didn't come from nowhere. The microservices gold rush burned teams that should have stayed monolithic. JavaScript framework churn of the 2010s rewarded teams that held still. Database rewrites have sunk startups. In all these cases, the engineers who said "no" were right.

The point isn't that pushback is always wrong. The point is that pushback has become the *default* posture, regardless of context. Thoughtful resistance based on experience is healthy. Reflexive resistance based on cultural incentives is not. The question is: when you push back, are you drawing from scar tissue that applies to this specific situation, or are you just reaching for the "no" that gets you promoted?

### What juniors learn from watching seniors

When pushback is the most rewarded behaviour in an organisation, people pay attention — especially engineers early in their careers.

Here's a pattern that plays out in code reviews: a reviewer suggests a cleaner pattern or a newer utility. The author responds, "That's out of scope" or "Let's not introduce new things here" — not because the suggestion is technically flawed, but because the author has learned that saying "no" sounds mature.

This isn't anyone's fault. It's a rational response to the incentives. If the organisation celebrates the person who holds the line more visibly than the person who takes a chance on a better approach, people adapt. Over time, the cultural signal shifts from "question the status quo" to "protect the status quo." Small-scale experimentation on a PR gets shut down not out of malice, but out of a learned instinct that resistance equals professionalism.

### The migration calculation

Ask a tech lead why they hesitate on a new tool or technique and the answer is often the same: the cost of migration.

"If we adopt this new library, we have to rewrite the whole codebase."

"We don't have the bandwidth for a massive migration."

The costs they name are real — and worth taking seriously. Time spent rewriting working code. Upskilling the team. Splitting attention from feature work. The risk of breaking something that runs in production. Anyone who dismisses these costs hasn't migrated a production system.

But here's what's frequently missing from the calculation: the value side. How much faster will the next feature ship on the new foundation? How many hours do we lose each month to the old thing's quirks and onboarding friction? Nobody builds the value column. They tally the cost column, see a positive number, and call that a no.

But "no" is safer to defend than "yes." If you block a migration and nothing changes, nobody notices. If you approve it and it goes wrong, you own it. That asymmetry pushes the default toward resistance.

One cost argument that rarely gets enough weight is the opportunity cost of the migration itself. While you're migrating, you're not working on other things. That's a real tradeoff. But it cuts both ways. Every month you stay on the old approach is a month you don't get the benefits of the new one. If you're going to count opportunity cost, count it on both sides.

New ideas are hard to integrate, but they rarely demand an all-at-once rewrite. The best teams use gradual migration strategies: isolate the new technique to a specific domain or implement the Strangler Fig pattern, slowly deprecating the old way without pausing feature development. You don't have to boil the ocean to make a cup of tea.

### The firefighting trap

Beneath the cultural bias sits a deeper layer: what actually gets rewarded.

Putting out a production fire is visible, urgent, and heroic. The person who ships a hotfix to unblock a sprint comes out looking great. Performance reviews love it.

Making an architectural improvement so that fire never happens? Nobody sees it. You can't prove you prevented eight hours of downtime — the counterfactual is invisible. When the preventer and the firefighter compete for the same promotion, the firefighter's highlight reel wins every time.

This isn't irrational. It's the system working exactly as designed. If you want more long-term thinking, fix what gets measured. Track leading indicators: incident frequency trends, time-to-recovery, ratio of preventative work to reactive work. Culture follows the scorecard.

But the scorecard isn't the whole story. Leaders who publicly celebrate a migration well done — or a disaster quietly avoided — shift what the team thinks is valued, even before the formal metrics catch up. Engineering culture is shaped by what leadership visibly rewards, not just what appears on the review form.

### AI changes the math

The "migration is too hard" argument gets weaker every quarter. We aren't limited to manual find-and-replace drudgery anymore.

With the right guardrails, the heavy lifting of code migrations can be automated. Feed the model specific constraints, wrap the output in deterministic checks — test suites, lint rules, type checkers — and let it process the boilerplate. The edge cases and implicit invariants still need human attention, but the tedious 80% gets faster every year.

AI isn't a magic wand. Context windows are finite, models miss invariants they can't see, and agentic workflows introduce their own unpredictability. But with clear instructions and deterministic guardrails, migrations that once took months now take weeks.

### Reclaiming curiosity

None of this means we should stop pushing back. Thoughtful resistance will always have a place — the scars from bad migrations and premature adoption are real. But we can bring better balance to the conversation.

Protect your systems from reckless instability, but notice when "no" has become your reflex rather than your reasoned conclusion. Reward the person who builds the value column alongside the cost column, even when the answer is still no. Celebrate the tech lead who says, "Not yet, but here's what would need to be true." Celebrate the person who prevents the incident — not just the one who fixes it.

Encourage developers at every level to ask, "Is there a better way to do this?" and make it safe for them to explore the answer. The tools for managing technical transitions are better than ever. Change the scorecard, publicly reward the quiet prevention work, and recognise that curiosity and caution aren't opposites.

---

*This post was written with AI assistance. The ideas are my own.*
