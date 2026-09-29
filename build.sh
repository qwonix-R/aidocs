npx esbuild src/extension.ts --bundle --outfile=dist/extension.js --external:vscode --format=cjs --platform=node
npx @vscode/vsce package --no-dependencies --allow-missing-repository
