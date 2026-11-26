import { PUBLIC_APP_ENV } from "$env/static/public";
import { app_url } from "../app.config.js";

export const prerender = PUBLIC_APP_ENV !== "preview";
export const trailingSlash = "always";

export function load({ url }) {
	const appUrl = app_url ? new URL(app_url) : null;
	const appPath = appUrl ? appUrl.pathname.replace(/\/$/, "") : ""; // '' or '/my-app'

	const pathname = url.pathname;
	const relativePath =
		appPath && (pathname === appPath || pathname.startsWith(appPath + "/"))
			? pathname.slice(appPath.length) || "/"
			: pathname;

	const canonicalUrl = appUrl ? appUrl.origin + appPath + relativePath : null;

	return {
		// This title and description will populate the page metadata
		// You can override these layout-level values using per-route +page.js load functions
		pageTitle: "Very Low Fertility Patterns - Prototype",
		pageDescription:
			"An interactive exploration of countries experiencing lowest-low fertility, comparing patterns and trajectories using data from the UN World Population Prospects 2024.",
		canonicalUrl
	};
}
