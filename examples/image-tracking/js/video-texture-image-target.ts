/**
 * class VideoTextureImageTarget
 * 
 * 
 */
import { Component } from '@wonderlandengine/api';
import { ARSession } from '../../..';
import { ARImageTrackingCamera } from '../../../src/components/AR/cameras/AR-image-tracking-camera';
import { PhysicalSizeImageTarget } from './physical-size-image-target';

class VideoTextureImageTarget extends Component {

  public static TypeName = 'video-texture-image-target-example';

  public static Properties = {
  
  };

  //private ARImageTrackingCamera!: WLEObject;
  //private imageId!: string;

  private physicalSizeImageTarget!: PhysicalSizeImageTarget;
  // cache videoTexture component
  private videoTextureComp!: Component & { video: HTMLVideoElement };

  // Sometimes the tracking is lost just for a fraction of the second before it's tracked again.
  // In this case we allow sometime before we hide the mesh to reduce the flickering. 
  private imageLostTimeout = 0;

  start() {

    const physicalSizeImageTarget = this.object.getComponent(PhysicalSizeImageTarget);
    if (!physicalSizeImageTarget) {
      console.warn(`${this.object.name}/${this.type} requires a ${PhysicalSizeImageTarget.TypeName}`);
      return;
    }

    this.physicalSizeImageTarget = physicalSizeImageTarget;

    const camera = this.physicalSizeImageTarget.ARImageTrackingCamera.getComponent(ARImageTrackingCamera)!;

    this.videoTextureComp = this.object.getComponent("video-texture-fixed") as any; // video-texture component is not updated to match @wonderlandengine/api 0.9.8 ("@wonderlandengine/components": "^0.9.2"),

    camera.onImageFound.push(this.onImageFound);

    camera.onImageLost.push((event: XR8ImageTrackedEvent) => {
      if (event.detail.name === this.physicalSizeImageTarget.imageId) {
        this.imageLostTimeout = setTimeout(() => {
          this.videoTextureComp.video.pause();
        }, 250);
      }
    });

    ARSession.onSessionEnded.push(() => {
      clearTimeout(this.imageLostTimeout);
      this.videoTextureComp.video.pause();
    })
  }


  private onImageFound = (event: XR8ImageTrackedEvent) => {
    if (event.detail.name === this.physicalSizeImageTarget.imageId) {
      //this.videoTextureComp.video.playsInline = true; // might be needed on native video-texture if not fixed yet ("@wonderlandengine/components": "^0.9.2"),
      this.videoTextureComp.video.play();
    }
  }
}
WL.registerComponent(VideoTextureImageTarget);