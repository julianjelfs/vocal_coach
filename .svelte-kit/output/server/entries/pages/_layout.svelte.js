import { s as store_get, u as unsubscribe_stores, a as slot } from "../../chunks/index2.js";
import { c as canInstallPWA } from "../../chunks/musicStore.js";
import "clsx";
import "idb";
function InstallPrompt($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    if (store_get($$store_subs ??= {}, "$canInstallPWA", canInstallPWA)) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<button class="install-btn svelte-wh6tnt" aria-label="Add app to home screen"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Install</button>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    $$renderer2.push(`<!--[-->`);
    slot($$renderer2, $$props, "default", {});
    $$renderer2.push(`<!--]--> `);
    InstallPrompt($$renderer2);
    $$renderer2.push(`<!---->`);
  });
}
export {
  _layout as default
};
