# GXEON — Jupiter Token Identity & UI Risk: Observational QA
**Date:** 13 Oct 2026 | **Category:** Public UI/metadata review | **Author:** XPeX Systems AI / GXEON
**Purpose:** Prepare a factual, original research contribution for the [TokenGems contest on Superteam Earn](https://superteam.fun/earn/listing/try-a-solana-project-and-give-useful-feedback-tokengems/).

## Method and scope
Read-only inspection of three public TokenGems token profile pages, documentation and a Solana explorer. No wallet was connected; no swap, token purchase, API key or security exploitation was performed. Rates/holders are live estimates and deliberately omitted from any comparison.
This is a discovery safety/UX observation, not an assertion of malicious behavior or formal verification of a token issuer.

## Evidence: three different Jupiter-related mint addresses
| Public page | Mint shown in page URL | Observed identity text |
|---|---|---|
| [Jupiter $JUP](https://tokengems.ai/tokens/solana/jupiter-8Uhj72RVsJMemXtdqade9zNZE6thWqXq8W8EEvPfk2LV) | `8Uhj72RVsJMemXtdqade9zNZE6thWqXq8W8EEvPfk2LV` | FAQ explicitly says contract is **not** official Jupiter governance token; warnings for unreliable recent pricing. |
| [Jupiter $JUPITER](https://tokengems.ai/tokens/solana/jupiter-JUPSB4uvWp3MAYRjQqbY9kTZpiYwkugSFg94scTgYSV) | `JUPSB4uvWp3MAYRjQqbY9kTZpiYwkugSFg94scTgYSV` | FAQ *describes Jupiter as official governance token*, page links to `jupitersol.online`; generic pricing-verification warning but no explicit mint-identity discrepancy warning. |
| [Jupiter $JUP](https://tokengems.ai/tokens/solana/jupiter-JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN) | `JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN` | Canonical token shown in [Jupiter's own token-list documentation](https://discuss.jup.ag/t/faq-token-list-v3-verification/23074) and on [Solscan](https://solscan.io/token/JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN). |

## Finding
The $JUPITER page exposes the protocol's official governance narrative in the FAQ while the mint address is different from the published Jupiter JUP mint. A reader who sees only the token's title/FAQ or website link might mistake the token profile for the canonical governance asset. A **pricing-unavailable** notice warns about market data reliability, but does not solve identity disambiguation.

**This does not prove fraud.** Similar names and third-party token metadata can be unverified or unaffiliated. The risk is **user confusion and overconfident labeling** before users click Trade.

## Suggested fixes / objective acceptance criteria
1. For token names resembling a high-profile protocol, render an independent **"mint not verified as affiliated"** label whenever authoritative issuer verification is unavailable. Do not inherit governance descriptions from name/ticker matches.
2. Above the FAQ and on search results, show the **full or copyable mint** and a canonical-source link or explicit **not verified** state.
3. Block or qualify copied protocol FAQ narratives on non-canonical mint pages until validated, e.g. `This page concerns the token with mint JUPSB4... and is not confirmed as the protocol's governance mint`.
4. Add a test fixture: search for Jupiter/JUP/JUPITER; inspect cards and detail pages for each mint; assert the official mint is clearly identifiable and other mints do not inherit official status.

## Concise English contribution draft (must be operator-reviewed before posting)
> I reviewed three TokenGems pages sharing Jupiter branding, comparing their Solana mint addresses against Jupiter's published JUP mint. The official JUP mint is `JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN`. The $JUP page at mint `8Uhj72...k2LV` explicitly says it is unaffiliated, but the $JUPITER page at `JUPSB4...gYSV` describes Jupiter's official governance role in its FAQ, even though its mint differs. That inconsistency could confuse readers before they trade. A clear, copyable mint and a verified/unverified **affiliation** badge on search cards and token detail pages would help. Can token-specific FAQs be blocked from inheriting a project's official description unless the mint has been verified? I only inspected public pages; I did not buy, swap or connect a wallet.
>
> References: official Jupiter token-list verification page (https://discuss.jup.ag/t/faq-token-list-v3-verification/23074) and the two TokenGems pages above.

## Entry requirements still outstanding
- [ ] Human operator review and edit of the draft (must reflect their truthful original opinion; no fabricated personal trades).
- [ ] Wallet-based *sign-in* to TokenGems by the user; never provide private keys and never approve transfer or token allowance for this task.
- [ ] Post factual observation on a suitable Jupiter token project page on TokenGems and capture live post URL.
- [ ] Follow @tokengems on X and repost its contest announcement with user's own X profile.
- [ ] Submit TokenGems profile URL, contribution link(s) and verified X handle via authenticated Superteam Earn profile @GXEON before contest deadline.
- [ ] Await winner announcement. Competition prizes 50–100 USDC to five winners out of 350 USDC total, **not a contract or guaranteed fee**.
- [ ] Check independently for platform acceptance and any USDC payout; none claimed or received.

**Operational state:** Original documentation prepared. Not posted to TokenGems. Not submitted to Superteam Earn. No contract/earned funds established.
