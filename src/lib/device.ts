export function getLocalDeviceInfo() {
  if (typeof navigator === "undefined") {
    return {
      browserName: "Unknown",
      browserVersion: "Unknown",
      osName: "Unknown",
      osVersion: "Unknown",
      mobileVendor: "Unknown",
      mobileModel: "Unknown",
    };
  }

  const userAgent = navigator.userAgent;
  const platform = navigator.platform;

  const browserMatch =
    userAgent.match(/(Firefox)\/([\d.]+)/) ??
    userAgent.match(/(Edg)\/([\d.]+)/) ??
    userAgent.match(/(Chrome)\/([\d.]+)/) ??
    userAgent.match(/Version\/([\d.]+).*(Safari)/);

  const browserName = browserMatch
    ? browserMatch[1] === "Edg"
      ? "Edge"
      : browserMatch[1] === "Safari"
        ? "Safari"
        : browserMatch[1]
    : "Unknown";

  const browserVersion = browserMatch
    ? browserMatch[2] ?? browserMatch[1] ?? "Unknown"
    : "Unknown";

  const osName = /Windows/i.test(platform)
    ? "Windows"
    : /Mac/i.test(platform)
      ? "macOS"
      : /Linux/i.test(platform)
        ? "Linux"
        : /iPhone|iPad|iPod/i.test(userAgent)
          ? "iOS"
          : /Android/i.test(userAgent)
            ? "Android"
            : "Unknown";

  return {
    browserName,
    browserVersion,
    osName,
    osVersion: "Unknown",
    mobileVendor: "Unknown",
    mobileModel: "Unknown",
  };
}