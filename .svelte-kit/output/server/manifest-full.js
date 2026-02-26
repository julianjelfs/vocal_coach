export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.svg","icons/icon-192.png","icons/icon-512.png","icons/icon-maskable-512.png","manifest.webmanifest"]),
	mimeTypes: {".svg":"image/svg+xml",".png":"image/png",".webmanifest":"application/manifest+json"},
	_: {
		client: {start:"_app/immutable/entry/start.CjvscV4o.js",app:"_app/immutable/entry/app.CsD4S2sS.js",imports:["_app/immutable/entry/start.CjvscV4o.js","_app/immutable/chunks/CY68Y4KB.js","_app/immutable/chunks/5b4AAHbk.js","_app/immutable/entry/app.CsD4S2sS.js","_app/immutable/chunks/Dp1pzeXC.js","_app/immutable/chunks/5b4AAHbk.js","_app/immutable/chunks/QY9dYR0b.js","_app/immutable/chunks/zmPQ--GU.js","_app/immutable/chunks/Dz_fRvZY.js","_app/immutable/chunks/C_0iIYPq.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
