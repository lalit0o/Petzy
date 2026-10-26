# Expo HAS CHANGED

Antes de crear o modificar menús emergentes, filtros o selectores pequeños, leer completa `../../.agents/skills/anchored-overlays/SKILL.md` y reutilizar `components/anchored-menu.tsx`. Define el origen de la animación, el cierre, la separación del fondo, los temas y el movimiento reducido aprobados para Petzy.

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

Before creating or redesigning a screen, read `../../.agents/skills/frontend-design/SKILL.md` in full. Follow its visual hierarchy and content guidance while keeping Petzy's approved palette, Nunito typography, navigation, accessibility, and module requirements. Also follow the root `AGENTS.md` guidance for `apple-design` and `async-feedback`.

Before creating or changing any form, also read `../../.agents/skills/mobile-forms/SKILL.md` in full. Check the keyboard's Next/Done path through every input and selector, and use the same validation and submit action as the visible button.

Para cualquier input, incluidos comentarios y búsquedas, aplicar también la sección «Campos visibles con el teclado abierto» de esa skill. Reutilizar `components/form-scroll-view.tsx` y evitar compensar dos veces el teclado con otro `KeyboardAvoidingView`.
