declare global {
    var testUtils: {
        delay: (ms: number) => Promise<void>;
        mockStagehand: () => any;
        mockRedisClient: () => any;
        createMockSession: () => any;
        createMockAgent: () => any;
    };
}
export {};
//# sourceMappingURL=setup.d.ts.map