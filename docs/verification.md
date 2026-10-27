# Verification record

Verified on 28 October 2026. These are observed checks, not a claim of zero defects or a complete security audit.

## Application and data

- Public production URL: https://q7m2vx-two.vercel.app
- Public source repository: https://github.com/piyushhsainii/w7x
- Database SHA-256: `70d1ffe4d266312d5dbe782dee474e6df21f5e0378459ef16bac9f85762ade70`.
- Source snapshot: 19,272 forecast publication/target records and 1,488 actual records, retrieved from Elexon. No synthetic records.
- Default 09:30 full-January evaluation: 744 matched observations, MAE 1,995.569 MW, RMSE 2,498.825 MW, bias +1,727.983 MW, WAPE 17.683%, P90 absolute error 4,183.9 MW.
- Auth-free HTTP requests to the production alias returned the actual React HTML and JSON health/decision/accuracy responses. The generated deployment-specific hostname can require Vercel authentication; use the production alias above for submission.

## Automated checks

- **Python:** 27 tests passed. Core math, independent target selection, cutoff inclusion/exclusion, actual publication availability, no interpolation, null/zero handling, pooled weighting, January boundaries, API validation, concealed outcomes, export parity, and security headers are covered.
- **TypeScript and Vite:** production compilation passed with Vite 7.3.7. Approximately 578 kB JavaScript before compression and 177 kB gzip; self-hosted Latin font subsets are bundled. No source maps are published.
- **Frontend dependency audit:** `npm audit` reported zero known vulnerabilities after patching Vite from 7.1.12 to 7.3.7.
- **Python dependency audit:** `pip-audit` against the pinned runtime lock reported no known vulnerabilities.
- **Dependency consistency:** the runtime pins in `requirements.txt` are kept flat for Vercel compatibility and match `requirements.lock`.
- **Compose:** `docker compose config --quiet` passed.
- **Docker build:** the multi-stage Node 22 / Python 3.12 image built successfully. `npm run build` ran successfully inside the clean Linux build stage.
- **Docker runtime:** the app ran as `appuser` with a read-only filesystem, dropped capabilities, no privilege escalation, and a loopback port binding. Root, health, and accuracy requests returned successful results matching the source snapshot.

## Browser checks

- Default decision view loads the forecast and publication details with actuals concealed.
- Outcome reveal adds actual generation, signed error, and realized MAE.
- Applying 31 January correctly selects 1 February delivery and disables next-day navigation.
- Changing cutoff from 09:30 to 09:00 selects the eligible 07:30 publication in the inspected example.
- Audit table can show all 48 settlement timestamps; :30 rows show actuals but no invented forecast/error. Keyboard controls were exercised.
- Reversed accuracy date ranges show a validation message; restoring 1–31 January and 09:30 gives the expected 744-observation scores.
- Monthly accuracy view and chart render with no captured browser error messages during the checked interactions.
- Mobile layout was inspected at a 390-pixel viewport. The document remained within the viewport; filter actions were grouped to avoid an isolated export button.

## Environment notes and remaining submission work

This machine has an unrelated broken Node launcher in an ancestor `node_modules/.bin` directory, which can affect local `npm run` commands. Direct Node compilation passed, and the clean Docker build ran the package build command successfully. No files outside this project were altered to repair that launcher. If affected locally, use:

```sh
node node_modules/typescript/bin/tsc -b
node node_modules/vite/bin/vite.js build
```

The test runner emitted a development-only Starlette warning about future migration from `httpx` to `httpx2`; it did not affect passing assertions. Browser automation sometimes failed to dispatch a mouse event after viewport changes or scrolling; keyboard controls and fresh page state were used to complete the relevant checks.

No YouTube video has been recorded or uploaded, and no submission form has been submitted. Use the presentation guide to record the required two-part video, keep it below ten minutes, then verify final app/repository/video URLs in an incognito browser before submitting. A video URL and the actual form URL are not available in the supplied brief.
