# FuSang Vision Portal

The customer portal for FuSang Vision, served at `portal.fusang-vision.com`.

Built with vanilla HTML, CSS and JavaScript. There is no build step and no framework. The site is served by GitHub Pages straight from `main`.

## Features

- Sign-in and account management
- Chart and four-layer reports (natal, decade, annual, monthly)
- Sihua (四化) unlock
- Single-question consultation (full flow)
- 2027 annual section
- Unsubscribe page
- Admin back office

## Interface languages

zh-TW, zh-CN, en, ja and ko. The default is en.

## Configuration

Front-end settings live in `config.js`. Only the Supabase anon key and other public settings belong there. Never put private keys, secrets or credentials in this repository.

## Contributing

- Start every commit message with the ticket number, e.g. `[PT-###]`.
- Pull the latest `main` before changing any file.

## License

© 2026 FuSang Vision. All rights reserved.
