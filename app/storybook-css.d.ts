// Permite los imports `import '...css'` en los *.stories.tsx (Storybook/Vite
// los resuelve en runtime; tsc solo necesita saber que el módulo existe).
declare module '*.css'
