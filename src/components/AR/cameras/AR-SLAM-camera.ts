import { ARSession } from '../AR-session';

import { WorldTracking_XR8 } from '../frameworks/xr8/world-tracking-mode-xr8';
import { WorldTracking_webAR } from '../frameworks/webAR/world-tracking-mode-webAR';


import { ITrackingMode } from '../frameworks/trackingMode';
import { webXRProvider } from '../frameworks/webAR/webXR-provider';
import { xr8Provider } from '../frameworks/xr8/xr8-provider';
import { ARCamera } from './AR-Camera';
import { Type } from '@wonderlandengine/api';

// running on a browser?
if (window.document) {

  // WL.arSupported might not exist at this point. so we wait until WLE resolves it
  (function checkARSupport() {
    if (WL.arSupported === undefined) {
      setTimeout(checkARSupport, 1);
    } else {
      if (WL.arSupported) {
        ARSession.registerTrackingProvider(webXRProvider)
      } else {
        ARSession.registerTrackingProvider(xr8Provider)
      }
    }
  })();
}

class ARSLAMCamera extends ARCamera {
  public static TypeName = 'AR-SLAM-camera';
  public static Properties = {
   
  };

  private trackingImpl?: ITrackingMode;

  public init() {
    if (WL.arSupported) {
    //if (false) { // force xr8
      this.trackingImpl = new WorldTracking_webAR(this);
    } else {
      this.trackingImpl = new WorldTracking_XR8(this);
    }

  }

  public start() {
    if (!this.object.getComponent('view')) {
      throw new Error('AR-camera requires a view component');
    }

    if (!WL.arSupported) {
      (this.trackingImpl as WorldTracking_XR8).init();
    }
  }

  startSession = async () => {
    if (this.active) {
      this.trackingImpl!.startSession();
    }
  }

  endSession = async () => {
    if (this.active) {
      this.trackingImpl!.endSession();
    }
  }

  onDeactivate(): void {
    this.trackingImpl!.endSession()
  }

  public update(dt: number) {
    this.trackingImpl!.update?.(dt);
  }
}

export { ARSLAMCamera }

