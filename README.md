# rokith.fpv

Portfolio site for Rokith Kumaar, FPV drone pilot and robotics builder from Chennai, India.

Plain HTML, CSS and JavaScript. No build step: open `index.html`, or serve the folder with any static host
(GitHub Pages, Netlify, Vercel).

- `index.html`: all content (story, results, projects, skills, contact)
- `styles.css`: design and layout
- `script.js`: hero drone animation, hangar tabs, scroll rail
- `assets/`: photos, see `assets/README.md` for file names

## Cache busting

`index.html` loads `styles.css?v=…` and `script.js?v=…`. Bump that version in both links (e.g. `20261121a` →
`20261121b`, or a new date) with every change to the CSS or JS, so visitors who have the old files cached get the new
ones on a normal reload.
