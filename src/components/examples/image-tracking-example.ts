import { Component, Object as WLEObject, Type } from '@wonderlandengine/api';
import { ARImageTrackingCamera } from '../AR/cameras/AR-image-tracking-camera';

class ImageTrackingExample extends Component {

  public static TypeName = 'image-tracking-example';
  public static Properties = {
    ARImageTrackingCamera: { type: Type.Object },
  };

  // injected by WL..
  private ARImageTrackingCamera!: WLEObject;

  start() {
    if (!this.ARImageTrackingCamera) {
      console.warn(`${this.object.name}/${this.type} requires a ${ARImageTrackingCamera.TypeName}`);
      return;
    }

    const camera = this.ARImageTrackingCamera.getComponent(ARImageTrackingCamera);

    if (!camera) {
      throw new Error(`${ARImageTrackingCamera.TypeName} was not found on ARImageTrackingCamera`)
    }

    //const mesh = this.object.getComponent(MeshComponent) // <-- fails, issue reported 
    const mesh = this.object.getComponent('mesh');
    if (!mesh) {
      return;
    }

    // hide by default
    mesh.active = false;

    // allocate some arrays
    const cachedPosition = new Array<number>(3);
    const cachedRotation = new Array<number>(4);
    const cachedScale = new Array<number>(3);

    camera.onImageFound.push((_event: unknown) => {
      mesh.active = true;
    });

    camera.onImageUpdate.push((event: any) => {
      const { rotation, position, scale } = event.detail

      cachedRotation[0] = rotation.x;
      cachedRotation[1] = rotation.y;
      cachedRotation[2] = rotation.z;
      cachedRotation[3] = rotation.w;

      cachedPosition[0] = position.x;
      cachedPosition[1] = position.y;
      cachedPosition[2] = position.z;

      cachedScale[0] = scale / 10;
      cachedScale[1] = scale / 10;
      cachedScale[2] = scale / 10;

      this.object.rotationWorld.set(cachedRotation);
      this.object.setTranslationWorld(cachedPosition);
      this.object.scalingWorld.set(cachedScale);
    });

    camera.onImageLost.push((_event: unknown) => {
      mesh.active = false;
    });
  }
}
WL.registerComponent(ImageTrackingExample);