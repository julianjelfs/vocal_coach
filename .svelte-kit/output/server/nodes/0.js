

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export const universal = {
  "prerender": true,
  "ssr": false
};
export const universal_id = "src/routes/+layout.ts";
export const imports = ["_app/immutable/nodes/0.CIL5HiYL.js","_app/immutable/chunks/Dp1pzeXC.js","_app/immutable/chunks/zmPQ--GU.js","_app/immutable/chunks/5b4AAHbk.js","_app/immutable/chunks/BMeZxLns.js","_app/immutable/chunks/Dz_fRvZY.js","_app/immutable/chunks/BcdHyojQ.js"];
export const stylesheets = ["_app/immutable/assets/0.BJYBrFhC.css"];
export const fonts = [];
