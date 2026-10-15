# NiseDomainDame (NDD)

[日本語](README.md)

*"Nise" (偽) means fake and "Dame" (ダメ) means no good in Japanese — "fake domains, no way."*

A Chrome extension that reveals the real punycode behind look-alike domains and warns you before opening homograph phishing sites.

## Features

- **Blocks suspicious domains before they load**, including those reached via redirects (e.g. short URLs)
- **Toolbar badge**: red `!` for suspicious, orange `IDN` for internationalized domains
- **Popup** shows the punycode, the Unicode form, and why it was flagged
- **Allowlist** for sites you trust

## What gets flagged

- Mixed scripts in one label, e.g. Cyrillic + Latin (`аpple.com`)
- Labels made only of Cyrillic/Greek letters that look Latin (`аррӏе.com`)
- Look-alikes of well-known services (Google, Apple, PayPal, Amazon, major Japanese banks, etc.)
- Malformed punycode

Legitimate IDNs such as `日本語.jp` or `münchen.de` only get the `IDN` badge and are not blocked.

## Install

1. Download or clone this repository
2. Open `chrome://extensions` and turn on **Developer mode**
3. Click **Load unpacked** and select this folder

## Try it

Reserved test domains never exist, so they are safe to try. Always type the `https://` prefix.

| URL | Result |
|---|---|
| `https://xn--pple-43d.test/` (аpple.test) | Warning page |
| `https://xn--80ak6aa92e.invalid/` (аррӏе.invalid) | Warning page |
| `https://httpbin.org/redirect-to?url=https://xn--pple-43d.test/` | Warning page after redirect |
| `https://xn--mnchen-3ya.test/` (münchen.test) | `IDN` badge only |

## Privacy

Everything runs locally. The extension sends no data anywhere, has no host permissions, and cannot read page contents. The allowlist is stored only on your device.

## Limitations

- Chrome does not allow extensions to change the address bar itself, so punycode is shown in the badge, popup, and warning page instead.
- On redirects, the fake page may begin loading for a moment before the warning page replaces it.
- Iframes are not checked.

## Official source

The only official distribution is this repository. Do not install modified copies from other sources.

## License

MIT — see [LICENSE](LICENSE).
