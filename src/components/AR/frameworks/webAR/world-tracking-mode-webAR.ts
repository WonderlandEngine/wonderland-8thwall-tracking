import { TrackingMode } from '../trackingMode';
import { webXRProvider } from './webXR-provider';

class WorldTracking_webAR extends TrackingMode {
  public startSession() {
    webXRProvider.startSession(WEBXR_REQUIRED_FEATURES, WEBXR_OPTIONAL_FEATURES);
  }

  public endSession(): void {
    webXRProvider.endSession();
  }
}

export { WorldTracking_webAR };