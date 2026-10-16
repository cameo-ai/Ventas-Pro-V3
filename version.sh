#!/usr/bin/env bash
# Guarda el estado actual como la siguiente versión (V1, V2, ...) y la sube a GitHub.
# Uso: ./version.sh "descripción del cambio"
cd "$(dirname "$0")" || exit 1
DESC="${1:-sin descripción}"
RAMA_GITHUB="versiones-pi"

ERR=0
for f in *.js public/js/*.js; do
  [ -f "$f" ] || continue
  node --check "$f" 2>/dev/null || { echo "ERROR DE SINTAXIS en $f — no se guardó la versión"; node --check "$f"; ERR=1; }
done
[ "$ERR" = 0 ] || exit 1

touch .gitignore
for d in data/ node_modules/ .env; do
  grep -qxF "$d" .gitignore || echo "$d" >> .gitignore
  if git ls-files -- "${d%/}" | grep -q .; then git rm -r -q --cached -- "${d%/}"; fi
done

ULT=$(git tag -l 'V[0-9]*' | sed 's/^V//' | sort -n | tail -1)
N=$(( ${ULT:-0} + 1 ))
V="V$N"

git add -A
if git diff --cached --quiet && [ -n "$ULT" ] && [ "$(git rev-parse HEAD)" = "$(git rev-parse "V$ULT^{commit}" 2>/dev/null)" ]; then
  echo "No hay cambios desde V$ULT: no se creó una versión nueva."
  exit 0
fi
git diff --cached --quiet || git commit -q -m "$V: $DESC" || { echo "No se pudo guardar"; exit 1; }
git tag -a "$V" -m "$V: $DESC" || exit 1
echo "GUARDADO COMO $V: $DESC"
git show --stat --format='%h %s' "$V" | head -15

if git push -q origin "HEAD:refs/heads/$RAMA_GITHUB" && git push -q origin "$V"; then
  echo "RESPALDO EN GITHUB OK (rama $RAMA_GITHUB, etiqueta $V)"
else
  echo "AVISO: quedó guardada en el Pi, pero no se pudo subir a GitHub"
fi
