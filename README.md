# The Crows Tavern

Static Crowanoke site published from this repository through GitHub Pages.

## Site accent color

The client's pink accent is `--accent: #ffb7c5` in the `:root` CSS rule in `index.html`. Dark text on filled buttons keeps that light pink readable.

## Animated crow color

In `index.html`, change `--crow-color` in the `:root` CSS rule near the top:

```css
--crow-color: #ffb7c5;
```

Replace the value with the client's requested hex code or another CSS color. This recolors every flying and perched pose together, without editing the SVGs or animation script. The original off-white is the default.

The SVGs act as silhouette masks; their transparent edges and the edited legless flight contours remain intact. Use an HTTP server when previewing locally because browsers restrict local-file mask URLs:

```sh
python -m http.server 8000
```

Then open `http://localhost:8000`. The crow appears for mouse input and is omitted on touch-only devices or when reduced motion is enabled.

## Icons

`favicon.ico`, `assets/favicon-32.png`, and `apple-touch-icon.png` use the supplied crow-and-tankard artwork. Their links in `index.html` include a version suffix to refresh cached icons.

## Live stream

The page checks `/api/live` and inserts the Twitch player when the response confirms `live: true`. The live-status endpoint is hosted separately; changing this repository does not change its credentials or routing.
