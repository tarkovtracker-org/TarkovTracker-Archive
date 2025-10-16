declare module 'd3' {
  const d3: {
    select: (...args: unknown[]) => unknown;
    svg: (url: string) => Promise<Document>;
    [key: string]: unknown;
  };

  export = d3;
}
