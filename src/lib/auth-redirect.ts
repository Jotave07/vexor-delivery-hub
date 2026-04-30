export const getAppOrigin = () => {
  if (typeof window === "undefined") return "";
  return window.location.origin.replace(/\/+$/, "");
};

export const buildAppUrl = (path: string) => {
  const origin = getAppOrigin();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${normalizedPath}`;
};
