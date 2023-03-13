import { ARProvider } from "../../AR-provider";

class WebXRProvider extends ARProvider {

  public get tag() {
    return "webXR";
  }

  private _xrSession: XRSession | null = null;
  public get xrSession ()  {
    return this._xrSession;
  }

  // Enforce the singleton pattern
  private instance: WebXRProvider | null = null;

  constructor() {
    super();

    // Safeguard that we are not running inside the editor
    if (typeof (document) === 'undefined') {
      return;
    }

    if(this.instance !== null) {
      throw "WebXRProvider cannot be instantiated";
    }

    this.instance = this;

    WL.onXRSessionStart.push((session: XRSession) => {
      this._xrSession = session;
      this.onSessionStarted.forEach(cb => cb(this));
    });

    WL.onXRSessionEnd.push(() => {
      this._xrSession = null;
      this.onSessionEnded.forEach(cb => cb(this));
    });
  }

  public async startSession(webxrRequiredFeatures: string [] = ['local'], webxrOptionalFeatures: string[] = ['local', 'hit-test',]) {
    WL.requestXRSession('immersive-ar', webxrRequiredFeatures, webxrOptionalFeatures);
  }

  public async endSession() {
    if (this._xrSession) {
      this._xrSession.end();
    }
  }

  public async load() {
    this.loaded = true;
    return Promise.resolve();
  }
}
const webXRProvider = new WebXRProvider();
export { WebXRProvider, webXRProvider }