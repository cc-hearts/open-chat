import type { ThemeConfig } from "antdv-next";

export const brandPalette = {
  base: {
    black: "#171717",
    white: "#ffffff",
    trueBlack: "#000000",
  },
  neutral: {
    50: "#fafafa",
    100: "#ebebeb",
    400: "#808080",
    500: "#666666",
    600: "#4d4d4d",
    900: "#171717",
  },
  workflow: {
    develop: "#0a72ef",
    preview: "#de1d8d",
    ship: "#ff5b4f",
  },
  interactive: {
    link: "#0072f5",
    focus: "#0075f5",
    ring: "rgba(147, 197, 253, 0.5)",
  },
  badge: {
    blueBg: "#ebf5ff",
    blueText: "#0068d6",
  },
  console: {
    blue: "#0070f3",
    purple: "#7928ca",
    pink: "#eb367f",
  },
} as const;

export const brandTheme: ThemeConfig = {
  token: {
    colorPrimary: brandPalette.interactive.link,
    colorInfo: brandPalette.workflow.develop,
    colorLink: brandPalette.interactive.link,
    colorText: brandPalette.neutral[900],
    colorTextHeading: brandPalette.neutral[900],
    colorTextSecondary: brandPalette.neutral[600],
    colorTextTertiary: brandPalette.neutral[500],
    colorTextPlaceholder: brandPalette.neutral[400],
    colorTextLightSolid: brandPalette.base.white,
    colorBorder: brandPalette.neutral[100],
    colorBorderSecondary: brandPalette.neutral[100],
    colorBgBase: brandPalette.base.white,
    colorBgLayout: brandPalette.base.white,
    colorBgContainer: brandPalette.base.white,
    colorBgElevated: brandPalette.base.white,
    colorFill: "rgba(23, 23, 23, 0.08)",
    colorFillSecondary: "rgba(23, 23, 23, 0.06)",
    colorFillTertiary: "rgba(23, 23, 23, 0.04)",
    colorFillQuaternary: brandPalette.neutral[50],
    controlItemBgHover: "rgba(23, 23, 23, 0.05)",
    controlItemBgActive: "rgba(10, 114, 239, 0.12)",
    controlOutline: brandPalette.interactive.focus,
    borderRadius: 8,
    fontFamily:
      '"Geist", "Geist Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    wireframe: false,
    lineWidthFocus: 2,
    boxShadow:
      "0 0 0 1px rgba(0, 0, 0, 0.08), 0 2px 2px rgba(0, 0, 0, 0.04), 0 8px 8px -8px rgba(0, 0, 0, 0.04)",
    boxShadowSecondary: "0 0 0 1px rgba(0, 0, 0, 0.08), 0 2px 2px rgba(0, 0, 0, 0.04)",
  },
};
