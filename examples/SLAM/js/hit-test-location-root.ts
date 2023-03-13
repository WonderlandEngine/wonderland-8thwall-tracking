import { Component, Object as WLEObject, Type } from '@wonderlandengine/api';
import { ARSession, WebXRProvider, ARProvider } from '../../..';
/**
 * Sets up a [WebXR Device API "Hit Test"](https://immersive-web.github.io/hit-test/)
 * and places the object to the hit location.
 * 
 * Difference from the original 'hit-test-location' is that the reticle does not have to be a child of the camera.
 *
 * **Requirements:**
 *  - Specify `'hit-test'` in the required or optional features on the AR button in your html file.
 */

class HitTestLocationRoot extends Component {
  public static TypeName = 'hit-test-location-root';
  public static Properties = {
    camera: { type: Type.Object },
  };

  // injected by WLE
  camera!: WLEObject;

  private tempScaling = new Float32Array(3);
  private visible = false;

  private xrViewerSpace?: XRReferenceSpace;
  private xrHitTestSource: XRHitTestSource | null = null;

  private tracking = false;
  init() {
    ARSession.onSessionStarted.push(this.onSessionStarted);
    ARSession.onSessionEnded.push(this.onSessionEnded);
    this.tempScaling.set(this.object.scalingLocal);
    this.visible = false;
    this.object.scale([0, 0, 0]);
  }

  update() {
    if (this.tracking) {
      const wasVisible = this.visible;
      if (this.xrHitTestSource) {

        const frame = WL.xrFrame;
        if (!frame)
          return;

        let hitTestResults = frame.getHitTestResults(this.xrHitTestSource);
        if (hitTestResults.length > 0) {
          let pose = hitTestResults[0].getPose(this.xrViewerSpace);
          this.visible = true;

          // this is good;
          const tw = this.camera.transformPointWorld(new Array(3), new Array(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z));
          this.object.setTranslationWorld(tw);


          // TODO: how do I get the world ROTATION
        } else {
          this.visible = false;
        }
      }

      if (this.visible != wasVisible) {
        if (!this.visible) {
          this.tempScaling.set(this.object.scalingLocal);
          this.object.scale([0, 0, 0]);
        } else {
          this.object.scalingLocal.set(this.tempScaling);
          this.object.setDirty();
        }
      }
    }
  }

  onSessionStarted = (provider: ARProvider) => {
    if (provider instanceof WebXRProvider) {
      this.tracking = true;
      (provider as WebXRProvider).xrSession!.requestReferenceSpace('viewer').then((refSpace: XRReferenceSpace) => {
        this.xrViewerSpace = refSpace;
        (provider as WebXRProvider).xrSession!.requestHitTestSource!({ space: this.xrViewerSpace! })!.then((hitTestSource: XRHitTestSource) => {
          this.xrHitTestSource = hitTestSource;
        });
      })
    }
  };

  onSessionEnded = (provider: ARProvider) => {

    if (provider instanceof WebXRProvider) {
      this.tracking = false

      this.object.scale([0, 0, 0]);
      this.visible = false;

      if (!this.xrHitTestSource) return;

      this.xrHitTestSource.cancel();
      this.xrHitTestSource = null;
    }
  }
};

WL.registerComponent(HitTestLocationRoot);
