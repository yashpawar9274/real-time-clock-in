import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.omvaluehomes.attendance",
  appName: "OM Attendance",
  webDir: "capacitor-web/client",
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      backgroundColor: "#1b4332",
    },
  },
};

export default config;