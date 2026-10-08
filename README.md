# Gabriel P. Silva

IT Infrastructure & Cloud · Architecture & Reliability · Oracle Database, Exadata & OCI

Professional landing page with experience, technical expertise, certifications, and contact links. Both languages share a neutral, minimalist design with responsive layouts and accessible contact menus.

- [English (default)](https://gabrielpstech.github.io/my-profile/)
- [Português brasileiro](https://gabrielpstech.github.io/my-profile/pt-br.html)

Use the EN / PT-BR control to switch languages. The current section is preserved when JavaScript is available; language navigation also works without JavaScript.

## Hosting

A static website served with GitHub Pages from the `main` branch and repository root. No installation or build is required.

## Contact

- [LinkedIn](https://www.linkedin.com/in/gabriel-p-s/)
- [Email](mailto:gabrielpstech@gmail.com)

## Updating the page

Edit `index.html` for English and `pt-br.html` for Brazilian Portuguese. Shared colors and responsive layout are in `styles.css`; contact menus, optional interaction sound, localized clipboard feedback, and section-preserving language links are in `script.js`. Keep content changes aligned across both HTML files. Contact is available through email and LinkedIn only.

## Contact interaction and accessibility

Both contact calls to action progressively enhance into a menu. Without JavaScript, they link to the contact section. The menu supports Enter/Space, arrow keys, Home/End, initial-letter navigation, Escape, Tab/Shift+Tab, outside clicks, and selection dismissal. Focus returns to the trigger on Escape or selection. Placement adapts to viewport edges, including short screens.

The original click sound is synthesized with Web Audio: a quiet 45 ms low-frequency pulse with filtered noise. No downloaded, copyrighted, or third-party audio is used. An AudioContext is created only on an explicit contact-button click; keyboard arrow navigation is silent. Sound can be disabled from either menu or the footer. The preference is shared between languages and saved locally under `gabriel-profile:interaction-sound`. If storage is blocked, the control still works for the current page. Reduced-motion preference disables both the sound and motion, including when the system setting changes. Unsupported Web Audio does not affect navigation.

Visual transitions use 200 ms. The design uses system fonts, neutral surfaces, visible focus states, a responsive information grid, and the existing printable layout.

## Validation

Run `node validate.mjs` for both translations, anchor and asset integrity, unique IDs, accessible heading references, JavaScript syntax, and text contrast checks. This static project has no package manifest, separate linter, or build command.

Browser regression tests require Node.js 22+ and a Chrome/Chromium instance started with a remote debugging port and an isolated profile. Serve the repository root locally, then run:

```sh
node tests/browser.mjs <debug-port> http://127.0.0.1:<site-port>
```

The suite covers contact menus, keyboard and focus behavior, audio activation/duration/muting, saved preferences, reduced motion, storage/audio failures, six viewport widths (320–1440 px), both translations, clipboard success/fallback, language anchors, and earlier experience. Clipboard and external link destinations are intercepted in tests, so they do not modify the system clipboard or launch external apps. The optional `QA_BLOCK_URLS` environment variable accepts comma-separated URL patterns to isolate host-injected scripts during QA.

Additional checks completed during the UI refresh: rendered desktop/mobile inspection, touch activation, short and landscape viewports, hover/press/focus styles, and usable contact links with JavaScript disabled. These checks use Chromium emulation; physical-device and subjective audio listening tests are not included.
