#!/usr/bin/env bash
# Deja el código como estaba en una versión anterior y reinicia la app.
# Uso: ./volver.sh V3        (sin argumento: muestra las versiones)
cd "$(dirname "$0")" || exit 1
V="$1"
if [ -z "$V" ]; then
  echo "Versiones guardadas:"
  git tag -l 'V[0-9]*' --sort=-v:refname -n1 | head -30
  echo; echo "Uso: ./volver.sh V3"
  exit 0
fi
git rev-parse -q --verify "refs/tags/$V" >/dev/null || { echo "No existe la versión $V. Mira la lista con: ./volver.sh"; exit 1; }
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Hay cambios sin guardar. Guárdalos primero con: ./version.sh \"descripción\""
  exit 1
fi

PROTEGIDO=(':!data' ':!data/**' ':!.env' ':!node_modules' ':!node_modules/**')
git checkout "$V" -- . "${PROTEGIDO[@]}"
git diff --name-only --diff-filter=A "$V" HEAD -- . "${PROTEGIDO[@]}" | while read -r f; do git rm -q -- "$f"; done
echo "Código restaurado a $V (la base de datos de ventas no se toca)."

./version.sh "vuelta a $V"

if command -v systemctl >/dev/null && systemctl list-unit-files ventas-pro.service >/dev/null 2>&1; then
  sudo systemctl restart ventas-pro.service && sleep 2 && echo "App: $(systemctl is-active ventas-pro.service)"
fi
