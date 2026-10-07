export const NODE_ENVIRONMENTS = ['development', 'production', 'test'] as const;

export type NodeEnvironment = (typeof NODE_ENVIRONMENTS)[number];
