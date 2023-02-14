import ARSession from '../AR-session';

import { Component, Type } from '@wonderlandengine/api';

import XR8Provider from '../frameworks/xr8/xr8-provider';
import WorldTracking_XR8 from '../frameworks/xr8/world-tracking-mode-xr8';


ARSession.registerTrackingProvider(XR8Provider);

const WLEComponentTypeName = 'AR-VPS-camera';

export default class ARVPSCamera extends Component {

  public static TypeName = WLEComponentTypeName;
  public static Properties = {
   
  };

  private trackingImpl = new WorldTracking_XR8(this);

  public get onWaySpotFound () {
    return this.trackingImpl.onWaySpotFound;

  }
  public get onWaySpotUpdated() {
    return this.trackingImpl.onWaySpotUpdated;
  }

  public get onWaySpotLost() {
    return this.trackingImpl.onWaySpotLost;
  }

  public get onMeshFound() {
    return this.trackingImpl.onMeshFound;
  }

  public start() {
    this.trackingImpl.init();
    ARSession.onARSessionRequested.push(this.startARSession);
  }

  startARSession = () => {
    if (this.active) {
      this.trackingImpl.startSession();
    }
  }

  onDeactivate(): void {
    this.trackingImpl.endSession();
  }
}

WL.registerComponent(ARVPSCamera);

