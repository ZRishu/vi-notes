const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const getApiBaseUrl = (): string => {
  const configuredBaseUrl = import.meta.env.VITE_BACKEND_URL?.trim();
  if (configuredBaseUrl) {
    return trimTrailingSlash(configuredBaseUrl);
  }

  return 'http://localhost:5000/api';
};

export const clientConfig = {
  apiBaseUrl: getApiBaseUrl(),
} as const;
