import { Component, Object as WLEObject, Type } from '@wonderlandengine/api';
import { ARSession } from '../../../src/components/AR/AR-session';
import { ARFaceTrackingCamera } from '../../../src/components/AR/cameras/AR-face-tracking-camera';
//import { ARFaceTrackingCamera } from '../../..';


const ATTACHMENT_POINTS = ['forehead', 'rightEyebrowInner', 'rightEyebrowMiddle', 'rightEyebrowOuter', 'leftEyebrowInner', 'leftEyebrowMiddle', 'leftEyebrowOuter', 'leftEar', 'rightEar', 'leftCheek', 'rightCheek', 'noseBridge', 'noseTip', 'leftEye', 'rightEye', 'leftEyeOuterCorner', 'rightEyeOuterCorner', 'upperLip', 'lowerLip', 'mouth', 'mouthRightCorner', 'mouthLeftCorner', 'chin'];

class FaceAttachmentPointExample extends Component {
  public static TypeName = 'face-attachment-point-example';
  public static Properties = {
    ARFaceTrackingCamera: { type: Type.Object },

    // To which ´attachmentPoint´ are we going to attach our `attachedObject`
    attachmentPoint: {type: Type.Enum, values: ATTACHMENT_POINTS},
    
    attachedObject: { type: Type.Object },
  };

  // injected by WL..
  private ARFaceTrackingCamera!: WLEObject;

  // injected by WL..
  private attachmentPoint: number = 0;

  // injected by WL..
  private attachedObject!: WLEObject;

  start() {
    if (!this.ARFaceTrackingCamera) {
      console.warn(`${this.object.name}/${this.type} requires a ${ARFaceTrackingCamera.TypeName}`);
      return;
    }
    const camera = this.ARFaceTrackingCamera.getComponent(ARFaceTrackingCamera);
    if (!camera) {
      throw new Error(`${ARFaceTrackingCamera.TypeName} was not found on ARFaceTrackingCamera`)
    }

    // allocate some arrays
    const cachedPosition = new Array<number>(3);
    const cachedRotation = new Array<number>(4);
    const cachedScale = [0, 0, 0];


    ARSession.onSessionEnded.push(() => {
      this.object.scalingWorld = [0, 0, 0];
      cachedScale[0] = cachedScale[1] = cachedScale[2] = 0;
    });

    this.object.scalingWorld = [0, 0, 0];

    camera.onFaceUpdate.push((event) => {

      // event.detail.attachmentPoints are filled with positions of all available positions of the face features
      const { transform, attachmentPoints } = event.detail;
      
      cachedRotation[0] = transform.rotation.x;
      cachedRotation[1] = transform.rotation.y;
      cachedRotation[2] = transform.rotation.z;
      cachedRotation[3] = transform.rotation.w;

      cachedPosition[0] = transform.position.x;
      cachedPosition[1] = transform.position.y;
      cachedPosition[2] = transform.position.z;

      const scale = transform.scale;

      cachedScale[0] = scale;
      cachedScale[1] = scale;
      cachedScale[2] = scale;

      this.object.rotationWorld.set(cachedRotation);
      this.object.setTranslationWorld(cachedPosition);
      this.object.scalingWorld.set(cachedScale);
      
      const attachmentPoint = attachmentPoints[ATTACHMENT_POINTS[this.attachmentPoint] as keyof typeof attachmentPoints].position;
      this.attachedObject.setTranslationLocal([attachmentPoint.x, attachmentPoint.y, attachmentPoint.z])
    })

    camera.onFaceLost.push((_event) => {
      this.object.scalingWorld = [0, 0, 0];
      cachedScale[0] = cachedScale[1] = cachedScale[2] = 0;
    });
  }
}

WL.registerComponent(FaceAttachmentPointExample);
