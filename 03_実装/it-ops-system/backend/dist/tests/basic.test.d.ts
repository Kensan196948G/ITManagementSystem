declare global {
    namespace jest {
        interface Matchers<R> {
            toBeValidMetrics(): R;
        }
    }
}
export {};
//# sourceMappingURL=basic.test.d.ts.map