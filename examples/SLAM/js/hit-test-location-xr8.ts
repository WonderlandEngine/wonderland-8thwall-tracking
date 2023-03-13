import { Component, Object as WLEObject, Type } from '@wonderlandengine/api';
import { vec3 } from 'gl-matrix';
import { ARSession, XR8Provider, ARProvider } from '../../../';

import { Plane } from './common/math/plane';
import { Ray } from './common/math/ray';

/**
 * Hit test location for XR8 implementation
 */
class HitTestLocationXR8 extends Component {
  public static TypeName = 'hit-test-location-xr8';
  public static Properties = {
    camera: { type: Type.Object },
  };
  private tempScaling = new Float32Array(3);
  // injected by WLE
  camera!: WLEObject;

  private tracking = false;
  private glPlane: Plane = new Plane(vec3.fromValues(0, 1, 0), 0);


  private camForward = new Array(3);
  private camForwardVec3 = vec3.create();
  private intersectionVec3 = vec3.create();
  private tmpWorldPosition = new Array(3);

  init() {
    ARSession.onSessionStarted.push(this.onSessionStarted);
    ARSession.onSessionEnded.push(this.onSessionEnded);
  }

  update() {
    if (this.tracking) {
      this.camera.getForward(this.camForward);
      vec3.set(this.camForwardVec3, this.camForward[0], this.camForward[1], this.camForward[2]);
      this.camera.getTranslationWorld(this.tmpWorldPosition);
      const ray = new Ray(vec3.fromValues(this.tmpWorldPosition[0], this.tmpWorldPosition[1], this.tmpWorldPosition[2]), this.camForwardVec3);
      const intersection = ray.intersectPlane(this.glPlane, this.intersectionVec3);
      if (intersection) {
        this.object.setTranslationWorld(intersection)
      }
    }
  }

  onSessionStarted = (provider: ARProvider) => {
    if (provider instanceof XR8Provider) {
      this.object.scalingWorld = [1, 1, 1]
      this.tracking = true;

    }
  }

  onSessionEnded = (provider: ARProvider) => {
    if (provider instanceof XR8Provider) {
      this.tracking = false;
      this.object.scalingWorld = [0, 0, 0]
    }
  }
};

WL.registerComponent(HitTestLocationXR8);
