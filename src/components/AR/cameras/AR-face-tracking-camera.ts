import { ARSession } from '../AR-session';
import { FaceTracking_XR8 } from '../frameworks/xr8/face-tracking-mode-xr8';
import { xr8Provider } from '../frameworks/xr8/xr8-provider';
import { Type } from '@wonderlandengine/api';
import { ARCamera } from './AR-Camera';

const WLEComponentTypeName = 'AR-face-tracking-camera';

ARSession.registerTrackingProvider(xr8Provider);
class ARFaceTrackingCamera extends ARCamera {
  public static TypeName = WLEComponentTypeName;
  public static Properties = {
    cameraDirection: { type: Type.Enum, values: ['front', 'back'] as XR8CameraDirection[keyof XR8CameraDirection][], default: 'front' },
  };

  private trackingImpl = new FaceTracking_XR8(this);

  // will be set by WLE
  public cameraDirection: number = 0;

  public get onFaceLoading() {
    return this.trackingImpl.onFaceLoading;
  }

  public get onFaceFound() {
    return this.trackingImpl.onFaceFound;
  }

  public get onFaceUpdate() {
    return this.trackingImpl.onFaceUpdate;
  }

  public get onFaceLost() {
    return this.trackingImpl.onFaceLost;
  }

  public start() {
    if (!this.object.getComponent('view')) {
      throw new Error('AR-camera requires a view component');
    }
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

export { ARFaceTrackingCamera };

