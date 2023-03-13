import { ARSession } from '../AR-session';

import { WorldTracking_XR8 } from '../frameworks/xr8/world-tracking-mode-xr8';

import { xr8Provider } from '../frameworks/xr8/xr8-provider';
import { ARCamera } from './AR-Camera';
import { Type } from '@wonderlandengine/api';

ARSession.registerTrackingProvider(xr8Provider)

class ARXR8SLAMCamera extends ARCamera {
  public static TypeName = 'AR-XR8-SLAM-camera';
  public static Properties = {
    UseAbsoluteScale: { type: Type.Bool, default: false }
  };

  private trackingImpl!: WorldTracking_XR8;

  public get onTrackingStatus() {
    return this.trackingImpl!.onTrackingStatus;
  }

  public init () {
    this.trackingImpl = new WorldTracking_XR8(this);
  }

  public start() {
    if (!this.object.getComponent('view')) {
      throw new Error('AR-camera requires a view component');
    }
    
    this.trackingImpl.init();
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
}

export { ARXR8SLAMCamera }

