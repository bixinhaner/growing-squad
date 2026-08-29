# 家庭同步站 Design QA

- Source visual truth: `public/assets/sync/family-sync-station-reference.png`
- Browser implementation: `artifacts/design-qa-sync-station-v2.png`
- Same-input comparison: `artifacts/design-qa-sync-station-comparison.png`
- Source pixels: 1550 × 1014
- Implementation pixels: 1280 × 1056
- Browser CSS viewport: 1280 px wide, device scale factor 1
- State: one real `bedtime.schedule.updated` conflict created by two authenticated devices; local value 21:30, family latest value 21:50
- Density normalization: both images were normalized to 600 px width in the browser comparison board; comparison evidence was captured at 1280 × 720

## Full-view comparison

The implementation keeps the selected ImageGen hierarchy: story illustration on the left, calm conflict explanation and two-version comparison on the right, recommended latest-version action, progressive technical details, and a reassuring delivered-record footer. The production parent shell remains visible intentionally, so the content region is narrower than the standalone mockup.

## Focused comparison

The conflict card was inspected at full browser resolution because its values, labels, recommended action, button hierarchy, icon treatment, radii and technical disclosure are the fidelity-critical region. No separate crop was needed after the full-resolution implementation capture confirmed legible text and touch targets.

## Required fidelity surfaces

- Fonts and typography: hierarchy, Chinese weight and wrapping are consistent with the current Growing Squad parent shell; no truncation or unreadable small labels.
- Spacing and layout rhythm: the illustration/card split, internal gaps, radii and footer rhythm match the source. The persistent sidebar is an intentional application constraint.
- Colors and tokens: ivory paper, navy ink, muted sage and moon-gold accents match the target; conflict handling avoids danger-red treatment.
- Image quality: the page uses the dedicated ImageGen moonlight-post-office hero at an uncropped, sharp 4:5 presentation. No emoji, placeholder art or CSS-drawn illustration is used.
- Copy and content: the implementation uses live device values and therefore shows 21:50 rather than the mockup's sample 21:45. The recovery explanation and three decisions match the selected target.

## Comparison history

1. Initial browser pass: latest family value incorrectly displayed the local 21:30 because the active schedule helper intentionally hid a future pending schedule. Severity P1 because choosing the recommended option could be misleading.
2. Fix: read the server-returned pending schedule for conflict comparison while retaining the normal schedule helper as fallback.
3. Post-fix evidence: `artifacts/design-qa-sync-station-v2.png` shows local 21:30 and family latest 21:50, with the recommended action using the same truthful value.

## Primary interactions tested

- Created a real conflicting schedule update from two authenticated devices.
- Verified the sidebar conflict badge appears automatically.
- Opened the sync station from the badge.
- Verified latest/local choices, defer action and technical disclosure are available.
- Verified no visible runtime error or broken asset occurred during the flow.

## Findings

No actionable P0, P1 or P2 visual differences remain. The existing parent sidebar makes the implementation denser than the standalone ImageGen mockup, but preserves navigation context and does not reduce usability.

## Follow-up polish

- P3: when the server later exposes the originating device name, replace “家庭最新版本” with the actual device label.

final result: passed
