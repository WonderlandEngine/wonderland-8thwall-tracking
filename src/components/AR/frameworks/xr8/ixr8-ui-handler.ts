interface IXR8UIHandler {
    requestUserInteraction: () => Promise<void>;
    handlePermissionFail: (error: Error) => void;
    handleError: (error: Event) => void;
    showWaitingForDeviceLocation: () => void;
    hideWaitingForDeviceLocation: () => void;
    handleIncompatibleDevice: () => void;
}

export { IXR8UIHandler }