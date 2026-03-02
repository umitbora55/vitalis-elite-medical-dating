export const TurboModuleRegistry = {
    get: () => null,
    getEnforcing: () => null,
};

export const NativeModules = {};

export const Platform = {
    OS: 'web',
    select: (obj: any) => obj.web || obj.default,
    isTesting: false,
};

export default {
    TurboModuleRegistry,
    NativeModules,
    Platform,
};
