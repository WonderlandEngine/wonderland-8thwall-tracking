import { Component } from '@wonderlandengine/api';
import { ARSession } from '../../../';
import { ARFaceTrackingCamera } from '../../../src/components/AR/cameras/AR-face-tracking-camera';
import { ARImageTrackingCamera } from '../../../src/components/AR/cameras/AR-image-tracking-camera';
import { ARSLAMCamera } from '../../../src/components/AR/cameras/AR-SLAM-camera';


class XR8CameraSwitch extends Component {
  public static TypeName = 'xr8-camera-switch-example';
  public static Properties = {
  };

  private faceTrackingCamera?: ARFaceTrackingCamera
  private imageTrackingCamera?: ARImageTrackingCamera
  private worldTrackingCamera?: ARSLAMCamera;

  start() {
    const html = `<div style="position: absolute; top: 0; left: 0; z-index: 999">
      <button style="line-height: 40px" id="XR8CameraSwitch-frontface">Turn on front face camera</button>
      <button style="line-height: 40px" id="XR8CameraSwitch-backface">Turn on back face camera</button>
      <button style="line-height: 40px"id="XR8CameraSwitch-image">Turn on image tracking camera</button>
      <button style="line-height: 40px" id="XR8CameraSwitch-world">Turn on world tracking camera</button>
      <button style="line-height: 40px" id="XR8CameraSwitch-kill">Kill session</button>
    </div>`

    const container = document.createElement("div");
    container.innerHTML = html;

    document.body.appendChild(container);

    container.querySelector('#XR8CameraSwitch-frontface')?.addEventListener('click', this.onFrontFaceCameraSelected);
    container.querySelector('#XR8CameraSwitch-backface')?.addEventListener('click', this.onBackFaceCameraSelected);
    container.querySelector('#XR8CameraSwitch-image')?.addEventListener('click', this.onImageCameraSelected);
    container.querySelector('#XR8CameraSwitch-world')?.addEventListener('click', this.onWorldCameraSelected);
    container.querySelector('#XR8CameraSwitch-kill')?.addEventListener('click', () => {
      ARSession.stopARSession();
    });

    ARSession.onSessionEnded.push(() => {
      console.trace("Killing the session - - CHECK THIS WHY TWICE");
      this.faceTrackingCamera!.active = false;
      this.imageTrackingCamera!.active = false;
      this.worldTrackingCamera!.active = false;
    })

    this.faceTrackingCamera = this.object.getComponent(ARFaceTrackingCamera)!;
    this.imageTrackingCamera = this.object.getComponent(ARImageTrackingCamera)!;
    this.worldTrackingCamera = this.object.getComponent(ARSLAMCamera)!;
  }

  onFrontFaceCameraSelected = () => {
    this.imageTrackingCamera!.active = false;
    this.worldTrackingCamera!.active = false;

    /**
     * TODO: this is a little bit dumb that we have to stop the camera
     * and restart it with only a change in the parameter.
     * 
     * It should be possible just to change the param and seemlesly witch, at least with 8thwall
     */
    this.faceTrackingCamera!.active = false;
    this.faceTrackingCamera!.cameraDirection = 0;

    this.faceTrackingCamera!.active = true;
    this.faceTrackingCamera!.startSession();
  }

  onBackFaceCameraSelected = () => {
    //this.faceTrackingCamera!.active = false;
    this.imageTrackingCamera!.active = false;
    this.worldTrackingCamera!.active = false;

    /**
     * TODO: this is a little bit dumb that we have to stop the camera
     * and restart it with only a change in the parameter.
     * 
     * It should be possible just to change the param and seemlesly witch, at least with 8thwall
     */
    this.faceTrackingCamera!.active = false;
    this.faceTrackingCamera!.cameraDirection = 1;

    this.faceTrackingCamera!.active = true;
    this.faceTrackingCamera!.startSession();
  }

  onImageCameraSelected = () => {
    this.faceTrackingCamera!.active = false;
    //this.imageTrackingCamera!.active = false;
    this.worldTrackingCamera!.active = false;

    if (!this.imageTrackingCamera!.active) {
      this.imageTrackingCamera!.active = true;
      this.imageTrackingCamera!.startSession();
    }
  }

  onWorldCameraSelected = () => {
    this.faceTrackingCamera!.active = false;
    this.imageTrackingCamera!.active = false;
    //this.worldTrackingCamera!.active = false;

    if (!this.worldTrackingCamera!.active) {
      this.worldTrackingCamera!.active = true;
      this.worldTrackingCamera!.startSession();
    }
  }
}

WL.registerComponent(XR8CameraSwitch);