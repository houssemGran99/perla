export type Theme = "light" | "dark";

export const THEME_KEY = "perla-theme";
export const THEME_COLOR: Record<Theme, string> = { light: "#f2f0f4", dark: "#16121b" };

// Runs before first paint (inlined in <head>) so a saved choice never flashes the other theme.
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t;document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.content=t==="dark"?"${THEME_COLOR.dark}":"${THEME_COLOR.light}"})}}catch(e){}})()`;
