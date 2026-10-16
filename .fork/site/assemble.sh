#!/bin/sh
# Assembles the full site repo (MolfarWav/MolfarWav.github.io) into .fork/site/dist:
# page sources, build script, stylesheet, the images from this repo, then builds the pages.
# Run from anywhere: sh .fork/site/assemble.sh
set -e
R=$(cd "$(dirname "$0")/../.." && pwd); F="$R/.fork/site"; D="$F/dist"
rm -rf "$D"; mkdir -p "$D/assets/screens" "$D/src"
cp -r "$F/src/en" "$F/src/uk" "$D/src/"; rm -f "$D/src/uk/.gitkeep"
cp "$F/build.mjs" "$F/README.md" "$D/"; cp "$R/LICENSE" "$D/"; touch "$D/.nojekyll"
cp "$F/assets/site.css" "$D/assets/"
cp "$R/client/public/vertep-logo.svg" "$R/client/public/favicon-64.png" \
   "$R/.github/assets/divider.svg" "$R/.github/assets/molfar/molfar-cast.gif" "$R/.github/assets/social-preview.png" "$D/assets/"
for f in home chat dashboard soul library molfar profile persona prompt-board chat-links quick-moves store phone-chat phone-molfar; do
  cp "$R/.github/assets/screens/$f.png" "$D/assets/screens/"
done
cp "$R/.github/assets/screens/molfar-rebuild.gif" "$D/assets/screens/"
for f in "$F"/google*.html; do [ -e "$f" ] && cp "$f" "$D/"; done
cd "$D" && node build.mjs
