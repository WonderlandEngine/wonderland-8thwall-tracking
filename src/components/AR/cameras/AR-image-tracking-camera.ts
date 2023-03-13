import { ARSession } from '../AR-session';

import { Type } from '@wonderlandengine/api';

import { xr8Provider } from '../frameworks/xr8/xr8-provider';
import { WorldTracking_XR8 } from '../frameworks/xr8/world-tracking-mode-xr8';
import { ARCamera } from './AR-Camera';


ARSession.registerTrackingProvider(xr8Provider);

const WLEComponentTypeName = 'AR-image-tracking-camera';

class ARImageTrackingCamera extends ARCamera {

  public static TypeName = WLEComponentTypeName;
  public static Properties = {
    EnableSLAM: { type: Type.Bool, default: false, } // Imrpoves tracking, reduces performance
  };

  private trackingImpl = new WorldTracking_XR8(this);

  public get onImageScanning() {
    return this.trackingImpl.onImageScanning;
  }

  public get onImageFound() {
    return this.trackingImpl.onImageFound;
  }

  public get onImageUpdate() {
    return this.trackingImpl.onImageUpdate;
  }

  public get onImageLost() {
    return this.trackingImpl.onImageLost;
  }

  public start() {
    this.trackingImpl.init();
  }

  startSession = async () => {
    if (this.active) {
      this.trackingImpl.startSession();
    }
  }

  endSession = async () => {
    if (this.active) {
      this.trackingImpl!.endSession();
    }
  }

  onDeactivate(): void {
    this.trackingImpl.endSession();
  }
}

export { ARImageTrackingCamera }