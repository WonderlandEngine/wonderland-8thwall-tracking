/**
 * class ImageTrackingExample
 * 
 * A very basic image tracking example.
 * Moves the object of the component to tracked image position.
 * 
 */
import { Component, Object as WLEObject, Type } from '@wonderlandengine/api';
import { ARSession } from '../../..';
import { ARSLAMCamera } from '../../../src/components/AR/cameras/AR-SLAM-camera';

class SlamTrackingExample extends Component {

  public static TypeName = 'slam-tracking-example';
  public static Properties = {
    ARSlamCamera: { type: Type.Object },
  };
  // injected by WL..
  private ARSlamCamera!: WLEObject;

  start() {
    if (!this.ARSlamCamera) {
      console.warn(`${this.object.name}/${this.type} requires a ${ARSLAMCamera.TypeName}`);
      return;
    }

    const camera = this.ARSlamCamera.getComponent(ARSLAMCamera);

    if (!camera) {
      throw new Error(`${ARSLAMCamera.TypeName} was not found on ARImageTrackingCamera`)
    }

    ARSession.onSessionStarted.push(() => {
      if(camera.active) {
        this.object.scalingWorld = [1, 1, 1]  
      }
    });

    ARSession.onSessionEnded.push(() => {
      this.object.scalingWorld = [0, 0, 0]
    });

    this.object.scalingWorld = [0, 0, 0]
  }
}
WL.registerComponent(SlamTrackingExample);