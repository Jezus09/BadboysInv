/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { useTranslate } from "./app-context";
import { Logo } from "./logo";

export function Splash() {
  const translate = useTranslate();
  return (
    <div
      id="splash"
      suppressHydrationWarning
      style={{
        alignItems: "center",
        backgroundColor: "#121212",
        color: "white",
        display: "flex",
        height: "100%",
        justifyContent: "center",
        left: 0,
        position: "fixed",
        top: 0,
        transition: "opacity 1s ease-in-out",
        width: "100%",
        zIndex: 100
      }}
    >
      <div
        suppressHydrationWarning
        style={{
          border: "1px solid transparent",
          borderRadius: "4px",
          minWidth: "280px",
          minHeight: "80px",
          textAlign: "center"
        }}
      >
        <div
          suppressHydrationWarning
          style={{
            padding: "0.5em",
            fontFamily: "stratum2, sans-serif",
            fontSize: "2rem",
            fontWeight: "bold",
            background: "linear-gradient(to right, #60a5fa, #a78bfa, #ec4899)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            marginBottom: "1rem"
          }}
        >
          BADBOYS INVENTORY
        </div>
        <div
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.1)",
            borderRadius: "2px",
            marginTop: "16px",
            overflow: "hidden",
            padding: "2px"
          }}
        >
          <div
            suppressHydrationWarning
            id="splash-progress"
            style={{
              background: "white",
              borderRadius: "2px",
              height: "4px",
              transition: "width 500ms ease-in-out",
              width: "0%"
            }}
          />
        </div>
        <noscript>
          <div className="px-2 pb-1 text-center">
            <strong>{translate("JavaScriptRequired")}</strong>
          </div>
        </noscript>
      </div>
      <style
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: `:root {color-scheme: dark;}`
        }}
      />
      <script
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: __SPLASH_SCRIPT__
        }}
      />
    </div>
  );
}
