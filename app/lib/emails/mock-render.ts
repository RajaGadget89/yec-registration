// Mock render function for build-time compatibility
export const render = async (): Promise<string> => {
  // This is a mock implementation that should never be called during build
  // It's only used to satisfy TypeScript and webpack during build
  throw new Error(
    "Mock render function called - this should not happen during build",
  );
};
