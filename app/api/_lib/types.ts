export type ApiCtx = {
  params?: Record<string, string>;
  me?: { id: string; email: string; role: "admin" | "super_admin" };
};

export type ApiHandler = (req: Request, ctx: ApiCtx) => Promise<Response>;
