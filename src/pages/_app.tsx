import { type AppType } from "next/app";
import { Atkinson_Hyperlegible, Spectral } from "next/font/google";

import { api } from "../utils/api";

import "../styles/globals.css";

/* next/font downloads these at build time and serves them from our own
 * origin, so the CSP's font-src 'self' holds. Weights match the design
 * canvas. The CSS variables feed --font-sans / --font-display in
 * globals.css. */
const atkinson = Atkinson_Hyperlegible({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-atkinson",
});

const spectral = Spectral({
  weight: ["300", "500", "600"],
  subsets: ["latin"],
  variable: "--font-spectral",
});

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <div className={`${atkinson.variable} ${spectral.variable} font-sans`}>
      <Component {...pageProps} />
    </div>
  );
};

export default api.withTRPC(MyApp);
